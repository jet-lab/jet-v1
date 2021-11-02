// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2021 JET PROTOCOL HOLDINGS, LLC.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::UnixTimestamp;
use bytemuck::{Pod, Zeroable};
use std::cmp::Ordering;

use jet_math::Number;
use jet_proc_macros::assert_size;

use crate::state::Cache;
use crate::utils::FixedBuf;
use crate::utils::JobCompletion;

const SECONDS_PER_HOUR: UnixTimestamp = 3600;
const SECONDS_PER_2H: UnixTimestamp = SECONDS_PER_HOUR * 2;
const SECONDS_PER_12H: UnixTimestamp = SECONDS_PER_HOUR * 12;
const SECONDS_PER_DAY: UnixTimestamp = SECONDS_PER_HOUR * 24;
const SECONDS_PER_WEEK: UnixTimestamp = SECONDS_PER_DAY * 7;
const SECONDS_PER_YEAR: UnixTimestamp = 31_536_000;
const MAX_ACCRUAL_SECONDS: UnixTimestamp = SECONDS_PER_WEEK;

static_assertions::const_assert_eq!(SECONDS_PER_HOUR, 60 * 60);
static_assertions::const_assert_eq!(SECONDS_PER_2H, 60 * 60 * 2);
static_assertions::const_assert_eq!(SECONDS_PER_12H, 60 * 60 * 12);
static_assertions::const_assert_eq!(SECONDS_PER_DAY, 60 * 60 * 24);
static_assertions::const_assert_eq!(SECONDS_PER_WEEK, 60 * 60 * 24 * 7);
static_assertions::const_assert_eq!(SECONDS_PER_YEAR, 60 * 60 * 24 * 365);

/// We have three interest rate regimes. The rate is described by a continuous,
/// piecewise-linear function of the utilization rate:
/// 1. zero to [utilization_rate_1]: borrow rate increases linearly from
///     [borrow_rate_0] to [borrow_rate_1].
/// 2. [utilization_rate_1] to [utilization_rate_2]: borrow rate increases linearly
///     from [borrow_rate_1] to [borrow_rate_2].
/// 3. [utilization_rate_2] to one: borrow rate increases linearly from
///     [borrow_rate_2] to [borrow_rate_3].
///
/// Interest rates are nominal annual amounts, compounded continuously with
/// a day-count convention of actual-over-365. The accrual period is determined
/// by counting slots, and comparing against the number of slots per year.
#[assert_size(aligns, 64)]
#[repr(C)]
#[derive(Pod, Zeroable, Clone, Copy, AnchorDeserialize, AnchorSerialize)]
pub struct ReserveConfig {
    /// The utilization rate at which we switch from the first to second regime.
    pub utilization_rate_1: u16,

    /// The utilization rate at which we switch from the second to third regime.
    pub utilization_rate_2: u16,

    /// The lowest borrow rate in the first regime. Essentially the minimum
    /// borrow rate possible for the reserve.
    pub borrow_rate_0: u16,

    /// The borrow rate at the transition point from the first to second regime.
    pub borrow_rate_1: u16,

    /// The borrow rate at the transition point from the second to thirs regime.
    pub borrow_rate_2: u16,

    /// The highest borrow rate in the third regime. Essentially the maximum
    /// borrow rate possible for the reserve.
    pub borrow_rate_3: u16,

    /// The minimum allowable collateralization ratio for an obligation
    pub min_collateral_ratio: u16,

    /// The amount given as a bonus to a liquidator
    pub liquidation_premium: u16,

    /// The threshold at which to collect the fees accumulated from interest into
    /// real deposit notes.
    pub manage_fee_collection_threshold: u64,

    /// The fee rate applied to the interest payments collected
    pub manage_fee_rate: u16,

    /// The fee rate applied as interest owed on new loans
    pub loan_origination_fee: u16,

    /// unused
    pub _reserved0: u16,

    /// Represented as a percentage of the Price
    /// confidence values above this will not be accepted
    pub confidence_threshold: u16,

