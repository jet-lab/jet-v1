use anchor_lang::prelude::*;
use anchor_lang::Key;
use anchor_spl::token::{self, Transfer};

use crate::errors::ErrorCode;
use crate::state::*;
use crate::Amount;

#[event]
pub struct WithdrawCollateralEvent {
    depositor: Pubkey,
    reserve: Pubkey,
    amount: Amount,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct WithdrawCollateralBumpSeeds {
    collateral_account: u8,
    deposit_account: u8,
}

#[derive(Accounts)]
#[instruction(bump: WithdrawCollateralBumpSeeds)]
pub struct WithdrawCollateral<'info> {
    /// The relevant market the collateral is in
    #[account(has_one = market_authority)]
    pub market: Loader<'info, Market>,

    /// The market's authority account
    pub market_authority: AccountInfo<'info>,

    /// The reserve associated with the c-tokens that are being withdrawn
    #[account(has_one = market)]
    pub reserve: Loader<'info, Reserve>,

    /// The obligation the collateral is being withdrawn from
    /// todo verify depositor?
    #[account(mut,
              has_one = market,
              has_one = owner)]
    pub obligation: Loader<'info, Obligation>,

    /// The user/authority that owns the deposited collateral (depositor)
    #[account(signer)]
    pub owner: AccountInfo<'info>,

    /// The account that stores the user's deposit notes, where
    /// the collateral will be returned to.
    #[account(mut,
              seeds = [
                  b"deposits".as_ref(),
                  reserve.key().as_ref(),
                  owner.key.as_ref()
              ],
              bump = bump.deposit_account)]
    pub deposit_account: AccountInfo<'info>,

    /// The account that contains the collateral to be withdrawn
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

impl<'info> WithdrawCollateral<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.clone(),
            Transfer {
                from: self.collateral_account.to_account_info(),
                to: self.deposit_account.to_account_info(),
                authority: self.market_authority.clone(),
            },
        )
    }
}

/// Withdraw reserve notes previously deposited as collateral for an obligation
pub fn handler(
    ctx: Context<WithdrawCollateral>,
    _bump: WithdrawCollateralBumpSeeds,
    amount: Amount,
) -> ProgramResult {
    // Transfer the notes from the collateral account back to the
    // regular deposit account.
    let market = ctx.accounts.market.load()?;
    let reserve = ctx.accounts.reserve.load()?;
    let clock = Clock::get()?;
    let reserve_info = market.reserves().get_cached(reserve.index, clock.slot);

    let note_amount = amount.as_deposit_notes(reserve_info)?;

    token::transfer(
        ctx.accounts
            .transfer_context()
            .with_signer(&[&market.authority_seeds()]),
        note_amount,
    )?;

    // Also update the collateral values stored in the obligation account
    let mut obligation = ctx.accounts.obligation.load_mut()?;
    let collateral_account = ctx.accounts.collateral_account.key();

    obligation.withdraw_collateral(&collateral_account, reserve.amount(note_amount))?;

    // Verify this doesn't leave the loan subject to liquidation
    let clock = Clock::get().unwrap();
    let market_info = market.reserves();

    obligation.cache_calculations(market.reserves(), clock.slot);
    if !obligation.is_healthy(&market_info, clock.slot) {
        return Err(ErrorCode::ObligationUnhealthy.into());
    }

    emit!(WithdrawCollateralEvent {
        depositor: ctx.accounts.owner.key(),
        reserve: ctx.accounts.reserve.key(),
        amount
    });

    Ok(())
}
