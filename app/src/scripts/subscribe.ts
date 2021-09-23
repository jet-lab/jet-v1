// Subscribe to solana accounts
// Todo: keep subscription IDs and unsubscribe at end of lifetime

import type { Connection } from "@solana/web3.js";
import type * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import { parsePriceData } from "@pythnetwork/client";
import type { Asset, AssetStore, IdlMetadata, Market, Reserve } from "../models/JetTypes";
import { ASSETS, MARKET } from "../store";
import { getAccountInfoAndSubscribe, getMintInfoAndSubscribe, getTokenAccountAndSubscribe, parseMarketAccount, parseObligationAccount, parseReserveAccount, SOL_DECIMALS, getCcRate, getBorrowRate, getDepositRate } from "./programUtil";
import { TokenAmount } from "./utils";
import { MarketReserveInfoList } from "./layout";

let assetStore: AssetStore | null;
let market: Market;
ASSETS.subscribe(data => assetStore = data);
MARKET.subscribe(data => market = data);

export const subscribeToMarket = (idlMeta: IdlMetadata, connection: anchor.web3.Connection, coder: anchor.Coder) => {
  // Market subscription 
  getAccountInfoAndSubscribe(connection, idlMeta.market.market, account => {
    if (account != null) {
      MARKET.update(market => {
        console.assert(MarketReserveInfoList.span == 12288);
        const decoded = parseMarketAccount(account.data, coder);
        for (const reserveStruct of decoded.reserves) {
          for (const abbrev in market.reserves) {
            if (market.reserves[abbrev].accountPubkey.equals(reserveStruct.reserve)) {
              const reserve = market.reserves[abbrev];

              reserve.liquidationPremium = reserveStruct.liquidationBonus;
              reserve.depositNoteExchangeRate = reserveStruct.depositNoteExchangeRate;
              reserve.loanNoteExchangeRate = reserveStruct.loanNoteExchangeRate;

              deriveValues(market, reserve, assetStore?.tokens[abbrev]);

              break;
            }
          }
        }
        return market;
      })
    }
  });

  for (const reserveMeta of idlMeta.reserves) {
    // Reserve
    getAccountInfoAndSubscribe(connection, reserveMeta.accounts.reserve, account => {
      if (account != null) {
        MARKET.update(market => {
          const decoded = parseReserveAccount(account.data, coder);
          market.minColRatio = decoded.config.minCollateralRatio / 10000;

          const reserve = market.reserves[reserveMeta.abbrev];

          deriveValues(market, reserve, assetStore?.tokens[reserveMeta.abbrev]);

          const ccRate = getCcRate(decoded.config, reserve.outstandingDebt.uiAmountFloat, reserve.marketSize.uiAmountFloat, reserve.utilizationRate);

          reserve.maximumLTV = decoded.config.minCollateralRatio;
          reserve.liquidationPremium = decoded.config.liquidationPremium;
          reserve.outstandingDebt = new TokenAmount(decoded.state.outstandingDebt, reserveMeta.decimals).divb(new BN(Math.pow(10, 15)));
          reserve.accruedUntil = decoded.state.accruedUntil;
          reserve.borrowRate = getBorrowRate(ccRate, decoded.config.manageFeeRate);
          reserve.depositRate = getDepositRate(ccRate, reserve.utilizationRate);

          return market;
        })
      }
    });

    // Deposit Note Mint
    getMintInfoAndSubscribe(connection, reserveMeta.accounts.depositNoteMint, amount => {
      if (amount != null) {
        MARKET.update(market => {
          let reserve = market.reserves[reserveMeta.abbrev];
          reserve.depositNoteMint = amount;

          deriveValues(market, reserve, assetStore?.tokens[reserveMeta.abbrev]);

          return market;
        });
      }
    });

    // Loan Note Mint
    getMintInfoAndSubscribe(connection, reserveMeta.accounts.loanNoteMint, amount => {
      if (amount != null) {
        MARKET.update(market => {
          let reserve = market.reserves[reserveMeta.abbrev];
          reserve.loanNoteMint = amount;

          deriveValues(market, reserve, assetStore?.tokens[reserveMeta.abbrev]);

          return market;
        });
      }
    });

    // Reserve Vault
    getTokenAccountAndSubscribe(connection, reserveMeta.accounts.vault, reserveMeta.decimals, amount => {
      if (amount != null) {
        MARKET.update(market => {
          let reserve = market.reserves[reserveMeta.abbrev];
          reserve.availableLiquidity = amount;

          deriveValues(market, reserve, assetStore?.tokens[reserveMeta.abbrev]);

          return market;
        });
      }
    });

    // Reserve Token Mint
    getMintInfoAndSubscribe(connection, reserveMeta.accounts.tokenMint, amount => {
      if (amount != null) {
        MARKET.update(market => {
          let reserve = market.reserves[reserveMeta.abbrev];
          reserve.tokenMint = amount;

          deriveValues(market, reserve, assetStore?.tokens[reserveMeta.abbrev]);

          return market;
        });
      }
    });

    // Pyth Price
    getAccountInfoAndSubscribe(connection, reserveMeta.accounts.pythPrice, account => {
      if (account != null) {
        MARKET.update(market => {
          let reserve = market.reserves[reserveMeta.abbrev];
          reserve.price = parsePriceData(account.data).price;

          deriveValues(market, reserve, assetStore?.tokens[reserveMeta.abbrev]);

          return market;
        });
      }
    });
  }
};

