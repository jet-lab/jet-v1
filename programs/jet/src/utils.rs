// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2021 JET PROTOCOL HOLDINGS, LLC.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use std::{
    cell::RefMut,
    fmt::Display,
    ops::{Deref, DerefMut},
};

use anchor_lang::prelude::*;
use anchor_spl::dex::serum_dex::state::{Market as DexMarket, ToAlignedBytes};
use bytemuck::{Pod, Zeroable};

use crate::errors::ErrorCode;

pub fn read_pyth_product_attribute<'d>(data: &'d [u8], attribute: &[u8]) -> Option<&'d [u8]> {
    let mut idx = 0;

    while idx < data.len() {
        let key_len = data[idx] as usize;
        idx += 1;

        if key_len == 0 {
            continue;
        }

        let key = &data[idx..idx + key_len];
        idx += key_len;

        let val_len = data[idx] as usize;
        idx += 1;

        let value = &data[idx..idx + val_len];
        idx += val_len;

        if key == attribute {
            return Some(value);
        }
    }

    None
}

pub fn verify_dex_market_tokens(
    market: &AccountInfo,
    program: &Pubkey,
    expected_base_mint: &Pubkey,
    expected_quote_mint: &Pubkey,
) -> ProgramResult {
    let market_state = DexMarket::load(market, program)?;
    let market_v1 = match market_state {
        DexMarket::V1(v1) => v1,
        DexMarket::V2(v2) => RefMut::map(v2, |m| &mut m.inner),
    };

    let expected_base_mint = expected_base_mint.to_aligned_bytes();
    let expected_quote_mint = expected_quote_mint.to_aligned_bytes();

    if { market_v1.coin_mint } != expected_base_mint || { market_v1.pc_mint } != expected_quote_mint
    {
        return Err(ErrorCode::InvalidDexMarketMints.into());
    }

    Ok(())
}

/// Workaround for the fact that `Pubkey` doesn't implement the
/// `Pod` trait (even though it meets the requirements), and there
/// isn't really a way for us to extend the original type, so we wrap
/// it in a new one.
#[derive(Eq, PartialEq, Clone, Copy)]
#[repr(transparent)]
pub struct StoredPubkey(Pubkey);
static_assertions::const_assert_eq!(32, std::mem::size_of::<StoredPubkey>());

unsafe impl Pod for StoredPubkey {}
unsafe impl Zeroable for StoredPubkey {}

impl AsRef<Pubkey> for StoredPubkey {
    fn as_ref(&self) -> &Pubkey {
        &self.0
    }
}

impl From<StoredPubkey> for Pubkey {
    fn from(key: StoredPubkey) -> Self {
        key.0
    }
}

impl From<Pubkey> for StoredPubkey {
    fn from(key: Pubkey) -> Self {
        Self(key)
    }
}

impl Deref for StoredPubkey {
    type Target = Pubkey;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl DerefMut for StoredPubkey {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl PartialEq<Pubkey> for StoredPubkey {
    fn eq(&self, other: &Pubkey) -> bool {
        self.0.eq(other)
    }
}

impl std::fmt::Debug for StoredPubkey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        (&self.0 as &dyn std::fmt::Display).fmt(f)
    }
}

impl Display for StoredPubkey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}

/// A fixed-size byte array
#[derive(Clone, Copy)]
#[repr(transparent)]
pub struct FixedBuf<const SIZE: usize> {
    data: [u8; SIZE],
}

static_assertions::const_assert_eq!(0, std::mem::size_of::<FixedBuf<0>>());
static_assertions::const_assert_eq!(61, std::mem::size_of::<FixedBuf<61>>());

unsafe impl<const SIZE: usize> Pod for FixedBuf<SIZE> {}
unsafe impl<const SIZE: usize> Zeroable for FixedBuf<SIZE> {}

impl<const SIZE: usize> std::fmt::Debug for FixedBuf<SIZE> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "FixedBuf<{}>", SIZE)
    }
}

impl<const SIZE: usize> AsRef<[u8]> for FixedBuf<SIZE> {
    fn as_ref(&self) -> &[u8] {
        &self.data
    }
}

impl<const SIZE: usize> AsMut<[u8]> for FixedBuf<SIZE> {
    fn as_mut(&mut self) -> &mut [u8] {
        &mut self.data
    }
}

impl<const SIZE: usize> Deref for FixedBuf<SIZE> {
    type Target = [u8];

    fn deref(&self) -> &Self::Target {
        &self.data
    }
}

impl<const SIZE: usize> DerefMut for FixedBuf<SIZE> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.data
    }
}

impl<const SIZE: usize> borsh::BorshDeserialize for FixedBuf<SIZE> {
    fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let mut data = [0u8; SIZE];
        data.copy_from_slice(buf);

        Ok(FixedBuf { data })
    }
}

impl<const SIZE: usize> borsh::BorshSerialize for FixedBuf<SIZE> {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        let _ = writer.write(&self.data)?;
        Ok(())
    }
}

pub enum JobCompletion {
    Partial,
    Full,
}
