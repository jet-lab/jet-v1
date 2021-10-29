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
use anchor_spl::token::{self, Burn, Transfer};

use crate::state::*;
use crate::{Amount, Rounding};

#[event]
pub struct RepayEvent {
    borrower: Pubkey,
    reserve: Pubkey,
    amount: Amount,
}

#[derive(Accounts)]
pub struct Repay<'info> {
    /// The relevant market this repayment is for
    #[account(has_one = market_authority)]
    pub market: Loader<'info, Market>,

    /// The market's authority account
    pub market_authority: AccountInfo<'info>,

    /// The obligation with debt to be repaid
    #[account(mut,
              has_one = market,
              constraint = obligation.load().unwrap().has_loan_custody(&loan_account.key()))]
    pub obligation: Loader<'info, Obligation>,

    /// The reserve that the debt is from
    #[account(mut,
              has_one = market,
              has_one = vault,
              has_one = loan_note_mint)]
    pub reserve: Loader<'info, Reserve>,

    /// The reserve's vault where the payment will be transferred to
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    /// The mint for the debt/loan notes
    #[account(mut)]
    pub loan_note_mint: AccountInfo<'info>,

    /// The account that holds the borrower's debt balance
    #[account(mut)]
    pub loan_account: AccountInfo<'info>,

    /// The token account that the payment funds will be transferred from
    #[account(mut)]
    pub payer_account: AccountInfo<'info>,

    /// The account repaying the loan
    #[account(signer)]
    pub payer: AccountInfo<'info>,

    #[account(address = token::ID)]
    pub token_program: AccountInfo<'info>,
}

pub trait RepayContext<'info> {
    fn market(&self) -> &Loader<'info, Market>;
    fn market_authority(&self) -> &AccountInfo<'info>;
    fn obligation(&self) -> &Loader<'info, Obligation>;
    fn reserve(&self) -> &Loader<'info, Reserve>;
    fn vault(&self) -> &AccountInfo<'info>;
    fn loan_note_mint(&self) -> &AccountInfo<'info>;
    fn payer(&self) -> &AccountInfo<'info>;
    fn loan_account(&self) -> &AccountInfo<'info>;
    fn payer_account(&self) -> &AccountInfo<'info>;
    fn token_program(&self) -> &AccountInfo<'info>;

    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program().clone(),
            Transfer {
                from: self.payer_account().to_account_info(),
                to: self.vault().to_account_info(),
                authority: self.payer().clone(),
            },
        )
    }

    fn note_burn_context(&self) -> CpiContext<'_, '_, '_, 'info, Burn<'info>> {
        CpiContext::new(
            self.token_program().clone(),
            Burn {
                to: self.loan_account().to_account_info(),
                mint: self.loan_note_mint().to_account_info(),
                authority: self.market_authority().clone(),
            },
        )
    }
}

macro_rules! implement_repay_context {
    ($struct:ty) => {
        impl<'info> RepayContext<'info> for $struct {
            fn market(&self) -> &Loader<'info, Market> {
                &self.market
            }
            fn market_authority(&self) -> &AccountInfo<'info> {
                &self.market_authority
            }
            fn obligation(&self) -> &Loader<'info, Obligation> {
                &self.obligation
            }
            fn reserve(&self) -> &Loader<'info, Reserve> {
                &self.reserve
            }
            fn vault(&self) -> &AccountInfo<'info> {
                &self.vault
            }
            fn loan_note_mint(&self) -> &AccountInfo<'info> {
                &self.loan_note_mint
            }
            fn payer(&self) -> &AccountInfo<'info> {
                &self.payer
            }
            fn loan_account(&self) -> &AccountInfo<'info> {
                &self.loan_account
            }
            fn payer_account(&self) -> &AccountInfo<'info> {
                &self.payer_account
            }
            fn token_program(&self) -> &AccountInfo<'info> {
                &self.token_program
            }
        }
    };
}
pub(crate) use implement_repay_context;

implement_repay_context! {Repay<'info>}

/// Repay tokens for a loan
pub fn handler(ctx: Context<Repay>, amount: Amount) -> ProgramResult {
    repay(&ctx, amount)?;
    Ok(())
}

pub fn repay<'info, T: RepayContext<'info>>(
    ctx: &Context<T>,
    amount: Amount,
) -> Result<(), ProgramError> {
    let clock = Clock::get().unwrap();
    let market = ctx.accounts.market().load()?;
    let mut reserve = ctx.accounts.reserve().load_mut()?;
    let mut obligation = ctx.accounts.obligation().load_mut()?;
    let loan_account = ctx.accounts.loan_account();
    let reserve_info = market.reserves().get_cached(reserve.index, clock.slot);

    market.verify_ability_repay()?;

    // Calculate the number of tokens and notes that match the value being repaid
    let payoff_notes = amount.as_loan_notes(reserve_info, Rounding::Down)?;
    let payoff_notes = std::cmp::min(payoff_notes, token::accessor::amount(loan_account)?);
    let payoff_tokens = std::cmp::min(
        reserve_info.loan_notes_to_tokens(payoff_notes, Rounding::Up),
        reserve.unwrap_outstanding_debt(clock.slot).as_u64(0),
    );

    // Burn the debt that's being repaid
    token::burn(
        ctx.accounts
            .note_burn_context()
            .with_signer(&[&market.authority_seeds()]),
        payoff_notes,
    )?;

    // Transfer the payment tokens to the reserve's vault
    token::transfer(ctx.accounts.transfer_context(), payoff_tokens)?;

    // Keep the reserve's borrow tracking updated
    reserve.repay(clock.slot, payoff_tokens, payoff_notes);

    // record the repayment in the obligation which is used to determine the obligation's health
    obligation.repay(&loan_account.key(), reserve.amount(payoff_notes))?;

    emit!(RepayEvent {
        borrower: ctx.accounts.payer().key(),
        reserve: ctx.accounts.reserve().key(),
        amount
    });

    Ok(())
}