    /// The maximum token amount to allow in a single DEX trade when
    /// liquidating assetr from this reserve as collateral.
    pub liquidation_dex_trade_max: u64,

    pub _reserved1: [u8; 24],
}

#[assert_size(2048)]
#[account(zero_copy)]
pub struct Reserve {
    pub version: u16,

    /// The unique id for this reserve within the market
    pub index: u16,

    /// The base 10 decimals used for token values
    pub exponent: i32,

    /// The market this reserve is a part of.
    pub market: Pubkey,

    /// The account where a Pyth oracle keeps the updated price of the token.
    pub pyth_oracle_price: Pubkey,

    /// The account where a Pyth oracle keeps metadata about the token.
    pub pyth_oracle_product: Pubkey,

    /// The mint for the token being held in this reserve
    pub token_mint: Pubkey,

    /// The mint for this reserve's deposit notes
    pub deposit_note_mint: Pubkey,

    /// The mint for this reserve's loan notes
    pub loan_note_mint: Pubkey,

    /// The account with custody over the reserve's tokens.
    pub vault: Pubkey,

    /// The account with custody of the notes generated from collected fees
    pub fee_note_vault: Pubkey,

    /// The account for storing quote tokens during a swap
    pub dex_swap_tokens: Pubkey,

    /// The account used for trading with the DEX
    pub dex_open_orders: Pubkey,

    /// The DEX market account that this reserve can trade in
    pub dex_market: Pubkey,

    pub _reserved0: [u8; 408],

    pub config: ReserveConfig,

    _reserved1: [u8; 704],

    state: [u8; 512],
}

impl Reserve {
    pub(crate) fn init(&mut self, clock: &Clock) {
        self.state_mut().get_stale_mut().accrued_until = clock.unix_timestamp;
    }

    pub(crate) fn amount(&self, value: u64) -> Number {
        Number::from_decimal(value, self.exponent)
    }

    pub fn total_deposits(&self) -> u64 {
        self.state().get_stale().total_deposits
    }

    pub fn total_deposit_notes(&self) -> u64 {
        self.state().get_stale().total_deposit_notes
    }

    pub fn total_loan_notes(&self) -> u64 {
        self.state().get_stale().total_loan_notes
    }

    pub fn unwrap_outstanding_debt(&self, current_slot: u64) -> &Number {
        &self.unwrap_state(current_slot).outstanding_debt
    }

    #[cfg(test)]
    fn unwrap_outstanding_debt_mut(&mut self, current_slot: u64) -> &mut Number {
        &mut self.unwrap_state_mut(current_slot).outstanding_debt
    }

    fn state(&self) -> &Cache<ReserveState, 1> {
        bytemuck::from_bytes(&self.state)
    }

    fn state_mut(&mut self) -> &mut Cache<ReserveState, 1> {
        bytemuck::from_bytes_mut(&mut self.state)
    }

    fn unwrap_state(&self, current_slot: u64) -> &ReserveState {
        self.state()
            .expect(current_slot, "Reserve needs to be refreshed")
    }

    fn unwrap_state_mut(&mut self, current_slot: u64) -> &mut ReserveState {
        self.state_mut()
            .expect_mut(current_slot, "Reserve needs to be refreshed")
    }

    /// Record an amount of tokens deposited into the reserve
    pub fn deposit(&mut self, token_amount: u64, note_amount: u64) {
        let state = self.state_mut().get_stale_mut();

        state.total_deposits = state.total_deposits.checked_add(token_amount).unwrap();
        state.total_deposit_notes = state.total_deposit_notes.checked_add(note_amount).unwrap();
    }

    /// Record an amount of tokens withdrawn from the reserve
    pub fn withdraw(&mut self, token_amount: u64, note_amount: u64) {
        let state = self.state_mut().get_stale_mut();

        state.total_deposits = state.total_deposits.checked_sub(token_amount).unwrap();
        state.total_deposit_notes = state.total_deposit_notes.checked_sub(note_amount).unwrap();
    }

