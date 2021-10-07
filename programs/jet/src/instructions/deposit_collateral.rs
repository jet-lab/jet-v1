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

use crate::state::*;
use crate::{Amount, Rounding};

#[event]
pub struct DepositCollateralEvent {
    depositor: Pubkey,
    reserve: Pubkey,
    amount: Amount,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct DepositCollateralBumpSeeds {
    collateral_account: u8,
    deposit_account: u8,
}

#[derive(Accounts)]
#[instruction(bump: DepositCollateralBumpSeeds)]
pub struct DepositCollateral<'info> {
    /// The relevant market this deposit is for
    #[account(has_one = market_authority)]
    pub market: Loader<'info, Market>,

    /// The market's authority account
    pub market_authority: AccountInfo<'info>,

    /// The reserve that the collateral comes from
    #[account(has_one = market)]
    pub reserve: Loader<'info, Reserve>,

    /// The obligation the collateral is being deposited toward
    #[account(mut, has_one = market, has_one = owner)]
    pub obligation: Loader<'info, Obligation>,

    /// The user/authority that owns the deposit
    #[account(signer)]
    pub owner: AccountInfo<'info>,

    /// The account that stores the user's deposit notes
    #[account(mut,
              seeds = [
                  b"deposits".as_ref(),
                  reserve.key().as_ref(),
                  owner.key.as_ref()
              ],
              bump = bump.deposit_account)]
    pub deposit_account: AccountInfo<'info>,

    /// The account that will store the deposit notes as collateral
    #[account(mut,
              seeds = [
                  b"collateral".as_ref(),
                  reserve.key().as_ref(),
                  obligation.key().as_ref(),
                  owner.key.as_ref()
              ],
              bump = bump.collateral_account)]
    pub collateral_account: AccountInfo<'info>,

    #[account(address = token::ID)]
    pub token_program: AccountInfo<'info>,
}

impl<'info> DepositCollateral<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.clone(),
            Transfer {
                from: self.deposit_account.to_account_info(),
                to: self.collateral_account.to_account_info(),
                authority: self.market_authority.clone(),
            },
        )
    }
}

/// Deposit reserve notes as collateral for an obligation
pub fn handler(
    ctx: Context<DepositCollateral>,
    _bump: DepositCollateralBumpSeeds,
    amount: Amount,
) -> ProgramResult {
    // Transfer the notes into the collateral account
    let market = &ctx.accounts.market.load()?;
    let reserve = ctx.accounts.reserve.load()?;
    let clock = Clock::get()?;
    let reserve_info = market.reserves().get_cached(reserve.index, clock.slot);

    market.verify_ability_deposit_withdraw()?;

    let note_amount = amount.as_deposit_notes(reserve_info, Rounding::Down)?;

    token::transfer(
        ctx.accounts
            .transfer_context()
            .with_signer(&[&market.authority_seeds()]),
        note_amount,
    )?;

    // To make things hopefully a bit more efficient, we also
    // record the amount of the collateral inside the obligationn
    // account, to avoid needing to access the collateral accout
    // to verify the position.

    let mut obligation = ctx.accounts.obligation.load_mut()?;
    let collateral_account = ctx.accounts.collateral_account.key();

    obligation.deposit_collateral(&collateral_account, reserve.amount(note_amount))?;

    emit!(DepositCollateralEvent {
        depositor: ctx.accounts.owner.key(),
        reserve: ctx.accounts.reserve.key(),
        amount
    });

    Ok(())
}
