import { Keypair, PublicKey, Signer, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { BN } from '@project-serum/anchor';
import { ASSOCIATED_TOKEN_PROGRAM_ID, NATIVE_MINT } from "@solana/spl-token";
import { AccountLayout as TokenAccountLayout, Token, TOKEN_PROGRAM_ID, u64 } from "@solana/spl-token";
import Rollbar from 'rollbar';
import WalletAdapter from './walletAdapter';
import type { Market, User, Asset, Reserve, AssetStore, SolWindow, WalletProvider, SlopeWallet, Wallet, MathWallet, SolongWallet, CustomProgramError, TransactionLog } from '../models/JetTypes';
import { TxnResponse } from "../models/JetTypes";
import { MARKET, USER, COPILOT, PROGRAM, CUSTOM_PROGRAM_ERRORS, CONNECTION, ANCHOR_CODER, IDL_METADATA, INIT_FAILED } from '../store';
import { subscribeToAssets } from './subscribe';
import { findDepositNoteAddress, findDepositNoteDestAddress, findLoanNoteAddress, findObligationAddress, sendTransaction, transactionErrorToString, findCollateralAddress, SOL_DECIMALS, parseIdlMetadata, sendAllTransactions, InstructionAndSigner, explorerUrl } from './programUtil';
import { Amount, timeout, TokenAmount } from './util';
import { dictionary } from './localization';
import { Buffer } from 'buffer';
import bs58 from 'bs58';

const SECONDS_PER_HOUR: BN = new BN(3600);
const SECONDS_PER_DAY: BN = SECONDS_PER_HOUR.muln(24);
const SECONDS_PER_WEEK: BN = SECONDS_PER_DAY.muln(7);
const MAX_ACCRUAL_SECONDS: BN = SECONDS_PER_WEEK;

const FAUCET_PROGRAM_ID = new PublicKey(
  "4bXpkKSV8swHSnwqtzuboGPaPDeEgAn4Vt8GfarV5rZt"
);

let program: anchor.Program | null;
let market: Market;
let user: User;
let idl: any;
let customProgramErrors: CustomProgramError[];
let connection: anchor.web3.Connection;
let confirmedSignatures: anchor.web3.ConfirmedSignatureInfo[];
let currentSignaturesIndex: number = 0;
let coder: anchor.Coder;
PROGRAM.subscribe(data => program = data);
MARKET.subscribe(data => market = data);
USER.subscribe(data => user = data);
CUSTOM_PROGRAM_ERRORS.subscribe(data => customProgramErrors = data);
CONNECTION.subscribe(data => connection = data);
ANCHOR_CODER.subscribe(data => coder = data);

// Development / Devnet identifier
export const inDevelopment: boolean = jetDev || window.location.hostname.indexOf('devnet') !== -1;

// Rollbar error logging
export const rollbar = new Rollbar({
  accessToken: 'e29773335de24e1f8178149992226c5e',
  captureUncaught: true,
  captureUnhandledRejections: true,
  payload: {
    environment: inDevelopment ? 'devnet' : 'mainnet'
  }
});

// Get IDL and market data
export const getIDLAndAnchorAndMarketPubkeys = async (): Promise<void> => {
  // Fetch IDL and preferred RPC Node
  const idlPath = "idl/" + jetIdl + "/jet.json";
  console.log(`Loading IDL from ${idlPath}`)
  const resp = await fetch(idlPath);
  idl = await resp.json();
  const idlMetadata = parseIdlMetadata(idl.metadata);
  IDL_METADATA.set(idlMetadata);
  CUSTOM_PROGRAM_ERRORS.set(idl.errors);

  // Construct account coder
  ANCHOR_CODER.set(new anchor.Coder(idl));

  // Establish and test web3 connection
  // If error log it and display failure component
  const preferredNode = localStorage.getItem('jetPreferredNode');
  try {
    const anchorConnection = new anchor.web3.Connection(
      preferredNode ?? idlMetadata.cluster, 
      (anchor.Provider.defaultOptions()).commitment
    );
    CONNECTION.set(anchorConnection);
    USER.update(user => {
      user.rpcNode = preferredNode;
      return user;
    });
  } catch {
    const anchorConnection = new anchor.web3.Connection(idlMetadata.cluster, (anchor.Provider.defaultOptions()).commitment);
    CONNECTION.set(anchorConnection);
    localStorage.removeItem('jetPreferredNode');
    USER.update(user => {
      user.rpcNode = null;
      return user;
    });
  }

  // Setup reserve structures
  const reserves: Record<string, Reserve> = {};
  for (const reserveMeta of idlMetadata.reserves) {
    let reserve: Reserve = {
      name: reserveMeta.name,
      abbrev: reserveMeta.abbrev,
      marketSize: TokenAmount.zero(reserveMeta.decimals),
      outstandingDebt: TokenAmount.zero(reserveMeta.decimals),
      utilizationRate: 0,
      depositRate: 0,
      borrowRate: 0,
      maximumLTV: 0,
      liquidationPremium: 0,
      price: 0,
      decimals: reserveMeta.decimals,
      depositNoteExchangeRate: new BN(0),
      loanNoteExchangeRate: new BN(0),
      accruedUntil: new BN(0),
      config: {
        utilizationRate1: 0,
        utilizationRate2: 0,
        borrowRate0: 0,
        borrowRate1: 0,
        borrowRate2: 0,
        borrowRate3: 0,
        minCollateralRatio: 0,
        liquidationPremium: 0,
        manageFeeCollectionThreshold: new BN(0),
        manageFeeRate: 0,
        loanOriginationFee: 0,
        liquidationSlippage: 0,
        _reserved0: 0,
        liquidationDexTradeMax: 0,
        _reserved1: [],
      },

      accountPubkey: reserveMeta.accounts.reserve,
      vaultPubkey: reserveMeta.accounts.vault,
      availableLiquidity: TokenAmount.zero(reserveMeta.decimals),
      feeNoteVaultPubkey: reserveMeta.accounts.feeNoteVault,
      tokenMintPubkey: reserveMeta.accounts.tokenMint,
      tokenMint: TokenAmount.zero(reserveMeta.decimals),
      faucetPubkey: reserveMeta.accounts.faucet ?? null,
      depositNoteMintPubkey: reserveMeta.accounts.depositNoteMint,
      depositNoteMint: TokenAmount.zero(reserveMeta.decimals),
      loanNoteMintPubkey: reserveMeta.accounts.loanNoteMint,
      loanNoteMint: TokenAmount.zero(reserveMeta.decimals),
      pythPricePubkey: reserveMeta.accounts.pythPrice,
      pythProductPubkey: reserveMeta.accounts.pythProduct,
    };
    reserves[reserveMeta.abbrev] = reserve;
  }

  // Update market accounts and reserves
  MARKET.update(market => {
    market.accountPubkey = idlMetadata.market.market;
    market.authorityPubkey = idlMetadata.market.marketAuthority;
    market.reserves = reserves;
    market.currentReserve = reserves.SOL;
    return market;
  });
};

// Connect to user's wallet
export const getWalletAndAnchor = async (provider: WalletProvider): Promise<void> => {
  // Cast solana injected window type
  const solWindow = window as unknown as SolWindow;
  let wallet: Wallet | SolongWallet | MathWallet | SlopeWallet;

  // Wallet adapter or injected wallet setup
  if (provider.name === 'Phantom' && solWindow.solana?.isPhantom) {
    wallet = solWindow.solana as unknown as Wallet;
  } else if (provider.name === 'Solflare' && solWindow.solflare?.isSolflare) {
    wallet = solWindow.solflare as unknown as Wallet;
  } else if(provider.name === 'Slope' && !!solWindow.Slope) {
    wallet = new solWindow.Slope() as unknown as SlopeWallet;
    const { data } = await wallet.connect();
    if(data.publicKey) {
      wallet.publicKey = new anchor.web3.PublicKey(data.publicKey);
    }
    wallet.on = (action: string, callback: any) => {if (callback) callback()};
  
  } else if (provider.name === 'Math Wallet' && solWindow.solana?.isMathWallet) {
    wallet = solWindow.solana as unknown as MathWallet;
    wallet.publicKey = new anchor.web3.PublicKey(await solWindow.solana.getAccount());
    wallet.on = (action: string, callback: any) => {if (callback) callback()};
    wallet.connect = (action: string, callback: any) => {if (callback) callback()};
  } else if (provider.name === 'Solong' && solWindow.solong) {
    wallet = solWindow.solong as unknown as SolongWallet;
    wallet.publicKey = new anchor.web3.PublicKey(await solWindow.solong.selectAccount());
    wallet.on = (action: string, callback: Function) => {if (callback) callback()};
    wallet.connect = (action: string, callback: Function) => {if (callback) callback()};
  } else {
    wallet = new WalletAdapter(provider.url) as Wallet;
  };

  // Setup anchor program
  anchor.setProvider(new anchor.Provider(
    connection,
    wallet as unknown as anchor.Wallet,
    anchor.Provider.defaultOptions()
  ));
  program = new anchor.Program(idl, (new anchor.web3.PublicKey(idl.metadata.address)));
  PROGRAM.set(program);

  // Set up wallet connection
  wallet.name = provider.name;
  wallet.on('connect', async () => {
    //Set wallet object on user
    USER.update(user => {
      user.wallet = wallet;
      return user;
    });
    // Begin fetching transaction logs
    initTransactionLogs();
    // Get all asset pubkeys owned by wallet pubkey
    await getAssetPubkeys();
    // Subscribe to all asset accounts for those pubkeys
    await subscribeToAssets();
    // Init wallet for UI display
    USER.update(user => {
      user.walletInit = true;
      return user;
    })
  });
  // Initiate wallet connection
  try {
    await wallet.connect();
  } catch (err) {
    console.error(err)
  }

  // User must accept disclaimer upon mainnet launch
  if (!inDevelopment) {
    const accepted = localStorage.getItem('jetDisclaimer');
    if (!accepted) {
      COPILOT.set({
        alert: {
          good: false,
          header: dictionary[user.language].copilot.alert.warning,
          text: dictionary[user.language].copilot.alert.disclaimer,
          action: {
            text: dictionary[user.language].copilot.alert.accept,
            onClick: () => localStorage.setItem('jetDisclaimer', 'true')
          }
        }
      });
    }
  }
};
// Disconnect user wallet
export const disconnectWallet = () => {
  if (user.wallet?.disconnect) {
    user.wallet.disconnect();
  }
  if (user.wallet?.forgetAccounts) {
    user.wallet.forgetAccounts();
  }
  USER.update(user => {
    user.wallet = null;
    user.walletInit = false;
    user.assets = null;
    user.walletBalances = {};
    user.collateralBalances = {};
    user.loanBalances = {};
    user.position = {
      depositedValue: 0,
      borrowedValue: 0,
      colRatio: 0,
      utilizationRate: 0
    }
    user.transactionLogs = [];
    return user;
  });
};

// Get user token accounts
export const getAssetPubkeys = async (): Promise<void> => {
  if (program == null || user.wallet === null) {
    return;
  }

  let [obligationPubkey, obligationBump] = await findObligationAddress(program, market.accountPubkey, user.wallet.publicKey);

  let assetStore: AssetStore = {
    sol: new TokenAmount(new BN(0), SOL_DECIMALS),
    obligationPubkey,
    obligationBump,
    tokens: {}
  } as AssetStore;
  for (const assetAbbrev in market.reserves) {
    let reserve = market.reserves[assetAbbrev];
    let tokenMintPubkey = reserve.tokenMintPubkey;

    let [depositNoteDestPubkey, depositNoteDestBump] = await findDepositNoteDestAddress(program, reserve.accountPubkey, user.wallet.publicKey);
    let [depositNotePubkey, depositNoteBump] = await findDepositNoteAddress(program, reserve.accountPubkey, user.wallet.publicKey);
    let [loanNotePubkey, loanNoteBump] = await findLoanNoteAddress(program, reserve.accountPubkey, obligationPubkey, user.wallet.publicKey);
    let [collateralPubkey, collateralBump] = await findCollateralAddress(program, reserve.accountPubkey, obligationPubkey, user.wallet.publicKey);

    let asset: Asset = {
      tokenMintPubkey,
      walletTokenPubkey: await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, tokenMintPubkey, user.wallet.publicKey),
      walletTokenExists: false,
      walletTokenBalance: TokenAmount.zero(reserve.decimals),
      depositNotePubkey,
      depositNoteBump,
      depositNoteExists: false,
      depositNoteBalance: TokenAmount.zero(reserve.decimals),
      depositBalance: TokenAmount.zero(reserve.decimals),
      depositNoteDestPubkey,
      depositNoteDestBump,
      depositNoteDestExists: false,
      depositNoteDestBalance: TokenAmount.zero(reserve.decimals),
      loanNotePubkey,
      loanNoteBump,
      loanNoteExists: false,
      loanNoteBalance: TokenAmount.zero(reserve.decimals),
      loanBalance: TokenAmount.zero(reserve.decimals),
      collateralNotePubkey: collateralPubkey,
      collateralNoteBump: collateralBump,
      collateralNoteExists: false,
      collateralNoteBalance: TokenAmount.zero(reserve.decimals),
      collateralBalance: TokenAmount.zero(reserve.decimals),
      maxDepositAmount: 0,
      maxWithdrawAmount: 0,
      maxBorrowAmount: 0,
      maxRepayAmount: 0
    };

    // Set user assets
    assetStore.tokens[assetAbbrev] = asset;
    USER.update(user => {
      user.assets = assetStore;
      return user;
    });
  }
};

