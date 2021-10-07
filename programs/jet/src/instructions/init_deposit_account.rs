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

use crate::state::*;

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitializeDepositAccount<'info> {
    /// The relevant market this deposit is for
    #[account(has_one = market_authority)]
    pub market: Loader<'info, Market>,

    /// The market's authority account
    pub market_authority: AccountInfo<'info>,

    /// The reserve being deposited into
    #[account(has_one = market,
              has_one = deposit_note_mint)]
    pub reserve: Loader<'info, Reserve>,

    /// The mint for the deposit notes
    pub deposit_note_mint: AccountInfo<'info>,

    /// The user/authority that will own the deposits
    #[account(mut, signer)]
    pub depositor: AccountInfo<'info>,

    /// The account that will store the deposit notes
    #[account(init,
              seeds = [
                  b"deposits".as_ref(),
                  reserve.key().as_ref(),
                  depositor.key.as_ref()
              ],
              bump = bump,
              token::mint = deposit_note_mint,
              token::authority = market_authority,
              payer = depositor)]
    pub deposit_account: AccountInfo<'info>,

    #[account(address = anchor_spl::token::ID)]
    pub token_program: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
}

/// Initialize an account that can be used to store deposit notes
pub fn handler(_ctx: Context<InitializeDepositAccount>, _bump: u8) -> ProgramResult {
    // Do nothing, the deposit account should be initialized
    // automatically by anchor during setup for this handler.

    msg!("initialized deposit account");
    Ok(())
}
