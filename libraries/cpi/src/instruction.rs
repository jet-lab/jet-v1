use crate::*;

/// Instruction.
pub struct InitMarket {
    pub owner: Pubkey,
    pub quote_currency: String,
    pub quote_token_mint: Pubkey,
}
impl borsh::ser::BorshSerialize for InitMarket
where
    Pubkey: borsh::ser::BorshSerialize,
    String: borsh::ser::BorshSerialize,
    Pubkey: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.owner, writer)?;
        borsh::BorshSerialize::serialize(&self.quote_currency, writer)?;
        borsh::BorshSerialize::serialize(&self.quote_token_mint, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for InitMarket
where
    Pubkey: borsh::BorshDeserialize,
    String: borsh::BorshDeserialize,
    Pubkey: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            owner: borsh::BorshDeserialize::deserialize(buf)?,
            quote_currency: borsh::BorshDeserialize::deserialize(buf)?,
            quote_token_mint: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for InitMarket {
    fn data(&self) -> Vec<u8> {
        let mut d = [33, 253, 15, 116, 89, 25, 127, 236].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct InitReserve {
    pub bump: InitReserveBumpSeeds,
    pub config: ReserveConfig,
}
impl borsh::ser::BorshSerialize for InitReserve
where
    InitReserveBumpSeeds: borsh::ser::BorshSerialize,
    ReserveConfig: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.bump, writer)?;
        borsh::BorshSerialize::serialize(&self.config, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for InitReserve
where
    InitReserveBumpSeeds: borsh::BorshDeserialize,
    ReserveConfig: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            bump: borsh::BorshDeserialize::deserialize(buf)?,
            config: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for InitReserve {
    fn data(&self) -> Vec<u8> {
        let mut d = [138, 245, 71, 225, 153, 4, 3, 43].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct UpdateReserveConfig {
    pub new_config: ReserveConfig,
}
impl borsh::ser::BorshSerialize for UpdateReserveConfig
where
    ReserveConfig: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.new_config, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for UpdateReserveConfig
where
    ReserveConfig: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            new_config: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for UpdateReserveConfig {
    fn data(&self) -> Vec<u8> {
        let mut d = [61, 148, 100, 70, 143, 107, 17, 13].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct InitDepositAccount {
    pub bump: u8,
}
impl borsh::ser::BorshSerialize for InitDepositAccount
where
    u8: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.bump, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for InitDepositAccount
where
    u8: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            bump: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for InitDepositAccount {
    fn data(&self) -> Vec<u8> {
        let mut d = [136, 79, 202, 206, 211, 146, 182, 158].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct InitCollateralAccount {
    pub bump: u8,
}
impl borsh::ser::BorshSerialize for InitCollateralAccount
where
    u8: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.bump, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for InitCollateralAccount
where
    u8: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            bump: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for InitCollateralAccount {
    fn data(&self) -> Vec<u8> {
        let mut d = [255, 145, 182, 44, 246, 213, 160, 56].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct InitLoanAccount {
    pub bump: u8,
}
impl borsh::ser::BorshSerialize for InitLoanAccount
where
    u8: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.bump, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for InitLoanAccount
where
    u8: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            bump: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for InitLoanAccount {
    fn data(&self) -> Vec<u8> {
        let mut d = [194, 102, 166, 130, 91, 74, 188, 81].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct InitObligation {
    pub bump: u8,
}
impl borsh::ser::BorshSerialize for InitObligation
where
    u8: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.bump, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for InitObligation
where
    u8: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            bump: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for InitObligation {
    fn data(&self) -> Vec<u8> {
        let mut d = [251, 10, 231, 76, 27, 11, 159, 96].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct SetMarketOwner {
    pub new_owner: Pubkey,
}
impl borsh::ser::BorshSerialize for SetMarketOwner
where
    Pubkey: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.new_owner, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for SetMarketOwner
where
    Pubkey: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            new_owner: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for SetMarketOwner {
    fn data(&self) -> Vec<u8> {
        let mut d = [166, 195, 167, 232, 32, 198, 184, 182].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct SetMarketFlags {
    pub flags: u64,
}
impl borsh::ser::BorshSerialize for SetMarketFlags
where
    u64: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.flags, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for SetMarketFlags
where
    u64: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            flags: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for SetMarketFlags {
    fn data(&self) -> Vec<u8> {
        let mut d = [73, 138, 236, 76, 82, 179, 94, 155].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct CloseDepositAccount {
    pub bump: u8,
}
impl borsh::ser::BorshSerialize for CloseDepositAccount
where
    u8: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.bump, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for CloseDepositAccount
where
    u8: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            bump: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for CloseDepositAccount {
    fn data(&self) -> Vec<u8> {
        let mut d = [152, 6, 13, 164, 50, 219, 225, 43].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct CloseCollateralAccount {
    pub bump: u8,
}
impl borsh::ser::BorshSerialize for CloseCollateralAccount
where
    u8: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.bump, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for CloseCollateralAccount
where
    u8: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            bump: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for CloseCollateralAccount {
    fn data(&self) -> Vec<u8> {
        let mut d = [106, 184, 133, 142, 131, 191, 224, 29].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct CloseLoanAccount {
    pub bump: u8,
}
impl borsh::ser::BorshSerialize for CloseLoanAccount
where
    u8: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.bump, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for CloseLoanAccount
where
    u8: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            bump: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for CloseLoanAccount {
    fn data(&self) -> Vec<u8> {
        let mut d = [137, 207, 106, 190, 122, 27, 176, 193].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct CloseObligation {
    pub bump: u8,
}
impl borsh::ser::BorshSerialize for CloseObligation
where
    u8: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.bump, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for CloseObligation
where
    u8: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            bump: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for CloseObligation {
    fn data(&self) -> Vec<u8> {
        let mut d = [178, 182, 18, 237, 158, 158, 51, 124].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct Deposit {
    pub bump: u8,
    pub amount: Amount,
}
impl borsh::ser::BorshSerialize for Deposit
where
    u8: borsh::ser::BorshSerialize,
    Amount: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.bump, writer)?;
        borsh::BorshSerialize::serialize(&self.amount, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for Deposit
where
    u8: borsh::BorshDeserialize,
    Amount: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            bump: borsh::BorshDeserialize::deserialize(buf)?,
            amount: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for Deposit {
    fn data(&self) -> Vec<u8> {
        let mut d = [242, 35, 198, 137, 82, 225, 242, 182].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct DepositTokens {
    pub amount: Amount,
}
impl borsh::ser::BorshSerialize for DepositTokens
where
    Amount: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.amount, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for DepositTokens
where
    Amount: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            amount: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for DepositTokens {
    fn data(&self) -> Vec<u8> {
        let mut d = [176, 83, 229, 18, 191, 143, 176, 150].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct Withdraw {
    pub bump: u8,
    pub amount: Amount,
}
impl borsh::ser::BorshSerialize for Withdraw
where
    u8: borsh::ser::BorshSerialize,
    Amount: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.bump, writer)?;
        borsh::BorshSerialize::serialize(&self.amount, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for Withdraw
where
    u8: borsh::BorshDeserialize,
    Amount: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            bump: borsh::BorshDeserialize::deserialize(buf)?,
            amount: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for Withdraw {
    fn data(&self) -> Vec<u8> {
        let mut d = [183, 18, 70, 156, 148, 109, 161, 34].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct WithdrawTokens {
    pub amount: Amount,
}
impl borsh::ser::BorshSerialize for WithdrawTokens
where
    Amount: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.amount, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for WithdrawTokens
where
    Amount: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            amount: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for WithdrawTokens {
    fn data(&self) -> Vec<u8> {
        let mut d = [2, 4, 225, 61, 19, 182, 106, 170].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct DepositCollateral {
    pub bump: DepositCollateralBumpSeeds,
    pub amount: Amount,
}
impl borsh::ser::BorshSerialize for DepositCollateral
where
    DepositCollateralBumpSeeds: borsh::ser::BorshSerialize,
    Amount: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.bump, writer)?;
        borsh::BorshSerialize::serialize(&self.amount, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for DepositCollateral
where
    DepositCollateralBumpSeeds: borsh::BorshDeserialize,
    Amount: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            bump: borsh::BorshDeserialize::deserialize(buf)?,
            amount: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for DepositCollateral {
    fn data(&self) -> Vec<u8> {
        let mut d = [156, 131, 142, 116, 146, 247, 162, 120].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct WithdrawCollateral {
    pub bump: WithdrawCollateralBumpSeeds,
    pub amount: Amount,
}
impl borsh::ser::BorshSerialize for WithdrawCollateral
where
    WithdrawCollateralBumpSeeds: borsh::ser::BorshSerialize,
    Amount: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.bump, writer)?;
        borsh::BorshSerialize::serialize(&self.amount, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for WithdrawCollateral
where
    WithdrawCollateralBumpSeeds: borsh::BorshDeserialize,
    Amount: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            bump: borsh::BorshDeserialize::deserialize(buf)?,
            amount: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for WithdrawCollateral {
    fn data(&self) -> Vec<u8> {
        let mut d = [115, 135, 168, 106, 139, 214, 138, 150].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct Borrow {
    pub bump: u8,
    pub amount: Amount,
}
impl borsh::ser::BorshSerialize for Borrow
where
    u8: borsh::ser::BorshSerialize,
    Amount: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.bump, writer)?;
        borsh::BorshSerialize::serialize(&self.amount, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for Borrow
where
    u8: borsh::BorshDeserialize,
    Amount: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            bump: borsh::BorshDeserialize::deserialize(buf)?,
            amount: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for Borrow {
    fn data(&self) -> Vec<u8> {
        let mut d = [228, 253, 131, 202, 207, 116, 89, 18].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct Repay {
    pub amount: Amount,
}
impl borsh::ser::BorshSerialize for Repay
where
    Amount: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.amount, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for Repay
where
    Amount: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            amount: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for Repay {
    fn data(&self) -> Vec<u8> {
        let mut d = [234, 103, 67, 82, 208, 234, 219, 166].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct Liquidate {
    pub amount: Amount,
    pub min_collateral: u64,
}
impl borsh::ser::BorshSerialize for Liquidate
where
    Amount: borsh::ser::BorshSerialize,
    u64: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.amount, writer)?;
        borsh::BorshSerialize::serialize(&self.min_collateral, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for Liquidate
where
    Amount: borsh::BorshDeserialize,
    u64: borsh::BorshDeserialize,
{
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            amount: borsh::BorshDeserialize::deserialize(buf)?,
            min_collateral: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl anchor_lang::InstructionData for Liquidate {
    fn data(&self) -> Vec<u8> {
        let mut d = [223, 179, 226, 125, 48, 46, 39, 74].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct MockLiquidateDex;
impl borsh::ser::BorshSerialize for MockLiquidateDex {
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for MockLiquidateDex {
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {})
    }
}
impl anchor_lang::InstructionData for MockLiquidateDex {
    fn data(&self) -> Vec<u8> {
        let mut d = [247, 195, 172, 177, 64, 18, 23, 209].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
/// Instruction.
pub struct RefreshReserve;
impl borsh::ser::BorshSerialize for RefreshReserve {
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for RefreshReserve {
    fn deserialize(buf: &mut &[u8]) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {})
    }
}
impl anchor_lang::InstructionData for RefreshReserve {
    fn data(&self) -> Vec<u8> {
        let mut d = [2, 218, 138, 235, 79, 201, 25, 102].to_vec();
        d.append(&mut self.try_to_vec().expect("Should always serialize"));
        d
    }
}
