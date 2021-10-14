import type * as anchor from '@project-serum/anchor';
import type { Market, User, Copilot, CustomProgramError, IdlMetadata, Obligation } from './models/JetTypes';
import { writable } from 'svelte/store';

// Overall app init
export const INIT_FAILED = writable<boolean> (false);

// Market and User
export const MARKET = writable<Market>({} as Market);
export const USER = writable<User>({
  location: null,
  isGeobanned: false,
  connectingWallet: true,
  wallet: null,
  walletInit: false,
  assets: null,
  warnedOfLiquidation: false,
  tradeAction: 'deposit',
  obligation: () => ({} as Obligation),
  belowMinCRatio: () => false,
  noDeposits: () => true,
  walletBalance: () => 0,
  collateralBalance: () => 0,
  loanBalance: () => 0,
  maxWithdraw: () => 0,
  maxBorrow: () => 0,
  maxInput: () => 0,
  assetIsCurrentDeposit: () => false,
  assetIsCurrentBorrow: () => false,
  transactionLogs: [],
  darkTheme: false,
  preferredNode: null,
  preferredLanguage: 'en',
  ping: 0,
  notifications: []
});

// Copilot
export const COPILOT = writable<Copilot | null> (null);

// Program
export const PROGRAM = writable<anchor.Program | null> (null);
export const CUSTOM_PROGRAM_ERRORS = writable<CustomProgramError[]> ([]);
export const ANCHOR_WEB3_CONNECTION = writable<anchor.web3.Connection> (undefined);
export const ANCHOR_CODER = writable<anchor.Coder> (undefined);
export const IDL_METADATA = writable<IdlMetadata> (undefined);