// Get all confirmed signatures for wallet pubkey
// TODO: call this again when user changes rpc node
export const initTransactionLogs = async (): Promise<void>  => {
  if (!user.wallet) {
    return;
  }

  // Fetch all confirmed signatures
  confirmedSignatures = await connection.getSignaturesForAddress(user.wallet.publicKey, undefined, 'confirmed');
  // Get first 16 full detailed logs
  await getTransactionsDetails(16);
};

// Get transaction details from confirmed signatures
export const getTransactionsDetails = async (txAmount: number): Promise<void> => {
  // Begin loading transaction logs
  USER.update(user => {
    user.transactionLogsInit = false;
    return user;
  });

  // Iterate until get the last signature or add the amount of tx we called for
  let logsCount = 0;
  let newLogs: TransactionLog[] = [];
  while (currentSignaturesIndex < confirmedSignatures.length && logsCount < txAmount) {
    // Get current signature from index
    const currentSignature = confirmedSignatures[currentSignaturesIndex]?.signature;
    if (!currentSignature) {
      return;
    }

    // Get confirmed transaction for signature
    const log = await connection.getTransaction(currentSignature, {commitment: 'confirmed'}) as unknown as TransactionLog;
    const detailedLog = log ? await getLogDetails(log, currentSignature) : null;
    if (detailedLog) {
      newLogs.push(detailedLog);
      logsCount++;
    }

    // Increment current index
    currentSignaturesIndex++;
  }

  // Add transaction logs and stop loading
  USER.update(user => {
    user.transactionLogs = [...user.transactionLogs, ...newLogs];
    user.transactionLogsInit = true;
    return user;
  });
};

