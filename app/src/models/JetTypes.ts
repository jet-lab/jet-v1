import type { AccountInfo, PublicKey, TransactionInstruction } from '@solana/web3.js';
import type BN from 'bn.js';
import type WalletAdapter from '../scripts/walletAdapter';
import type { TokenAmount } from '../scripts/util';

// Web3
export interface HasPublicKey {
  publicKey: PublicKey;
};
export interface ToBytes {
  toBytes(): Uint8Array;
};

//Idl Metadata
export interface IdlMetadata {
  address: PublicKey;
  cluster: string;
  market: MarketMetadata;
  reserves: ReserveMetadata[]
};
//Idl errors
export interface CustomProgramError {
  code: number;
  name: string;
  msg: string;
};

// Market
export interface Market {
  marketInit: boolean,
  accountPubkey: PublicKey,
  account?: AccountInfo<MarketAccount>,
  authorityPubkey: PublicKey,
  minColRatio: number,
  programMinColRatio: number,
  totalValueLocked: number,
  reserves: Record<string, Reserve>,
  reservesArray: Reserve[],
  currentReserve: Reserve,
  nativeValues: boolean
};
export interface MarketAccount {
  version: number,
  /** The exponent used for quote prices */
  quoteExponent: number,
  /** The currency used for quote prices */
  quoteCurrency: BN,
  /** The bump seed value for generating the authority address. */
  authorityBumpSeed: number,
  /** The address used as the seed for generating the market authority
  address. Typically this is the market account's own address. */
  authoritySeed: PublicKey,
  /** The account derived by the program, which has authority over all
  assets in the market. */
  marketAuthority: PublicKey,
  /** The account that has authority to make changes to the market */
  owner: PublicKey,
  /** The mint for the token in terms of which the reserve assets are quoted */
  quoteTokenMint: PublicKey,
  /** Reserved space */
  _reserved: number[],
  /** Tracks the current prices of the tokens in reserve accounts */
  reserves: JetMarketReserveInfo[]
};
export interface JetMarketReserveInfo {
  reserve: PublicKey;
  price: BN;
  depositNoteExchangeRate: BN;
  loanNoteExchangeRate: BN;
  minCollateralRatio: BN;
  liquidationBonus: number;
  lastUpdated: BN;
  invalidated: number;
};
export type CacheReserveInfoStruct = CacheStruct & {
  /** The price of the asset being stored in the reserve account.
  USD per smallest unit (1u64) of a token */
  price: BN,
  /** The value of the deposit note (unit: reserve tokens per note token) */
  depositNoteExchangeRate: BN,
  /** The value of the loan note (unit: reserve tokens per note token) */
  loanNoteExchangeRate: BN,
  /** The minimum allowable collateralization ratio for a loan on this reserve */
  minCollateralRatio: number,
  /** The bonus awarded to liquidators when repaying a loan in exchange for a
  collateral asset. */
  liquidationBonus: number,
  /** Unused space */
  _reserved: number[],
};
export interface CacheStruct {
  /** The last slot that this information was updated in */
  lastUpdated: BN,
  /** Whether the value has been manually invalidated */
  invalidated: number,
  /** Unused space */
  _reserved: number[],
};
export interface MarketMetadata {
  market: PublicKey,
  marketAuthority: PublicKey,
};

// Reserve
export interface Reserve {
  name: string,
  abbrev: string,
  marketSize: TokenAmount,
  outstandingDebt: TokenAmount,
  utilizationRate: number,
  depositRate: number,
  borrowRate: number,
  maximumLTV: number,
  /** The bonus awarded to liquidators when repaying a loan in exchange for a
  collateral asset. */
  liquidationPremium: number,
  /** The price of the asset being stored in the reserve account. */
  price: number,
  decimals: number,
  /** The value of the deposit note (unit: reserve tokens per note token) */
  depositNoteExchangeRate: BN,
  /** The value of the loan note (unit: reserve tokens per note token) */
  loanNoteExchangeRate: BN,
  /** The number of seconds since 1970 that the reserve is refreshed to. */
  accruedUntil: BN,
  config: ReserveConfigStruct,

