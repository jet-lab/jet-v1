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

use std::num::NonZeroU64;

use anchor_lang::prelude::*;
use anchor_lang::Key;
use anchor_spl::dex;
use anchor_spl::dex::serum_dex::instruction::SelfTradeBehavior;
use anchor_spl::dex::serum_dex::matching::{OrderType, Side};
use anchor_spl::dex::serum_dex::state::MarketState as DexMarketState;
use anchor_spl::token::Transfer;
use anchor_spl::token::{self, Burn};
use jet_math::Number;

use crate::errors::ErrorCode;
use crate::state::*;

/// Accounts used to place orders on the DEX
#[derive(Accounts, Clone)]
pub struct DexMarketAccounts<'info> {
    #[account(mut)]
    market: AccountInfo<'info>,

    #[account(mut)]
    open_orders: AccountInfo<'info>,

    #[account(mut)]
    request_queue: AccountInfo<'info>,

    #[account(mut)]
    event_queue: AccountInfo<'info>,

    #[account(mut)]
    bids: AccountInfo<'info>,

    #[account(mut)]
    asks: AccountInfo<'info>,

    /// The vault for the "base" currency
    #[account(mut)]
    coin_vault: AccountInfo<'info>,

    /// The vault for the "quote" currency
    #[account(mut)]
    pc_vault: AccountInfo<'info>,

    /// DEX owner
    vault_signer: AccountInfo<'info>,
}

/// Client for interacting with the DEX program
struct DexClient<'a, 'info> {
    market: &'a Market,
    market_authority: &'a AccountInfo<'info>,
    dex_market: &'a DexMarketAccounts<'info>,
    dex_program: &'a AccountInfo<'info>,
    order_payer_token_account: &'a AccountInfo<'info>,
    coin_wallet: &'a AccountInfo<'info>,
    pc_wallet: &'a AccountInfo<'info>,
    token_program: &'a AccountInfo<'info>,
    rent: &'a AccountInfo<'info>,
}

impl<'a, 'info> DexClient<'a, 'info> {
    fn price_lots(
        &self,
        price: Number,
        quote_expo: i32,
        coin_expo: i32,
    ) -> Result<u64, ProgramError> {
        let quote_decimals = (quote_expo * -1) as u32;
        let coin_decimals = (coin_expo * -1) as u32;
        let dex_market = DexMarketState::load(&self.dex_market.market, &dex::ID)?;

        Ok(
            (price * Number::ten_pow(quote_decimals) * dex_market.coin_lot_size
                / (Number::ten_pow(coin_decimals) * dex_market.pc_lot_size))
                .as_u64_rounded(0),
        )
    }

    /// Buy as much of the base currency as possible with the given amount
    /// of quote tokens.
    fn buy(&self, limit_price: u64, quote_amount: u64) -> ProgramResult {
        let max_coin_qty = u64::MAX;
        let max_pc_qty = quote_amount;

        self.create_order(Side::Bid, limit_price, max_coin_qty, max_pc_qty)
    }

    /// Sell as much of the given base currency as possible.
    fn sell(&self, limit_price: u64, base_amount: u64) -> ProgramResult {
        let max_pc_qty = u64::MAX;
        let max_coin_qty = {
            let dex_market = DexMarketState::load(&self.dex_market.market, &dex::ID)?;
            base_amount.checked_div(dex_market.coin_lot_size).unwrap()
        };

        if max_coin_qty == 0 {
            return Err(ErrorCode::CollateralValueTooSmall.into());
        }

        self.create_order(Side::Ask, limit_price, max_coin_qty, max_pc_qty)
    }

    /// Create a new order to trade on the DEX
    fn create_order(
        &self,
        side: Side,
        limit_price: u64,
        max_coin_qty: u64,
        max_pc_qty: u64,
    ) -> ProgramResult {
        let dex_accs = dex::NewOrderV3 {
            market: self.dex_market.market.clone(),
            open_orders: self.dex_market.open_orders.clone(),
            request_queue: self.dex_market.request_queue.clone(),
            event_queue: self.dex_market.event_queue.clone(),
            market_bids: self.dex_market.bids.clone(),
            market_asks: self.dex_market.asks.clone(),
            order_payer_token_account: self.order_payer_token_account.clone(),
            open_orders_authority: self.market_authority.clone(),
            coin_vault: self.dex_market.coin_vault.clone(),
            pc_vault: self.dex_market.pc_vault.clone(),
            token_program: self.token_program.clone(),
            rent: self.rent.clone(),
        };

        let ctx = CpiContext::new(self.dex_program.clone(), dex_accs);

        dex::new_order_v3(
            ctx.with_signer(&[&self.market.authority_seeds()]),
            side,
            NonZeroU64::new(limit_price).unwrap(),
            NonZeroU64::new(max_coin_qty).unwrap(),
            NonZeroU64::new(max_pc_qty).unwrap(),
            SelfTradeBehavior::DecrementTake,
            OrderType::ImmediateOrCancel,
            0,
            65535,
        )
    }

