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
use crate::{Amount, Rounding};

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Deposit<'info> {
    /// The relevant market this deposit is for
    #[account(has_one = market_authority)]
    pub market: Loader<'info, Market>,

    /// The market's authority account
    pub market_authority: AccountInfo<'info>,

    /// The reserve being deposited into
    #[account(mut,
              has_one = market,
              has_one = vault,
              has_one = deposit_note_mint)]
    pub reserve: Loader<'info, Reserve>,

    /// The reserve's vault where the deposited tokens will be transferred to
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    /// The mint for the deposit notes
    #[account(mut)]
    pub deposit_note_mint: AccountInfo<'info>,

    /// The user/authority that owns the deposit
    #[account(signer)]
    pub depositor: AccountInfo<'info>,

    /// The account that will store the deposit notes
    #[account(mut,
              seeds = [
                  b"deposits".as_ref(),
                  reserve.key().as_ref(),
                  depositor.key.as_ref()
              ],
              bump = bump)]
    pub deposit_account: AccountInfo<'info>,

    /// The token account with the tokens to be deposited
    #[account(mut)]
    pub deposit_source: AccountInfo<'info>,

    #[account(address = token::ID)]
    pub token_program: AccountInfo<'info>,
}

impl<'info> Deposit<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.clone(),
            Transfer {
                from: self.deposit_source.to_account_info(),
                to: self.vault.to_account_info(),
                authority: self.depositor.clone(),
            },
        )
    }

    fn note_mint_context(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        CpiContext::new(
            self.token_program.clone(),
            MintTo {
                to: self.deposit_account.to_account_info(),
                mint: self.deposit_note_mint.to_account_info(),
                authority: self.market_authority.clone(),
            },
        )
    }
}

/// Deposit tokens into a reserve
pub fn handler(ctx: Context<Deposit>, _bump: u8, amount: Amount) -> ProgramResult {
    let market = ctx.accounts.market.load()?;
    let mut reserve = ctx.accounts.reserve.load_mut()?;
    let clock = Clock::get()?;
    let reserve_info = market.reserves().get_cached(reserve.index, clock.slot);

    market.verify_ability_deposit_withdraw()?;

    // Calculate the number of new notes that need to be minted to represent
    // the current value being deposited
    let token_amount = amount.as_tokens(reserve_info, Rounding::Up);
    let note_amount = amount.as_deposit_notes(reserve_info, Rounding::Down)?;

    reserve.deposit(token_amount, note_amount);

    // Now that we have the note value, we can transfer this deposit
    // to the vault and mint the new notes
    token::transfer(ctx.accounts.transfer_context(), token_amount)?;

    token::mint_to(
        ctx.accounts
            .note_mint_context()
            .with_signer(&[&market.authority_seeds()]),
        note_amount,
    )?;

    Ok(())
}
