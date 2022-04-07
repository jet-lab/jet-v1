use crate::*;

pub struct InitializeCollateralAccount<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub obligation: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub reserve: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_note_mint: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub owner: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub collateral_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub system_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub rent: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}

#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for InitializeCollateralAccount<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.obligation),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.reserve),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.deposit_note_mint),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.owner),
            true,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.collateral_account),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_program),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.system_program),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.rent),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for InitializeCollateralAccount<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.obligation,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.reserve));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_note_mint,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.owner));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.collateral_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_program,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.system_program,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.rent));
        account_infos
    }
}
pub struct InitializeDepositAccount<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub reserve: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_note_mint: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub depositor: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub system_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub rent: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}

#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for InitializeDepositAccount<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.reserve),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.deposit_note_mint),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.depositor),
            true,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.deposit_account),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_program),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.system_program),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.rent),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for InitializeDepositAccount<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.reserve));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_note_mint,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.depositor));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_program,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.system_program,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.rent));
        account_infos
    }
}

pub struct InitializeLoanAccount<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub obligation: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub reserve: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub loan_note_mint: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub owner: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub loan_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub system_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub rent: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for InitializeLoanAccount<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.obligation),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.reserve),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.loan_note_mint),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.owner),
            true,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.loan_account),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_program),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.system_program),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.rent),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for InitializeLoanAccount<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.obligation,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.reserve));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.loan_note_mint,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.owner));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.loan_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_program,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.system_program,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.rent));
        account_infos
    }
}

pub struct InitializeMarket<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for InitializeMarket<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.market),
            false,
        ));
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for InitializeMarket<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos
    }
}

pub struct InitializeObligation<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub borrower: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub obligation: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub system_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for InitializeObligation<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.borrower),
            true,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.obligation),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_program),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.system_program),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for InitializeObligation<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.borrower));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.obligation,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_program,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.system_program,
        ));
        account_infos
    }
}

pub struct InitializeReserve<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub reserve: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub vault: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub fee_note_vault: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub dex_swap_tokens: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub dex_open_orders: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub dex_market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_mint: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub dex_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub oracle_price: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub oracle_product: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_note_mint: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub loan_note_mint: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub quote_token_mint: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub owner: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub system_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub rent: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for InitializeReserve<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.market),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.reserve),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.vault),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.fee_note_vault),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.dex_swap_tokens),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.dex_open_orders),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.dex_market),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_mint),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_program),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.dex_program),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.oracle_price),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.oracle_product),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.deposit_note_mint),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.loan_note_mint),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.quote_token_mint),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.owner),
                true,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.system_program),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.rent),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for InitializeReserve<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.reserve));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.vault));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.fee_note_vault,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.dex_swap_tokens,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.dex_open_orders,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.dex_market,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_mint,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_program,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.dex_program,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.oracle_price,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.oracle_product,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_note_mint,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.loan_note_mint,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.quote_token_mint,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.owner));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.system_program,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.rent));
        account_infos
    }
}

pub struct SetMarketFlags<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub owner: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for SetMarketFlags<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.market),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.owner),
                true,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for SetMarketFlags<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.owner));
        account_infos
    }
}

pub struct SetMarketOwner<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub owner: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for SetMarketOwner<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.market),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.owner),
                true,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for SetMarketOwner<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.owner));
        account_infos
    }
}

pub struct CloseCollateralAccount<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub obligation: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub owner: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub collateral_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for CloseCollateralAccount<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.obligation),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.owner),
            true,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.collateral_account),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.deposit_account),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_program),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for CloseCollateralAccount<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.obligation,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.owner));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.collateral_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_program,
        ));
        account_infos
    }
}

pub struct CloseDepositAccount<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub reserve: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub vault: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_note_mint: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub depositor: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub receiver_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for CloseDepositAccount<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.reserve),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.vault),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.deposit_note_mint),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.depositor),
            true,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.deposit_account),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.receiver_account),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_program),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for CloseDepositAccount<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.reserve));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.vault));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_note_mint,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.depositor));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.receiver_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_program,
        ));
        account_infos
    }
}

pub struct CloseLoanAccount<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub obligation: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub owner: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub loan_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for CloseLoanAccount<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.obligation),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.owner),
            true,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.loan_account),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_program),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for CloseLoanAccount<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.obligation,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.owner));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.loan_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_program,
        ));
        account_infos
    }
}

pub struct CloseObligation<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub owner: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub obligation: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for CloseObligation<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.owner),
            true,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.obligation),
            false,
        ));
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for CloseObligation<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.owner));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.obligation,
        ));
        account_infos
    }
}

pub struct Borrow<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub obligation: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub reserve: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub vault: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub loan_note_mint: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub borrower: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub loan_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub receiver_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for Borrow<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.obligation),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.reserve),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.vault),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.loan_note_mint),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.borrower),
                true,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.loan_account),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.receiver_account),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_program),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for Borrow<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.obligation,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.reserve));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.vault));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.loan_note_mint,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.borrower));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.loan_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.receiver_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_program,
        ));
        account_infos
    }
}