// Get UI data of a transaction log
export let getLogDetails = async (log: TransactionLog, signature: string): Promise<TransactionLog | undefined> => {
  // Record of instructions to their first 8 bytes for transaction logs
  const instructionBytes: Record<string, number[]> = {
    deposit: [242, 35, 198, 137, 82, 225, 242, 182],
    withdraw: [183, 18, 70, 156, 148, 109, 161, 34],
    borrow: [228, 253, 131, 202, 207, 116, 89, 18],
    repay: [234, 103, 67, 82, 208, 234, 219, 166]
  };

  // Use log messages to only surface transactions that utilize Jet
  for (let msg of log.meta.logMessages) {
    if (msg.indexOf(idl.metadata.address) !== -1) {
      for (let progInst in instructionBytes) {
        for (let inst of log.transaction.message.instructions) {
          // Get first 8 bytes from data
          const txInstBytes = [];
          for (let i = 0; i < 8; i++) {
            //need to decode bs58 first
            txInstBytes.push(bs58.decode(inst.data)[i]);
          }
          // If those bytes match any of our instructions label trade action
          if (JSON.stringify(instructionBytes[progInst]) === JSON.stringify(txInstBytes)) {
            log.tradeAction = dictionary[user.language].transactions[progInst];
            // Determine asset and trade amount
            for (let pre of log.meta.preTokenBalances as any[]) {
              for (let post of log.meta.postTokenBalances as any[]) {
                if (pre.mint === post.mint && pre.uiTokenAmount.amount !== post.uiTokenAmount.amount) {
                  for (let reserve of idl.metadata.reserves) {
                    if (reserve.accounts.tokenMint === pre.mint) {
                      // For withdraw and borrow SOL,
                      // Skip last account (pre-token balance is 0)
                      if (reserve.abbrev === 'SOL'
                        && (progInst === 'withdraw' || progInst === 'borrow')
                        && pre.uiTokenAmount.amount === '0') {
                        break;
                      }
                      log.tokenAbbrev = reserve.abbrev;
                      log.tokenDecimals = reserve.decimals;
                      log.tokenPrice = reserve.price;
                      log.tradeAmount = new TokenAmount(
                        new BN(post.uiTokenAmount.amount - pre.uiTokenAmount.amount),
                        reserve.decimals
                      );
                    }
                  }
                }
              }
            }
            // Signature
            log.signature = signature;
            // UI date
            log.blockDate = new Date(log.blockTime * 1000).toLocaleDateString();
            // Explorer URL
            log.explorerUrl = explorerUrl(log.signature);
            // If we found mint match, add tx to logs
            if (log.tokenAbbrev) {
              return log;
            }
          }
        }
      }
    }
  }
};

