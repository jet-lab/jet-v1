// Subscribe to solana accounts
// Todo: keep subscription IDs and unsubscribe at end of lifetime
import type { Connection } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import type * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import { parsePriceData } from "@pythnetwork/client";
import type { Market, User, Asset, IdlMetadata, Reserve } from "../models/JetTypes";
import { ANCHOR_CODER, CONNECTION, IDL_METADATA, MARKET, USER } from "../store";
import { getAccountInfoAndSubscribe, getMintInfoAndSubscribe, getTokenAccountAndSubscribe, parseMarketAccount, parseObligationAccount, parseReserveAccount, SOL_DECIMALS, getCcRate, getBorrowRate, getDepositRate } from "./programUtil";
import { TokenAmount } from "./util";
import { MarketReserveInfoList } from "./layout";

let market: Market;
let user: User;
let idlMetadata: IdlMetadata;
let connection: Connection;
let coder: anchor.Coder
MARKET.subscribe(data => market = data);
USER.subscribe(data => user = data);
IDL_METADATA.subscribe(data => idlMetadata = data)
CONNECTION.subscribe(data => connection = data)
ANCHOR_CODER.subscribe(data => coder = data)

export const subscribeToMarket = async () => {
  let promise: Promise<number>;
  const promises: Promise<number>[] = [];

  // Market subscription 
  let timeStart = Date.now();
  promise = getAccountInfoAndSubscribe(connection, idlMetadata.market.market, account => {
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

              deriveValues(reserve, user.assets?.tokens[reserve.abbrev]);
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
    USER.update(user => {
      user.rpcPing = timeEnd - timeStart;
      return user;
    });
  });
  promises.push(promise);

  for (const reserveMeta of idlMetadata.reserves) {
    // Reserve
    promise = getAccountInfoAndSubscribe(connection, reserveMeta.accounts.reserve, account => {
      if (account != null) {
        MARKET.update(market => {
          const decoded = parseReserveAccount(account.data, coder);

          // Hardcoding min c-ratio to 130% for now
          // market.minColRatio = decoded.config.minCollateralRatio / 10000;

          const reserve = market.reserves[reserveMeta.abbrev];

          reserve.maximumLTV = decoded.config.minCollateralRatio;
          reserve.liquidationPremium = decoded.config.liquidationPremium;
          reserve.outstandingDebt = new TokenAmount(decoded.state.outstandingDebt, reserveMeta.decimals).divb(new BN(Math.pow(10, 15)));
          reserve.accruedUntil = decoded.state.accruedUntil;
          reserve.config = decoded.config;

          deriveValues(reserve, user.assets?.tokens[reserve.abbrev]);
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

          deriveValues(reserve, user.assets?.tokens[reserve.abbrev]);
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

          deriveValues(reserve, user.assets?.tokens[reserve.abbrev]);
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

          deriveValues(reserve, user.assets?.tokens[reserve.abbrev]);
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

          deriveValues(reserve, user.assets?.tokens[reserve.abbrev]);
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

          deriveValues(reserve, user.assets?.tokens[reserve.abbrev]);
          return market;
        });
      }
    });
    promises.push(promise);
  }

  return await Promise.all(promises);
};

export const subscribeToAssets = async () => {
  let promise: Promise<number>;
  let promises: Promise<number>[] = [];
  if (!user.assets || !user.wallet) {
    return;
  }

  // Obligation
  promise = getAccountInfoAndSubscribe(connection, user.assets.obligationPubkey, account => {
    if (account != null) {
      USER.update(user => {
        if (user.assets) {
          user.assets.obligation = {
            ...account,
            data: parseObligationAccount(account.data, coder),
          };
        }
        return user;
      });
    }
  })
  promises.push(promise);

  // Wallet native SOL balance
  promise = getAccountInfoAndSubscribe(connection, user.wallet.publicKey, account => {
    USER.update(user => {
      if (user.assets) {
        const reserve = market.reserves["SOL"];

        // Need to be careful constructing a BN from a number.
        // If the user has more than 2^53 lamports it will throw for not having enough precision.
        user.assets.tokens.SOL.walletTokenBalance = new TokenAmount(new BN(account?.lamports.toString() ?? 0), SOL_DECIMALS)

        user.assets.sol = user.assets.tokens.SOL.walletTokenBalance
        user.walletBalances.SOL = user.assets.tokens.SOL.walletTokenBalance.uiAmountFloat;
        
        deriveValues(reserve, user.assets.tokens.SOL);
      }
      return user;
    });
  });
  promises.push(promise);

  for (const abbrev in user.assets.tokens) {
    const asset = user.assets.tokens[abbrev];
    const reserve = market.reserves[abbrev];

    // Wallet token account
    promise = getTokenAccountAndSubscribe(connection, asset.walletTokenPubkey, reserve.decimals, amount => {
      USER.update(user => {
        if (user.assets) {
          user.assets.tokens[reserve.abbrev].walletTokenBalance = amount ?? new TokenAmount(new BN(0), reserve.decimals);
          user.assets.tokens[reserve.abbrev].walletTokenExists = !!amount;
          // Update wallet token balance
          if (!asset.tokenMintPubkey.equals(NATIVE_MINT)) {
            user.walletBalances[reserve.abbrev] = asset.walletTokenBalance.uiAmountFloat;
          }

          deriveValues(reserve, user.assets.tokens[reserve.abbrev]);
        }
        return user;
      });
    });
    promises.push(promise);

    // Reserve deposit notes
    promise = getTokenAccountAndSubscribe(connection, asset.depositNoteDestPubkey, reserve.decimals, amount => {
      USER.update(user => {
        if (user.assets) {
          user.assets.tokens[reserve.abbrev].depositNoteDestBalance = amount ?? TokenAmount.zero(reserve.decimals);
          user.assets.tokens[reserve.abbrev].depositNoteDestExists = !!amount;
          
          deriveValues(reserve, user.assets.tokens[reserve.abbrev]);
        }
        return user;
      });
    })
    promises.push(promise);

    // Deposit notes account
    promise = getTokenAccountAndSubscribe(connection, asset.depositNotePubkey, reserve.decimals, amount => {
      USER.update(user => {
        if (user.assets) {
          user.assets.tokens[reserve.abbrev].depositNoteBalance = amount ?? TokenAmount.zero(reserve.decimals);
          user.assets.tokens[reserve.abbrev].depositNoteExists = !!amount;

          deriveValues(reserve, user.assets.tokens[reserve.abbrev]);
        }
        return user;
      });
    })
    promises.push(promise);

    // Obligation loan notes
    promise = getTokenAccountAndSubscribe(connection, asset.loanNotePubkey, reserve.decimals, amount => {
      USER.update(user => {
        if (user.assets) {
          user.assets.tokens[reserve.abbrev].loanNoteBalance = amount ?? TokenAmount.zero(reserve.decimals);
          user.assets.tokens[reserve.abbrev].loanNoteExists = !!amount;

          deriveValues(reserve, user.assets.tokens[reserve.abbrev]);
        }
        return user;
      });
    })
    promises.push(promise);

    // Obligation collateral notes
    promise = getTokenAccountAndSubscribe(connection, asset.collateralNotePubkey, reserve.decimals, amount => {
      USER.update(user => {
        if (user.assets) {
          user.assets.tokens[reserve.abbrev].collateralNoteBalance = amount ?? TokenAmount.zero(reserve.decimals);
          user.assets.tokens[reserve.abbrev].collateralNoteExists = !!amount;

          deriveValues(reserve, user.assets.tokens[reserve.abbrev]);
        }
        return user;
      });
    });
    promises.push(promise);
  }

  return await Promise.all(promises);
};