  accountPubkey: PublicKey,
  vaultPubkey: PublicKey,
  availableLiquidity: TokenAmount,
  feeNoteVaultPubkey: PublicKey,
  tokenMintPubkey: PublicKey,
  tokenMint: TokenAmount,
  faucetPubkey: PublicKey | null,
  depositNoteMintPubkey: PublicKey,
  depositNoteMint: TokenAmount,
  loanNoteMintPubkey: PublicKey,
  loanNoteMint: TokenAmount,
  pythPricePubkey: PublicKey,
  pythProductPubkey: PublicKey
};
export interface ReserveAccount {
  version: number,
  index: number,
  exponent: number,
  market: PublicKey,
  oraclePrice: PublicKey,
  oracleProduct: PublicKey,
  tokenMint: PublicKey,
  depositNoteMint: PublicKey,
  loanNoteMint: PublicKey,
  vault: PublicKey,
  feeNoteVault: PublicKey,
  dexSwapTokens: PublicKey,
  dexOpenOrders: PublicKey,
  dexMarket: PublicKey,
  _reserved0: number[],
  config: ReserveConfigStruct,
  _reserved1: number[],
  state: ReserveStateStruct,
};
export interface ReserveConfigStruct {
  /** The utilization rate at which we switch from the first to second regime. */
  utilizationRate1: number,
  /** The utilization rate at which we switch from the second to third regime. */
  utilizationRate2: number,
  /** The lowest borrow rate in the first regime. Essentially the minimum
      borrow rate possible for the reserve. */
  borrowRate0: number,
  /** The borrow rate at the transition point from the first to second regime. */
  borrowRate1: number,
  /** The borrow rate at the transition point from the second to thirs regime. */
  borrowRate2: number,
  /** The highest borrow rate in the third regime. Essentially the maximum
      borrow rate possible for the reserve. */
  borrowRate3: number,
  /** The minimum allowable collateralization ratio for an obligation */
  minCollateralRatio: number,
  /** The amount given as a bonus to a liquidator */
  liquidationPremium: number,
  /** The threshold at which to collect the fees accumulated from interest into
      real deposit notes. */
  manageFeeCollectionThreshold: BN,
  /** The fee rate applied to the interest payments collected */
  manageFeeRate: number,
  /** The fee rate applied as interest owed on new loans */
  loanOriginationFee: number,
  /** Maximum slippage when selling this asset on DEX during liquidations */
  liquidationSlippage: number,
  /** Unused space */
  _reserved0: number,
  /** Maximum number of tokens to sell in a single DEX trade during liquidation */
  liquidationDexTradeMax: number,
  /** Unused space */
  _reserved1: number[],
};
export type ReserveStateStruct = CacheStruct & {
  accruedUntil: BN,
  outstandingDebt: BN,
  uncollectedFees: BN,
  totalDeposits: BN,
  totalDepositNotes: BN,
  totalLoanNotes: BN,
  _reserved: number[],
};
export interface ReserveMetadata {
  name: string,
  abbrev: string,
  decimals: number,
  reserveIndex: number,
  accounts: {
    reserve: PublicKey,
    vault: PublicKey,
    feeNoteVault: PublicKey,
    tokenMint: PublicKey,
    faucet?: PublicKey,
    depositNoteMint: PublicKey,
    loanNoteMint: PublicKey,
    
    pythPrice: PublicKey,
    pythProduct: PublicKey,

    dexMarket: PublicKey,
    dexSwapTokens: PublicKey,
    dexOpenOrders: PublicKey,
  },
  bump: {
    vault: number,
    depositNoteMint: number,
    loanNoteMint: number,

    dexSwapTokens: number,
    dexOpenOrders: number,
  },
};