    /// Calculates the borrow fee token amount for
    /// an amount of tokens to be borrowed from the reserve.
    pub fn borrow_fee(&self, token_amount: u64) -> u64 {
        let origination_fee = Number::from_bps(self.config.loan_origination_fee);
        let fee_owed = origination_fee * token_amount;

        fee_owed.as_u64_ceil(0)
    }

    /// Record an amount of tokens to be borrowed from the reserve.
    pub fn borrow(&mut self, current_slot: u64, token_amount: u64, note_amount: u64, fees: u64) {
        let borrowed_amount = Number::from(token_amount);

        let state = self.unwrap_state_mut(current_slot);

        let fees = Number::from_decimal(fees, 0);

        state.uncollected_fees += fees;
        state.outstanding_debt += borrowed_amount + fees;
        state.total_deposits = state.total_deposits.checked_sub(token_amount).unwrap();
        state.total_loan_notes = state.total_loan_notes.checked_add(note_amount).unwrap();
    }

    /// Record an amount of tokens repaid back to the reserve.
    pub fn repay(&mut self, current_slot: u64, token_amount: u64, note_amount: u64) {
        let state = self.unwrap_state_mut(current_slot);

        state.outstanding_debt -= Number::from(token_amount);
        state.total_loan_notes = state.total_loan_notes.checked_sub(note_amount).unwrap();
        state.total_deposits = state.total_deposits.checked_add(token_amount).unwrap();

        if state.total_loan_notes == 0 && state.outstanding_debt < Number::ONE {
            // Truncate any leftover fraction from debts
            state.outstanding_debt = Number::ZERO;
        }
    }

    /// Record an amount of tokens added to the vault which need
    /// to be collected as fees later.
    pub fn add_uncollected_fees(&mut self, current_slot: u64, amount: u64) {
        let state = self.unwrap_state_mut(current_slot);
        state.uncollected_fees += Number::from(amount);
        state.total_deposits = state.total_deposits.checked_add(amount).unwrap();
    }

    /// Calculate the exchange rate for deposit notes (tokens per note)
    pub fn deposit_note_exchange_rate(
        &self,
        current_slot: u64,
        vault_total: u64,
        mint_supply: u64,
    ) -> Number {
        let state = self.unwrap_state(current_slot);
        let calc = DepositNoteCalculator {
            outstanding_debt: state.outstanding_debt,
            uncollected_fees: state.uncollected_fees,
            vault_total,
            mint_supply,
        };

        calc.exchange_rate()
    }

    /// Calculate the exchange rate for loan notes (tokens per note)
    pub fn loan_note_exchange_rate(&self, current_slot: u64, mint_supply: u64) -> Number {
        let state = self.unwrap_state(current_slot);
        let calc = LoanNoteCalculator {
            outstanding_debt: state.outstanding_debt,
            mint_supply,
        };

        calc.exchange_rate()
    }

    /// Accrue the interest charges for outstanding borrows
    pub fn try_accrue_interest(
        &mut self,
        vault_total: u64,
        target_time: UnixTimestamp,
        target_slot: u64,
    ) -> JobCompletion {
        let ReserveState {
            outstanding_debt,
            accrued_until,
            ..
        } = *self.state().get_stale();

        let time_behind = target_time - accrued_until;
        let time_to_accrue = std::cmp::min(time_behind, MAX_ACCRUAL_SECONDS);

        let interest_rate = self.interest_rate(outstanding_debt, vault_total);
        let state_cache: &mut Cache<ReserveState, 0> = bytemuck::from_bytes_mut(&mut self.state);

        match time_to_accrue.cmp(&0) {
            Ordering::Less => {
                panic!("Interest may not be accrued over a negative time period.");
            }
            Ordering::Equal => {}
            Ordering::Greater => {
                let compound_rate = Reserve::compound_interest(interest_rate, time_to_accrue);

                let interest_fee_rate = Number::from_bps(self.config.manage_fee_rate);
                let state = state_cache.get_stale_mut();

                let new_interest_accrued = state.outstanding_debt * compound_rate;
                let fee_to_collect = new_interest_accrued * interest_fee_rate;

                state.outstanding_debt += new_interest_accrued;
                state.uncollected_fees += fee_to_collect;
                state.accrued_until = state.accrued_until.checked_add(time_to_accrue).unwrap();
            }
        }

        if time_behind == time_to_accrue {
            state_cache.refresh_to(target_slot);
            JobCompletion::Full
        } else {
            state_cache.invalidate();
            JobCompletion::Partial
        }
    }

