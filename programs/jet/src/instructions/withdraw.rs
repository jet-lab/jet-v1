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
use anchor_lang::InstructionData;
use anchor_lang::Key;
use anchor_spl::token;
use solana_program::instruction::Instruction;
use solana_program::program::invoke_signed;

use crate::cpi::accounts::WithdrawTokens;
use crate::state::*;
use crate::Amount;

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Withdraw<'info> {
    /// The relevant market this withdraw is for
    #[account(has_one = market_authority)]
    pub market: Loader<'info, Market>,

    /// The market's authority account
    pub market_authority: AccountInfo<'info>,

    /// The reserve being withdrawn from
    #[account(mut,
              has_one = market,
              has_one = vault,
              has_one = deposit_note_mint)]
    pub reserve: Loader<'info, Reserve>,

    /// The reserve's vault where the withdrawn tokens will be transferred from
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    /// The mint for the deposit notes
    #[account(mut)]
    pub deposit_note_mint: AccountInfo<'info>,

    /// The user/authority that owns the deposit
    #[account(signer)]
    pub depositor: AccountInfo<'info>,

    /// The account that stores the deposit notes
    #[account(mut,
              seeds = [
                  b"deposits".as_ref(),
                  reserve.key().as_ref(),
                  depositor.key.as_ref()
              ],
              bump = bump)]
    pub deposit_account: AccountInfo<'info>,

    /// The token account where to transfer withdrawn tokens to
    #[account(mut)]
    pub withdraw_account: AccountInfo<'info>,

    #[account(address = crate::ID)]
    pub jet_program: AccountInfo<'info>,

    #[account(address = token::ID)]
    pub token_program: AccountInfo<'info>,
}

impl<'info> Withdraw<'info> {
    fn withdraw_tokens_context(&self) -> CpiContext<'_, '_, '_, 'info, WithdrawTokens<'info>> {
        CpiContext::new(
            self.jet_program.to_account_info(),
            WithdrawTokens {
                market: self.market.to_account_info(),
                market_authority: self.market_authority.to_account_info(),
                reserve: self.reserve.to_account_info(),
                vault: self.vault.to_account_info(),
                deposit_note_mint: self.deposit_note_mint.to_account_info(),
                depositor: self.market_authority.to_account_info(),
                deposit_note_account: self.deposit_account.to_account_info(),
                withdraw_account: self.withdraw_account.to_account_info(),
                token_program: self.token_program.clone(),
            },
        )
    }
}

/// Withdraw tokens from a reserve
pub fn handler(ctx: Context<Withdraw>, _bump: u8, amount: Amount) -> ProgramResult {
    let market = ctx.accounts.market.load()?;
    let wt_ctx = ctx.accounts.withdraw_tokens_context();
    let ix = Instruction {
        program_id: crate::ID,
        accounts: wt_ctx.to_account_metas(Some(true)),
        data: crate::instruction::WithdrawTokens { amount }.data(),
    };

    invoke_signed(
        &ix,
        &wt_ctx.to_account_infos(),
        &[&market.authority_seeds()],
    )
}