// User
export interface User {
  // Location
  locale: Locale | null,
  geobanned: boolean,

  // Wallet
  connectingWallet: boolean,
  wallet: Wallet | MathWallet | SolongWallet | SlopeWallet | null,
  /** True when all wallet account subscriptions have returned data at least once. */
  walletInit: boolean,
  tradeAction: string,

  // Assets and position
  assets: AssetStore | null,
  walletBalances: Record<string, number>,
  collateralBalances: Record<string, number>,
  loanBalances: Record<string, number>,
  position: Obligation,

  // Transaction logs
  transactionLogs: TransactionLog[],
  transactionLogsInit: boolean,
  
  // Notifications
  notifications: Notification[],
  addNotification: (n: Notification) => void,
  clearNotification: (i: number) => void,

  // Settings
  language: string,
  darkTheme: boolean,
  navExpanded: boolean,
  rpcNode: string | null,
  rpcPing: number
};


// Solana injected window object
export interface SolWindow extends Window {
  solana: {
    isPhantom?: boolean,
    isMathWallet?: boolean,
    getAccount: () => Promise<string>,
  },
  solong: {
    selectAccount: () => Promise<string>,
  },
  solflare: {
    isSolflare?: boolean
  },
  Slope: {
    new (): SlopeWallet;
  }
};

// Wallet
export interface Wallet extends WalletAdapter {
  name: string,
  forgetAccounts: Function
};
export interface SolongWallet {
  name: string,
  inProcess: boolean,
  currentAccount: string,
  selectMsg: any,
  signature: any,
  transferRst: any,
  publicKey: any,
  on: Function,
  disconnect: Function
  connect: Function,
  forgetAccounts: Function
};
export interface MathWallet {
  isMathWallet: boolean,
  version: string,
  name: string,
  publicKey: PublicKey,
  on: Function,
  connect: Function,
  disconnect: Function,
  forgetAccounts: Function
};

export interface SlopeWallet {
  name: string,
  publicKey: any,
  on: Function,
  forgetAccounts: Function,
  connect(): Promise<{
      msg: string;
      data: {
          publicKey?: string;
      };
  }>;
  disconnect(): Promise<{ msg: string }>;
  signTransaction(message: string): Promise<{
      msg: string;
      data: {
          publicKey?: string;
          signature?: string;
      };
  }>;
  signAllTransactions(messages: string[]): Promise<{
      msg: string;
      data: {
          publicKey?: string;
          signatures?: string[];
      };
  }>;
  signMessage(message: Uint8Array): Promise<{ data: { signature: string } }>;
}

export interface WalletProvider {
  name: string,
  logo: string,
  url: string
};

// Account
export interface AssetStore {
  /** The users unwrapped sol balance found in their wallet. If we want to track more data than this, 
   * this field could be expanded into a whole object instead of a BN. */
  sol: TokenAmount,
  obligationPubkey: PublicKey,
  obligationBump: number,
  obligation?: AccountInfo<ObligationAccount>,
  tokens: Record<string, Asset> & {
    SOL: Asset,
    USDC: Asset,
    BTC: Asset,
    ETH: Asset
  }
};
export interface Asset {
  tokenMintPubkey: PublicKey,
  walletTokenPubkey: PublicKey,
  walletTokenExists: boolean,
  walletTokenBalance: TokenAmount,
  depositNotePubkey: PublicKey,
  depositNoteBump: number,
  depositNoteExists: boolean,
  depositNoteBalance: TokenAmount,
  depositBalance: TokenAmount,
  depositNoteDestPubkey: PublicKey,
  depositNoteDestBump: number,
  depositNoteDestExists: boolean,
  depositNoteDestBalance: TokenAmount,
  loanNotePubkey: PublicKey,
  loanNoteBump: number,
  loanNoteExists: boolean,
  loanNoteBalance: TokenAmount,
  loanBalance: TokenAmount,
  collateralNotePubkey: PublicKey,
  collateralNoteBump: number,
  collateralNoteExists: boolean,
  collateralNoteBalance: TokenAmount,
  collateralBalance: TokenAmount,
  maxDepositAmount: number,
  maxWithdrawAmount: number,
  maxBorrowAmount: number,
  maxRepayAmount: number,
};