    /// Settle funds from a trade
    fn settle(&self) -> ProgramResult {
        let settle_accs = dex::SettleFunds {
            market: self.dex_market.market.clone(),
            open_orders: self.dex_market.open_orders.clone(),
            open_orders_authority: self.market_authority.clone(),
            coin_vault: self.dex_market.coin_vault.clone(),
            pc_vault: self.dex_market.pc_vault.clone(),
            coin_wallet: self.coin_wallet.clone(),
            pc_wallet: self.pc_wallet.clone(),
            vault_signer: self.dex_market.vault_signer.clone(),
            token_program: self.token_program.clone(),
        };

        let ctx = CpiContext::new(self.dex_program.clone(), settle_accs);

        dex::settle_funds(ctx.with_signer(&[&self.market.authority_seeds()]))
    }
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone, Copy)]
pub enum DexSide {
    Bid,
    Ask,
}

#[derive(Accounts)]
pub struct LiquidateDex<'info> {
    /// The relevant market this liquidation is for
    #[account(has_one = market_authority)]
    pub market: Loader<'info, Market>,

    /// The market's authority account
    pub market_authority: AccountInfo<'info>,

    /// The obligation with debt to be repaid
    #[account(mut, has_one = market)]
    pub obligation: Loader<'info, Obligation>,

    /// The reserve that the debt is from
    #[account(mut,
              has_one = market,
              has_one = loan_note_mint,
              has_one = dex_swap_tokens,
              constraint = loan_reserve.load().unwrap().vault == loan_reserve_vault.key())]
    pub loan_reserve: Loader<'info, Reserve>,

    /// The reserve's vault where the debt repayment should go
    #[account(mut)]
    pub loan_reserve_vault: AccountInfo<'info>,

    /// The mint for the debt/loan notes
    #[account(mut)]
    pub loan_note_mint: AccountInfo<'info>,

    /// The account that holds the borrower's debt balance
    #[account(mut)]
    pub loan_account: AccountInfo<'info>,

    /// The reserve that the collateral is from
    #[account(has_one = market,
              has_one = deposit_note_mint,
              constraint = collateral_reserve.load().unwrap().vault == collateral_reserve_vault.key())]
    pub collateral_reserve: Loader<'info, Reserve>,

    /// The reserve's vault where the collateral will be withdrawn from
    #[account(mut)]
    pub collateral_reserve_vault: AccountInfo<'info>,

    /// The mint for the collateral's deposit notes
    #[account(mut)]
    pub deposit_note_mint: AccountInfo<'info>,

    /// The account that holds the borrower's collateral balance
    #[account(mut)]
    pub collateral_account: AccountInfo<'info>,

    /// The account for temporarily storing any quote tokens during
    /// the swap between collateral and loaned assets.
    #[account(mut)]
    pub dex_swap_tokens: AccountInfo<'info>,

    /// The DEX program
    #[account(address = dex::ID)]
    pub dex_program: AccountInfo<'info>,

    #[account(address = token::ID)]
    pub token_program: AccountInfo<'info>,
    pub rent: AccountInfo<'info>,
}

