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

use std::fmt::Debug;

use anchor_lang::prelude::*;
use anchor_lang::Key;
use bytemuck::{Contiguous, Pod, Zeroable};

use jet_math::Number;
use jet_proc_macros::assert_size;

use crate::errors::ErrorCode;
use crate::state::{CachedReserveInfo, ReserveIndex};
use crate::utils::{FixedBuf, StoredPubkey};

use super::Cache;
use super::Market;
use super::MarketReserves;

/// Limit the total positions that can be registered on an obligation
const MAX_OBLIGATION_POSITIONS: usize = 11;

/// The minimum quote value for an obligation to require partial liquidations,
/// if an obligation has a lower value then it can be fully liquidated when below
/// the minimum collateralization ratio.
const MIN_PARTIAL_LIQUIDATION_VALUE: u64 = 10;

#[assert_size(4608)]
/// Tracks information about a user's obligation to repay a borrowed position.
#[account(zero_copy)]
pub struct Obligation {
    pub version: u32,

    pub _reserved0: u32,

    /// The market this obligation is a part of
    pub market: Pubkey,

    /// The address that owns the debt/assets as a part of this obligation
    pub owner: Pubkey,

    /// Unused space before start of collateral info
    pub _reserved1: [u8; 184],

    /// The storage for cached calculations
    pub cached: [u8; 256],

    /// The storage for the information on positions owed by this obligation
    pub collateral: [u8; 2048],

    /// The storage for the information on positions owed by this obligation
    pub loans: [u8; 2048],
}

impl Obligation {
    pub fn register_collateral(
        &mut self,
        account: &Pubkey,
        reserve_index: ReserveIndex,
    ) -> Result<(), ErrorCode> {
        if self.position_count() >= MAX_OBLIGATION_POSITIONS {
            return Err(ErrorCode::NoFreeObligation);
        }

        self.collateral_mut()
            .register(Position::new(Side::Collateral, *account, reserve_index))
    }

    pub fn register_loan(
        &mut self,
        account: &Pubkey,
        reserve_index: ReserveIndex,
    ) -> Result<(), ErrorCode> {
        if self.position_count() >= MAX_OBLIGATION_POSITIONS {
            return Err(ErrorCode::NoFreeObligation);
        }

        self.loans_mut()
            .register(Position::new(Side::Loan, *account, reserve_index))
    }

    pub fn unregister_collateral(
        &mut self,
        account: &Pubkey,
        // position: &Position
    ) -> Result<(), ErrorCode> {
        self.collateral_mut().unregister(*account)
    }

    pub fn unregister_loan(&mut self, account: &Pubkey) -> Result<(), ErrorCode> {
        self.loans_mut().unregister(*account)
    }
    /// Record the collateral deposited for an obligation
    pub fn deposit_collateral(
        &mut self,
        collateral_account: &Pubkey,
        deposit_notes_amount: Number,
    ) -> ProgramResult {
        self.cached_mut().invalidate();
        self.collateral_mut()
            .add(collateral_account, deposit_notes_amount)
    }

    /// Record the collateral withdrawn for an obligation
    pub fn withdraw_collateral(
        &mut self,
        collateral_account: &Pubkey,
        deposit_notes_amount: Number,
    ) -> ProgramResult {
        self.cached_mut().invalidate();
        self.collateral_mut()
            .subtract(collateral_account, deposit_notes_amount)
    }

    /// Record the loan borrowed from an obligation (borrow notes deposited)
    pub fn borrow(&mut self, loan_account: &Pubkey, loan_notes_amount: Number) -> ProgramResult {
        self.cached_mut().invalidate();
        self.loans_mut().add(loan_account, loan_notes_amount)
    }

    /// Record the loan repaid from an obligation (borrow notes burned)
    pub fn repay(&mut self, loan_account: &Pubkey, loan_notes_amount: Number) -> ProgramResult {
        self.cached_mut().invalidate();
        self.loans_mut().subtract(loan_account, loan_notes_amount)
    }

    /// Be smarter about compute
    pub fn cache_calculations(&mut self, market: &MarketReserves, current_slot: u64) {
        let loans: &ObligationSide = bytemuck::from_bytes(&self.loans);
        let collateral: &ObligationSide = bytemuck::from_bytes(&self.collateral);
        let cached: &mut CalculationCache = bytemuck::from_bytes_mut(&mut self.cached);

        cached.refresh(current_slot);

        let values = cached.get_stale_mut();
        values.loan_value = loans._market_value(market, current_slot);
        values.collateral_value = collateral._market_value(market, current_slot);
    }