// Add new transaction log on trade submit
export let addTransactionLog = async (signature: string) => {
  const txLogs = user.transactionLogs ?? [];
  //Reset logs for load
  USER.update(user => {
    user.transactionLogsInit = false;
    return user;
  });

  // Keep trying to get confirmed log (may take a few seconds for validation)
  let log: TransactionLog | null = null;
  while (!log) {
    log = await connection.getTransaction(signature, {commitment: 'confirmed'}) as unknown as TransactionLog | null;
    timeout(2000);
  }

  // Get UI details and add to logs store
  const logDetail = await getLogDetails(log, signature);
  if (logDetail) {
    txLogs.unshift(logDetail);
    USER.update(user => {
      user.transactionLogs = txLogs;
      user.transactionLogsInit = true;
      return user;
    });
  }
};

// Deposit
export const deposit = async (abbrev: string, lamports: BN)
  : Promise<[res: TxnResponse, txid: string[]]> => {
  if (!user.assets || !user.wallet || !program) {
    return [TxnResponse.Failed, []];
  }
  const [res, txid] = await refreshOldReserves();
  if (res !== TxnResponse.Success) {
    return [res, txid]
  }

  let reserve = market.reserves[abbrev];
  let asset = user.assets.tokens[abbrev];
  let depositSourcePubkey = asset.walletTokenPubkey;

  // Optional signers
  let depositSourceKeypair: Keypair | undefined;

  // Optional instructions
  // Create wrapped sol ixs
  let createTokenAccountIx: TransactionInstruction | undefined;
  let initTokenAccountIx: TransactionInstruction | undefined;
  let closeTokenAccountIx: TransactionInstruction | undefined;

  // Initialize Obligation, deposit notes, collateral notes
  let initObligationIx: TransactionInstruction | undefined;
  let initDepositAccountIx: TransactionInstruction | undefined;
  let initCollateralAccountIx: TransactionInstruction | undefined;

  // When handling SOL, ignore existing wsol accounts and initialize a new wrapped sol account
  if (asset.tokenMintPubkey.equals(NATIVE_MINT)) {
    // Overwrite the deposit source
    // The app will always wrap native sol, ignoring any existing wsol
    depositSourceKeypair = Keypair.generate();
    depositSourcePubkey = depositSourceKeypair.publicKey;

    const rent = await connection.getMinimumBalanceForRentExemption(TokenAccountLayout.span);
    createTokenAccountIx = SystemProgram.createAccount({
      fromPubkey: user.wallet.publicKey,
      newAccountPubkey: depositSourcePubkey,
      programId: TOKEN_PROGRAM_ID,
      space: TokenAccountLayout.span,
      lamports: parseInt(lamports.addn(rent).toString())
    })

    initTokenAccountIx = Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      NATIVE_MINT,
      depositSourcePubkey,
      user.wallet.publicKey
    );

    closeTokenAccountIx = Token.createCloseAccountInstruction(
      TOKEN_PROGRAM_ID,
      depositSourcePubkey,
      user.wallet.publicKey,
      user.wallet.publicKey,
      []);
  }

  // Create the deposit note dest account if it doesn't exist
  if (!asset.depositNoteExists) {
    initDepositAccountIx = program.instruction.initDepositAccount(asset.depositNoteBump, {
      accounts: {
        market: market.accountPubkey,
        marketAuthority: market.authorityPubkey,

        reserve: reserve.accountPubkey,
        depositNoteMint: reserve.depositNoteMintPubkey,

        depositor: user.wallet.publicKey,
        depositAccount: asset.depositNotePubkey,

        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
    });
  }

  if (!user.assets.obligation) {
    initObligationIx = buildInitObligationIx()
  }

  // Obligatory refresh instruction
  const refreshReserveIx = buildRefreshReserveIx(abbrev);
  const amount = Amount.tokens(lamports);
  const depositIx = program.instruction.deposit(asset.depositNoteBump, amount, {
    accounts: {
      market: market.accountPubkey,
      marketAuthority: market.authorityPubkey,

      reserve: reserve.accountPubkey,
      vault: reserve.vaultPubkey,
      depositNoteMint: reserve.depositNoteMintPubkey,

      depositor: user.wallet.publicKey,
      depositAccount: asset.depositNotePubkey,
      depositSource: depositSourcePubkey,

      tokenProgram: TOKEN_PROGRAM_ID,
    }
  });

  // Initialize the collateral account if it doesn't exist
  if (!asset.collateralNoteExists) {
    initCollateralAccountIx = program.instruction.initCollateralAccount(asset.collateralNoteBump, {
      accounts: {
        market: market.accountPubkey,
        marketAuthority: market.authorityPubkey,

        obligation: user.assets.obligationPubkey,
        reserve: reserve.accountPubkey,
        depositNoteMint: reserve.depositNoteMintPubkey,

        owner: user.wallet.publicKey,
        collateralAccount: asset.collateralNotePubkey,

        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      }
    });
  }

  const depositCollateralBumpSeeds = {
    collateralAccount: asset.collateralNoteBump,
    depositAccount: asset.depositNoteBump,
  };
  let depositCollateralIx = program.instruction.depositCollateral(depositCollateralBumpSeeds, amount, {
    accounts: {
      market: market.accountPubkey,
      marketAuthority: market.authorityPubkey,

      reserve: reserve.accountPubkey,

      obligation: user.assets.obligationPubkey,
      owner: user.wallet.publicKey,
      depositAccount: asset.depositNotePubkey,
      collateralAccount: asset.collateralNotePubkey,

      tokenProgram: TOKEN_PROGRAM_ID,
    }
  });

  const ix = [
    createTokenAccountIx,
    initTokenAccountIx,
    initDepositAccountIx,
    initObligationIx,
    initCollateralAccountIx,
    refreshReserveIx,
    depositIx,
    depositCollateralIx,
    closeTokenAccountIx
  ].filter(ix => ix) as TransactionInstruction[];
  const signers = [depositSourceKeypair].filter(signer => signer) as Keypair[];

  try {
    return await sendTransaction(program.provider, ix, signers);
  } catch (err) {
    console.error(`Deposit error: ${transactionErrorToString(err)}`);
    rollbar.error(`Deposit error: ${transactionErrorToString(err)}`);
    return [TxnResponse.Failed, []];
  }
};