pub struct Deposit<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub reserve: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub vault: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_note_mint: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub depositor: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_source: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for Deposit<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.reserve),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.vault),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.deposit_note_mint),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.depositor),
                true,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.deposit_account),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.deposit_source),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_program),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for Deposit<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.reserve));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.vault));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_note_mint,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.depositor));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_source,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_program,
        ));
        account_infos
    }
}

pub struct DepositCollateral<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub reserve: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub obligation: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub owner: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub collateral_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for DepositCollateral<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.reserve),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.obligation),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.owner),
                true,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.deposit_account),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.collateral_account),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_program),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for DepositCollateral<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.reserve));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.obligation,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.owner));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.collateral_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_program,
        ));
        account_infos
    }
}

pub struct DepositTokens<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub reserve: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub vault: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_note_mint: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub depositor: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_note_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_source: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for DepositTokens<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.reserve),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.vault),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.deposit_note_mint),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.depositor),
                true,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.deposit_note_account),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.deposit_source),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_program),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for DepositTokens<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.reserve));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.vault));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_note_mint,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.depositor));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_note_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_source,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_program,
        ));
        account_infos
    }
}

pub struct Liquidate<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub obligation: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub reserve: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub collateral_reserve: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub vault: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub loan_note_mint: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub loan_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub collateral_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub payer_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub receiver_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub payer: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for Liquidate<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.obligation),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.reserve),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.collateral_reserve),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.vault),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.loan_note_mint),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.loan_account),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.collateral_account),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.payer_account),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.receiver_account),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.payer),
                true,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_program),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for Liquidate<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.obligation,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.reserve));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.collateral_reserve,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.vault));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.loan_note_mint,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.loan_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.collateral_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.payer_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.receiver_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.payer));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_program,
        ));
        account_infos
    }
}

pub struct DexMarketAccounts<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub open_orders: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub request_queue: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub event_queue: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub bids: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub asks: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub coin_vault: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub pc_vault: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub vault_signer: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for DexMarketAccounts<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.market),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.open_orders),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.request_queue),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.event_queue),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.bids),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.asks),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.coin_vault),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.pc_vault),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.vault_signer),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for DexMarketAccounts<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.open_orders,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.request_queue,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.event_queue,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.bids));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.asks));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.coin_vault,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.pc_vault));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.vault_signer,
        ));
        account_infos
    }
}

pub struct RefreshReserve<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub reserve: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub fee_note_vault: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_note_mint: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub pyth_oracle_price: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for RefreshReserve<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.market),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.reserve),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.fee_note_vault),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.deposit_note_mint),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.pyth_oracle_price),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_program),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for RefreshReserve<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.reserve));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.fee_note_vault,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_note_mint,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.pyth_oracle_price,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_program,
        ));
        account_infos
    }
}

pub struct Repay<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub obligation: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub reserve: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub vault: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub loan_note_mint: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub loan_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub payer_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub payer: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for Repay<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.obligation),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.reserve),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.vault),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.loan_note_mint),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.loan_account),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.payer_account),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.payer),
                true,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_program),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for Repay<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.obligation,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.reserve));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.vault));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.loan_note_mint,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.loan_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.payer_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.payer));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_program,
        ));
        account_infos
    }
}

pub struct UpdateReserveConfig<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub reserve: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub owner: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for UpdateReserveConfig<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.reserve),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.owner),
                true,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for UpdateReserveConfig<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.reserve));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.owner));
        account_infos
    }
}

pub struct Withdraw<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub reserve: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub vault: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_note_mint: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub depositor: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub withdraw_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub jet_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for Withdraw<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.reserve),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.vault),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.deposit_note_mint),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.depositor),
                true,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.deposit_account),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.withdraw_account),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.jet_program),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_program),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for Withdraw<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.reserve));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.vault));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_note_mint,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.depositor));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.withdraw_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.jet_program,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_program,
        ));
        account_infos
    }
}

pub struct WithdrawCollateral<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub reserve: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub obligation: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub owner: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub collateral_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for WithdrawCollateral<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.reserve),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.obligation),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.owner),
                true,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.deposit_account),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.collateral_account),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_program),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for WithdrawCollateral<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.reserve));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.obligation,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.owner));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.collateral_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_program,
        ));
        account_infos
    }
}

pub struct WithdrawTokens<'info> {
    pub market: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub market_authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub reserve: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub vault: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_note_mint: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub depositor: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub deposit_note_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub withdraw_account: anchor_lang::solana_program::account_info::AccountInfo<'info>,
    pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for WithdrawTokens<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = Vec::new();
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market),
                false,
            ),
        );
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.market_authority),
                false,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.reserve),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.vault),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.deposit_note_mint),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.depositor),
                true,
            ),
        );
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.deposit_note_account),
            false,
        ));
        account_metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
            anchor_lang::Key::key(&self.withdraw_account),
            false,
        ));
        account_metas.push(
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                anchor_lang::Key::key(&self.token_program),
                false,
            ),
        );
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for WithdrawTokens<'info> {
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = Vec::new();
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.market));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.market_authority,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.reserve));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.vault));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_note_mint,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(&self.depositor));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.deposit_note_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.withdraw_account,
        ));
        account_infos.push(anchor_lang::ToAccountInfo::to_account_info(
            &self.token_program,
        ));
        account_infos
    }
}