    /// Determine if the obligation is healthy, or otherwise unhealthy and
    /// at risk of liquidation.
    pub fn is_healthy(&self, market: &MarketReserves, current_slot: u64) -> bool {
        let max_min_c_ratio: Number;
        let _max_min_c_ratio = self
            .loans()
            .positions
            .iter()
            .take_while(|p| p.account != Pubkey::default())
            .map(|p| {
                market
                    .get_cached(p.reserve_index, current_slot)
                    .min_collateral_ratio
            })
            .max();
        if let Some(c) = _max_min_c_ratio {
            max_min_c_ratio = c;
        } else {
            return true; // No loans
        }

        let cached: &CalculationCache = bytemuck::from_bytes(&self.cached);

        let cache_values = cached.expect(current_slot, "calculations not performed");
        let min_collateral_value = cache_values.loan_value * max_min_c_ratio;

        min_collateral_value <= cache_values.collateral_value
    }

    /// Liquidate a loan on this obligation
    ///
    /// Returns the number of collateral notes that the liquidator should
    /// receive in return for paying off the loan.
    pub fn liquidate(
        &mut self,
        market: &MarketReserves,
        current_slot: u64,
        collateral_account: &Pubkey,
        loan_account: &Pubkey,
        repay_notes_amount: Number,
    ) -> Result<Number, ErrorCode> {
        let loan_total = self.loan_value(market, current_slot);
        let loan = self.loans().position(loan_account)?;
        let loan_reserve = market.get_cached(loan.reserve_index, current_slot);

        let collateral_total = self.collateral_value(market, current_slot);
        let collateral = self.collateral_mut().position(collateral_account)?;
        let collateral_reserve = market.get_cached(collateral.reserve_index, current_slot);

        // calculate the value of the debt being repaid
        let repaid_value =
            repay_notes_amount * loan_reserve.loan_note_exchange_rate * loan_reserve.price;
        let repaid_ratio = repaid_value / loan_total;

        // Adjust the repaid value based on the configured bonus for liquidators
        let min_c_ratio = loan_reserve.min_collateral_ratio;
        let liquidation_bonus = Number::from_bps(collateral_reserve.liquidation_bonus);

        // Limit collateral withdrawl based on the sellable value which, if sold,
        // would bring the obligation back to a healthy position.
        let loan_to_value = loan_total / collateral_total;
        let c_ratio_ltv = min_c_ratio * loan_to_value;

        let collateral_max_value = if c_ratio_ltv < Number::ONE {
            // This means the loan is over-collateralized, so we shouldn't allow
            // any liquidation for it.
            msg!("c_ratio_ltv < 1 implies this cannot be liquidated");
            return Err(ErrorCode::ObligationHealthy);
        } else {
            collateral_total * repaid_ratio
        };

        let limit_fraction = (c_ratio_ltv - Number::ONE)
            / (min_c_ratio / (Number::ONE + liquidation_bonus) - Number::ONE);

        let collateral_sellable_value = std::cmp::min(
            (Number::ONE + liquidation_bonus) * repaid_value,
            limit_fraction * collateral_total,
        );

        // Set a minimum sellable amount, so that positions worth less than the minimum
        // can always be fully liquidated.
        let collateral_sellable_value = std::cmp::max(
            collateral_sellable_value,
            Number::from(MIN_PARTIAL_LIQUIDATION_VALUE),
        );

        // Limit collateral to allow for withdrawl by a liquidator, based on the
        // collateral amount to the ratio of the overall debt being repaid.
        let collateral_max_value = std::cmp::min(collateral_max_value, collateral_sellable_value);

        let collateral_max_notes = collateral_max_value
            / collateral_reserve.price
            / collateral_reserve.deposit_note_exchange_rate;

        let collateral_max_notes = std::cmp::min(collateral_max_notes, collateral.amount);

        let collateral = self.collateral_mut().position_mut(collateral_account)?;
        collateral.amount = collateral.amount.saturating_sub(collateral_max_notes);

        Ok(collateral_max_notes)
    }

