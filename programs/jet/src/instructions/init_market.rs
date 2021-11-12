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

use std::io::Write;

use anchor_lang::prelude::*;
use anchor_lang::Key;

use crate::state::*;

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(zero)]
    pub market: Loader<'info, Market>,
}

/// Initialize a new empty market with a given owner.
pub fn handler(
    ctx: Context<InitializeMarket>,
    owner: Pubkey,
    quote_currency: String,
    quote_token_mint: Pubkey,
) -> ProgramResult {
    let market_address = ctx.accounts.market.key();
    let initial_seeds = &[ctx.accounts.market.to_account_info().key.as_ref()];

    let mut market = ctx.accounts.market.load_init()?;

    let (authority, authority_seed) = Pubkey::find_program_address(initial_seeds, ctx.program_id);

    market.version = 0;
    market.owner = owner;
    market.market_authority = authority;
    market.authority_seed = market_address;
    market.authority_bump_seed = [authority_seed];
    market.quote_token_mint = quote_token_mint;
    (&mut market.quote_currency[..]).write_all(quote_currency.as_bytes())?;

    msg!("market initialized with currency {}", quote_currency);

    Ok(())
}
