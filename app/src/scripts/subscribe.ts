// Subscribe to solana accounts
// Todo: keep subscription IDs and unsubscribe at end of lifetime

import type { Connection } from "@solana/web3.js";
import type * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import { parsePriceData } from "@pythnetwork/client";
import type { Asset, AssetStore, IdlMetadata, Market, Reserve } from "../models/JetTypes";
import { ASSETS, MARKET, PING } from "../store";
import { getAccountInfoAndSubscribe, getMintInfoAndSubscribe, getTokenAccountAndSubscribe, parseMarketAccount, parseObligationAccount, parseReserveAccount, SOL_DECIMALS, getCcRate, getBorrowRate, getDepositRate } from "./programUtil";
import { TokenAmount } from "./util";
import { MarketReserveInfoList } from "./layout";

let assetStore: AssetStore | null;
let market: Market;
ASSETS.subscribe(data => assetStore = data);
MARKET.subscribe(data => market = data);

export const subscribeToMarket = async (idlMeta: IdlMetadata, connection: anchor.web3.Connection, coder: anchor.Coder) => {
  let promise: Promise<number>;
  const promises: Promise<number>[] = [];

  // Market subscription 
  let timeStart = Date.now();
  promise = getAccountInfoAndSubscribe(connection, idlMeta.market.market, account => {
    if (account != null) {
      MARKET.update(market => {
        console.assert(MarketReserveInfoList.span == 12288);
        const decoded = parseMarketAccount(account.data, coder);
        for (const reserveStruct of decoded.reserves) {
          for (const abbrev in market.reserves) {
            if (market.reserves[abbrev].accountPubkey.equals(reserveStruct.reserve) && assetStore) {
              const reserve = market.reserves[abbrev];

              reserve.liquidationPremium = reserveStruct.liquidationBonus;
              reserve.depositNoteExchangeRate = reserveStruct.depositNoteExchangeRate;
              reserve.loanNoteExchangeRate = reserveStruct.loanNoteExchangeRate;

              deriveValues(reserve, assetStore.tokens[abbrev]);

              break;
            }
          }
        }
        return market;
      })
    }
  });
  // Set ping of RPC call
  promise.then(() => {
    let timeEnd = Date.now();
    PING.set(timeEnd - timeStart);
  });
  promises.push(promise);


  for (const reserveMeta of idlMeta.reserves) {
    // Reserve
    promise = getAccountInfoAndSubscribe(connection, reserveMeta.accounts.reserve, account => {
      if (account != null) {
        MARKET.update(market => {
          const decoded = parseReserveAccount(account.data, coder);
          market.minColRatio = decoded.config.minCollateralRatio / 10000;

          const reserve = market.reserves[reserveMeta.abbrev];

          reserve.maximumLTV = decoded.config.minCollateralRatio;
          reserve.liquidationPremium = decoded.config.liquidationPremium;
          reserve.outstandingDebt = new TokenAmount(decoded.state.outstandingDebt, reserveMeta.decimals).divb(new BN(Math.pow(10, 15)));
          reserve.accruedUntil = decoded.state.accruedUntil;
          reserve.config = decoded.config;

          deriveValues(reserve, assetStore?.tokens[reserveMeta.abbrev]);

          return market;
        })
      }
    });
    promises.push(promise);

    // Deposit Note Mint
    promise = getMintInfoAndSubscribe(connection, reserveMeta.accounts.depositNoteMint, amount => {
      if (amount != null) {
        MARKET.update(market => {
          let reserve = market.reserves[reserveMeta.abbrev];
          reserve.depositNoteMint = amount;

          deriveValues(reserve, assetStore?.tokens[reserveMeta.abbrev]);

          return market;
        });
      }
    });
    promises.push(promise);

    // Loan Note Mint
    promise = getMintInfoAndSubscribe(connection, reserveMeta.accounts.loanNoteMint, amount => {
      if (amount != null) {
        MARKET.update(market => {
          let reserve = market.reserves[reserveMeta.abbrev];
          reserve.loanNoteMint = amount;

          deriveValues(reserve, assetStore?.tokens[reserveMeta.abbrev]);

          return market;
        });
      }
    });
    promises.push(promise);

    // Reserve Vault
    promise = getTokenAccountAndSubscribe(connection, reserveMeta.accounts.vault, reserveMeta.decimals, amount => {
      if (amount != null) {
        MARKET.update(market => {
          let reserve = market.reserves[reserveMeta.abbrev];
          reserve.availableLiquidity = amount;

          deriveValues(reserve, assetStore?.tokens[reserveMeta.abbrev]);

          return market;
        });
      }
    });
    promises.push(promise);

    // Reserve Token Mint
    promise = getMintInfoAndSubscribe(connection, reserveMeta.accounts.tokenMint, amount => {
      if (amount != null) {
        MARKET.update(market => {
          let reserve = market.reserves[reserveMeta.abbrev];
          reserve.tokenMint = amount;

          deriveValues(reserve, assetStore?.tokens[reserveMeta.abbrev]);

          return market;
        });
      }
    });
    promises.push(promise);

    // Pyth Price
    promise = getAccountInfoAndSubscribe(connection, reserveMeta.accounts.pythPrice, account => {
      if (account != null) {
        MARKET.update(market => {
          let reserve = market.reserves[reserveMeta.abbrev];
          reserve.price = parsePriceData(account.data).price;

          deriveValues(reserve, assetStore?.tokens[reserveMeta.abbrev]);

          return market;
        });
      }
    });
    promises.push(promise);
  }

  return await Promise.all(promises);
};