    /// Collect any fees that were accumulated
    ///
    /// Returns the number of notes to mint to represent the fees collected
    pub fn collect_accrued_fees(&mut self, current_slot: u64, exchange_rate: Number) -> u64 {
        let threshold = Number::from(self.config.manage_fee_collection_threshold);
        let state = self.unwrap_state_mut(current_slot);

        if threshold > state.uncollected_fees {
            // not enough accumulated to be worth minting new notes for
            return 0;
        }

        let fee_notes = (state.uncollected_fees / exchange_rate).as_u64(0);

        state.uncollected_fees = Number::ZERO;
        state.total_deposit_notes = state.total_deposit_notes.checked_add(fee_notes).unwrap();

        fee_notes
    }

    /// Computes the effective applicable interest rate assuming continuous
    /// compounding for the given number of slots.
    ///
    /// Uses an approximation calibrated for accuracy to twenty decimals places,
    /// though the current configuration of Number does not support that. (TODO)
    fn compound_interest(rate: Number, seconds: UnixTimestamp) -> Number {
        // The two panics below are implementation details, chosen to facilitate convenient
        // implementation of compounding. They can be relaxed with a bit of additional work.
        // The "seconds" guards are chosen to guarantee accuracy under the assumption that
        // the rate is not more than one.

        if rate > Number::ONE * 2 {
            panic!("Not implemented; interest rate too large for compound_interest()");
        }

        let terms = match seconds {
            _ if seconds <= SECONDS_PER_2H => 5,
            _ if seconds <= SECONDS_PER_12H => 6,
            _ if seconds <= SECONDS_PER_DAY => 7,
            _ if seconds <= SECONDS_PER_WEEK => 10,
            _ => panic!("Not implemented; too many seconds in compound_interest()"),
        };

        let x = rate * seconds / SECONDS_PER_YEAR;

        jet_math::expm1_approx(x, terms)
    }

    /// Get the interest rate charged to borrowers for the given inputs
    pub fn interest_rate(&self, outstanding_debt: Number, vault_total: u64) -> Number {
        let borrow_1 = Number::from_bps(self.config.borrow_rate_1);

        // Catch the edge case of empty reserve
        if vault_total == 0 && outstanding_debt == Number::ZERO {
            return borrow_1;
        }

        let util_rate = utilization_rate(outstanding_debt, vault_total);

        let util_1 = Number::from_bps(self.config.utilization_rate_1);

        if util_rate <= util_1 {
            // First regime
            let borrow_0 = Number::from_bps(self.config.borrow_rate_0);

            return Reserve::interpolate(util_rate, Number::ZERO, util_1, borrow_0, borrow_1);
        }

        let util_2 = Number::from_bps(self.config.utilization_rate_2);
        let borrow_2 = Number::from_bps(self.config.borrow_rate_2);

        if util_rate <= util_2 {
            // Second regime
            let borrow_1 = Number::from_bps(self.config.borrow_rate_1);

            return Reserve::interpolate(util_rate, util_1, util_2, borrow_1, borrow_2);
        }

        let borrow_3 = Number::from_bps(self.config.borrow_rate_3);

        if util_rate < Number::ONE {
            // Third regime
            return Reserve::interpolate(util_rate, util_2, Number::ONE, borrow_2, borrow_3);
        }

        // Maximum interest
        borrow_3
    }

