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
use anchor_lang::Key;
use anchor_spl::token::{self, Transfer};

use crate::errors::ErrorCode;
use crate::repay::{implement_repay_context, repay, RepayContext};
use crate::state::*;
use crate::{Amount, Rounding};

#[event]
pub struct LiquidateEvent {
    borrower: Pubkey,
    debt_reserve: Pubkey,
    collateral_reserve: Pubkey,
    paid_amount: Amount,
    collateral_amount: u64,
}

#[derive(Accounts)]
pub struct Liquidate<'info> {
    /// The relevant market this liquidation is for
    #[account(has_one = market_authority)]
    pub market: Loader<'info, Market>,

    /// The market's authority account
    pub market_authority: AccountInfo<'info>,

    /// The obligation with debt to be repaid
    #[account(mut,
              has_one = market,
              constraint = obligation.load().unwrap().has_collateral_custody(&collateral_account.key()),
              constraint = obligation.load().unwrap().has_loan_custody(&loan_account.key()),
              constraint = obligation.load().unwrap().is_collateral_reserve(&market.load().unwrap(), &collateral_account.key(), &collateral_reserve.key()))]
    pub obligation: Loader<'info, Obligation>,

    /// The reserve that the debt is from
    #[account(mut,
              has_one = market,
              has_one = vault,
              has_one = loan_note_mint)]
    pub reserve: Loader<'info, Reserve>,

    /// The reserve the collateral is from
    pub collateral_reserve: Loader<'info, Reserve>,

    /// The reserve's vault where the payment will be transferred to
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    /// The mint for the debt/loan notes
    #[account(mut)]
    pub loan_note_mint: AccountInfo<'info>,

    /// The account that holds the borrower's debt balance
    #[account(mut)]
    pub loan_account: AccountInfo<'info>,

    /// The account that holds the borrower's collateral
    #[account(mut)]
    pub collateral_account: AccountInfo<'info>,

    /// The token account that the payment funds will be transferred from
    #[account(mut)]
    pub payer_account: AccountInfo<'info>,

    /// The account that will receive a portion of the borrower's collateral
    #[account(mut)]
    pub receiver_account: AccountInfo<'info>,

    /// The account paying off the loan
    #[account(signer)]
    pub payer: AccountInfo<'info>,

    #[account(address = token::ID)]
    pub token_program: AccountInfo<'info>,
}

impl<'info> Liquidate<'info> {
    fn transfer_collateral_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.clone(),
            Transfer {
                from: self.collateral_account.to_account_info(),
                to: self.receiver_account.to_account_info(),
                authority: self.market_authority.clone(),
            },
        )
    }
}

implement_repay_context! {Liquidate<'info>}

/// Liquidate a part of an obligation's debt
/// amount: number of tokens being paid off from the debt
pub fn handler(ctx: Context<Liquidate>, amount: Amount, min_collateral: u64) -> ProgramResult {
    let collateral_amount = transfer_collateral(ctx.accounts, amount, min_collateral)?;

    repay(&ctx, amount)?;

    emit!(LiquidateEvent {
        borrower: ctx.accounts.obligation.key(),
        debt_reserve: ctx.accounts.reserve.key(),
        // FIXME: should be the collateral's reserve
        collateral_reserve: ctx.accounts.reserve.key(),
        paid_amount: amount,
        collateral_amount
    });
    Ok(())
}

fn transfer_collateral(
    accounts: &mut Liquidate,
    amount: Amount,
    min_collateral: u64,
) -> Result<u64, ProgramError> {
    let market = accounts.market.load()?;
    let reserve = accounts.reserve.load()?;
    let collateral_reserve = accounts.collateral_reserve.load()?;
    let mut obligation = accounts.obligation.load_mut()?;
    let clock = Clock::get().unwrap();

    let market_reserves = market.reserves();
    let reserve_info = market_reserves.get_cached(reserve.index, clock.slot);

    obligation.cache_calculations(market.reserves(), clock.slot);

    // First check that the obligation is unhealthy
    if obligation.is_healthy(market_reserves, clock.slot) {
        return Err(ErrorCode::ObligationHealthy.into());
    }

    // Calclulate number of tokens being repaid to figure out the value
    let repaid_notes_amount = reserve.amount(amount.as_loan_notes(reserve_info, Rounding::Down)?);

    // Calculate the appropriate amount of the collateral that the
    // liquidator should receive in return for this repayment
    let collateral_account = accounts.collateral_account.key();
    let loan_account = accounts.loan_account.key();
    let collateral_amount = obligation.liquidate(
        market_reserves,
        clock.slot,
        &collateral_account,
        &loan_account,
        repaid_notes_amount,
    )?;

    let collateral_amount = collateral_amount.as_u64_rounded(collateral_reserve.exponent);

    if collateral_amount < min_collateral {
        msg!("collateral below amount requested");
        return Err(ErrorCode::LiquidationLowCollateral.into());
    }

    // Transfer the collateral to the liquidator's account
    token::transfer(
        accounts
            .transfer_collateral_context()
            .with_signer(&[&market.authority_seeds()]),
        collateral_amount,
    )?;

    Ok(collateral_amount)
}
