import { writable } from 'svelte/store';
import type { PublicKey } from '@solana/web3.js';
import type * as anchor from '@project-serum/anchor';
import type { Market, Reserve, User, Copilot, CustomProgramError, IdlMetadata, Notification } from './models/JetTypes';


// Overall app init
export const INIT_FAILED = writable<boolean> (false);

// Market
let market: Market;
export const MARKET = writable<Market>({
  // Accounts
  accountPubkey: {} as PublicKey,
  authorityPubkey: {} as PublicKey,

  // Hardcode minimum c-ratio to 130% for now
  minColRatio: 1.3,

  // Total value of all reserves
  totalValueLocked: 0,

  // Reserves
  reserves: {},
  reservesArray: [],
  currentReserve: {} as Reserve,

  // Native vs USD UI values
  nativeValues: true,
});
MARKET.subscribe(data => market = data);

// User
let user: User;
export const USER = writable<User>({
  // Locale
  locale: null,
  geobanned: false,

  // Wallet
  connectingWallet: true,
  wallet: null,
  walletInit: false,
  tradeAction: 'deposit',

  // Assets and position
  assets: null,
  obligation: {
    depositedValue: 0,
    borrowedValue: 0,
    colRatio: 0,
    utilizationRate: 0
  },
  walletBalances: {},
  collateralBalances: {},
  loanBalances: {},

  // Get the maximum value a user can input of current asset
  maxInput: () => {
    let currentReserve = market.currentReserve.abbrev;
    let max = 0;
    if (market.currentReserve && user.assets) {
      // Depositing
      if (user.tradeAction === 'deposit') {
        max = user.walletBalances[currentReserve];
      // Withdrawing
      } else if (user.tradeAction === 'withdraw') {
        let collateralBalance = 0;
        let maxWithdraw = 0;
        if (market.currentReserve && user.assets) {
          collateralBalance = user.assets.tokens[market.currentReserve.abbrev]?.collateralBalance.uiAmountFloat;
          maxWithdraw = user.obligation.borrowedValue
            ? (user.obligation.depositedValue - (market.minColRatio * user.obligation.borrowedValue)) / market.reserves[market.currentReserve.abbrev].price
              : collateralBalance;
          if (maxWithdraw > collateralBalance) {
            maxWithdraw = collateralBalance;
          }
        }
        max = maxWithdraw;
      // Borrowing
      } else if (user.tradeAction === 'borrow') {
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
          max = availableLiquidity;
        } else {
          max = maxBorrow;
        }
      } else if (user.tradeAction === 'repay') {
        // Check if wallet balance is less than the user owes
        if (user.walletBalances[currentReserve] < user.loanBalances[currentReserve]) {
          max = user.walletBalances[currentReserve]
        } else {
          max = user.loanBalances[currentReserve];
        }
      }
    }
    return max;
  },

  // Transaction Logs
  transactionLogs: [],

  // Notifications
  notifications: [],

  // Add notification
  addNotification: (n: Notification) => {
    const notifs = user.notifications ?? [];
    notifs.push(n);
    const index = notifs.indexOf(n);
    USER.update(user => {
      user.notifications = notifs;
      return user;
    });
    setTimeout(() => {
      if (user.notifications[index] && user.notifications[index].text === n.text) {
        user.clearNotification(index);
      }
    }, 4000);
  },
  // Clear notification
  clearNotification: (i: number) => {
    const notifs = user.notifications;
    notifs.splice(i, 1);
    USER.update(user => {
      user.notifications = notifs;
      return user;
    });
  },

  // Settings
  darkTheme: localStorage.getItem('jetDark') === 'true',
  navExpanded: localStorage.getItem('jetNavExpanded') === 'true',
  language: localStorage.getItem('jetPreferredLanguage') ?? 'en',
  rpcNode: localStorage.getItem('jetPreferredNode') ?? '',
  rpcPing: 0,
});
USER.subscribe(data => user = data);

// Copilot
export const COPILOT = writable<Copilot | null> (null);

// Program
export const PROGRAM = writable<anchor.Program | null> (null);
export const CUSTOM_PROGRAM_ERRORS = writable<CustomProgramError[]> ([]);
export const ANCHOR_WEB3_CONNECTION = writable<anchor.web3.Connection> (undefined);
export const ANCHOR_CODER = writable<anchor.Coder> (undefined);
export const IDL_METADATA = writable<IdlMetadata> (undefined);