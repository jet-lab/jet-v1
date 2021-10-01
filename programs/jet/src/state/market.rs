use std::ops::{Deref, DerefMut};

use anchor_lang::prelude::*;
use bytemuck::{Pod, Zeroable};
use pyth_client::Product;

use jet_math::Number;
use jet_proc_macros::assert_size;

use crate::errors::ErrorCode;
use crate::utils::{FixedBuf, StoredPubkey};

use super::Cache;

/// Lending market account
#[assert_size(12800)]
#[account(zero_copy)]
pub struct Market {
    pub version: u32,

    /// The exponent used for quote prices
    pub quote_exponent: i32,

    /// The currency used for quote prices
    pub quote_currency: [u8; 15],

    /// The bump seed value for generating the authority address.
    pub authority_bump_seed: [u8; 1],

    /// The address used as the seed for generating the market authority
    /// address. Typically this is the market account's own address.
    pub authority_seed: Pubkey,

    /// The account derived by the program, which has authority over all
    /// assets in the market.
    pub market_authority: Pubkey,

    /// The account that has authority to make changes to the market
    pub owner: Pubkey,

    /// The mint for the token used to quote the value for reserve assets.
    pub quote_token_mint: Pubkey,

    /// Storage for flags that can be set on the market.
    pub flags: u64,

    /// Unused space before start of reserve list
    _reserved: [u8; 352],

    /// The storage for information on reserves in the market
    reserves: [u8; 12288],
}

impl Market {
    /// Validate that the oracles for a reserve match
    ///
    /// 1) Checks that the product quote currency matches the one set on
    /// the market.
    ///
    /// 2) Checks that the price account address is the same mentioned in
    /// the product.
    pub fn validate_oracle(&self, product: &Product, price: &Pubkey) -> Result<(), ErrorCode> {
        let quote_currency =
            match crate::utils::read_pyth_product_attribute(&product.attr, b"quote_currency") {
                None => return Err(ErrorCode::InvalidOracle.into()),
                Some(name) => std::str::from_utf8(name).unwrap(),
            };

        if self.quote_currency() != quote_currency {
            msg!(
                "oracle quote currency doesn't match the market's: '{}' vs '{}'",
                quote_currency,
                self.quote_currency()
            );

            return Err(ErrorCode::InvalidOracle.into());
        }

        if &product.px_acc.val[..] != price.to_bytes() {
            msg!("oracle product and price accounts don't match");
            return Err(ErrorCode::InvalidOracle.into());
        }

        Ok(())
    }

    /// Gets the name of the currency used for quotes
    pub fn quote_currency(&self) -> &str {
        let end = self.quote_currency.iter().position(|c| *c == 0).unwrap();
        std::str::from_utf8(&self.quote_currency[..end]).unwrap()
    }

    /// Gets the authority seeds for signing requests with the
    /// market authority address.
    pub fn authority_seeds(&self) -> [&[u8]; 2] {
        [self.authority_seed.as_ref(), &self.authority_bump_seed]
    }

    pub fn reserves_mut(&mut self) -> &mut MarketReserves {
        bytemuck::from_bytes_mut(&mut self.reserves)
    }

    pub fn reserves(&self) -> &MarketReserves {
        bytemuck::from_bytes(&self.reserves)
    }

    /// Get the current flags set on the market
    pub fn flags(&self) -> MarketFlags {
        MarketFlags::from_bits(self.flags).unwrap()
    }

    /// Set new flags on the market
    pub fn reset_flags(&mut self, flags: MarketFlags) {
        self.flags = flags.bits();
    }

    /// Verify that the market is currently allowing deposits and withdrawls
    pub fn verify_ability_deposit_withdraw(&self) -> Result<(), ErrorCode> {
        if self.flags().contains(MarketFlags::HALT_DEPOSITS) {
            msg!("the market is currently not allowing deposits/withdrawls");
            return Err(ErrorCode::MarketHalted);
        }

        Ok(())
    }

    /// Verify that the market is currently allowing changes to borrows
    pub fn verify_ability_borrow(&self) -> Result<(), ErrorCode> {
        if self.flags().contains(MarketFlags::HALT_BORROWS) {
            msg!("the market is currently not allowing borrows");
            return Err(ErrorCode::MarketHalted);
        }

        Ok(())
    }

    /// Verify that the market is currently allowing repayments to loans
    pub fn verify_ability_repay(&self) -> Result<(), ErrorCode> {
        if self.flags().contains(MarketFlags::HALT_REPAYS) {
            msg!("the market is currently not allowing borrows");
            return Err(ErrorCode::MarketHalted);
        }

        Ok(())
    }
}

#[assert_size(aligns, 12288)]
#[derive(Pod, Zeroable, Clone, Copy)]
#[repr(C)]
pub struct MarketReserves {
    /// Tracks the current prices of the tokens in reserve accounts
    reserve_info: [ReserveInfo; 32],
}

pub type ReserveIndex = u16;

impl MarketReserves {
    pub fn register(&mut self, reserve: &Pubkey) -> Result<ReserveIndex, ErrorCode> {
        for (index, entry) in self.reserve_info.iter_mut().enumerate() {
            if entry.reserve != Pubkey::default() {
                continue;
            }
            *entry.reserve = *reserve;

            return Ok(index as ReserveIndex);
        }

        Err(ErrorCode::NoFreeReserves)
    }