    /// Linear interpolation between (x0, y0) and (x1, y1).
    fn interpolate(x: Number, x0: Number, x1: Number, y0: Number, y1: Number) -> Number {
        assert!(x >= x0);
        assert!(x <= x1);

        y0 + ((x - x0) * (y1 - y0)) / (x1 - x0)
    }
}

/// Information about a single collateral or loan account registered with an obligation
#[assert_size(aligns, 496)]
#[derive(Pod, Zeroable, Clone, Copy)]
#[repr(C)]
struct ReserveState {
    accrued_until: i64,

    outstanding_debt: Number,

    uncollected_fees: Number,

    total_deposits: u64,

    total_deposit_notes: u64,
    total_loan_notes: u64,

    _reserved: FixedBuf<416>,
}

/// Get the current utilization rate (borrowed / deposited)
pub fn utilization_rate(outstanding_debt: Number, vault_total: u64) -> Number {
    outstanding_debt / (outstanding_debt + Number::from(vault_total))
}

struct DepositNoteCalculator {
    outstanding_debt: Number,
    uncollected_fees: Number,
    vault_total: u64,
    mint_supply: u64,
}

impl<'a> NoteCalculator for DepositNoteCalculator {
    fn note_supply(&self) -> Number {
        Number::from(self.mint_supply)
    }

    fn token_supply(&self) -> Number {
        // When calculating the value of deposit notes, we should consider
        // the total debt owed to depositors, which may be less than the total
        // debt due to fees charged by the protocol. This allows the program
        // to generate new deposit notes based on the extra debt.
        self.outstanding_debt + Number::from(self.vault_total) - self.uncollected_fees
    }
}

struct LoanNoteCalculator {
    outstanding_debt: Number,
    mint_supply: u64,
}

impl NoteCalculator for LoanNoteCalculator {
    fn note_supply(&self) -> Number {
        Number::from(self.mint_supply)
    }

    fn token_supply(&self) -> Number {
        self.outstanding_debt
    }
}

pub trait NoteCalculator {
    fn note_supply(&self) -> Number;
    fn token_supply(&self) -> Number;

    /// Number of tokens each bank note is worth.
    /// Ratio in terms of the smallest transferable units of each token.
    fn exchange_rate(&self) -> Number {
        let note_supply = match self.note_supply() {
            Number::ZERO => Number::ONE,
            n => n,
        };

        let token_supply = match self.token_supply() {
            Number::ZERO => Number::ONE,
            n => n,
        };

        token_supply / note_supply
    }

    /// Returns the quantity of notes that represent the provided number of tokens
    fn notes_from_tokens(&self, tokens: u64) -> u64 {
        let tokens = Number::from(tokens);
        let notes = tokens / self.exchange_rate();

        notes.as_u64(0)
    }

    /// Returns the quantity of tokens that are represented by the provided number of notes
    fn tokens_from_notes(&self, notes: u64) -> u64 {
        let notes = Number::from(notes);
        let tokens = notes * self.exchange_rate();

        tokens.as_u64(0)
    }
}

impl std::fmt::Debug for ReserveState {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        f.debug_struct("ReserveState")
            .field("accrued_until", &self.accrued_until)
            .field("outstanding_debt", &self.outstanding_debt.to_string())
            .field("uncollected_fees", &self.uncollected_fees.to_string())
            .field("total_deposits", &self.total_deposits.to_string())
            .field("total_deposit_notes", &self.total_deposit_notes.to_string())
            .field("total_loan_notes", &self.total_loan_notes.to_string())
            .finish()
    }
}

impl std::fmt::Debug for Reserve {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        let state = self.state().get_stale();

        f.debug_struct("Reserve")
            .field("index", &{ self.index })
            .field("market", &self.market)
            .field("token_mint", &self.token_mint)
            .field("vault", &self.vault)
            .field("fee_vault", &self.fee_note_vault)
            .field("exponent", &{ self.exponent })
            .field("state", state)
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use bytemuck::Zeroable;

