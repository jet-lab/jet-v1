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
use anchor_spl::token::{self, MintTo, Transfer};

use crate::state::*;
use crate::{Amount, ErrorCode, Rounding};

#[event]
pub struct BorrowEvent {
    borrower: Pubkey,
    reserve: Pubkey,
    debt: u64,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Borrow<'info> {
    /// The relevant market this borrow is for
    #[account(has_one = market_authority)]
    pub market: Loader<'info, Market>,

    /// The market's authority account
    pub market_authority: AccountInfo<'info>,

    /// The obligation with collateral to borrow with
    #[account(mut)]
    pub obligation: Loader<'info, Obligation>,

    /// The reserve being borrowed from
    #[account(mut,
              has_one = market,
              has_one = vault,
              has_one = loan_note_mint)]
    pub reserve: Loader<'info, Reserve>,

    /// The reserve's vault where the borrowed tokens will be transferred from
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    /// The mint for the debt/loan notes
    #[account(mut)]
    pub loan_note_mint: AccountInfo<'info>,

    /// The user/authority that is borrowing
    #[account(signer)]
    pub borrower: AccountInfo<'info>,

    /// The account to track the borrower's balance to repay
    #[account(mut,
              seeds = [
                  b"loan".as_ref(),
                  reserve.key().as_ref(),
                  obligation.key().as_ref(),
                  borrower.key.as_ref()
              ],
              bump = bump)]
    pub loan_account: AccountInfo<'info>,

    /// The token account that the borrowed funds will be transferred to
    #[account(mut, constraint = receiver_account.key() != vault.key())]
    pub receiver_account: AccountInfo<'info>,

    #[account(address = token::ID)]
    pub token_program: AccountInfo<'info>,
}

impl<'info> Borrow<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.clone(),
            Transfer {
                from: self.vault.to_account_info(),
                to: self.receiver_account.to_account_info(),
                authority: self.market_authority.clone(),
            },
        )
    }

    fn note_mint_context(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        CpiContext::new(
            self.token_program.clone(),
            MintTo {
                to: self.loan_account.to_account_info(),
                mint: self.loan_note_mint.to_account_info(),
                authority: self.market_authority.clone(),
            },
        )
    }
}

/// Borrow tokens from a reserve
pub fn handler(ctx: Context<Borrow>, _bump: u8, amount: Amount) -> ProgramResult {
    let market = ctx.accounts.market.load()?;
    let mut reserve = ctx.accounts.reserve.load_mut()?;
    let loan_account = &ctx.accounts.loan_account.key();

    market.verify_ability_borrow()?;

    let market_reserves = market.reserves();
    let clock = Clock::get().unwrap();
    let reserve_info = market_reserves.get_cached(reserve.index, clock.slot);

    let requested_tokens = amount.as_tokens(reserve_info, Rounding::Down);
    let fees = reserve.borrow_fee(requested_tokens);
    let total_token_debt = requested_tokens
        .checked_add(fees)
        .expect("Requested a debt that would exceed the maximum potential supply for a token.");

    // Calculate the number of notes to create to match the value being
    // borrowed plus the fees, then mint the notes as a way of tracking
    // this borrower's debt.
    let new_notes = reserve_info.loan_notes_from_tokens(total_token_debt, Rounding::Up);

    // Record the borrow onto the reserve account, and also add any fees
    // to get the total amount borrowed.
    reserve.borrow(clock.slot, requested_tokens, new_notes, fees);

    token::mint_to(
        ctx.accounts
            .note_mint_context()
            .with_signer(&[&market.authority_seeds()]),
        new_notes,
    )?;

    // record the loan in the obligation which is used to determine the obligation's health
    let obligation = &mut ctx.accounts.obligation.load_mut()?;
    obligation.borrow(loan_account, reserve.amount(new_notes))?;

    obligation.cache_calculations(market.reserves(), clock.slot);

    // Validate that the obligation has sufficient collateral to borrow
    // the requested amount, by checking that its still healthy after
    // minting the new debt.
    if !obligation.is_healthy(market_reserves, clock.slot) {
        return Err(ErrorCode::InsufficientCollateral.into());
    }

    // Now that we have the debt recorded, transfer the borrowed funds
    // to the requested receiving account.
    token::transfer(
        ctx.accounts
            .transfer_context()
            .with_signer(&[&market.authority_seeds()]),
        requested_tokens,
    )?;

    emit!(BorrowEvent {
        borrower: ctx.accounts.borrower.key(),
        reserve: ctx.accounts.reserve.key(),
        debt: new_notes
    });

    Ok(())
}
