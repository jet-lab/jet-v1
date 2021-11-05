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
use anchor_spl::token::{self, MintTo};
use jet_math::Number;
use pyth_client::Price;

use crate::utils::JobCompletion;
use crate::{errors::ErrorCode, state::*};

#[derive(Accounts)]
pub struct RefreshReserve<'info> {
    /// The relevant market this refresh is for
    #[account(mut, has_one = market_authority)]
    pub market: Loader<'info, Market>,

    /// The market's authority account
    pub market_authority: AccountInfo<'info>,

    /// The reserve being refreshed
    #[account(mut,
              has_one = market,
              has_one = fee_note_vault,
              has_one = pyth_oracle_price)]
    pub reserve: Loader<'info, Reserve>,

    /// The reserve's vault for storing collected fees
    #[account(mut)]
    pub fee_note_vault: AccountInfo<'info>,

    /// The reserve's mint for deposit notes
    #[account(mut)]
    pub deposit_note_mint: AccountInfo<'info>,

    /// The account containing the price information for the token.
    pub pyth_oracle_price: AccountInfo<'info>,

    #[account(address = token::ID)]
    pub token_program: AccountInfo<'info>,
}

impl<'info> RefreshReserve<'info> {
    fn fee_note_mint_context(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        CpiContext::new(
            self.token_program.clone(),
            MintTo {
                to: self.fee_note_vault.clone(),
                mint: self.deposit_note_mint.to_account_info(),
                authority: self.market_authority.clone(),
            },
        )
    }
}

pub fn handler(ctx: Context<RefreshReserve>) -> ProgramResult {
    let mut market = ctx.accounts.market.load_mut()?;
    let mut reserve = ctx.accounts.reserve.load_mut()?;

    let oracle_data = ctx.accounts.pyth_oracle_price.try_borrow_data()?;
    let oracle = pyth_client::cast::<Price>(&oracle_data);
    if oracle.agg.price < 0 {
        return Err(ErrorCode::InvalidOraclePrice.into());
    }
    let threshold = Number::from_bps(reserve.config.confidence_threshold)
        * Number::from_decimal(oracle.twap.val, oracle.expo);
    if oracle.agg.conf > threshold.as_u64_ceil(oracle.expo) {
        msg!("pyth confidence range outside threshold");
        return Err(ErrorCode::InvalidOraclePrice.into());
    }

    let market_reserves = market.reserves_mut();
    let reserve_info = market_reserves.get_mut(reserve.index);

    let clock = Clock::get()?;

    let vault_amount = reserve.total_deposits();
    let deposit_note_mint_supply = reserve.total_deposit_notes();
    let loan_note_mint_supply = reserve.total_loan_notes();

    // apply the interest for outstanding debt on this reserve
    match reserve.try_accrue_interest(vault_amount, clock.unix_timestamp, clock.slot) {
        JobCompletion::Partial => {
            msg!("performing partial reserve refresh: additional iterations required");
            reserve_info.invalidate();
        }
        JobCompletion::Full => {
            // record the current value of the loan and deposit notes, as a way of
            // mitigating problems with undervaluing collateral in a liquidation.
            // this needs to come after interest accrual (Cache should ensure this)
            let reserve_cache = reserve_info.get_stale_mut();
            let deposit_note_exchange_rate = reserve.deposit_note_exchange_rate(
                clock.slot,
                vault_amount,
                deposit_note_mint_supply,
            );
            let loan_note_exchange_rate =
                reserve.loan_note_exchange_rate(clock.slot, loan_note_mint_supply);

            reserve_cache.price = Number::from_decimal(oracle.agg.price, oracle.expo);

            reserve_cache.deposit_note_exchange_rate = deposit_note_exchange_rate;
            reserve_cache.loan_note_exchange_rate = loan_note_exchange_rate;
            reserve_cache.min_collateral_ratio =
                Number::from_bps(reserve.config.min_collateral_ratio);
            reserve_cache.liquidation_bonus = reserve.config.liquidation_premium;

            // record current time
            reserve_info.refresh_to(clock.slot);

            // Collect any fees that need to be minted to notes
            let notes_to_mint =
                reserve.collect_accrued_fees(clock.slot, deposit_note_exchange_rate);

            if notes_to_mint > 0 {
                token::mint_to(
                    ctx.accounts
                        .fee_note_mint_context()
                        .with_signer(&[&market.authority_seeds()]),
                    notes_to_mint,
                )?;
            }

            msg!("reserve refreshed");
        }
    }
    Ok(())
}
