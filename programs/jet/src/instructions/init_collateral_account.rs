use anchor_lang::prelude::*;
use anchor_lang::Key;

use crate::state::*;

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitializeCollateralAccount<'info> {
    /// The relevant market this collateral is for
    #[account(has_one = market_authority)]
    pub market: Loader<'info, Market>,

    /// The market's authority account
    pub market_authority: AccountInfo<'info>,

    /// The obligation the collateral account is used for
    #[account(mut,
              has_one = market,
              has_one = owner)]
    pub obligation: Loader<'info, Obligation>,

    /// The reserve that the collateral comes from
    #[account(has_one = market,
              has_one = deposit_note_mint)]
    pub reserve: Loader<'info, Reserve>,

    /// The mint for the deposit notes being used as collateral
    pub deposit_note_mint: AccountInfo<'info>,

    /// The user/authority that owns the collateral
    #[account(mut, signer)]
    pub owner: AccountInfo<'info>,

    /// The account that will store the deposit notes
    #[account(init,
              seeds = [
                  b"collateral".as_ref(),
                  reserve.key().as_ref(),
                  obligation.key().as_ref(),
                  owner.key.as_ref()
              ],
              bump = bump,
              token::mint = deposit_note_mint,
              token::authority = market_authority,
              payer = owner)]
    pub collateral_account: AccountInfo<'info>,

    #[account(address = anchor_spl::token::ID)]
    pub token_program: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
}

/// Initialize an account that can be used to store deposit notes as collateral for an obligation
pub fn handler(ctx: Context<InitializeCollateralAccount>, _bump: u8) -> ProgramResult {
    // Anchor would have already initialized the new collateral token account,
    // so all that's left is to register it in the obligation account. This
    // provides an exact record of which accounts are associated with the
    // obligation.

    let mut obligation = ctx.accounts.obligation.load_mut()?;
    let reserve = ctx.accounts.reserve.load()?;
    let account = ctx.accounts.collateral_account.key();

    obligation.register_collateral(&account, reserve.index)?;

    msg!("initialized collateral account");
    Ok(())
}