// Withdraw
export const withdraw = async (abbrev: string, amount: Amount)
  : Promise<[res: TxnResponse, txid: string[]]> => {
  if (!user.assets || !user.wallet || !program) {
    return [TxnResponse.Failed, []];
  }

  const [res, txid] = await refreshOldReserves();
  if (res !== TxnResponse.Success) {
    return [res, txid]
  }

  const reserve = market.reserves[abbrev];
  const asset = user.assets.tokens[abbrev];

  let withdrawAccount = asset.walletTokenPubkey;

  // Create token account ix
  let createAssociatedTokenAccountIx: TransactionInstruction | undefined;
  
  // Wrapped sol ixs
  let wsolKeypair: Keypair | undefined;
  let createWsolIx: TransactionInstruction | undefined;
  let initWsolIx: TransactionInstruction | undefined;
  let closeWsolIx: TransactionInstruction | undefined;
  
  if (asset.tokenMintPubkey.equals(NATIVE_MINT)) {
    // Create a token account to receive wrapped sol.
    // There isn't an easy way to unwrap sol without
    // closing the account, so we avoid closing the 
    // associated token account.
    const rent = await Token.getMinBalanceRentForExemptAccount(connection);
    
    wsolKeypair = Keypair.generate();
    withdrawAccount = wsolKeypair.publicKey;
    createWsolIx = SystemProgram.createAccount({
      fromPubkey: user.wallet.publicKey,
      newAccountPubkey: withdrawAccount,
      programId: TOKEN_PROGRAM_ID,
      space: TokenAccountLayout.span,
      lamports: rent,
    })
    initWsolIx = Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID, 
      reserve.tokenMintPubkey, 
      withdrawAccount, 
      user.wallet.publicKey);
  } else if (!asset.walletTokenExists) {
    // Create the wallet token account if it doesn't exist
    createAssociatedTokenAccountIx = Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      asset.tokenMintPubkey,
      withdrawAccount,
      user.wallet.publicKey,
      user.wallet.publicKey);
  }

  // Obligatory refresh instruction
  const refreshReserveIxs = buildRefreshReserveIxs();
  
  const withdrawCollateralBumps = {
    collateralAccount: asset.collateralNoteBump,
    depositAccount: asset.depositNoteBump,
  };
  const withdrawCollateralIx = program.instruction.withdrawCollateral(withdrawCollateralBumps, amount, {
    accounts: {
      market: market.accountPubkey,
      marketAuthority: market.authorityPubkey,

      reserve: reserve.accountPubkey,

      obligation: user.assets.obligationPubkey,
      owner: user.wallet.publicKey,
      depositAccount: asset.depositNotePubkey,
      collateralAccount: asset.collateralNotePubkey,

      tokenProgram: TOKEN_PROGRAM_ID,
    },
  });

  const withdrawIx = program.instruction.withdraw(asset.depositNoteBump, amount, {
    accounts: {
      market: market.accountPubkey,
      marketAuthority: market.authorityPubkey,

      reserve: reserve.accountPubkey,
      vault: reserve.vaultPubkey,
      depositNoteMint: reserve.depositNoteMintPubkey,

      depositor: user.wallet.publicKey,
      depositAccount: asset.depositNotePubkey,
      withdrawAccount,

      tokenProgram: TOKEN_PROGRAM_ID,
    },
  });

  // Unwrap sol
  if (asset.tokenMintPubkey.equals(NATIVE_MINT) && wsolKeypair) {
    closeWsolIx = Token.createCloseAccountInstruction(
      TOKEN_PROGRAM_ID,
      withdrawAccount,
      user.wallet.publicKey,
      user.wallet.publicKey,
      []);
  }

  const ixs: InstructionAndSigner[] = [
    {
      ix: [
        createAssociatedTokenAccountIx,
        createWsolIx,
        initWsolIx,
      ].filter(ix => ix) as TransactionInstruction[],
      signers: [wsolKeypair].filter(signer => signer) as Signer[],
    },
    {
      ix: [
        ...refreshReserveIxs,
        withdrawCollateralIx,
        withdrawIx,
        closeWsolIx,
      ].filter(ix => ix) as TransactionInstruction[],
    }
  ];

  try {
    const [res, txids] = await sendAllTransactions(program.provider, ixs);
    return [res, txids];
  } catch (err) {
    console.error(`Withdraw error: ${transactionErrorToString(err)}`);
    rollbar.error(`Withdraw error: ${transactionErrorToString(err)}`);
    return [TxnResponse.Failed, []];
  }
};