impl<'info> LiquidateDex<'info> {
    fn loan_note_burn_context(&self) -> CpiContext<'_, '_, '_, 'info, Burn<'info>> {
        CpiContext::new(
            self.token_program.clone(),
            Burn {
                to: self.loan_account.clone(),
                mint: self.loan_note_mint.clone(),
                authority: self.market_authority.clone(),
            },
        )
    }

    fn collateral_note_burn_context(&self) -> CpiContext<'_, '_, '_, 'info, Burn<'info>> {
        CpiContext::new(
            self.token_program.clone(),
            Burn {
                to: self.collateral_account.clone(),
                mint: self.deposit_note_mint.clone(),
                authority: self.market_authority.clone(),
            },
        )
    }

    fn _transfer_swapped_token_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.clone(),
            Transfer {
                from: self.dex_swap_tokens.clone(),
                to: self.loan_reserve_vault.clone(),
                authority: self.market_authority.clone(),
            },
        )
    }

    /// Check that the loan/collateral accounts are registered with the obligation
    fn verify_obligation_accounts(&self) -> Result<(), ProgramError> {
        let obligation = self.obligation.load()?;

        if !obligation.has_collateral_custody(self.collateral_account.key)
            || !obligation.has_loan_custody(self.loan_account.key)
        {
            msg!("note accounts don't match the obligation");
            return Err(ErrorCode::ObligationAccountMismatch.into());
        }

        Ok(())
    }

    /// Ensure an obligation has an unhealthy debt position to allow liquidation
    fn verify_unhealthy(&self) -> Result<(), ProgramError> {
        let mut obligation = self.obligation.load_mut()?;
        let market = self.market.load()?;
        let clock = Clock::get()?;

        obligation.cache_calculations(market.reserves(), clock.slot);

        if obligation.is_healthy(market.reserves(), clock.slot) {
            msg!("cannot liquidate a healthy position");
            return Err(ErrorCode::ObligationHealthy.into());
        }

        Ok(())
    }
}

#[derive(Debug)]
enum SwapKind {
    Buy,
    Sell,
}

#[derive(Debug)]
struct SwapPlan {
    /// The total value of collateral that can be sold to bring the
    /// loan back into a healthy position.
    collateral_sellable_value: Number,

    /// The total value that would be repaid to cover the loan position,
    /// which may be less than the total collateral sold due to fees.
    loan_repay_value: Number,

    /// The _actual_ amount of collateral tokens that can be used in
    /// the trade to buy back loaned tokens. This can be less than the
    /// total sellable amount when:
    ///
    ///     * the collateral account being liquidated is of a lesser value
    ///       compared to the overall collateral available within the account
    ///
    ///     * the loan account being liquidated is of a lesser value compared
    ///       to the overall loans on the account.
    collateral_tokens_tradable: Number,

    /// The worst price to accept for the trade
    limit_price: Number,

    /// The kind of trade that should be executed
    kind: SwapKind,

    /// The acceptable slippage for the trade
    slippage: Number,
}

struct SwapCalculator<'a, 'info> {
    market: &'a Market,
    loan_reserve: &'a Reserve,
    collateral_reserve: &'a Reserve,
    loan_account: &'a AccountInfo<'info>,
    collateral_account: &'a AccountInfo<'info>,
    obligation: &'a Obligation,
    collateral_reserve_info: &'a CachedReserveInfo,
    loan_reserve_info: &'a CachedReserveInfo,
}

impl<'a, 'info> SwapCalculator<'a, 'info> {
    fn new(
        market: &'a Market,
        loan_reserve: &'a Reserve,
        collateral_reserve: &'a Reserve,
        loan_account: &'a AccountInfo<'info>,
        collateral_account: &'a AccountInfo<'info>,
        obligation: &'a Obligation,
    ) -> SwapCalculator<'a, 'info> {
        let clock = Clock::get().unwrap();
        let collateral_reserve_info = market
            .reserves()
            .get_cached(collateral_reserve.index, clock.slot);
        let loan_reserve_info = market.reserves().get_cached(loan_reserve.index, clock.slot);

        SwapCalculator {
            market,
            loan_reserve,
            collateral_reserve,
            loan_account,
            collateral_account,
            obligation,
            collateral_reserve_info,
            loan_reserve_info,
        }
    }

