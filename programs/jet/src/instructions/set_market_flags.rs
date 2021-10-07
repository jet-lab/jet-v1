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
pub struct SetMarketFlags<'info> {
    #[account(mut, has_one = owner)]
    pub market: Loader<'info, Market>,

    #[account(signer)]
    pub owner: AccountInfo<'info>,
}

/// Change the flags on a market
pub fn handler(ctx: Context<SetMarketFlags>, flags: u64) -> ProgramResult {
    let mut market = ctx.accounts.market.load_mut()?;
    let flags = match MarketFlags::from_bits(flags) {
        Some(f) => f,
        None => return Err(ErrorCode::InvalidParameter.into()),
    };

    market.reset_flags(flags);

    Ok(())
}
