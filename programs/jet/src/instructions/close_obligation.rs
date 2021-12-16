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

use crate::errors::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct CloseObligation<'info> {
    /// The relevant market
    #[account(has_one = market_authority)]
    pub market: Loader<'info, Market>,

    /// The market's authority account
    pub market_authority: AccountInfo<'info>,

    /// The user/authority that is responsible for owning this obligation.
    #[account(mut, signer)]
    pub owner: AccountInfo<'info>,

    /// The account that stores the obligation notes, such as loans and collaterals, to be closed.
    /// Marks the account as being closed at the end of the instruction’s execution,
    /// sending the rent exemption lamports to the specified. close is implicit.
    #[account(mut,
              has_one = owner,
              has_one = market,
              close = owner)]
    pub obligation: Loader<'info, Obligation>,
}

/// Close an account that tracks a portfolio of collateral deposits and loans.
pub fn handler(ctx: Context<CloseObligation>, _bump: u8) -> ProgramResult {
    let obligation = ctx.accounts.obligation.load()?;

    // check if the position size is zero; if yes then proceed
    if obligation.position_count() > 0 {
        return Err(ErrorCode::PositionNotEmpty.into());
    }

    msg!("closed obligation account");
    Ok(())
}