    /// Determine if this obligation has a custody over some account,
    /// by checking if its in the list of registered accounts.
    pub fn has_collateral_custody(&self, account: &Pubkey) -> bool {
        self.collateral()
            .positions
            .iter()
            .any(|p| p.account.as_ref() == account)
    }

    /// Determine if this obligation has a custody over some account,
    /// by checking if its in the list of registered accounts.
    pub fn has_loan_custody(&self, account: &Pubkey) -> bool {
        self.loans()
            .positions
            .iter()
            .any(|p| p.account.as_ref() == account)
    }

    /// Determine if the reserve matches the collateral
    pub fn is_collateral_reserve(
        &self,
        market: &Market,
        collateral: &Pubkey,
        reserve: &Pubkey,
    ) -> bool {
        self.collateral().positions.iter().any(|p| {
            p.account.as_ref() == collateral
                && market
                    .reserves()
                    .iter()
                    .enumerate()
                    .any(|(index, r)| *r.reserve == *reserve && (index as u16) == p.reserve_index)
        })
    }

    pub fn collateral_value(&self, market: &MarketReserves, current_slot: u64) -> Number {
        if let Ok(values) = self.cached().try_get(current_slot) {
            return values.collateral_value;
        }

        self.collateral()._market_value(market, current_slot)
    }

    pub fn loan_value(&self, market: &MarketReserves, current_slot: u64) -> Number {
        if let Ok(values) = self.cached().try_get(current_slot) {
            return values.loan_value;
        }

        self.loans()._market_value(market, current_slot)
    }

    pub fn position_count(&self) -> usize {
        let collaterals = self
            .collateral()
            .positions
            .iter()
            .take_while(|p| p.account != Pubkey::default())
            .count();
        let loans = self
            .loans()
            .positions
            .iter()
            .take_while(|p| p.account != Pubkey::default())
            .count();

        loans + collaterals
    }

    fn cached(&self) -> &CalculationCache {
        bytemuck::from_bytes(&self.cached)
    }

    fn cached_mut(&mut self) -> &mut CalculationCache {
        bytemuck::from_bytes_mut(&mut self.cached)
    }

    pub fn collateral(&self) -> &ObligationSide {
        bytemuck::from_bytes(&self.collateral)
    }

    pub fn loans(&self) -> &ObligationSide {
        bytemuck::from_bytes(&self.loans)
    }

    fn collateral_mut(&mut self) -> &mut ObligationSide {
        bytemuck::from_bytes_mut(&mut self.collateral)
    }

    fn loans_mut(&mut self) -> &mut ObligationSide {
        bytemuck::from_bytes_mut(&mut self.loans)
    }
}

#[assert_size(240)]
#[derive(Pod, Zeroable, Clone, Copy)]
#[repr(C)]
struct CalculationCacheInner {
    collateral_value: Number,
    loan_value: Number,

    _reserved: FixedBuf<192>,
}

type CalculationCache = Cache<CalculationCacheInner, 0>;

#[assert_size(4)]
#[derive(Contiguous, Debug, Clone, Copy, Eq, PartialEq)]
#[repr(u32)]
enum Side {
    Collateral,
    Loan,
}

/// Tracks information about the collateral deposited towards an obligation
#[assert_size(aligns, 2048)]
#[derive(Pod, Zeroable, Clone, Copy)]
#[repr(C)]
pub struct ObligationSide {
    positions: [Position; 16],
}

impl ObligationSide {
    /// Register a position for this obligation (account which holds loan or collateral notes)
    fn register(&mut self, new: Position) -> Result<(), ErrorCode> {
        for position in self.positions.iter_mut() {
            if position.account == new.account.key() {
                panic!(
                    "Cannot register account {:?} as {:?} for reserve index {:?} since it is \
                        already registered with {:?} for this obligation",
                    new.account, new.side, position.reserve_index, position
                );
            }

            if position.reserve_index == new.reserve_index && position.account != Pubkey::default()
            {
                panic!(
                    "Cannot register account {:?} as {:?} for reserve index {:?} since the \
                        reserve index is already registered with {:?} for this obligation",
                    new.account, new.side, position.reserve_index, position
                );
            }

            if position.account != Pubkey::default() {
                continue;
            }

            *position = new;

            return Ok(());
        }

        Err(ErrorCode::NoFreeObligation)
    }