    #[test]
    fn sane_deposit_note_exchange_rate() {
        let vault_total = 100_000_000;
        let mint_supply = 50_000_000;
        let deposit = 200_000_000;

        let outstanding_debt = Number::from(200_000_000);
        let uncollected_fees = Number::from(100_000_000);

        let calc = DepositNoteCalculator {
            outstanding_debt,
            uncollected_fees,
            vault_total,
            mint_supply,
        };
        let notes_received = calc.notes_from_tokens(deposit);

        assert_eq!(50_000_000, notes_received);
    }

    #[test]
    fn sane_utilization_rate() {
        let vault_total = 100_000_000;

        assert_eq!(
            5000,
            utilization_rate(Number::from(100_000_000), vault_total).as_u64(jet_math::BPS_EXPONENT)
        );

        let outstanding_debt = Number::from(60_000_000);
        assert_eq!(
            3750,
            utilization_rate(outstanding_debt, vault_total).as_u64(jet_math::BPS_EXPONENT)
        );
    }

    #[test]
    fn test_interest_rate_model() {
        let mut reserve = Reserve::zeroed();
        let mut config = ReserveConfig::zeroed();

        reserve.exponent = -3;

        config.utilization_rate_1 = 7000;
        config.utilization_rate_2 = 9000;
        config.borrow_rate_0 = 50;
        config.borrow_rate_1 = 300;
        config.borrow_rate_2 = 4500;
        config.borrow_rate_3 = 10000;

        reserve.config = config;

        let vault_total = 100_000_000;

        // At 0% utilization
        let outstanding_debt = Number::from(0);
        assert_eq!(
            50,
            reserve
                .interest_rate(outstanding_debt, vault_total)
                .as_u64(jet_math::BPS_EXPONENT)
        );

        // In first regime (20% utilization)
        let outstanding_debt = Number::from(25_000_000);
        assert_eq!(
            121,
            reserve
                .interest_rate(outstanding_debt, vault_total)
                .as_u64(jet_math::BPS_EXPONENT)
        );

        // At transition to second regime (70% utilization)
        let outstanding_debt = Number::from(233_333_334); // TODO precision thing?
        assert_eq!(
            300,
            reserve
                .interest_rate(outstanding_debt, vault_total)
                .as_u64(jet_math::BPS_EXPONENT)
        );

        // In second regime (80% utilization)
        let outstanding_debt = Number::from(400_000_000);
        assert_eq!(
            2400,
            reserve
                .interest_rate(outstanding_debt, vault_total)
                .as_u64(jet_math::BPS_EXPONENT)
        );

        // At transition to third regime (90% utilization)
        let outstanding_debt = Number::from(900_000_000);
        assert_eq!(
            4500,
            reserve
                .interest_rate(outstanding_debt, vault_total)
                .as_u64(jet_math::BPS_EXPONENT)
        );

        // In third regime (95% utilization)
        let outstanding_debt = Number::from(1_900_000_000);
        assert_eq!(
            7250,
            reserve
                .interest_rate(outstanding_debt, vault_total)
                .as_u64(jet_math::BPS_EXPONENT)
        );

        // At 100% utilization
        let outstanding_debt = Number::from(1_000_000);
        assert_eq!(
            10000,
            reserve
                .interest_rate(outstanding_debt, 0)
                .as_u64(jet_math::BPS_EXPONENT)
        );
    }