// Borrow
export const borrow = async (abbrev: string, amount: Amount)
  : Promise<[res: TxnResponse, txid: string[]]> => {
  if (!user.assets || !user.wallet || !program) {
    return [TxnResponse.Failed, []];
  }

  const [res, txid] = await refreshOldReserves();
  if (res !== TxnResponse.Success) {
    return [res, txid]
  }
  

  const reserve = market.reserves[abbrev];
  const asset = user.assets.tokens[abbrev];

  let receiverAccount = asset.walletTokenPubkey;

  // Create token account ix
  let createTokenAccountIx: TransactionInstruction | undefined;

  // Create loan note token ix
  let initLoanAccountIx: TransactionInstruction | undefined;

  // Wrapped sol ixs
  let wsolKeypair: Keypair | undefined;
  let createWsolTokenAccountIx: TransactionInstruction | undefined;
  let initWsoltokenAccountIx: TransactionInstruction | undefined;
  let closeTokenAccountIx: TransactionInstruction | undefined;

  if (asset.tokenMintPubkey.equals(NATIVE_MINT)) {
    // Create a token account to receive wrapped sol.
    // There isn't an easy way to unwrap sol without
    // closing the account, so we avoid closing the 
    // associated token account.
    const rent = await Token.getMinBalanceRentForExemptAccount(connection);
    
    wsolKeypair = Keypair.generate();
    receiverAccount = wsolKeypair.publicKey;
    createWsolTokenAccountIx = SystemProgram.createAccount({
      fromPubkey: user.wallet.publicKey,
      newAccountPubkey: wsolKeypair.publicKey,
      programId: TOKEN_PROGRAM_ID,
      space: TokenAccountLayout.span,
      lamports: rent,
    })
    initWsoltokenAccountIx = Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID, 
      reserve.tokenMintPubkey, 
      wsolKeypair.publicKey, 
      user.wallet.publicKey);
  } else if (!asset.walletTokenExists) {
    // Create the wallet token account if it doesn't exist
    createTokenAccountIx = Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      asset.tokenMintPubkey,
      asset.walletTokenPubkey,
      user.wallet.publicKey,
      user.wallet.publicKey);
  }

  // Create the loan note account if it doesn't exist
  if (!asset.loanNoteExists) {
    initLoanAccountIx = program.instruction.initLoanAccount(asset.loanNoteBump, {
      accounts: {
        market: market.accountPubkey,
        marketAuthority: market.authorityPubkey,

        obligation: user.assets.obligationPubkey,
        reserve: reserve.accountPubkey,
        loanNoteMint: reserve.loanNoteMintPubkey,

        owner: user.wallet.publicKey,
        loanAccount: asset.loanNotePubkey,

        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      }
    });
  }

  // Obligatory refresh instruction
  const refreshReserveIxs = buildRefreshReserveIxs();

  const borrowIx = program.instruction.borrow(asset.loanNoteBump, amount, {
    accounts: {
      market: market.accountPubkey,
      marketAuthority: market.authorityPubkey,

      obligation: user.assets.obligationPubkey,
      reserve: reserve.accountPubkey,
      vault: reserve.vaultPubkey,
      loanNoteMint: reserve.loanNoteMintPubkey,

      borrower: user.wallet.publicKey,
      loanAccount: asset.loanNotePubkey,
      receiverAccount,

      tokenProgram: TOKEN_PROGRAM_ID,
    },
  });

  // If withdrawing SOL, unwrap it by closing
  if (asset.tokenMintPubkey.equals(NATIVE_MINT)) {
    closeTokenAccountIx = Token.createCloseAccountInstruction(
      TOKEN_PROGRAM_ID,
      receiverAccount,
      user.wallet.publicKey,
      user.wallet.publicKey,
      []);
  }

  const ixs: InstructionAndSigner[] = [
    {
      ix: [
        createTokenAccountIx,
        createWsolTokenAccountIx,
        initWsoltokenAccountIx,
        initLoanAccountIx,
      ].filter(ix => ix) as TransactionInstruction[],
      signers: [wsolKeypair].filter(ix => ix) as Signer[],
    },
    {
      ix: [
        ...refreshReserveIxs,
        borrowIx,
        closeTokenAccountIx
      ].filter(ix => ix) as TransactionInstruction[],
    }
  ];

  try {
    // Make deposit RPC call
    const [res, txids] = await sendAllTransactions(program.provider, ixs);
    return [res, txids];
  } catch (err) {
    console.error(`Borrow error: ${transactionErrorToString(err)}`);
    rollbar.error(`Borrow error: ${transactionErrorToString(err)}`);
    return [TxnResponse.Failed, []];
  }
};