    /// Unregister a position for this obligation (account which holds loan or collateral notes)
    fn unregister(&mut self, existing_account: Pubkey) -> Result<(), ErrorCode> {
        for position in self.positions.iter_mut() {
            if position.account != existing_account {
                continue;
            }

            *position.account = Pubkey::default();

            return Ok(());
        }

        Err(ErrorCode::ObligationPositionNotFound)
    }

    /// Record the loan borrowed from an obligation (borrow notes deposited)
    fn add(&mut self, account: &Pubkey, notes_amount: Number) -> ProgramResult {
        let position = self.position_mut(account)?;
        position.amount += notes_amount;
        Ok(())
    }

    /// Record the loan repaid from an obligation (borrow notes burned)
    fn subtract(&mut self, account: &Pubkey, notes_amount: Number) -> ProgramResult {
        let position = self.position_mut(account)?;
        position.amount = position.amount.saturating_sub(notes_amount);
        Ok(())
    }

    pub fn position(&self, account: &Pubkey) -> Result<&Position, ErrorCode> {
        let position = self
            .positions
            .iter()
            .find(|p| p.account == *account)
            .ok_or(ErrorCode::UnregisteredPosition)?;
        Ok(position)
    }

    fn position_mut(&mut self, account: &Pubkey) -> Result<&mut Position, ErrorCode> {
        let position = self
            .positions
            .iter_mut()
            .find(|p| p.account == *account)
            .ok_or(ErrorCode::UnregisteredPosition)?;
        Ok(position)
    }

    pub fn market_value(&self, market_info: &MarketReserves, current_slot: u64) -> PositionValue {
        let mut value = PositionValue::zeroed();
        for position in self.positions.iter() {
            if position.account == Pubkey::default() {
                continue;
            }

            let reserve = market_info.get(position.reserve_index).unwrap(current_slot);
            let position_value = position.market_value(reserve);
            value.market_value += position_value.market_value;
            value.complementary_limit += position_value.complementary_limit;
        }
        value
    }

    fn _market_value(&self, market: &MarketReserves, current_slot: u64) -> Number {
        let mut value = Number::ZERO;

        for pos in &self.positions {
            if pos.account == Pubkey::default() {
                continue;
            }

            let reserve = market.get_cached(pos.reserve_index, current_slot);
            value += pos._market_value(reserve);
        }

        value
    }

    pub fn iter(&self) -> impl Iterator<Item = &Position> {
        self.positions
            .iter()
            .take_while(|p| p.account != Pubkey::default())
    }
}

/// Information about a single collateral or loan account registered with an obligation
#[assert_size(aligns, 128)]
#[derive(Pod, Zeroable, Debug, Clone, Copy)]
#[repr(C)]
pub struct Position {
    /// The token account holding the bank notes
    pub account: StoredPubkey,

    /// Non-authoritative number of bank notes placed in the account
    pub amount: Number,

    pub side: u32,

    /// The index of the reserve that this position's assets are from
    pub reserve_index: ReserveIndex,

    _reserved: FixedBuf<66>,
}

/// The value of a collateral or loan position within an obligation
#[derive(Pod, Zeroable, Clone, Copy)]
#[repr(C)]
pub struct PositionValue {
    /// The market value in USD of the assets that were either deposited or borrowed.
    pub market_value: Number,

    /// For loans, this is the minimum collateral requirement in USD.
    /// For collateral, this is the maximum in USD that can be borrowed against it.
    pub complementary_limit: Number,
}

impl Position {
    fn new(side: Side, account: Pubkey, reserve_index: ReserveIndex) -> Position {
        Position {
            account: account.into(),
            side: side.into_integer(),
            amount: Number::ZERO,
            reserve_index,
            _reserved: FixedBuf::zeroed(),
        }
    }

    pub fn market_value(&self, reserve: &CachedReserveInfo) -> PositionValue {
        let market_value = self._market_value(reserve);
        PositionValue {
            market_value,
            complementary_limit: self.complementary_limit(reserve, market_value),
        }
    }

    fn _market_value(&self, reserve: &CachedReserveInfo) -> Number {
        self.amount * self.note_exchange_rate(reserve) * reserve.price
    }

