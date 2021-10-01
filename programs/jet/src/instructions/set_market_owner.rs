use anchor_lang::prelude::*;

use crate::state::*;

#[derive(Accounts)]
pub struct SetMarketOwner<'info> {
    #[account(mut, has_one = owner)]
    pub market: Loader<'info, Market>,

    #[account(signer)]
    pub owner: AccountInfo<'info>,
}

/// Change the owner on a market
pub fn handler(ctx: Context<SetMarketOwner>, new_owner: Pubkey) -> ProgramResult {
    let mut market = ctx.accounts.market.load_mut()?;
    market.owner = new_owner;

    Ok(())
}
