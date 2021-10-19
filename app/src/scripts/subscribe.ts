// Subscribe to solana accounts
// Todo: keep subscription IDs and unsubscribe at end of lifetime
import type { Connection } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import type * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import { parsePriceData } from "@pythnetwork/client";
import type { Market, User, Asset, IdlMetadata, Reserve } from "../models/JetTypes";
import { MARKET, USER } from "../store";
import { getAccountInfoAndSubscribe, getMintInfoAndSubscribe, getTokenAccountAndSubscribe, parseMarketAccount, parseObligationAccount, parseReserveAccount, SOL_DECIMALS, getCcRate, getBorrowRate, getDepositRate } from "./programUtil";
import { TokenAmount } from "./util";
import { MarketReserveInfoList } from "./layout";

let market: Market;
let user: User;
MARKET.subscribe(data => market = data);
USER.subscribe(data => user = data);

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
            if (market.reserves[abbrev].accountPubkey.equals(reserveStruct.reserve) && user.assets) {
              const reserve = market.reserves[abbrev];

              reserve.liquidationPremium = reserveStruct.liquidationBonus;
              reserve.depositNoteExchangeRate = reserveStruct.depositNoteExchangeRate;
              reserve.loanNoteExchangeRate = reserveStruct.loanNoteExchangeRate;

              deriveValues(reserve, user.assets ? user.assets.tokens[reserve.abbrev] : undefined);
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


  for (const reserveMeta of idlMeta.reserves) {
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

          deriveValues(reserve);
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

          deriveValues(reserve);
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

          deriveValues(reserve);
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

          deriveValues(reserve, user.assets ? user.assets.tokens[reserve.abbrev] : undefined);
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

          deriveValues(reserve, user.assets ? user.assets.tokens[reserve.abbrev] : undefined);
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

          deriveValues(reserve, user.assets ? user.assets.tokens[reserve.abbrev] : undefined);
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
  if (!user.assets) {
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

          // Obligation object for UI
          let depositedValue: number = 0;
          let borrowedValue: number = 0;
          let colRatio = 0;
          let utilizationRate = 0;
          for (let t in user.assets.tokens) {
            depositedValue += new TokenAmount(
              user.assets.tokens[t].collateralBalance.amount,
              market.reserves[t].decimals
            ).uiAmountFloat * market.reserves[t].price;
            borrowedValue += new TokenAmount(
              user.assets.tokens[t].loanBalance.amount,
              market.reserves[t].decimals
            ).uiAmountFloat * market.reserves[t].price;

            colRatio = borrowedValue ? depositedValue / borrowedValue : 0;
            utilizationRate = depositedValue ? borrowedValue / depositedValue : 0;
          }

          user.obligation = {
            depositedValue,
            borrowedValue,
            colRatio,
            utilizationRate
          }
        }
        return user;
      });
    }
  })
  promises.push(promise);

  // Wallet native SOL balance
  promise = getAccountInfoAndSubscribe(connection, wallet, account => {
    USER.update(user => {
      if (user.assets) {
        // Need to be careful constructing a BN from a number.
        // If the user has more than 2^53 lamports it will throw for not having enough precision.
        user.assets.sol = new TokenAmount(new BN(account?.lamports.toString() ?? "0"), SOL_DECIMALS);
        // Update wallet SOL balance
        user.walletBalances.SOL = user.assets.sol.uiAmountFloat;
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

    // Max deposit
    asset.maxDepositAmount = user.walletBalances[reserve.abbrev];

    // Max withdraw
    let collateralBalance = 0;
    let maxWithdraw = 0;
    if (market.currentReserve && user.assets) {
      collateralBalance = user.assets.tokens[market.currentReserve.abbrev]?.collateralBalance?.uiAmountFloat;
      maxWithdraw = user.obligation.borrowedValue
        ? (user.obligation.depositedValue - (market.minColRatio * user.obligation.borrowedValue)) / market.reserves[market.currentReserve.abbrev].price
          : collateralBalance;
      if (maxWithdraw > collateralBalance) {
        maxWithdraw = collateralBalance;
      }
      asset.maxWithdrawAmount = maxWithdraw;
    }

    // Max borrow
    let maxBorrow = 0;
    if (market.currentReserve && user.assets) {
      const availableLiquidity = market.reserves[market.currentReserve.abbrev].availableLiquidity?.uiAmountFloat;
      maxBorrow = ((user.obligation.depositedValue / market.minColRatio) - user.obligation.borrowedValue) / market.reserves[market.currentReserve.abbrev].price;
      if (maxBorrow > availableLiquidity) {
        maxBorrow = availableLiquidity;
      }
    }
    // Check if available liquidity of a reserve is
    // less than the most a user can borrow
    const availableLiquidity = market.currentReserve.availableLiquidity.uiAmountFloat;
    if (availableLiquidity < maxBorrow) {
      asset.maxBorrowAmount = availableLiquidity;
    } else {
      asset.maxBorrowAmount = maxBorrow;
    }

    // Max repay
    // Check if wallet balance is less than the user owes
    if (user.walletBalances[reserve.abbrev] < user.loanBalances[reserve.abbrev]) {
      asset.maxRepayAmount = user.walletBalances[reserve.abbrev];
    } else {
      asset.maxRepayAmount = user.loanBalances[reserve.abbrev];
    }
  };
};