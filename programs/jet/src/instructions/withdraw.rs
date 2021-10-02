use anchor_lang::prelude::*;
use anchor_lang::Key;
use anchor_spl::token::{self, Burn, Transfer};

use crate::state::*;
use crate::{Amount, Rounding};

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

    #[account(address = token::ID)]
    pub token_program: AccountInfo<'info>,
}

impl<'info> Withdraw<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.clone(),
            Transfer {
                from: self.vault.to_account_info(),
                to: self.withdraw_account.to_account_info(),
                authority: self.market_authority.clone(),
            },
        )
    }

    fn note_burn_context(&self) -> CpiContext<'_, '_, '_, 'info, Burn<'info>> {
        CpiContext::new(
            self.token_program.clone(),
            Burn {
                to: self.deposit_account.to_account_info(),
                mint: self.deposit_note_mint.to_account_info(),
                authority: self.market_authority.clone(),
            },
        )
    }
}

/// Withdraw tokens from a reserve
pub fn handler(ctx: Context<Withdraw>, _bump: u8, amount: Amount) -> ProgramResult {
    let market = ctx.accounts.market.load()?;
    let mut reserve = ctx.accounts.reserve.load_mut()?;
    let clock = Clock::get().unwrap();
    let reserve_info = market.reserves().get_cached(reserve.index, clock.slot);

    market.verify_ability_deposit_withdraw()?;

    // Calculate the number of tokens that the request amount is worth
    let token_amount = amount.as_tokens(reserve_info, Rounding::Down);
    let note_amount = amount.as_deposit_notes(reserve_info, Rounding::Up)?;

    reserve.withdraw(token_amount, note_amount);

    // Transfer the tokens from the reserve, and burn the deposit notes
    token::transfer(
        ctx.accounts
            .transfer_context()
            .with_signer(&[&market.authority_seeds()]),
        token_amount,
    )?;

    token::burn(
        ctx.accounts
            .note_burn_context()
            .with_signer(&[&market.authority_seeds()]),
        note_amount,
    )?;

    Ok(())
}