    fn max_collateral_tradable(&self, sellable_value: Number) -> Result<Number, ProgramError> {
        let liquidation_fee = Number::from_bps(self.collateral_reserve.config.liquidation_premium);

        // calculate max number of tokens that can be sold from this account
        let max_collateral_tokens = sellable_value / self.collateral_reserve_info.price;

        // calculate current number of tokens that the account has
        let cur_collateral_tokens = self
            .collateral_reserve
            .amount(token::accessor::amount(&self.collateral_account)?)
            * self.collateral_reserve_info.deposit_note_exchange_rate;

        // calculate an approximate for the amount of collateral tokens needed to pay off
        // the current loan balance
        let loan_value = self
            .loan_reserve
            .amount(token::accessor::amount(&self.loan_account)?)
            * self.loan_reserve_info.loan_note_exchange_rate
            * self.loan_reserve_info.price;

        let max_sellable_tokens =
            loan_value * (Number::ONE + liquidation_fee) / self.collateral_reserve_info.price;

        // get the configurable limit thats sets an upper bound on tokens traded
        // in a single order
        let reserve_sell_limit = match self.collateral_reserve.config.liquidation_dex_trade_max {
            0 => self.collateral_reserve.amount(std::u64::MAX),
            n => Number::from(n),
        };

        // Limit the amount of tokens sold to the lesser of either:
        //  * the total value of the collateral allowed to be sold to cover this debt position
        //  * the total collateral tokens available to the position being liquidated
        //  * the total collateral necessary to repay the loan
        //  * the hard limit of token amounts to execute in a single trade, as configured in the reserve
        let tradable_tokens = [
            max_collateral_tokens,
            cur_collateral_tokens,
            max_sellable_tokens,
            reserve_sell_limit,
        ]
        .iter()
        .min()
        .cloned()
        .unwrap();

        Ok(tradable_tokens)
    }

    /// Calculate the plan for swapping the collateral for debt
    fn plan(&self) -> Result<SwapPlan, ProgramError> {
        let clock = Clock::get()?;
        let min_c_ratio = Number::from_bps(self.loan_reserve.config.min_collateral_ratio);
        let liquidation_fee = Number::from_bps(self.collateral_reserve.config.liquidation_premium);
        let slippage = liquidation_fee / (Number::ONE + liquidation_fee);

        let collateral_value = self
            .obligation
            .collateral_value(self.market.reserves(), clock.slot);
        let loan_value = self
            .obligation
            .loan_value(self.market.reserves(), clock.slot);

        let loan_to_value = loan_value / collateral_value;
        let c_ratio_ltv = min_c_ratio * loan_to_value;

        if c_ratio_ltv <= Number::ONE {
            // This means the loan is over-collateralized, so we shouldn't allow
            // any liquidation for it.
            msg!("c_ratio_ltv < 1 implies this cannot be liquidated");
            return Err(ErrorCode::ObligationHealthy.into());
        } else if c_ratio_ltv > min_c_ratio {
            // This means the loan is underwater, so for now we just disallow
            // liquidations on underwater loans using the DEX.
            return Err(ErrorCode::Disallowed.into());
        }

        let limit_fraction = (c_ratio_ltv - Number::ONE)
            / (min_c_ratio * (Number::ONE - liquidation_fee) - Number::ONE);

        let collateral_sellable_value = limit_fraction * collateral_value;
        let loan_repay_value = collateral_sellable_value / (Number::ONE + liquidation_fee);
        let normal_limit_price = (Number::ONE - slippage)
            * (self.collateral_reserve_info.price / self.loan_reserve_info.price);

        let (kind, limit_price) = if self.loan_reserve.token_mint == self.market.quote_token_mint {
            (SwapKind::Sell, normal_limit_price)
        } else if self.collateral_reserve.token_mint == self.market.quote_token_mint {
            (SwapKind::Buy, Number::ONE / normal_limit_price)
        } else {
            msg!("cannot liquidate these pairs");
            return Err(ErrorCode::Disallowed.into());
        };

        let collateral_tokens_tradable = self.max_collateral_tradable(collateral_sellable_value)?;

        Ok(SwapPlan {
            collateral_sellable_value,
            collateral_tokens_tradable,
            loan_repay_value,
            limit_price,
            kind,
            slippage,
        })
    }
}

/// Calculate the estimates for swap values
fn calculate_collateral_swap_plan(internal: &LiquidateDex) -> Result<SwapPlan, ProgramError> {
    let loan_reserve = internal.loan_reserve.load()?;
    let collateral_reserve = internal.collateral_reserve.load()?;
    let obligation = internal.obligation.load()?;
    let market = internal.market.load()?;

    let calculator = SwapCalculator::new(
        &market,
        &loan_reserve,
        &collateral_reserve,
        &internal.loan_account,
        &internal.collateral_account,
        &obligation,
    );

    calculator.plan()
}

