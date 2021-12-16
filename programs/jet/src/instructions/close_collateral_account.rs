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
use anchor_spl::token::{self, CloseAccount};

use crate::state::*;
use crate::utils::verify_account_empty;

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct CloseCollateralAccount<'info> {
    /// The relevant market this collateral is for
    #[account(has_one = market_authority)]
    pub market: Loader<'info, Market>,

    /// The market's authority account
    pub market_authority: AccountInfo<'info>,

    /// The obligation the collateral account is used for ??
    #[account(mut,
              has_one = market,
              has_one = owner)]
    pub obligation: Loader<'info, Obligation>,

    /// The user/authority that owns the collateral
    #[account(mut, signer)]
    pub owner: AccountInfo<'info>,

    /// The account that stores the deposit notes
    #[account(mut)]
    pub collateral_account: AccountInfo<'info>,

    /// The account that will stores the deposit notes
    #[account(mut)]
    pub deposit_account: AccountInfo<'info>,

    #[account(address = anchor_spl::token::ID)]
    pub token_program: AccountInfo<'info>,
}

/// Close an account that can be used to store deposit notes as collateral for an obligation
impl<'info> CloseCollateralAccount<'info> {
    fn close_context(&self) -> CpiContext<'_, '_, '_, 'info, CloseAccount<'info>> {
        CpiContext::new(
            self.token_program.clone(),
            CloseAccount {
                account: self.collateral_account.to_account_info(),
                destination: self.deposit_account.to_account_info(),
                authority: self.market_authority.clone(),
            },
        )
    }
}

/// Close a collateral account that stores deposit notes
pub fn handler(ctx: Context<CloseCollateralAccount>, _bump: u8) -> ProgramResult {
    let mut obligation = ctx.accounts.obligation.load_mut()?;
    let market = ctx.accounts.market.load()?;
    let account = ctx.accounts.collateral_account.key();

    // Verify if collateral is empty, then proceed
    verify_account_empty(&ctx.accounts.collateral_account)?;

    // unregister the collateral account
    obligation.unregister_collateral(&account)?;

    // Account should now be empty and unregistered from the obligation aaccount, so we can close it out
    token::close_account(
        ctx.accounts
            .close_context()
            .with_signer(&[&market.authority_seeds()]),
    )?;

    msg!("closed collateral account");
    Ok(())
}