    #[test]
    fn test_interest_rate_model_three_to_two_segment_reduction() {
        let mut reserve = Reserve::zeroed();
        let mut config = ReserveConfig::zeroed();

        reserve.exponent = -3;

        config.utilization_rate_1 = 7000;
        config.utilization_rate_2 = 10000;
        config.borrow_rate_0 = 50;
        config.borrow_rate_1 = 300;
        config.borrow_rate_2 = 9000;
        config.borrow_rate_3 = Default::default();

        reserve.config = config;

        let vault_total = 100_000_000;

        // At 0% utilization
        let outstanding_debt = Number::from(0);
        assert_eq!(
            50,
            reserve
                .interest_rate(outstanding_debt, vault_total)
                .as_u64(jet_math::BPS_EXPONENT)
        );

        // In first regime (20% utilization)
        let outstanding_debt = Number::from(25_000_000);
        assert_eq!(
            121,
            reserve
                .interest_rate(outstanding_debt, vault_total)
                .as_u64(jet_math::BPS_EXPONENT)
        );

        // At transition to second regime (70% utilization)
        let outstanding_debt = Number::from(233_333_334); // TODO precision thing?
        assert_eq!(
            300,
            reserve
                .interest_rate(outstanding_debt, vault_total)
                .as_u64(jet_math::BPS_EXPONENT)
        );

        // In second regime (80% utilization)
        let outstanding_debt = Number::from(400_000_000);
        assert_eq!(
            3200,
            reserve
                .interest_rate(outstanding_debt, vault_total)
                .as_u64(jet_math::BPS_EXPONENT)
        );

        // At transition to third regime (90% utilization)
        let outstanding_debt = Number::from(900_000_000);
        assert_eq!(
            6100,
            reserve
                .interest_rate(outstanding_debt, vault_total)
                .as_u64(jet_math::BPS_EXPONENT)
        );

        // In third regime (95% utilization)
        let outstanding_debt = Number::from(1_900_000_000);
        assert_eq!(
            7550,
            reserve
                .interest_rate(outstanding_debt, vault_total)
                .as_u64(jet_math::BPS_EXPONENT)
        );

        // At 100% utilization
        let outstanding_debt = Number::from(vault_total);
        assert_eq!(
            9000,
            reserve
                .interest_rate(outstanding_debt, 0)
                .as_u64(jet_math::BPS_EXPONENT)
        );
    }

    // In the tests below we take the interest model as correct and focus
    // the tests on the accrual mechanism and its precision.

    #[test]
    fn sane_interest_accrual_at_ideal_utilization_one_day() {
        let mut reserve = Reserve::zeroed();

        reserve.exponent = -3;

        reserve.config.utilization_rate_1 = 5000;
        reserve.config.utilization_rate_2 = 9000;
        reserve.config.borrow_rate_0 = 50;
        reserve.config.borrow_rate_1 = 300;
        reserve.config.borrow_rate_2 = 2000;
        reserve.config.borrow_rate_3 = 9000;

        *reserve.unwrap_outstanding_debt_mut(0) = Number::from(100_000_000);

        let vault_total = 100_000_000;
        let target_time = SECONDS_PER_YEAR / (365 * 24);

        reserve.try_accrue_interest(vault_total, target_time, 0);
        let owed = reserve.state().get_stale().outstanding_debt.as_u64(0);

        assert_eq!(100_000_342, owed);
    }

    #[test]
    fn sane_interest_accrual_at_ideal_utilization_seven_days() {
        let mut reserve = Reserve::zeroed();

        reserve.exponent = -3;

        reserve.config.utilization_rate_1 = 5000;
        reserve.config.utilization_rate_2 = 9000;
        reserve.config.borrow_rate_0 = 50;
        reserve.config.borrow_rate_1 = 300;
        reserve.config.borrow_rate_2 = 2000;
        reserve.config.borrow_rate_3 = 9000;

        let vault_total = 100_000_000;
        *reserve.unwrap_outstanding_debt_mut(0) = Number::from(100_000_000);

        let target_time = 7 * SECONDS_PER_YEAR / (365 * 24);

        reserve.try_accrue_interest(vault_total, target_time, 0);

        let owed = reserve.state().get_stale().outstanding_debt.as_u64(0);

        assert_eq!(owed, 100_002_397);
    }