/// Execute the calculated plan to swap the collateral.
///
/// Returns the number of collateral tokens swapped.
fn execute_plan<'info>(
    internal: &LiquidateDex<'info>,
    source_dex_market: &DexMarketAccounts<'info>,
    target_dex_market: &DexMarketAccounts<'info>,
    plan: &SwapPlan,
) -> Result<(), ProgramError> {
    let market = internal.market.load()?;
    let collateral_reserve = internal.collateral_reserve.load()?;
    let loan_reserve = internal.loan_reserve.load()?;

    let get_dex_client = |dex_market, coin_wallet, pc_wallet| DexClient {
        market: &market,
        market_authority: &internal.market_authority,
        dex_program: &internal.dex_program,
        dex_market,
        order_payer_token_account: &internal.collateral_reserve_vault,
        token_program: &internal.token_program,
        rent: &internal.rent,

        coin_wallet,
        pc_wallet,
    };

    match plan.kind {
        SwapKind::Sell => {
            // Sell the collateral on the DEX
            let dex_client = get_dex_client(
                source_dex_market,
                &internal.collateral_reserve_vault,
                &internal.loan_reserve_vault,
            );
            let limit_price = dex_client.price_lots(
                plan.limit_price,
                loan_reserve.exponent,
                collateral_reserve.exponent,
            )?;

            dex_client.sell(
                limit_price,
                plan.collateral_tokens_tradable
                    .as_u64_rounded(collateral_reserve.exponent),
            )?;
            dex_client.settle()?;
        }

        SwapKind::Buy => {
            // Use the collateral to buy the debt asset on the DEX
            let dex_client = get_dex_client(
                target_dex_market,
                &internal.loan_reserve_vault,
                &internal.collateral_reserve_vault,
            );
            let limit_price = dex_client.price_lots(
                plan.limit_price,
                collateral_reserve.exponent,
                loan_reserve.exponent,
            )?;

            dex_client.buy(
                limit_price,
                plan.collateral_tokens_tradable
                    .as_u64_rounded(collateral_reserve.exponent),
            )?;
            dex_client.settle()?;
        }
    }

    Ok(())
}

/// Verify that the amount of tokens we received for selling some collateral is acceptable
fn verify_proceeds(
    internal: &LiquidateDex,
    proceeds: u64,
    collateral_tokens_sold: Number,
    slippage: Number,
) -> Result<(), ProgramError> {
    let clock = Clock::get()?;
    let market = internal.market.load()?;
    let collateral_reserve = internal.collateral_reserve.load()?;
    let loan_reserve = internal.loan_reserve.load()?;
    let collateral_info = market
        .reserves()
        .get_cached(collateral_reserve.index, clock.slot);
    let loan_info = market.reserves().get_cached(loan_reserve.index, clock.slot);

    // This is the total value of what we received for selling the collateral
    let proceeds_value = loan_info.price * loan_reserve.amount(proceeds);
    let collateral_value = collateral_info.price * collateral_tokens_sold;

    let min_value = collateral_value * (Number::ONE - slippage);

    if proceeds_value < min_value {
        // The difference in value is beyond the range of the configured slippage,
        // so reject this result.
        msg!("proceeds = {}, minimum = {}", proceeds_value, min_value);
        return Err(ErrorCode::LiquidationSwapSlipped.into());
    }

    Ok(())
}

