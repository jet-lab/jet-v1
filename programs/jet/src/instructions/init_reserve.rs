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
use anchor_spl::dex;
use anchor_spl::dex::serum_dex::state::OpenOrders;
use anchor_spl::dex::InitOpenOrders;
use anchor_spl::token::{self, InitializeAccount, InitializeMint, Mint, TokenAccount};
use pyth_client::Product;

use crate::state::*;
use crate::utils;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitReserveBumpSeeds {
    pub vault: u8,
    pub fee_note_vault: u8,
    pub dex_open_orders: u8,
    pub dex_swap_tokens: u8,
    pub deposit_note_mint: u8,
    pub loan_note_mint: u8,
}

#[derive(Accounts)]
#[instruction(bump: InitReserveBumpSeeds)]
pub struct InitializeReserve<'info> {
    /// The market the new reserve is being added to.
    #[account(mut,
              has_one = owner,
              has_one = market_authority,
              has_one = quote_token_mint)]
    pub market: Loader<'info, Market>,

    /// The market's authority account, which owns the vault
    pub market_authority: AccountInfo<'info>,

    /// The new account to store data about the reserve
    #[account(zero)]
    pub reserve: Loader<'info, Reserve>,

    /// The account to hold custody of the tokens being
    /// controlled by this reserve.
    #[account(init,
              seeds = [
                  b"vault".as_ref(),
                  reserve.key().as_ref()
              ],
              bump = bump.vault,
              token::mint = token_mint,
              token::authority = market_authority,
              payer = owner)]
    pub vault: AccountInfo<'info>,

    /// The account to hold the notes created from fees collected by the reserve
    #[account(init,
              seeds = [
                  b"fee-vault".as_ref(),
                  reserve.key().as_ref()
              ],
              bump = bump.fee_note_vault,
              payer = owner,
              owner = token::ID,
              space = TokenAccount::LEN)]
    pub fee_note_vault: AccountInfo<'info>,

    /// The account for storing quote tokens during swaps
    #[account(init,
              seeds = [
                  b"dex-swap-tokens".as_ref(),
                  reserve.key().as_ref()
              ],
              bump = bump.dex_swap_tokens,
              token::mint = quote_token_mint,
              token::authority = market_authority,
              payer = owner)]
    pub dex_swap_tokens: AccountInfo<'info>,

    /// The account to use for placing orders on the DEX
    #[account(init,
              seeds = [
                  b"dex-open-orders".as_ref(),
                  reserve.key().as_ref()
              ],
              bump = bump.dex_open_orders,
              payer = owner,
              owner = dex::ID,
              space = std::mem::size_of::<OpenOrders>() + 12,
              rent_exempt = skip)]
    pub dex_open_orders: AccountInfo<'info>,

    /// The DEX market that can be used to trade the reserve asset
    pub dex_market: AccountInfo<'info>,

    /// The mint for the token being stored in this reserve.
    pub token_mint: Account<'info, Mint>,

    /// The program for interacting with the token.
    #[account(address = token::ID)]
    pub token_program: AccountInfo<'info>,

    /// The program for interacting with the DEX
    #[account(address = dex::ID)]
    pub dex_program: AccountInfo<'info>,

    /// The account containing the price information for the token.
    pub oracle_price: AccountInfo<'info>,

    /// The account containing the metadata about the token being referenced
    pub oracle_product: AccountInfo<'info>,

    /// The mint for notes which will represent user deposits
    #[account(init,
              seeds = [
                  b"deposits".as_ref(),
                  reserve.key().as_ref(),
                  token_mint.key().as_ref()
              ],
              bump = bump.deposit_note_mint,
              payer = owner,
              owner = token::ID,
              space = Mint::LEN)]
    pub deposit_note_mint: AccountInfo<'info>,

    /// The mint for notes which will represent user loans
    #[account(init,
              seeds = [
                  b"loans".as_ref(),
                  reserve.key().as_ref(),
                  token_mint.key().as_ref()
              ],
              bump = bump.loan_note_mint,
              payer = owner,
              owner = token::ID,
              space = Mint::LEN)]
    pub loan_note_mint: AccountInfo<'info>,

    /// The mint for the market quote tokens
    pub quote_token_mint: AccountInfo<'info>,

    /// The market owner, which must sign to make this change to the market.
    #[account(signer)]
    pub owner: AccountInfo<'info>,

    pub system_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> InitializeReserve<'info> {
    fn init_deposit_mint_context(&self) -> CpiContext<'_, '_, '_, 'info, InitializeMint<'info>> {
        CpiContext::new(
            self.token_program.clone(),
            InitializeMint {
                mint: self.deposit_note_mint.clone(),
                rent: self.rent.to_account_info(),
            },
        )
    }

    fn init_loan_mint_context(&self) -> CpiContext<'_, '_, '_, 'info, InitializeMint<'info>> {
        CpiContext::new(
            self.token_program.clone(),
            InitializeMint {
                mint: self.loan_note_mint.clone(),
                rent: self.rent.to_account_info(),
            },
        )
    }

    fn init_fee_vault_context(&self) -> CpiContext<'_, '_, '_, 'info, InitializeAccount<'info>> {
        CpiContext::new(
            self.token_program.clone(),
            InitializeAccount {
                account: self.fee_note_vault.clone(),
                authority: self.market_authority.clone(),
                mint: self.deposit_note_mint.clone(),
                rent: self.rent.to_account_info(),
            },
        )
    }

    fn init_dex_open_orders_context(&self) -> CpiContext<'_, '_, '_, 'info, InitOpenOrders<'info>> {
        CpiContext::new(
            self.dex_program.clone(),
            InitOpenOrders {
                open_orders: self.dex_open_orders.clone(),
                authority: self.market_authority.clone(),
                market: self.dex_market.clone(),
                rent: self.rent.to_account_info(),
            },
        )
    }

    fn init_accounts(&self) -> ProgramResult {
        token::initialize_mint(
            self.init_deposit_mint_context(),
            self.token_mint.decimals,
            self.market_authority.key,
            Some(self.market_authority.key),
        )?;

        token::initialize_mint(
            self.init_loan_mint_context(),
            self.token_mint.decimals,
            self.market_authority.key,
            Some(self.market_authority.key),
        )?;

        token::initialize_account(self.init_fee_vault_context())?;

        Ok(())
    }

    fn register_with_market(&mut self, config: ReserveConfig) -> ProgramResult {
        let mut market = self.market.load_mut()?;
        let mut reserve = self.reserve.load_init()?;
        let oracle_price = &self.oracle_price;
        let oracle_product = &self.oracle_product;
        let token_mint = &self.token_mint;

        reserve.version = 0;
        reserve.config = config;
        reserve.market = self.market.key();
        reserve.pyth_oracle_price = oracle_price.key();
        reserve.pyth_oracle_product = oracle_product.key();
        reserve.vault = self.vault.key();
        reserve.fee_note_vault = self.fee_note_vault.key();
        reserve.dex_swap_tokens = self.dex_swap_tokens.key();
        reserve.dex_open_orders = self.dex_open_orders.key();
        reserve.dex_market = self.dex_market.key();

        reserve.exponent = -(token_mint.decimals as i32);
        reserve.token_mint = token_mint.key();
        reserve.deposit_note_mint = *self.deposit_note_mint.key;
        reserve.loan_note_mint = *self.loan_note_mint.key;

        let clock = Clock::get()?;
        reserve.init(&clock);

        if token_mint.key() != market.quote_token_mint {
            // Only configure the DEX account for the reserve if there can be a
            // market for it, which may not be the case if the reserve token is
            // the same as the quote token.

            // Verify the DEX market is usable for the reserve/market tokens
            utils::verify_dex_market_tokens(
                &self.dex_market,
                self.dex_program.key,
                &reserve.token_mint,
                &market.quote_token_mint,
            )?;

            dex::init_open_orders(
                self.init_dex_open_orders_context()
                    .with_signer(&[&market.authority_seeds()]),
            )?;
        }

        // Verify the oracle account
        let product_data = oracle_product.try_borrow_data()?;
        let product = pyth_client::cast::<Product>(&product_data);

        // FIXME: also validate mint decimals
        market.validate_oracle(product, oracle_price.key)?;

        // Register an entry with the market account for this new reserve
        let reserve_key = self.reserve.key();
        let market_reserves = market.reserves_mut();

        reserve.index = market_reserves.register(&reserve_key)?;

        msg!("registered reserve #{}", { reserve.index });

        Ok(())
    }
}

/// Initialize a new reserve in a market with some initial liquidity.
pub fn handler(
    ctx: Context<InitializeReserve>,
    _bump: InitReserveBumpSeeds,
    config: ReserveConfig,
) -> ProgramResult {
    // Initialize the reserve data
    ctx.accounts.register_with_market(config)?;

    // Create extra accounts needed by the reserve, e.g. the mint for the depository notes
    ctx.accounts.init_accounts()?;

    Ok(())
}