// Derive market reserve and user asset values, update global objects
const deriveValues = (reserve: Reserve, asset?: Asset) => {
  // Derive market reserve values
  reserve.marketSize = reserve.outstandingDebt.add(reserve.availableLiquidity);
  reserve.utilizationRate = reserve.marketSize.isZero() ? 0
      : reserve.outstandingDebt.uiAmountFloat / reserve.marketSize.uiAmountFloat;
  const ccRate = getCcRate(reserve.config, reserve.utilizationRate);
  reserve.borrowRate = getBorrowRate(ccRate, reserve.config.manageFeeRate);
  reserve.depositRate = getDepositRate(ccRate, reserve.utilizationRate);

  // Update market total value locked and reserve array from new values
  let tvl: number = 0;
  let reservesArray: Reserve[] = [];
  for (let r in market.reserves) {
    tvl += market.reserves[r].marketSize.muln(market.reserves[r].price)?.uiAmountFloat;
    reservesArray.push(market.reserves[r]);
  }
  MARKET.update(market => {
    market.totalValueLocked = tvl;
    market.reservesArray = reservesArray;
    return market;
  });

  // Derive user asset values
  if (asset) {
    asset.depositBalance = asset.depositNoteBalance.mulb(reserve.depositNoteExchangeRate).divb(new BN(Math.pow(10, 15)));
    asset.loanBalance = asset.loanNoteBalance.mulb(reserve.loanNoteExchangeRate).divb(new BN(Math.pow(10, 15)));
    asset.collateralBalance = asset.collateralNoteBalance.mulb(reserve.depositNoteExchangeRate).divb(new BN(Math.pow(10, 15)));

    // Update user obligation balances
    user.collateralBalances[reserve.abbrev] = asset.collateralBalance.uiAmountFloat;
    user.loanBalances[reserve.abbrev] = asset.loanBalance.uiAmountFloat;

    // Update user position object for UI
    user.position = {
      depositedValue: 0,
      borrowedValue: 0,
      colRatio: 0,
      utilizationRate: 0
    }
    for (let t in user.assets?.tokens) {
      user.position.depositedValue += user.collateralBalances[t] * market.reserves[t].price;
      user.position.borrowedValue += user.loanBalances[t] * market.reserves[t].price;
      user.position.colRatio = user.position.borrowedValue ? user.position.depositedValue / user.position.borrowedValue : 0;
      user.position.utilizationRate = user.position.depositedValue ? user.position.borrowedValue / user.position.depositedValue : 0;
    }

    // Max deposit
    asset.maxDepositAmount = user.walletBalances[reserve.abbrev];

    // Max withdraw
    asset.maxWithdrawAmount = user.position.borrowedValue
      ? (user.position.depositedValue - (market.programMinColRatio * user.position.borrowedValue)) / reserve.price
        : asset.collateralBalance.uiAmountFloat;
    if (asset.maxWithdrawAmount > asset.collateralBalance.uiAmountFloat) {
      asset.maxWithdrawAmount = asset.collateralBalance.uiAmountFloat;
    }

    // Max borrow
    asset.maxBorrowAmount = ((user.position.depositedValue / market.minColRatio) - user.position.borrowedValue) / reserve.price;
    if (asset.maxBorrowAmount > reserve.availableLiquidity.uiAmountFloat) {
      asset.maxBorrowAmount = reserve.availableLiquidity.uiAmountFloat;
    }

    // Max repay
    if (user.walletBalances[reserve.abbrev] < asset.loanBalance.uiAmountFloat) {
      asset.maxRepayAmount = user.walletBalances[reserve.abbrev];
    } else {
      asset.maxRepayAmount = asset.loanBalance.uiAmountFloat;
    }
  };
};