    pub fn remove(&mut self, index: ReserveIndex) {
        self.reserve_info[index as usize] = ReserveInfo::zeroed();
    }

    pub fn get_mut(&mut self, index: ReserveIndex) -> &mut ReserveInfo {
        &mut self.reserve_info[index as usize]
    }

    pub fn get(&self, index: ReserveIndex) -> &ReserveInfo {
        &self.reserve_info[index as usize]
    }

    pub fn get_cached(&self, index: ReserveIndex, current_slot: u64) -> &CachedReserveInfo {
        let entry = self.get(index);
        match entry.cache.try_get(current_slot) {
            Ok(info) => info,
            Err(_) => {
                msg!("reserve {} is stale in market", entry.reserve);
                msg!(
                    "cached_slot = {}, current_slot = {}",
                    entry.cache.last_updated(),
                    current_slot
                );
                panic!("market reserve is stale");
            }
        }
    }

    pub fn get_cached_mut(
        &mut self,
        index: ReserveIndex,
        current_slot: u64,
    ) -> &mut CachedReserveInfo {
        self.get_mut(index)
            .cache
            .expect_mut(current_slot, "reserve market data is stale")
    }

    pub fn iter(&self) -> impl Iterator<Item = &ReserveInfo> {
        self.reserve_info
            .iter()
            .take_while(|r| r.reserve != Pubkey::default())
    }

    pub fn iter_mut(&mut self) -> impl Iterator<Item = &mut ReserveInfo> {
        self.reserve_info
            .iter_mut()
            .take_while(|r| r.reserve != Pubkey::default())
    }
}

#[assert_size(aligns, 384)]
#[derive(Pod, Zeroable, Clone, Copy)]
#[repr(C)]
pub struct ReserveInfo {
    /// The related reserve account
    pub reserve: StoredPubkey,

    /// Unused space
    _reserved: FixedBuf<80>,

    /// Cached values for the portion of the reserve info that is calculated dynamically
    pub cache: Cache<CachedReserveInfo, 1>,
}

#[assert_size(aligns, 256)]
#[derive(Pod, Zeroable, Clone, Copy, Debug)]
#[repr(C)]
pub struct CachedReserveInfo {
    /// The price of the asset being stored in the reserve account.
    /// USD per smallest unit (1u64) of a token
    pub price: Number,

    /// The value of the deposit note (unit: reserve tokens per note token)
    pub deposit_note_exchange_rate: Number,

    /// The value of the loan note (unit: reserve tokens per note token)
    pub loan_note_exchange_rate: Number,

    /// The minimum allowable collateralization ratio for a loan on this reserve
    pub min_collateral_ratio: Number,

    /// The bonus awarded to liquidators when repaying a loan in exchange for a
    /// collateral asset.
    pub liquidation_bonus: u16,

    /// Unused space
    _reserved: FixedBuf<158>,
}

impl CachedReserveInfo {
    /// USD per smallest unit (1u64) of the deposit note
    pub fn deposit_note_price(&self) -> Number {
        self.deposit_note_exchange_rate * self.price
    }

    /// USD per smallest unit (1u64) of the loan note
    pub fn loan_note_price(&self) -> Number {
        self.loan_note_exchange_rate * self.price
    }

    /// Convert loan notes into the equivalent value of tokens
    pub fn loan_notes_to_tokens(&self, notes: u64) -> u64 {
        (self.loan_note_exchange_rate * Number::from(notes)).as_u64(0)
    }

    /// Convert a token amount into the equivalent value of loan notes
    pub fn loan_notes_from_tokens(&self, tokens: u64) -> u64 {
        (Number::from(tokens) / self.loan_note_exchange_rate).as_u64(0)
    }

    /// Convert deposit notes into the equivalent value of tokens
    pub fn deposit_notes_to_tokens(&self, notes: u64) -> u64 {
        (self.deposit_note_exchange_rate * Number::from(notes)).as_u64(0)
    }

    /// Convert a token amount into the equivalent value of deposit notes
    pub fn deposit_notes_from_tokens(&self, tokens: u64) -> u64 {
        (Number::from(tokens) / self.deposit_note_exchange_rate).as_u64(0)
    }
}

impl Deref for ReserveInfo {
    type Target = Cache<CachedReserveInfo, 1>;

    fn deref(&self) -> &Self::Target {
        &self.cache
    }
}

impl DerefMut for ReserveInfo {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.cache
    }
}

impl ReserveInfo {
    pub fn unwrap(&self, current_slot: u64) -> &CachedReserveInfo {
        self.try_get(current_slot)
            .expect(&format!("reserve {}", self.reserve))
    }

    pub fn unwrap_mut(&mut self, current_slot: u64) -> &mut CachedReserveInfo {
        let key = self.reserve;
        self.try_get_mut(current_slot)
            .expect(&format!("reserve {}", key))
    }
}

bitflags::bitflags! {
    pub struct MarketFlags: u64 {
        /// Disable all borrowing and collateral withdrawls
        const HALT_BORROWS = 1 << 0;

        /// Disable repaying loans
        const HALT_REPAYS = 1 << 1;

        /// Disable deposits + withdrawls
        const HALT_DEPOSITS = 1 << 2;

        /// Disable all operations
        const HALT_ALL = Self::HALT_BORROWS.bits
                       | Self::HALT_REPAYS.bits
                       | Self::HALT_DEPOSITS.bits;

    }
}