/// Update the internal accounting to reflect the changes in the debt an
/// collateral positions in the obligation and reserves.
fn update_accounting(
    internal: &LiquidateDex,
    plan: &SwapPlan,
    proceeds: u64,
    collateral_tokens_sold: Number,
) -> Result<(), ProgramError> {
    let clock = Clock::get()?;
    let market = internal.market.load()?;
    let collateral_reserve = internal.collateral_reserve.load()?;
    let mut loan_reserve = internal.loan_reserve.load_mut()?;
    let mut obligation = internal.obligation.load_mut()?;

    let loan_info = market.reserves().get_cached(loan_reserve.index, clock.slot);
    let collateral_info = market
        .reserves()
        .get_cached(collateral_reserve.index, clock.slot);

    let collateral_sell_expected = plan.collateral_sellable_value / collateral_info.price;
    let collateral_repaid_ratio_actual = collateral_tokens_sold / collateral_sell_expected;

    let loan_repaid_value = collateral_repaid_ratio_actual * plan.loan_repay_value;
    let loan_repaid_tokens = loan_repaid_value / loan_info.price;
    let loan_repaid_tokens_u64 = loan_repaid_tokens.as_u64(loan_reserve.exponent);
    let loan_repaid_notes = loan_repaid_tokens / loan_info.deposit_note_exchange_rate;
    let loan_repaid_notes_u64 = loan_repaid_notes.as_u64(loan_reserve.exponent);

    // Update the payment on the loan reserve
    loan_reserve.repay(clock.slot, loan_repaid_tokens_u64, loan_repaid_notes_u64);

    // Update the changes in the obligation positions
    let collateral_notes_sold = collateral_tokens_sold / collateral_info.deposit_note_exchange_rate;

    obligation.withdraw_collateral(internal.collateral_account.key, collateral_notes_sold)?;
    obligation.repay(internal.loan_account.key, loan_repaid_notes)?;

    // Burn the debt that's being repaid
    token::burn(
        internal
            .loan_note_burn_context()
            .with_signer(&[&market.authority_seeds()]),
        loan_repaid_notes.as_u64(loan_reserve.exponent),
    )?;

    // Burn the collateral notes that were sold off
    token::burn(
        internal
            .collateral_note_burn_context()
            .with_signer(&[&market.authority_seeds()]),
        collateral_notes_sold.as_u64(collateral_reserve.exponent),
    )?;

    // Now to handle fees, where we've added extra tokens to the reserve vault
    // that aren't applied to the debt. So we need to isolate these funds to be
    // collected later.
    let fee_proceeds = proceeds.saturating_sub(loan_repaid_tokens_u64);
    loan_reserve.add_uncollected_fees(clock.slot, fee_proceeds);

    Ok(())
}

#[inline(never)]
fn handler<'info>(
    source_market: &DexMarketAccounts<'info>,
    target_market: &DexMarketAccounts<'info>,
    internal: &LiquidateDex<'info>,
) -> ProgramResult {
    // Only allow liquidations for unhealthy loans
    internal.verify_unhealthy()?;

    // Ensure the loan/collateral have the right owner
    internal.verify_obligation_accounts()?;

    msg!("ready to liquidate");

    // record some values so we can calculate the change after swapping with the DEX,
    // since its hard to pre-calculate what the behavior is going to be.
    let loan_reserve_tokens = token::accessor::amount(&internal.loan_reserve_vault)?;

    // Calculate the quote value of collateral that needs to be sold
    let plan = calculate_collateral_swap_plan(internal)?;

    // Trade the the collateral
    execute_plan(internal, source_market, target_market, &plan)?;

    msg!("collateral sold");

    let loan_reserve_proceeds =
        token::accessor::amount(&internal.loan_reserve_vault)?.saturating_sub(loan_reserve_tokens);

    // Ensure we got an ok deal with the collateral swap
    verify_proceeds(
        internal,
        loan_reserve_proceeds,
        plan.collateral_tokens_tradable,
        plan.slippage,
    )?;

    msg!("swap is ok");

    // Save all the changes
    update_accounting(
        internal,
        &plan,
        loan_reserve_proceeds,
        plan.collateral_tokens_tradable,
    )?;

    msg!("liquidation complete!");

    Ok(())
}

/// Somewhat custom handler for the `liquidate_dex` instruction, where we do some setup
/// work manually that anchor normally would generate automatically. In this case the
/// generated code has some issues fitting within the stack frame limit, so to workaround
/// that we just implement it here explicitly for now to ensure it fits within the frame.
pub fn handler_raw<'info>(
    program_id: &Pubkey,
    accounts: &[AccountInfo<'info>],
    data: &[u8],
) -> ProgramResult {
    let mut account_list = accounts;

    msg!("attempting liquidation");

    // just use anchor to check everything as usual
    let source_market = DexMarketAccounts::try_accounts(program_id, &mut account_list, data)?;
    let target_market = DexMarketAccounts::try_accounts(program_id, &mut account_list, data)?;
    let liquidation = LiquidateDex::try_accounts(program_id, &mut account_list, data)?;

    // pass accounts to real handler
    handler(&source_market, &target_market, &liquidation)?;
    Ok(())
}

#[derive(Accounts)]
pub struct MockLiquidateDex<'info> {
    source_market: DexMarketAccounts<'info>,
    target_market: DexMarketAccounts<'info>,
    to_liquidate: LiquidateDex<'info>,
}