    fn complementary_limit(&self, reserve: &CachedReserveInfo, market_value: Number) -> Number {
        match Side::from_integer(self.side).expect("invalid side value") {
            Side::Collateral => market_value / reserve.min_collateral_ratio,
            Side::Loan => market_value * reserve.min_collateral_ratio,
        }
    }

    fn note_exchange_rate(&self, reserve: &CachedReserveInfo) -> Number {
        match Side::from_integer(self.side).expect("invalid side value") {
            Side::Collateral => reserve.deposit_note_exchange_rate,
            Side::Loan => reserve.loan_note_exchange_rate,
        }
    }
}

impl Debug for Obligation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let collateral = self.collateral().iter().collect::<Vec<_>>();
        let loans = self.loans().iter().collect::<Vec<_>>();
        f.debug_struct("Obligation")
            .field("version", &{ self.version })
            .field("market", &self.market)
            .field("owner", &self.owner)
            .field("collateral", &collateral)
            .field("loans", &loans)
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use crate::state::ReserveInfo;

    use super::*;

    struct ObligationTestContext {
        market: MarketReserves,
        obligation: Obligation,
    }

    impl ObligationTestContext {
        fn new() -> Self {
            Self {
                market: MarketReserves::zeroed(),
                obligation: Obligation::zeroed(),
            }
        }

        fn create_collateral(&mut self, reserve_init: impl Fn(&mut ReserveInfo)) -> Pubkey {
            let reserve_key = Pubkey::new_unique();
            let collateral_key = Pubkey::new_unique();

            let reserve_index = self.market.register(&reserve_key).unwrap();
            let reserve_info = self.market.get_mut(reserve_index);

            reserve_init(reserve_info);

            self.obligation
                .register_collateral(&collateral_key, reserve_index)
                .unwrap();

            collateral_key
        }

        fn create_loan(&mut self, reserve_init: impl Fn(&mut ReserveInfo)) -> Pubkey {
            let reserve_key = Pubkey::new_unique();
            let loan_key = Pubkey::new_unique();

            let reserve_index = self.market.register(&reserve_key).unwrap();
            let reserve_info = self.market.get_mut(reserve_index);

            reserve_init(reserve_info);

            self.obligation
                .register_loan(&loan_key, reserve_index)
                .unwrap();

            loan_key
        }
    }

    #[test]
    fn sane_is_obligation_healthy() {
        let mut ctx = ObligationTestContext::new();

        let collateral = ctx.create_collateral(|reserve| {
            let cache = reserve.cache.get_stale_mut();

            cache.price = Number::from(1);
            cache.deposit_note_exchange_rate = Number::from(1_000);
            cache.min_collateral_ratio = Number::from_bps(12500);
        });
        let loan = ctx.create_loan(|reserve| {
            let cache = reserve.cache.get_stale_mut();

            cache.price = Number::from(2);
            cache.loan_note_exchange_rate = Number::from(1_000);
            cache.min_collateral_ratio = Number::from_bps(12500);
        });

        ctx.obligation
            .deposit_collateral(&collateral, Number::from(1_000_000))
            .unwrap();
        ctx.obligation.borrow(&loan, Number::from(500_000)).unwrap();

        // c-ratio = 100%
        ctx.obligation.cache_calculations(&ctx.market, 0);
        let healthy = ctx.obligation.is_healthy(&ctx.market, 0);
        assert!(!healthy);

        // c-ratio = 250%
        ctx.obligation.repay(&loan, Number::from(300_000)).unwrap();

        ctx.obligation.cache_calculations(&ctx.market, 0);
        let healthy = ctx.obligation.is_healthy(&ctx.market, 0);
        assert!(healthy);
    }

    #[test]
    fn sane_liquidate_collateral() {
        let mut ctx = ObligationTestContext::new();

        let collateral = ctx.create_collateral(|reserve| {
            let cache = reserve.get_stale_mut();

            cache.liquidation_bonus = 1000;
            cache.price = Number::from(1);
            cache.deposit_note_exchange_rate = Number::from(1);
            cache.min_collateral_ratio = Number::from_bps(12500);
        });
        let loan = ctx.create_loan(|reserve| {
            let cache = reserve.get_stale_mut();

            cache.price = Number::from(2);
            cache.loan_note_exchange_rate = Number::from(1);
            cache.min_collateral_ratio = Number::from_bps(12500);
        });

        ctx.obligation
            .deposit_collateral(&collateral, Number::from(1_150_000))
            .unwrap();
        ctx.obligation.borrow(&loan, Number::from(500_000)).unwrap();

        let collateral_returned = ctx
            .obligation
            .liquidate(&ctx.market, 0, &collateral, &loan, Number::from(347_826))
            .unwrap();

        ctx.obligation.repay(&loan, Number::from(347_826)).unwrap();

        assert_eq!(733_333, collateral_returned.as_u64_rounded(0));
        assert_eq!(
            152_174,
            ctx.obligation
                .loans()
                .position(&loan)
                .unwrap()
                .amount
                .as_u64_rounded(0)
        );
        assert_eq!(
            416_667,
            ctx.obligation
                .collateral()
                .position(&collateral)
                .unwrap()
                .amount
                .as_u64_rounded(0)
        );
    }

    #[test]
    fn ltv_90_liquidate_collateral_all() {
        let mut ctx = ObligationTestContext::new();

        let collateral = ctx.create_collateral(|reserve| {
            let cache = reserve.get_stale_mut();

            cache.liquidation_bonus = 1000;
            cache.price = Number::from(1);
            cache.deposit_note_exchange_rate = Number::from(1);
            cache.min_collateral_ratio = Number::from_bps(12500);
        });
        let loan = ctx.create_loan(|reserve| {
            let cache = reserve.get_stale_mut();

            cache.price = Number::from(2);
            cache.loan_note_exchange_rate = Number::from(1);
            cache.min_collateral_ratio = Number::from_bps(12500);
        });

        ctx.obligation
            .deposit_collateral(&collateral, Number::from(1_111_111))
            .unwrap();
        ctx.obligation.borrow(&loan, Number::from(500_000)).unwrap();

        let collateral_returned = ctx
            .obligation
            .liquidate(&ctx.market, 0, &collateral, &loan, Number::from(500_000))
            .unwrap();

        assert_eq!(1_018_519, collateral_returned.as_u64_rounded(0));
    }

    #[test]
    fn ltv_98_liquidate_collateral_marginal() {
        let mut ctx = ObligationTestContext::new();

        let collateral = ctx.create_collateral(|reserve| {
            let cache = reserve.get_stale_mut();

            cache.liquidation_bonus = 100;
            cache.price = Number::from(1);
            cache.deposit_note_exchange_rate = Number::from(1);
            cache.min_collateral_ratio = Number::from_bps(12500);
        });
        let loan = ctx.create_loan(|reserve| {
            let cache = reserve.get_stale_mut();

            cache.price = Number::from(2);
            cache.loan_note_exchange_rate = Number::from(1);
            cache.min_collateral_ratio = Number::from_bps(12500);
        });

        ctx.obligation
            .deposit_collateral(&collateral, Number::from(1_020_408))
            .unwrap();
        ctx.obligation.borrow(&loan, Number::from(500_000)).unwrap();

        let collateral_returned = ctx
            .obligation
            .liquidate(&ctx.market, 0, &collateral, &loan, Number::from(473_684))
            .unwrap();

        assert_eq!(956_842, collateral_returned.as_u64_rounded(0));
    }

    #[test]
    fn ltv_98_liquidate_collateral_limited_bonus() {
        let mut ctx = ObligationTestContext::new();

        let collateral = ctx.create_collateral(|reserve| {
            let cache = reserve.get_stale_mut();

            cache.liquidation_bonus = 1000;
            cache.price = Number::from(1);
            cache.deposit_note_exchange_rate = Number::from(1);
            cache.min_collateral_ratio = Number::from_bps(12500);
        });
        let loan = ctx.create_loan(|reserve| {
            let cache = reserve.get_stale_mut();

            cache.price = Number::from(2);
            cache.loan_note_exchange_rate = Number::from(1);
            cache.min_collateral_ratio = Number::from_bps(12500);
        });

        ctx.obligation
            .deposit_collateral(&collateral, Number::from(1_020_408))
            .unwrap();
        ctx.obligation.borrow(&loan, Number::from(500_000)).unwrap();

        let collateral_returned = ctx
            .obligation
            .liquidate(&ctx.market, 0, &collateral, &loan, Number::from(473_684))
            .unwrap();

        assert_eq!(966_702, collateral_returned.as_u64_rounded(0));
    }

    #[test]
    fn ltv_826_liquidate_collateral() {
        let mut ctx = ObligationTestContext::new();

        let collateral = ctx.create_collateral(|reserve| {
            let cache = reserve.get_stale_mut();

            cache.liquidation_bonus = 300;
            cache.price = Number::from_decimal(162_080, -3);
            cache.deposit_note_exchange_rate = Number::from_decimal(1_004_271, -6);
            cache.min_collateral_ratio = Number::from_bps(12500);
        });
        let loan = ctx.create_loan(|reserve| {
            let cache = reserve.get_stale_mut();

            cache.price = Number::from(1);
            cache.loan_note_exchange_rate = Number::from_decimal(819_667, -6);
            cache.min_collateral_ratio = Number::from_bps(12500);
        });

        ctx.obligation
            .deposit_collateral(&collateral, Number::from(49_924))
            .unwrap();
        ctx.obligation
            .borrow(&loan, Number::from(8_159_114))
            .unwrap();

        let collateral_returned = ctx
            .obligation
            .liquidate(&ctx.market, 0, &collateral, &loan, Number::from(97_303))
            .unwrap();

        assert_eq!(505, collateral_returned.as_u64_rounded(0));
    }

    #[test]
    fn no_partial_liquidate_at_min() {
        let mut ctx = ObligationTestContext::new();

        let collateral = ctx.create_collateral(|reserve| {
            let cache = reserve.get_stale_mut();

            cache.liquidation_bonus = 1000;
            cache.price = Number::from(1);
            cache.deposit_note_exchange_rate = Number::from(1);
            cache.min_collateral_ratio = Number::from_bps(12500);
        });
        let loan = ctx.create_loan(|reserve| {
            let cache = reserve.get_stale_mut();

            cache.price = Number::from(2);
            cache.loan_note_exchange_rate = Number::from(1);
            cache.min_collateral_ratio = Number::from_bps(12500);
        });

        ctx.obligation
            .deposit_collateral(&collateral, Number::from(9))
            .unwrap();
        ctx.obligation.borrow(&loan, Number::from(4)).unwrap();

        let collateral_returned = ctx
            .obligation
            .liquidate(&ctx.market, 0, &collateral, &loan, Number::from(4))
            .unwrap();

        assert_eq!(9, collateral_returned.as_u64_rounded(0));
    }

    #[test]
    fn underwater_liquidate_collateral() {
        let mut ctx = ObligationTestContext::new();

        let collateral = ctx.create_collateral(|reserve| {
            let cache = reserve.get_stale_mut();

            cache.price = Number::from(900);
            cache.deposit_note_exchange_rate = Number::from(1);
            cache.min_collateral_ratio = Number::from_bps(12500);
        });
        let loan = ctx.create_loan(|reserve| {
            let cache = reserve.get_stale_mut();

            cache.liquidation_bonus = 500;
            cache.price = Number::from(2000);
            cache.loan_note_exchange_rate = Number::from(1);
            cache.min_collateral_ratio = Number::from_bps(12500);
        });

        ctx.obligation
            .deposit_collateral(&collateral, Number::from(1_000_000))
            .unwrap();
        ctx.obligation.borrow(&loan, Number::from(500_000)).unwrap();

        let collateral_returned = ctx
            .obligation
            .liquidate(&ctx.market, 0, &collateral, &loan, Number::from(476_200))
            .unwrap();

        // since repaid value = 952.4
        // since liquidation bonus = 5%
        // then repaid bonus value = (952.4 * 1.05) = 1000.02
        // since collateral value = 900.0
        // then collateral returned should be 1000.0 * 952.4 / 900.0 = 1058.222
        //
        // this should not be true, since the debt is valued higher
        // than the total collateral, a liquidator shouldn't be able
        // to withdraw all of the collateral without paying down
        // the entire debt.
        assert_ne!(collateral_returned.as_u64_rounded(0), 1_000_000);

        // since repaid ratio = 952.400 / 1000.0 = 0.95240
        // then max collateral returned = 1000.0 * 0.95240 = 952.400
        assert_eq!(collateral_returned.as_u64_rounded(0), 952_400);
    }
}
