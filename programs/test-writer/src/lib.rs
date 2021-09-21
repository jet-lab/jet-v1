//! writer program
//!
//! Utility for writing arbitrary data to accounts.
//! Primarily useful for testing, when mocking account data
//! that would normally be set by some other program/process.

use std::io::Write as IoWrite;

use anchor_lang::prelude::*;

declare_id!("test2Jds58cDo5cGk8eLFbdhW2doamw9xDAYKjTkbW5");

#[program]
pub mod test_writer {
    use super::*;

    /// Write data to an account
    pub fn write(ctx: Context<Write>, offset: u64, data: Vec<u8>) -> ProgramResult {
        let account_data = ctx.accounts.target.to_account_info().data;
        let borrow_data = &mut *account_data.borrow_mut();
        let offset = offset as usize;

        (&mut borrow_data[offset..]).write(&data[..])?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Write<'info> {
    #[account(mut, signer)]
    target: AccountInfo<'info>,
}