// Obligation
export interface Obligation {
  depositedValue: number,
  borrowedValue: number,
  colRatio: number,
  utilizationRate: number
};
export interface ObligationAccount {
  version: number,
  /** Unused space */
  _reserved0: number,
  /** The market this obligation is a part of */
  market: PublicKey,
  /** The address that owns the debt/assets as a part of this obligation */
  owner: PublicKey,
  /** Unused space */
  _reserved1: number[],
  /** Storage for cached calculations */
  cached: number[],
  /** The storage for the information on collateral owned by this obligation */
  collateral: ObligationPositionStruct[],
  /** The storage for the information on positions owed by this obligation */
  loans: ObligationPositionStruct[],
};
export interface ObligationPositionStruct {
  /** The token account holding the bank notes */
  account: PublicKey,
  /** Non-authoritative number of bank notes placed in the account */
  amount: BN,
  side: number,
  /** The index of the reserve that this position's assets are from */
  reserveIndex: number,
  _reserved: number[],
};

// Locale
export interface Locale {
  ip: string,
  city: string,
  region: string,
  country: string,
  loc: string,
  postal: number,
  timezone: string
};

// Transaction Logs
export interface TransactionLog {
  blockTime: number,
  blockDate: string,
  explorerUrl: string,
  meta: {
    err: any,
    fee: number,
    innerInstructions: Object[],
    logMessages: string[],
    postBalances: number[],
    postTokenBalances: Object[],
    preBalances: number[],
    preTokenBalances: Object[],
    rewards: any[],
    status: Record<string, any>,
    slot: number
  },
  slot: number,
  signature: string,
  tradeAction: string,
  tradeAmount: TokenAmount,
  transaction: { 
    message: {
      /** The message header, identifying signed and read-only `accountKeys` */
      header: {
        numRequiredSignatures: number;
        numReadonlySignedAccounts: number;
        numReadonlyUnsignedAccounts: number;
      }
      /** All the account keys used by this transaction */
      accountKeys: string[];
      /** The hash of a recent ledger block */
      recentBlockhash: string;
      /** Instructions that will be executed in sequence and committed in one atomic transaction if all succeed. */
      instructions: CompiledInstruction[];
    },
    signatures: string[]
  },
  tokenAbbrev: string,
  tokenDecimals: number,
  tokenPrice: number
};

export interface CompiledInstruction {
  /** Index into the transaction keys array indicating the program account that executes this instruction */
  programIdIndex: number;
  /** Ordered indices into the transaction keys array indicating which accounts to pass to the program */
  accounts: number[];
  /** The program input data encoded as base 58 */
  data: string;
};

// Notifications
export interface Notification {
  success: boolean,
  text: string
};

// Copilot
export interface Copilot {
  suggestion?: CopilotSuggestion,
  definition?: CopilotDefinition,
  alert?: CopilotAlert,
};
export interface CopilotSuggestion {
  good: boolean,
  overview?: string,
  detail?: string,
  solution?: string,
  action?: {
    text?: string,
    onClick: () => void,
  }
};
export interface CopilotDefinition {
  term: string,
  definition: string
};
export interface CopilotAlert {
  good: boolean,
  header: string,
  text: string,
  action?: {
    text: string,
    onClick: () => void
  }
};

export enum TxnResponse {
  Success = 'SUCCESS',
  Failed = 'FAILED',
  Cancelled = 'CANCELLED'
};

export interface SlopeTxn {
  msg: string;
  data: {
      publicKey?: string;
      signature?: string;
      signatures?: string[];
  };
};