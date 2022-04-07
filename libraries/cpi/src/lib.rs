use anchor_lang::prelude::*;

pub mod accounts;
mod errors;
pub mod instruction;

pub use errors::ErrorCode;

declare_id!("JPv1rCqrhagNNmJVM5J1he7msQ5ybtvE1nNuHpDHMNU");

/// Specifies the units of some amount of value
#[derive(AnchorDeserialize, AnchorSerialize, Eq, PartialEq, Debug, Clone, Copy)]
pub enum AmountUnits {
    Tokens,
    DepositNotes,
    LoanNotes,
}

/// Represent an amount of some value (like tokens, or notes)
#[derive(AnchorDeserialize, AnchorSerialize, Eq, PartialEq, Debug, Clone, Copy)]
pub struct Amount {
    pub units: AmountUnits,
    pub value: u64,
}

impl Amount {
    pub fn from_tokens(value: u64) -> Amount {
        Amount {
            units: AmountUnits::Tokens,
            value,
        }
    }

    pub fn from_deposit_notes(value: u64) -> Amount {
        Amount {
            units: AmountUnits::DepositNotes,
            value,
        }
    }

    pub fn from_loan_notes(value: u64) -> Amount {
        Amount {
            units: AmountUnits::LoanNotes,
            value,
        }
    }
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct DepositCollateralBumpSeeds {
    pub collateral_account: u8,
    pub deposit_account: u8,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct WithdrawCollateralBumpSeeds {
    pub collateral_account: u8,
    pub deposit_account: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitReserveBumpSeeds {
    pub vault: u8,
    pub fee_note_vault: u8,
    pub dex_open_orders: u8,
    pub dex_swap_tokens: u8,
    pub deposit_note_mint: u8,
    pub loan_note_mint: u8,
}

#[repr(C)]
#[derive(Clone, Copy, AnchorDeserialize, AnchorSerialize)]
pub struct ReserveConfig {
    /// The utilization rate at which we switch from the first to second regime.
    pub utilization_rate_1: u16,

    /// The utilization rate at which we switch from the second to third regime.
    pub utilization_rate_2: u16,

    /// The lowest borrow rate in the first regime. Essentially the minimum
    /// borrow rate possible for the reserve.
    pub borrow_rate_0: u16,

    /// The borrow rate at the transition point from the first to second regime.
    pub borrow_rate_1: u16,

    /// The borrow rate at the transition point from the second to thirs regime.
    pub borrow_rate_2: u16,

    /// The highest borrow rate in the third regime. Essentially the maximum
    /// borrow rate possible for the reserve.
    pub borrow_rate_3: u16,

    /// The minimum allowable collateralization ratio for an obligation
    pub min_collateral_ratio: u16,

    /// The amount given as a bonus to a liquidator
    pub liquidation_premium: u16,

    /// The threshold at which to collect the fees accumulated from interest into
    /// real deposit notes.
    pub manage_fee_collection_threshold: u64,

    /// The fee rate applied to the interest payments collected
    pub manage_fee_rate: u16,

    /// The fee rate applied as interest owed on new loans
    pub loan_origination_fee: u16,

    /// unused
    pub _reserved0: u16,

    /// Represented as a percentage of the Price
    /// confidence values above this will not be accepted
    pub confidence_threshold: u16,

    /// The maximum token amount to allow in a single DEX trade when
    /// liquidating assetr from this reserve as collateral.
    pub liquidation_dex_trade_max: u64,

    pub _reserved1: [u8; 24],
}

pub fn init_market<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::InitializeMarket<'info>>,
    owner: Pubkey,
    quote_currency: String,
    quote_token_mint: Pubkey,
) -> Result<()> {
    let ix = {
        let ix = instruction::InitMarket {
            owner,
            quote_currency,
            quote_token_mint,
        };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [33, 253, 15, 116, 89, 25, 127, 236].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn init_reserve<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::InitializeReserve<'info>>,
    bump: InitReserveBumpSeeds,
    config: ReserveConfig,
) -> Result<()> {
    let ix = {
        let ix = instruction::InitReserve { bump, config };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [138, 245, 71, 225, 153, 4, 3, 43].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn update_reserve_config<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::UpdateReserveConfig<'info>>,
    new_config: ReserveConfig,
) -> Result<()> {
    let ix = {
        let ix = instruction::UpdateReserveConfig { new_config };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [61, 148, 100, 70, 143, 107, 17, 13].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn init_deposit_account<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::InitializeDepositAccount<'info>>,
    bump: u8,
) -> Result<()> {
    let ix = {
        let ix = instruction::InitDepositAccount { bump };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [136, 79, 202, 206, 211, 146, 182, 158].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn init_collateral_account<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::InitializeCollateralAccount<'info>>,
    bump: u8,
) -> Result<()> {
    let ix = {
        let ix = instruction::InitCollateralAccount { bump };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [255, 145, 182, 44, 246, 213, 160, 56].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn init_loan_account<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::InitializeLoanAccount<'info>>,
    bump: u8,
) -> Result<()> {
    let ix = {
        let ix = instruction::InitLoanAccount { bump };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [194, 102, 166, 130, 91, 74, 188, 81].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn init_obligation<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::InitializeObligation<'info>>,
    bump: u8,
) -> Result<()> {
    let ix = {
        let ix = instruction::InitObligation { bump };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [251, 10, 231, 76, 27, 11, 159, 96].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn set_market_owner<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::SetMarketOwner<'info>>,
    new_owner: Pubkey,
) -> Result<()> {
    let ix = {
        let ix = instruction::SetMarketOwner { new_owner };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [166, 195, 167, 232, 32, 198, 184, 182].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn set_market_flags<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::SetMarketFlags<'info>>,
    flags: u64,
) -> Result<()> {
    let ix = {
        let ix = instruction::SetMarketFlags { flags };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [73, 138, 236, 76, 82, 179, 94, 155].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn close_deposit_account<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::CloseDepositAccount<'info>>,
    bump: u8,
) -> Result<()> {
    let ix = {
        let ix = instruction::CloseDepositAccount { bump };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [152, 6, 13, 164, 50, 219, 225, 43].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn close_collateral_account<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::CloseCollateralAccount<'info>>,
    bump: u8,
) -> Result<()> {
    let ix = {
        let ix = instruction::CloseCollateralAccount { bump };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [106, 184, 133, 142, 131, 191, 224, 29].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn close_loan_account<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::CloseLoanAccount<'info>>,
    bump: u8,
) -> Result<()> {
    let ix = {
        let ix = instruction::CloseLoanAccount { bump };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [137, 207, 106, 190, 122, 27, 176, 193].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn close_obligation<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::CloseObligation<'info>>,
    bump: u8,
) -> Result<()> {
    let ix = {
        let ix = instruction::CloseObligation { bump };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [178, 182, 18, 237, 158, 158, 51, 124].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn deposit<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::Deposit<'info>>,
    bump: u8,
    amount: Amount,
) -> Result<()> {
    let ix = {
        let ix = instruction::Deposit { bump, amount };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [242, 35, 198, 137, 82, 225, 242, 182].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn deposit_tokens<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::DepositTokens<'info>>,
    amount: Amount,
) -> Result<()> {
    let ix = {
        let ix = instruction::DepositTokens { amount };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [176, 83, 229, 18, 191, 143, 176, 150].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn withdraw<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::Withdraw<'info>>,
    bump: u8,
    amount: Amount,
) -> Result<()> {
    let ix = {
        let ix = instruction::Withdraw { bump, amount };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [183, 18, 70, 156, 148, 109, 161, 34].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn withdraw_tokens<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::WithdrawTokens<'info>>,
    amount: Amount,
) -> Result<()> {
    let ix = {
        let ix = instruction::WithdrawTokens { amount };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [2, 4, 225, 61, 19, 182, 106, 170].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn deposit_collateral<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::DepositCollateral<'info>>,
    bump: DepositCollateralBumpSeeds,
    amount: Amount,
) -> Result<()> {
    let ix = {
        let ix = instruction::DepositCollateral { bump, amount };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [156, 131, 142, 116, 146, 247, 162, 120].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn withdraw_collateral<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::WithdrawCollateral<'info>>,
    bump: WithdrawCollateralBumpSeeds,
    amount: Amount,
) -> Result<()> {
    let ix = {
        let ix = instruction::WithdrawCollateral { bump, amount };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [115, 135, 168, 106, 139, 214, 138, 150].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn borrow<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::Borrow<'info>>,
    bump: u8,
    amount: Amount,
) -> Result<()> {
    let ix = {
        let ix = instruction::Borrow { bump, amount };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [228, 253, 131, 202, 207, 116, 89, 18].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn repay<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::Repay<'info>>,
    amount: Amount,
) -> Result<()> {
    let ix = {
        let ix = instruction::Repay { amount };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [234, 103, 67, 82, 208, 234, 219, 166].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn liquidate<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::Liquidate<'info>>,
    amount: Amount,
    min_collateral: u64,
) -> Result<()> {
    let ix = {
        let ix = instruction::Liquidate {
            amount,
            min_collateral,
        };
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [223, 179, 226, 125, 48, 46, 39, 74].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
pub fn refresh_reserve<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, crate::accounts::RefreshReserve<'info>>,
) -> Result<()> {
    let ix = {
        let ix = instruction::RefreshReserve;
        let mut ix_data = AnchorSerialize::try_to_vec(&ix)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
        let mut data = [2, 218, 138, 235, 79, 201, 25, 102].to_vec();
        data.append(&mut ix_data);
        let accounts = ctx.to_account_metas(None);
        anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts,
            data,
        }
    };
    let mut acc_infos = ctx.to_account_infos();
    Ok(anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &acc_infos,
        ctx.signer_seeds,
    )?)
}
