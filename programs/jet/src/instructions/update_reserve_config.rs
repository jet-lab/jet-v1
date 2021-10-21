use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateReserveConfig<'info> {
    #[account(has_one = owner)]
    pub market: Loader<'info, Market>,

    #[account(mut, has_one = market)]
    pub reserve: Loader<'info, Reserve>,

    #[account(signer)]
    pub owner: AccountInfo<'info>,
}

pub fn handler(ctx: Context<UpdateReserveConfig>, new_config: ReserveConfig) -> ProgramResult {
    let mut reserve = ctx.accounts.reserve.load_mut()?;
    reserve.config = new_config;
    Ok(())
}