export const subscribeToAssets = async (connection: Connection, coder: anchor.Coder, wallet: anchor.web3.PublicKey) => {
  if (assetStore == null) {
    return;
  }

  // Wallet native SOL balance
  getAccountInfoAndSubscribe(connection, wallet, account => {
    ASSETS.update(asset => {
      if (asset) {
        // Need to be careful constructing a BN from a number.
        // If the user has more than 2^53 lamports it will throw for not having enough precision.
        asset.sol = new TokenAmount(new BN(account?.lamports.toString() ?? "0"), SOL_DECIMALS);
      }
      return asset;
    });
  });

  // Obligation
  getAccountInfoAndSubscribe(connection, assetStore.obligationPubkey, account => {
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

  for (const abbrev in assetStore.tokens) {
    const asset = assetStore.tokens[abbrev];
    const reserve = market.reserves[abbrev];

    // Wallet token account
    getTokenAccountAndSubscribe(connection, asset.walletTokenPubkey, reserve.decimals, amount => {
      ASSETS.update(asset => {
        if (asset) {
          asset.tokens[reserve.abbrev].walletTokenBalance = amount ?? new TokenAmount(new BN(0), reserve.decimals);
          asset.tokens[reserve.abbrev].walletTokenExists = !!amount;

          deriveValues(market, market.reserves[reserve.abbrev], asset.tokens[reserve.abbrev]);
        }
        return asset;
      });
    });

    // Reserve deposit notes
    getTokenAccountAndSubscribe(connection, asset.depositNoteDestPubkey, reserve.decimals, amount => {
      ASSETS.update(asset => {
        if (asset) {
          asset.tokens[reserve.abbrev].depositNoteDestBalance = amount ?? TokenAmount.zero(reserve.decimals);
          asset.tokens[reserve.abbrev].depositNoteDestExists = !!amount;

          deriveValues(market, market.reserves[reserve.abbrev], asset.tokens[reserve.abbrev]);
        }
        return asset;
      });
    })

    // Deposit notes account
    getTokenAccountAndSubscribe(connection, asset.depositNotePubkey, reserve.decimals, amount => {
      ASSETS.update(asset => {
        if (asset) {
          asset.tokens[reserve.abbrev].depositNoteBalance = amount ?? TokenAmount.zero(reserve.decimals);
          asset.tokens[reserve.abbrev].depositNoteExists = !!amount;

          deriveValues(market, market.reserves[reserve.abbrev], asset.tokens[reserve.abbrev]);
        }
        return asset;
      });
    })

    // Obligation loan notes
    getTokenAccountAndSubscribe(connection, asset.loanNotePubkey, reserve.decimals, amount => {
      ASSETS.update(asset => {
        if (asset) {
          asset.tokens[reserve.abbrev].loanNoteBalance = amount ?? TokenAmount.zero(reserve.decimals);
          asset.tokens[reserve.abbrev].loanNoteExists = !!amount;

          deriveValues(market, market.reserves[reserve.abbrev], asset.tokens[reserve.abbrev]);
        }
        return asset;
      })
    })

    // Obligation collateral notes
    getTokenAccountAndSubscribe(connection, asset.collateralNotePubkey, reserve.decimals, amount => {
      ASSETS.update(asset => {
        if (asset) {
          asset.tokens[reserve.abbrev].collateralNoteBalance = amount ?? TokenAmount.zero(reserve.decimals);
          asset.tokens[reserve.abbrev].collateralNoteExists = !!amount;

          deriveValues(market, market.reserves[reserve.abbrev], asset.tokens[reserve.abbrev]);
        }
        return asset;
      });
    });
  }
};

const deriveValues = (market: Market, reserve?: Reserve, asset?: Asset) => {
  if (reserve) {
    reserve.marketSize = reserve.outstandingDebt.add(reserve.availableLiquidity);
    reserve.utilizationRate = !reserve.marketSize.amount.isZero() 
      ? reserve.outstandingDebt.uiAmountFloat / reserve.marketSize.uiAmountFloat
        : 0;

    if (asset) {
      asset.depositBalance = asset.depositNoteBalance.mulb(reserve.depositNoteExchangeRate).divb(new BN(Math.pow(10, 15)));
      asset.loanBalance = asset.loanNoteBalance.mulb(reserve.loanNoteExchangeRate).divb(new BN(Math.pow(10, 15)));
      asset.collateralBalance = asset.collateralNoteBalance.mulb(reserve.depositNoteExchangeRate).divb(new BN(Math.pow(10, 15)));
    }
  }
};