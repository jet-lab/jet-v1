use anchor_lang::prelude::*;

use crate::errors::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
pub struct SetMarketFlags<'info> {
    #[account(mut, has_one = owner)]
    pub market: Loader<'info, Market>,

    #[account(signer)]
    pub owner: AccountInfo<'info>,
}

/// Change the flags on a market
pub fn handler(ctx: Context<SetMarketFlags>, flags: u64) -> ProgramResult {
    let mut market = ctx.accounts.market.load_mut()?;
    let flags = match MarketFlags::from_bits(flags) {
        Some(f) => f,
        None => return Err(ErrorCode::InvalidParameter.into()),
    };

    market.reset_flags(flags);

    Ok(())
}