    #[test]
    fn sane_interest_accrual_at_ideal_utilization_one_day_high_precision() {
        let mut reserve = Reserve::zeroed();

        reserve.exponent = -6;

        reserve.config.utilization_rate_1 = 5000;
        reserve.config.utilization_rate_2 = 9000;
        reserve.config.borrow_rate_0 = 50;
        reserve.config.borrow_rate_1 = 300;
        reserve.config.borrow_rate_2 = 2000;
        reserve.config.borrow_rate_2 = 9000;

        let vault_total = 100_000_000_000;
        *reserve.unwrap_outstanding_debt_mut(0) = Number::from(100_000_000_000u64);

        let target_time = SECONDS_PER_HOUR;

        reserve.try_accrue_interest(vault_total, target_time, 0);

        let owed = reserve.state().get_stale().outstanding_debt.as_u64(0);

        assert_eq!(owed, 100_000_342_466);
    }

    #[test]
    fn sane_interest_accrual_at_ideal_utilization_seven_days_high_precision() {
        let mut reserve = Reserve::zeroed();

        reserve.exponent = -6;

        reserve.config.utilization_rate_1 = 5000;
        reserve.config.utilization_rate_2 = 9000;
        reserve.config.borrow_rate_0 = 50;
        reserve.config.borrow_rate_1 = 300;
        reserve.config.borrow_rate_2 = 2000;
        reserve.config.borrow_rate_2 = 9000;

        let vault_total = 100_000_000_000;
        *reserve.unwrap_outstanding_debt_mut(0) = Number::from(100_000_000_000u64);

        let target_time = 7 * SECONDS_PER_HOUR;

        reserve.try_accrue_interest(vault_total, target_time, 0);

        let owed = reserve.state().get_stale().outstanding_debt.as_u64(0);

        // NOTE results in 2_397_288 (wrong) with PRECISION = 12 jet-math
        assert_eq!(owed, 100_002_397_289);
    }

    #[test]
    fn sane_interest_accrual_at_ideal_utilization_seven_days_high_precision_high_rate() {
        let mut reserve = Reserve::zeroed();

        reserve.exponent = -6;

        reserve.config.utilization_rate_1 = 5000;
        reserve.config.utilization_rate_2 = 9000;
        reserve.config.borrow_rate_0 = 50;
        reserve.config.borrow_rate_1 = 3000;
        reserve.config.borrow_rate_2 = 6000;
        reserve.config.borrow_rate_2 = 9000;

        let vault_total = 100_000_000_000;
        *reserve.unwrap_outstanding_debt_mut(0) = Number::from(100_000_000_000u64);

        let target_time = 7 * SECONDS_PER_YEAR / (365 * 24);

        reserve.try_accrue_interest(vault_total, target_time, 0);

        let owed = reserve.state().get_stale().outstanding_debt.as_u64(0);

        assert_eq!(owed, 100_023_975_476);
    }

    #[test]
    fn sane_interest_manage_fee_collection() {
        let mut reserve = Reserve::zeroed();

        reserve.exponent = -6;

        reserve.config.utilization_rate_1 = 5000;
        reserve.config.utilization_rate_2 = 9000;
        reserve.config.borrow_rate_0 = 50;
        reserve.config.borrow_rate_1 = 3000;
        reserve.config.borrow_rate_2 = 6000;
        reserve.config.borrow_rate_2 = 9000;
        reserve.config.manage_fee_rate = 1000;
        reserve.config.manage_fee_collection_threshold = 1;

        let vault_total = 100_000_000_000;
        let deposit_notes = 200_000_000_000;
        *reserve.unwrap_outstanding_debt_mut(0) = Number::from(100_000_000_000u64);

        let deposit_note_value = reserve.deposit_note_exchange_rate(0, vault_total, deposit_notes);

        assert_eq!(deposit_note_value, Number::from(1));

        let target_time = 7 * SECONDS_PER_HOUR;

        reserve.try_accrue_interest(vault_total, target_time, 0);

        let deposit_note_value = reserve.deposit_note_exchange_rate(0, vault_total, deposit_notes);

        assert_eq!(deposit_note_value.as_u64(-6), 1_000_107);

        let owed = reserve.state().get_stale().outstanding_debt.as_u64(0);

        assert_eq!(owed, 100_023_975_476);

        let fees = reserve.collect_accrued_fees(0, deposit_note_value);

        assert_eq!(fees, 2_397_288);
    }
}