// Repay
export const repay = async (abbrev: string, amount: Amount)
  : Promise<[res: TxnResponse, txid: string[]]> => {
  if (!user.assets || !user.wallet || !program) {
    return [TxnResponse.Failed, []];
  }

  const [res, txid] = await refreshOldReserves();
  if (res !== TxnResponse.Success) {
    return [res, txid]
  }

  const reserve = market.reserves[abbrev];
  const asset = user.assets.tokens[abbrev];
  let depositSourcePubkey = asset.walletTokenPubkey;

  // Optional signers
  let depositSourceKeypair: Keypair | undefined;

  // Optional instructions
  // Create wrapped sol ixs
  let createTokenAccountIx: TransactionInstruction | undefined;
  let initTokenAccountIx: TransactionInstruction | undefined;
  let closeTokenAccountIx: TransactionInstruction | undefined;

  // When handling SOL, ignore existing wsol accounts and initialize a new wrapped sol account
  if (asset.tokenMintPubkey.equals(NATIVE_MINT)) {
    // Overwrite the deposit source
    // The app will always wrap native sol, ignoring any existing wsol
    depositSourceKeypair = Keypair.generate();
    depositSourcePubkey = depositSourceKeypair.publicKey;

    // Do our best to estimate the lamports we need
    // 1.002 is a bit of room for interest
    const lamports = amount.units.loanNotes
      ? reserve.loanNoteExchangeRate.mul(amount.value).div(new BN(Math.pow(10, 15))).muln(1.002)
      : amount.value;

    const rent = await connection.getMinimumBalanceForRentExemption(TokenAccountLayout.span);
    createTokenAccountIx = SystemProgram.createAccount({
      fromPubkey: user.wallet.publicKey,
      newAccountPubkey: depositSourcePubkey,
      programId: TOKEN_PROGRAM_ID,
      space: TokenAccountLayout.span,
      lamports: parseInt(lamports.addn(rent).toString())
    })

    initTokenAccountIx = Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      NATIVE_MINT,
      depositSourcePubkey,
      user.wallet.publicKey
    );

    closeTokenAccountIx = Token.createCloseAccountInstruction(
      TOKEN_PROGRAM_ID,
      depositSourcePubkey,
      user.wallet.publicKey,
      user.wallet.publicKey,
      []);
  } else if (!asset.walletTokenExists) {
    return [TxnResponse.Failed, []];
  }

  // Obligatory refresh instruction
  const refreshReserveIx = buildRefreshReserveIx(abbrev);

  const repayIx = program.instruction.repay(amount, {
    accounts: {
      market: market.accountPubkey,
      marketAuthority: market.authorityPubkey,

      obligation: user.assets.obligationPubkey,
      reserve: reserve.accountPubkey,
      vault: reserve.vaultPubkey,
      loanNoteMint: reserve.loanNoteMintPubkey,

      payer: user.wallet.publicKey,
      loanAccount: asset.loanNotePubkey,
      payerAccount: depositSourcePubkey,

      tokenProgram: TOKEN_PROGRAM_ID,
    },
  });

  const ix = [
    createTokenAccountIx,
    initTokenAccountIx,
    refreshReserveIx,
    repayIx,
    closeTokenAccountIx,
  ].filter(ix => ix) as TransactionInstruction[];
  const signers = [depositSourceKeypair].filter(signer => signer) as Signer[];

  try {
    return await sendTransaction(program.provider, ix, signers);
  } catch (err) {
    console.error(`Repay error: ${transactionErrorToString(err)}`);
    rollbar.error(`Repay error: ${transactionErrorToString(err)}`);
    return [TxnResponse.Failed, []];
  }
};

const buildInitObligationIx = ()
  : TransactionInstruction | undefined => {
  if (!program || !user.assets || !user.wallet) {
    return;
  }

  return program.instruction.initObligation(user.assets.obligationBump, {
    accounts: {
      market: market.accountPubkey,
      marketAuthority: market.authorityPubkey,

      borrower: user.wallet.publicKey,
      obligation: user.assets.obligationPubkey,

      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    },
  });
};

/** Creates ixs to refresh all reserves. */
const buildRefreshReserveIxs = () => {
  const ix: TransactionInstruction[] = [];

  if (!user.assets) {
    return ix;
  }

  for (const assetAbbrev in user.assets.tokens) {
    const refreshReserveIx = buildRefreshReserveIx(assetAbbrev);
    if(refreshReserveIx) {
      ix.push(refreshReserveIx);
    }
  }
  return ix;
}

/**Sends transactions to refresh all reserves
 * until it can be fully refreshed once more. */
const refreshOldReserves = async ()
  : Promise<[res: TxnResponse, txid: string[]]> => {
  if (!program) {
    return [TxnResponse.Failed, []];
  }

  let res: TxnResponse = TxnResponse.Success
  let txid: string[] = [];

  for (const abbrev in market.reserves) {
    let reserve = market.reserves[abbrev];
    let accruedUntil = reserve.accruedUntil;

    while (accruedUntil.add(MAX_ACCRUAL_SECONDS).lt(new BN(Math.floor(Date.now() / 1000)))) {
      const refreshReserveIx = buildRefreshReserveIx(abbrev);

      const ix = [
        refreshReserveIx
      ].filter(ix => ix) as TransactionInstruction[];

      try {
        [res, txid] = await sendTransaction(program.provider, ix);
      } catch (err) {
        console.log(transactionErrorToString(err));
        return [TxnResponse.Failed, []];
      }
      accruedUntil = accruedUntil.add(MAX_ACCRUAL_SECONDS);
    }
  }
  return [res, txid];
}