export const subscribeToAssets = async (connection: Connection, coder: anchor.Coder, wallet: anchor.web3.PublicKey) => {
  let promise: Promise<number>;
  let promises: Promise<number>[] = [];
  if (assetStore == null) {
    return;
  }

  // Wallet native SOL balance
  promise = getAccountInfoAndSubscribe(connection, wallet, account => {
    ASSETS.update(asset => {
      if (asset) {
        // Need to be careful constructing a BN from a number.
        // If the user has more than 2^53 lamports it will throw for not having enough precision.
        asset.sol = new TokenAmount(new BN(account?.lamports.toString() ?? "0"), SOL_DECIMALS);
      }
      return asset;
    });
  });
  promises.push(promise);

  // Obligation
  promise = getAccountInfoAndSubscribe(connection, assetStore.obligationPubkey, account => {
    if (account != null) {
      ASSETS.update(asset => {
        if (asset) {
          asset.obligation = {
            ...account,
            data: parseObligationAccount(account.data, coder),
          };
        }
        return asset;
      });
    }
  })
  promises.push(promise);

  for (const abbrev in assetStore.tokens) {
    const asset = assetStore.tokens[abbrev];
    const reserve = market.reserves[abbrev];

    // Wallet token account
    promise = getTokenAccountAndSubscribe(connection, asset.walletTokenPubkey, reserve.decimals, amount => {
      ASSETS.update(asset => {
        if (asset) {
          asset.tokens[reserve.abbrev].walletTokenBalance = amount ?? new TokenAmount(new BN(0), reserve.decimals);
          asset.tokens[reserve.abbrev].walletTokenExists = !!amount;

          deriveValues(market.reserves[reserve.abbrev], asset.tokens[reserve.abbrev]);
        }
        return asset;
      });
    });
    promises.push(promise);

    // Reserve deposit notes
    promise = getTokenAccountAndSubscribe(connection, asset.depositNoteDestPubkey, reserve.decimals, amount => {
      ASSETS.update(asset => {
        if (asset) {
          asset.tokens[reserve.abbrev].depositNoteDestBalance = amount ?? TokenAmount.zero(reserve.decimals);
          asset.tokens[reserve.abbrev].depositNoteDestExists = !!amount;

          deriveValues(market.reserves[reserve.abbrev], asset.tokens[reserve.abbrev]);
        }
        return asset;
      });
    })
    promises.push(promise);

    // Deposit notes account
    promise = getTokenAccountAndSubscribe(connection, asset.depositNotePubkey, reserve.decimals, amount => {
      ASSETS.update(asset => {
        if (asset) {
          asset.tokens[reserve.abbrev].depositNoteBalance = amount ?? TokenAmount.zero(reserve.decimals);
          asset.tokens[reserve.abbrev].depositNoteExists = !!amount;

          deriveValues(market.reserves[reserve.abbrev], asset.tokens[reserve.abbrev]);
        }
        return asset;
      });
    })
    promises.push(promise);

    // Obligation loan notes
    promise = getTokenAccountAndSubscribe(connection, asset.loanNotePubkey, reserve.decimals, amount => {
      ASSETS.update(asset => {
        if (asset) {
          asset.tokens[reserve.abbrev].loanNoteBalance = amount ?? TokenAmount.zero(reserve.decimals);
          asset.tokens[reserve.abbrev].loanNoteExists = !!amount;

          deriveValues(market.reserves[reserve.abbrev], asset.tokens[reserve.abbrev]);
        }
        return asset;
      })
    })
    promises.push(promise);

    // Obligation collateral notes
    promise = getTokenAccountAndSubscribe(connection, asset.collateralNotePubkey, reserve.decimals, amount => {
      ASSETS.update(asset => {
        if (asset) {
          asset.tokens[reserve.abbrev].collateralNoteBalance = amount ?? TokenAmount.zero(reserve.decimals);
          asset.tokens[reserve.abbrev].collateralNoteExists = !!amount;

          deriveValues(market.reserves[reserve.abbrev], asset.tokens[reserve.abbrev]);
        }
        return asset;
      });
    });
    promises.push(promise);
  }

  return await Promise.all(promises);
};

const deriveValues = (reserve: Reserve, asset: Asset | undefined) => {
  reserve.marketSize = reserve.outstandingDebt.add(reserve.availableLiquidity);
  reserve.utilizationRate = reserve.marketSize.amount.isZero()
    ? 0
    : reserve.outstandingDebt.uiAmountFloat / reserve.marketSize.uiAmountFloat;

  const ccRate = getCcRate(reserve.config, reserve.utilizationRate);
  reserve.borrowRate = getBorrowRate(ccRate, reserve.config.manageFeeRate);
  reserve.depositRate = getDepositRate(ccRate, reserve.utilizationRate);

  if (asset) {
    asset.depositBalance = asset.depositNoteBalance.mulb(reserve.depositNoteExchangeRate).divb(new BN(Math.pow(10, 15)));
    asset.loanBalance = asset.loanNoteBalance.mulb(reserve.loanNoteExchangeRate).divb(new BN(Math.pow(10, 15)));
    asset.collateralBalance = asset.collateralNoteBalance.mulb(reserve.depositNoteExchangeRate).divb(new BN(Math.pow(10, 15)));
  }
};