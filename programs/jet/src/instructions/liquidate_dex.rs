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
    /// Buy as much of the base currency as possible with the given amount
    /// of quote tokens.
    fn _buy(&self, quote_amount: u64) -> ProgramResult {
        let limit_price = u64::MAX;
        let max_coin_qty = u64::MAX;
        let max_pc_qty = quote_amount;

        self.create_order(Side::Bid, limit_price, max_coin_qty, max_pc_qty)
    }

    /// Sell as much of the given base currency as possible.
    fn sell(&self, base_amount: u64) -> ProgramResult {
        let limit_price = 1;
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
            side.into(),
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

    fn transfer_swapped_token_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
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

struct SwapPlan {
    /// The total value of collateral that can be sold to bring the
    /// loan back into a healthy position.
    sellable_value: Number,

    /// The total value that would be repaid to cover the loan position,
    /// which may be less than the total collateral sold due to fees.
    loan_repay_value: Number,
}

/// Calculate the estimates for swap values
fn calculate_collateral_swap_plan(internal: &LiquidateDex) -> Result<SwapPlan, ProgramError> {
    let loan_reserve = internal.loan_reserve.load()?;
    let collateral_reserve = internal.collateral_reserve.load()?;
    let obligation = internal.obligation.load()?;
    let market = internal.market.load()?;
    let clock = Clock::get()?;

    let min_c_ratio = Number::from_bps(loan_reserve.config.min_collateral_ratio);
    let liquidation_fee = Number::from_bps(collateral_reserve.config.liquidation_premium);
    let slippage = Number::from_bps(collateral_reserve.config.liquidation_slippage);

    let collateral_value = obligation.collateral_value(market.reserves(), clock.slot);
    let loan_value = obligation.loan_value(market.reserves(), clock.slot);

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

    let fee_plus_slippage = liquidation_fee + slippage;

    // This bound ensures that the plan will actually improve the c-ratio.
    assert!(fee_plus_slippage < (min_c_ratio - Number::ONE));

    let loan_repay_value = (min_c_ratio * loan_value - collateral_value)
        / (min_c_ratio - fee_plus_slippage - Number::ONE);
    let sellable_value = loan_repay_value * (Number::ONE + fee_plus_slippage);

    Ok(SwapPlan {
        sellable_value,
        loan_repay_value,
    })
}

/// Sell the collateral by trading on the DEX
fn sell_collateral<'info>(
    internal: &LiquidateDex<'info>,
    dex_market: &DexMarketAccounts<'info>,
    collateral_value: Number,
) -> Result<Number, ProgramError> {
    let clock = Clock::get()?;
    let market = internal.market.load()?;
    let reserve = internal.collateral_reserve.load()?;
    let reserve_info = market.reserves().get_cached(reserve.index, clock.slot);

    let dex_client = DexClient {
        market: &market,
        market_authority: &internal.market_authority,
        dex_program: &internal.dex_program,
        dex_market,
        order_payer_token_account: &internal.collateral_reserve_vault,
        token_program: &internal.token_program,
        rent: &internal.rent,

        coin_wallet: &internal.collateral_reserve_vault,
        pc_wallet: &internal.dex_swap_tokens,
    };

    let max_collateral_tokens = collateral_value / reserve_info.price;
    let cur_collateral_tokens = reserve
        .amount(token::accessor::amount(&internal.collateral_account)?)
        * reserve_info.deposit_note_exchange_rate;

    // Limit the amount of tokens sold to the lesser of either:
    //  * the total value of the collateral allowed to be sold to cover this debt position
    //  * the total collateral tokens available to the position being liquidated
    //  * the hard limit of token amounts to execute in a single trade, as configured in the reserve
    let reserve_sell_limit = match reserve.config.liquidation_dex_trade_max {
        0 => reserve.amount(std::u64::MAX),
        n => reserve.amount(n),
    };
    let tokens_to_sell = std::cmp::min(max_collateral_tokens, cur_collateral_tokens);
    let tokens_to_sell = std::cmp::min(tokens_to_sell, reserve_sell_limit);

    dex_client.sell(tokens_to_sell.as_u64(reserve.exponent))?;
    dex_client.settle()?;

    Ok(tokens_to_sell)
}

/// Buy back the loaned asset by trading on the DEX
fn buy_debt<'info>(
    internal: &LiquidateDex<'info>,
    _dex_market: &DexMarketAccounts<'info>,
) -> Result<(), ProgramError> {
    let market = internal.market.load()?;
    let reserve = internal.loan_reserve.load()?;

    let quote_tokens = token::accessor::amount(&internal.dex_swap_tokens)?;

    if reserve.token_mint == market.quote_token_mint {
        // The reserve's assets is the same as the quote token,
        // so we can just transfer the tokens from the intermediate
        // account into the reserve.
        token::transfer(
            internal
                .transfer_swapped_token_context()
                .with_signer(&[&market.authority_seeds()]),
            quote_tokens,
        )?;
    } else {
        // FIXME: eventually support another swap once tx size permits
        return Err(ErrorCode::NotSupported.into());
    }

    Ok(())
}

/// Verify that the amount of tokens we received for selling some collateral is acceptable
fn verify_proceeds(
    internal: &LiquidateDex,
    proceeds: u64,
    collateral_tokens_sold: Number,
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

    let slippage = Number::from_bps(collateral_reserve.config.liquidation_slippage);
    let min_value = collateral_value * (Number::ONE - slippage);

    if proceeds_value < min_value {
        // The difference in value is beyond the range of the configured slippage,
        // so reject this result.
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

    let collateral_sell_expected = plan.sellable_value / collateral_info.price;
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

    msg!("calculated plan to swap");

    // Sell the collateral
    let collateral_tokens_sold = sell_collateral(internal, source_market, plan.sellable_value)?;

    msg!("collateral sold");

    // Buy the loaned token
    buy_debt(internal, target_market)?;

    msg!("debt bought");

    let loan_reserve_proceeds =
        token::accessor::amount(&internal.loan_reserve_vault)?.saturating_sub(loan_reserve_tokens);

    // Ensure we got an ok deal with the collateral swap
    verify_proceeds(internal, loan_reserve_proceeds, collateral_tokens_sold)?;

    msg!("swap is ok");

    // Save all the changes
    update_accounting(
        internal,
        &plan,
        loan_reserve_proceeds,
        collateral_tokens_sold,
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
    let mut liquidation = LiquidateDex::try_accounts(program_id, &mut account_list, data)?;

    // pass accounts to real handler
    handler(&source_market, &target_market, &mut liquidation)?;
    Ok(())
}

#[derive(Accounts)]
pub struct MockLiquidateDex<'info> {
    source_market: DexMarketAccounts<'info>,
    target_market: DexMarketAccounts<'info>,
    to_liquidate: LiquidateDex<'info>,
}