const buildRefreshReserveIx = (abbrev: string) => {
  if (!program) {
    return;
  }

  let reserve = market.reserves[abbrev];

  const refreshInstruction = program.instruction.refreshReserve({
    accounts: {
      market: market.accountPubkey,
      marketAuthority: market.authorityPubkey,

      reserve: reserve.accountPubkey,
      feeNoteVault: reserve.feeNoteVaultPubkey,
      depositNoteMint: reserve.depositNoteMintPubkey,

      pythOraclePrice: reserve.pythPricePubkey,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
  });

  return refreshInstruction;
};

// Faucet
export const airdrop = async (abbrev: string, lamports: BN)
  : Promise<[res: TxnResponse, txid: string[]]> => {
  if (program == null || user.assets == null || !user.wallet) {
    return [TxnResponse.Failed, []];
  }

  let reserve = market.reserves[abbrev];
  const asset = Object.values(user.assets.tokens).find(asset => asset.tokenMintPubkey.equals(reserve.tokenMintPubkey));

  if (asset == null) {
    return [TxnResponse.Failed, []];
  }

  let ix: TransactionInstruction[] = [];
  let signers: Signer[] = [];

  //optionally create a token account for wallet

  let res: TxnResponse = TxnResponse.Failed
  let txid: string[] = [];

  if (!asset.walletTokenExists) {
    const createTokenAccountIx = Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      asset.tokenMintPubkey,
      asset.walletTokenPubkey,
      user.wallet.publicKey,
      user.wallet.publicKey);
    ix.push(createTokenAccountIx);
  }

  if (reserve.tokenMintPubkey.equals(NATIVE_MINT)) {
    // Sol airdrop
    try {
      // Use a specific endpoint. A hack because some devnet endpoints are unable to airdrop
      const endpoint = new anchor.web3.Connection('https://api.devnet.solana.com', (anchor.Provider.defaultOptions()).commitment);
      const airdropTxnId = await endpoint.requestAirdrop(user.wallet.publicKey, parseInt(lamports.toString()));
      console.log(`Transaction ${explorerUrl(airdropTxnId)}`);
      const confirmation = await endpoint.confirmTransaction(airdropTxnId);
      if (confirmation.value.err) {
        console.error(`Airdrop error: ${transactionErrorToString(confirmation.value.err.toString())}`);
        return [TxnResponse.Failed, []];
      } else {
        return [TxnResponse.Success, [airdropTxnId]];
      }
    } catch (error) {
      console.error(`Airdrop error: ${transactionErrorToString(error)}`);
      rollbar.error(`Airdrop error: ${transactionErrorToString(error)}`);
      return [TxnResponse.Failed, []]
    }
  } else if (reserve.faucetPubkey) {
    // Faucet airdrop
    const faucetAirdropIx = await buildFaucetAirdropIx(
      lamports,
      reserve.tokenMintPubkey,
      asset.walletTokenPubkey,
      reserve.faucetPubkey
    );
    ix.push(faucetAirdropIx);

    [res, txid] = await sendTransaction(program.provider, ix, signers);
  } else {
    // Mint to the destination token account
    const mintToIx = Token.createMintToInstruction(TOKEN_PROGRAM_ID, reserve.tokenMintPubkey, asset.walletTokenPubkey, user.wallet.publicKey, [], new u64(lamports.toArray()));
    ix.push(mintToIx);

    [res, txid] = await sendTransaction(program.provider, ix, signers);
  }

  return [res, txid];
};

const buildFaucetAirdropIx = async (
  amount: BN,
  tokenMintPublicKey: PublicKey,
  destinationAccountPubkey: PublicKey,
  faucetPubkey: PublicKey
) => {
  const pubkeyNonce = await PublicKey.findProgramAddress([new TextEncoder().encode("faucet")], FAUCET_PROGRAM_ID);

  const keys = [
    { pubkey: pubkeyNonce[0], isSigner: false, isWritable: false },
    {
      pubkey: tokenMintPublicKey,
      isSigner: false,
      isWritable: true
    },
    { pubkey: destinationAccountPubkey, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: faucetPubkey, isSigner: false, isWritable: false }
  ];

  return new TransactionInstruction({
    programId: FAUCET_PROGRAM_ID,
    data: Buffer.from([1, ...amount.toArray("le", 8)]),
    keys
  });
};

//Take error code and and return error explanation
export const getErrNameAndMsg = (errCode: number): string => {
  const code = Number(errCode);

  if (code >=100 && code < 300) {
    return `This is an Anchor program error code ${code}. Please check here: https://github.com/project-serum/anchor/blob/master/lang/src/error.rs`;
  }

  for (let i = 0; i < customProgramErrors.length; i++) {
    const err = customProgramErrors[i];
    if (err.code === code) {
      return `\n\nCustom Program Error Code: ${errCode} \n- ${err.name} \n- ${err.msg}`;
    }
  } 
  return `No matching error code description or translation for ${errCode}`;
};

//get the custom program error code if there's any in the error message and return parsed error code hex to number string

  /**
   * Get the custom program error code if there's any in the error message and return parsed error code hex to number string
   * @param errMessage string - error message that would contain the word "custom program error:" if it's a customer program error
   * @returns [boolean, string] - probably not a custom program error if false otherwise the second element will be the code number in string
   */
export const getCustomProgramErrorCode = (errMessage: string): [boolean, string] => {
  const index = errMessage.indexOf('custom program error:');
  if(index == -1) {
    return [false, 'May not be a custom program error']
  } else {
    return [true, `${parseInt(errMessage.substring(index + 22,  index + 28).replace(' ', ''), 16)}`];
  }
};
