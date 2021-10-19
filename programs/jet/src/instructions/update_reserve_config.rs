use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct UpdateReserveConfig<'info> {
    #[account(mut)]
    pub reserve: Loader<'info, Reserve>,
}

pub fn handler(ctx: Context<UpdateReserveConfig>, new_config: ReserveConfig) -> ProgramResult {
    let mut reserve = ctx.accounts.reserve.load_mut()?;
    reserve.update_config(new_config);
    Ok(())
}