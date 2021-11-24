import { writable } from 'svelte/store';
import type { PublicKey } from '@solana/web3.js';
import type * as anchor from '@project-serum/anchor';
import type { Market, Reserve, User, Copilot, CustomProgramError, IdlMetadata, Notification } from './models/JetTypes';


// Overall app init
export const INIT_FAILED = writable<boolean> (false);

// Market
export const MARKET = writable<Market>({
  /** True when all market and reserve account subscriptions have returned data at least once. */
  marketInit: false,

  // Accounts
  accountPubkey: {} as PublicKey,
  authorityPubkey: {} as PublicKey,

  // Hardcode minimum c-ratio to 130% for now
  minColRatio: 1.3,
  // Hardcode minimum c-ratio to 130% for now
  programMinColRatio: 1.25,

  // Total value of all reserves
  totalValueLocked: 0,

  // Reserves
  reserves: {},
  reservesArray: [],
  currentReserve: {} as Reserve,

  /** Native vs USD UI values */
  nativeValues: true,
});

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
  walletBalances: {},
  collateralBalances: {},
  loanBalances: {},
  position: {
    depositedValue: 0,
    borrowedValue: 0,
    colRatio: 0,
    utilizationRate: 0
  },

  // Transaction Logs
  transactionLogs: [],
  transactionLogsInit: true,

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
    }, 5000);
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
export const CONNECTION = writable<anchor.web3.Connection> (undefined);
export const ANCHOR_CODER = writable<anchor.Coder> (undefined);
export const IDL_METADATA = writable<IdlMetadata> (undefined);