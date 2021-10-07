import { Keypair, PublicKey, Signer, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { BN } from '@project-serum/anchor';
import { ASSOCIATED_TOKEN_PROGRAM_ID, NATIVE_MINT } from "@solana/spl-token";
import { AccountLayout as TokenAccountLayout, Token, TOKEN_PROGRAM_ID, u64 } from "@solana/spl-token";
import Rollbar from 'rollbar';
import WalletAdapter from './walletAdapter';
import type { Reserve, AssetStore, SolWindow, WalletProvider, Wallet, Asset, Market, MathWallet, SolongWallet, CustomProgramError, TransactionLog } from '../models/JetTypes';
import { MARKET, CONNECT_WALLET, WALLET, ASSETS, TRANSACTION_LOGS, PROGRAM, PREFERRED_NODE, WALLET_INIT, CUSTOM_PROGRAM_ERRORS, ANCHOR_WEB3_CONNECTION, ANCHOR_CODER, IDL_METADATA, INIT_FAILED, CURRENT_RESERVE, PREFERRED_LANGUAGE, COPILOT } from '../store';
import { subscribeToAssets, subscribeToMarket } from './subscribe';
import { findDepositNoteAddress, findDepositNoteDestAddress, findLoanNoteAddress, findObligationAddress, sendTransaction, transactionErrorToString, findCollateralAddress, SOL_DECIMALS, parseIdlMetadata, sendAllTransactions, InstructionAndSigner, explorerUrl } from './programUtil';
import { Amount, TokenAmount } from './util';
import { dictionary } from './localization';
import { Buffer } from 'buffer';

const SECONDS_PER_HOUR: BN = new BN(3600);
const SECONDS_PER_DAY: BN = SECONDS_PER_HOUR.muln(24);
const SECONDS_PER_WEEK: BN = SECONDS_PER_DAY.muln(7);
const MAX_ACCRUAL_SECONDS: BN = SECONDS_PER_WEEK;

const FAUCET_PROGRAM_ID = new PublicKey(
  "4bXpkKSV8swHSnwqtzuboGPaPDeEgAn4Vt8GfarV5rZt"
);

let wallet: Wallet | MathWallet | SolongWallet;
let assets: AssetStore | null;
let program: anchor.Program | null;
let market: Market;
let idl: any;
let customProgramErrors: CustomProgramError[];
let connection: anchor.web3.Connection;
let coder: anchor.Coder;
let preferredLanguage: string;
let preferredNode: string | null;
WALLET.subscribe(data => wallet = data);
ASSETS.subscribe(data => assets = data);
PROGRAM.subscribe(data => program = data);
MARKET.subscribe(data => market = data);
CUSTOM_PROGRAM_ERRORS.subscribe(data => customProgramErrors = data);
ANCHOR_WEB3_CONNECTION.subscribe(data => connection = data);
ANCHOR_CODER.subscribe(data => coder = data);
PREFERRED_LANGUAGE.subscribe(data => preferredLanguage = data);
PREFERRED_NODE.subscribe(data => preferredNode = data);

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

// Record of instructions to their first 8 bytes for transaction logs
const INSTRUCTION_BYTES: Record<string, number[]> = {
  deposit: [242, 35, 198, 137, 82, 225, 242, 182],
  withdraw: [183, 18, 70, 156, 148, 109, 161, 34],
  borrow: [228, 253, 131, 202, 207, 116, 89, 18],
  repay: [234, 103, 67, 82, 208, 234, 219, 166]
};

// Get IDL and market data
export const getMarketAndIDL = async (): Promise<void> => {
  // Fetch IDL and preferred RPC Node
  const resp = await fetch('idl/jet.json');
  idl = await resp.json();
  IDL_METADATA.set(parseIdlMetadata(idl.metadata));
  CUSTOM_PROGRAM_ERRORS.set(idl.errors);
  PREFERRED_NODE.set(localStorage.getItem('jetPreferredNode'));

  // Establish web3 connection
  const idlMetadata = parseIdlMetadata(idl.metadata);
  coder = new anchor.Coder(idl);

  // Establish and test web3 connection
  // If error log it and display failure component
  try {
    const anchorConnection = new anchor.web3.Connection(
      preferredNode ?? idlMetadata.cluster, 
      (anchor.Provider.defaultOptions()).commitment
    );
    ANCHOR_WEB3_CONNECTION.set(anchorConnection);
  } catch {
    const anchorConnection = new anchor.web3.Connection(idlMetadata.cluster, (anchor.Provider.defaultOptions()).commitment);
    ANCHOR_WEB3_CONNECTION.set(anchorConnection);
    PREFERRED_NODE.set(null);
    localStorage.removeItem('jetPreferredNode');
  }
  
  ANCHOR_CODER.set(new anchor.Coder(idl));
  try {
    await connection.getVersion();
    INIT_FAILED.set(null);
  } catch (err) {
    console.error(`Unable to connect: ${err}`)
    rollbar.critical(`Unable to connect: ${err}`);
    INIT_FAILED.set({ geobanned: false });
    return;
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

  // Set market
  MARKET.set({
    minColRatio: 0,
    accountPubkey: idlMetadata.market.market,
    authorityPubkey: idlMetadata.market.marketAuthority,
    reserves: reserves,
  });

  // Set current reserve to SOL
  CURRENT_RESERVE.set(market.reserves.SOL);

  // Subscribe to market 
  await subscribeToMarket(idlMetadata, connection, coder);

  // Prompt user to connect wallet
  CONNECT_WALLET.set(true);
};

// Connect to user's wallet
export const getWalletAndAnchor = async (provider: WalletProvider): Promise<void> => {
  // Cast solana injected window type
  const solWindow = window as unknown as SolWindow;

  // Wallet adapter or injected wallet setup
  if (provider.name === 'Phantom' && solWindow.solana?.isPhantom) {
    wallet = solWindow.solana as unknown as Wallet;
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

  // Set wallet
  wallet.name = provider.name;
  WALLET.set(wallet);

  // Setup anchor program
  anchor.setProvider(new anchor.Provider(
    connection,
    wallet as unknown as anchor.Wallet,
    anchor.Provider.defaultOptions()
  ));
  program = new anchor.Program(idl, (new anchor.web3.PublicKey(idl.metadata.address)));
  PROGRAM.set(program);

  // Connect and begin fetching account data
  // Check for newly created token accounts on interval
  wallet.on('connect', async () => {
    getTransactionLogs();
    await getAssetPubkeys();
    await subscribeToAssets(connection, coder, wallet.publicKey);
    await getMarketAndIDL();
    WALLET_INIT.set(true);

    // Must accept disclaimer upon mainnet launch
    if (!inDevelopment) {
      const accepted = localStorage.getItem('jetDisclaimer');
      if (!accepted) {
        COPILOT.set({
          alert: {
            good: false,
            header: dictionary[preferredLanguage].copilot.alert.warning,
            text: dictionary[preferredLanguage].copilot.alert.disclaimer,
            action: {
              text: dictionary[preferredLanguage].copilot.alert.accept,
              onClick: () => localStorage.setItem('jetDisclaimer', 'true')
            }
          }
        });
      }
    }
  });
  await wallet.connect();
};

// Get Jet transactions and associated UI data
export const getTransactionLogs = async (): Promise<void> => {
  if (!wallet?.publicKey) {
    return;
  }

  // Reset global store
  TRANSACTION_LOGS.set(null);
  // Establish solana connection and get all confirmed signatures
  // associated with user's wallet pubkey
  const txLogs: TransactionLog[] = [];
  const transactionConnection = preferredNode ? new anchor.web3.Connection(preferredNode)
    : (inDevelopment ? new anchor.web3.Connection('https://api.devnet.solana.com/')  : connection);
  const sigs = await transactionConnection.getConfirmedSignaturesForAddress2(wallet.publicKey, undefined, 'confirmed'); 
  for (let sig of sigs) {
    // Get confirmed transaction from each signature
    const log = await transactionConnection.getConfirmedTransaction(sig.signature, 'confirmed') as unknown as TransactionLog;
    // Use log messages to only surface transactions that utilize Jet
    for (let msg of log.meta.logMessages) {
      if (msg.indexOf(idl.metadata.address) !== -1) {
        for (let progInst in INSTRUCTION_BYTES) {
          for (let inst of log.transaction.instructions) {
            // Get first 8 bytes from data
            const txInstBytes = [];
            for (let i = 0; i < 8; i++) {
              txInstBytes.push(inst.data[i]);
            }
            // If those bytes match any of our instructions label trade action
            if (JSON.stringify(INSTRUCTION_BYTES[progInst]) === JSON.stringify(txInstBytes)) {
              log.tradeAction = dictionary[preferredLanguage].transactions[progInst];
              // Determine asset and trade amount
              for (let pre of log.meta.preTokenBalances as any[]) {
                for (let post of log.meta.postTokenBalances as any[]) {
                  if (pre.mint === post.mint && pre.uiTokenAmount.amount !== post.uiTokenAmount.amount) {
                    for (let reserve of idl.metadata.reserves) {
                      if (reserve.accounts.tokenMint === pre.mint) {
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
              log.signature = sig.signature;
              // UI date
              log.blockDate = new Date(log.blockTime * 1000).toLocaleDateString();
              // Explorer URL
              log.explorerUrl = explorerUrl(log.signature);
              // If we found mint match, add tx to logs
              if (log.tokenAbbrev) {
                txLogs.push(log);
              }
            }
          }
        }
      }
      // Break messages loop and move onto next signature
      break;
    }
  }
  // Update global store
  TRANSACTION_LOGS.set(txLogs);
};

// Get user token accounts
const getAssetPubkeys = async (): Promise<void> => {
  if (program == null || wallet.publicKey == null) {
    return;
  }

  let [obligationPubkey, obligationBump] = await findObligationAddress(program, market.accountPubkey, wallet.publicKey);

  let assetStore: AssetStore = {
    sol: new TokenAmount(new BN(0), SOL_DECIMALS),
    obligationPubkey,
    obligationBump,
    tokens: {}
  } as AssetStore;
  for (const assetAbbrev in market.reserves) {
    let reserve = market.reserves[assetAbbrev];
    let tokenMintPubkey = reserve.tokenMintPubkey;

    let [depositNoteDestPubkey, depositNoteDestBump] = await findDepositNoteDestAddress(program, reserve.accountPubkey, wallet.publicKey);
    let [depositNotePubkey, depositNoteBump] = await findDepositNoteAddress(program, reserve.accountPubkey, wallet.publicKey);
    let [loanNotePubkey, loanNoteBump] = await findLoanNoteAddress(program, reserve.accountPubkey, obligationPubkey, wallet.publicKey);
    let [collateralPubkey, collateralBump] = await findCollateralAddress(program, reserve.accountPubkey, obligationPubkey, wallet.publicKey);

    let asset: Asset = {
      tokenMintPubkey,
      walletTokenPubkey: await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, tokenMintPubkey, wallet.publicKey),
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
    };

    // Set asset
    assetStore.tokens[assetAbbrev] = asset;
    ASSETS.set(assetStore);
  }
};

// Deposit
export const deposit = async (abbrev: string, lamports: BN)
  : Promise<[ok: boolean, txid: string | undefined]> => {
  if (!assets || !program) {
    return [false, undefined];
  }

  const [ok, txid] = await refreshOldReserves();
  if (!ok) {
    return [false, txid]
  }

  let reserve = market.reserves[abbrev];
  let asset = assets.tokens[abbrev];
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
      fromPubkey: wallet.publicKey,
      newAccountPubkey: depositSourcePubkey,
      programId: TOKEN_PROGRAM_ID,
      space: TokenAccountLayout.span,
      lamports: parseInt(lamports.addn(rent).toString())
    })

    initTokenAccountIx = Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      NATIVE_MINT,
      depositSourcePubkey,
      wallet.publicKey
    );

    closeTokenAccountIx = Token.createCloseAccountInstruction(
      TOKEN_PROGRAM_ID,
      depositSourcePubkey,
      wallet.publicKey,
      wallet.publicKey,
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

        depositor: wallet.publicKey,
        depositAccount: asset.depositNotePubkey,

        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
    });
  }

  if (!assets.obligation) {
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

      depositor: wallet.publicKey,
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

        obligation: assets.obligationPubkey,
        reserve: reserve.accountPubkey,
        depositNoteMint: reserve.depositNoteMintPubkey,

        owner: wallet.publicKey,
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

      obligation: assets.obligationPubkey,
      owner: wallet.publicKey,
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
    return [false, undefined];
  }
};

// Withdraw
export const withdraw = async (abbrev: string, amount: Amount)
  : Promise<[ok: boolean, txid: string | undefined]> => {
  if (!assets || !program) {
    return [false, undefined];
  }

  const [ok, txid] = await refreshOldReserves();
  if (!ok) {
    return [false, txid]
  }

  const reserve = market.reserves[abbrev];
  const asset = assets.tokens[abbrev];

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
      fromPubkey: wallet.publicKey,
      newAccountPubkey: withdrawAccount,
      programId: TOKEN_PROGRAM_ID,
      space: TokenAccountLayout.span,
      lamports: rent,
    })
    initWsolIx = Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID, 
      reserve.tokenMintPubkey, 
      withdrawAccount, 
      wallet.publicKey);
  } else if (!asset.walletTokenExists) {
    // Create the wallet token account if it doesn't exist
    createAssociatedTokenAccountIx = Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      asset.tokenMintPubkey,
      withdrawAccount,
      wallet.publicKey,
      wallet.publicKey);
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

      obligation: assets.obligationPubkey,
      owner: wallet.publicKey,
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

      depositor: wallet.publicKey,
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
      wallet.publicKey,
      wallet.publicKey,
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
    const [ok, txids] = await sendAllTransactions(program.provider, ixs);
    return [ok, txids[txids.length - 1]]
  } catch (err) {
    console.error(`Withdraw error: ${transactionErrorToString(err)}`);
    rollbar.error(`Withdraw error: ${transactionErrorToString(err)}`);
    return [false, undefined];
  }
};

// Borrow
export const borrow = async (abbrev: string, amount: Amount)
  : Promise<[ok: boolean, txid: string | undefined]> => {
  if (!assets || !program) {
    return [false, undefined];
  }

  const [ok, txid] = await refreshOldReserves();
  if (!ok) {
    return [false, txid]
  }
  

  const reserve = market.reserves[abbrev];
  const asset = assets.tokens[abbrev];

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
      fromPubkey: wallet.publicKey,
      newAccountPubkey: wsolKeypair.publicKey,
      programId: TOKEN_PROGRAM_ID,
      space: TokenAccountLayout.span,
      lamports: rent,
    })
    initWsoltokenAccountIx = Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID, 
      reserve.tokenMintPubkey, 
      wsolKeypair.publicKey, 
      wallet.publicKey);
  } else if (!asset.walletTokenExists) {
    // Create the wallet token account if it doesn't exist
    createTokenAccountIx = Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      asset.tokenMintPubkey,
      asset.walletTokenPubkey,
      wallet.publicKey,
      wallet.publicKey);
  }

  // Create the loan note account if it doesn't exist
  if (!asset.loanNoteExists) {
    initLoanAccountIx = program.instruction.initLoanAccount(asset.loanNoteBump, {
      accounts: {
        market: market.accountPubkey,
        marketAuthority: market.authorityPubkey,

        obligation: assets.obligationPubkey,
        reserve: reserve.accountPubkey,
        loanNoteMint: reserve.loanNoteMintPubkey,

        owner: wallet.publicKey,
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

      obligation: assets.obligationPubkey,
      reserve: reserve.accountPubkey,
      vault: reserve.vaultPubkey,
      loanNoteMint: reserve.loanNoteMintPubkey,

      borrower: wallet.publicKey,
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
      wallet.publicKey,
      wallet.publicKey,
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
    const [ok, txids] = await sendAllTransactions(program.provider, ixs);
    return [ok, txids[txids.length - 1]];
  } catch (err) {
    console.error(`Borrow error: ${transactionErrorToString(err)}`);
    rollbar.error(`Borrow error: ${transactionErrorToString(err)}`);
    return [false, undefined];
  }
};

// Repay
export const repay = async (abbrev: string, amount: Amount)
  : Promise<[ok: boolean, txid: string | undefined]> => {
  if (!assets || !program) {
    return [false, undefined];
  }

  const [ok, txid] = await refreshOldReserves();
  if (!ok) {
    return [false, txid]
  }

  const reserve = market.reserves[abbrev];
  const asset = assets.tokens[abbrev];
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
      fromPubkey: wallet.publicKey,
      newAccountPubkey: depositSourcePubkey,
      programId: TOKEN_PROGRAM_ID,
      space: TokenAccountLayout.span,
      lamports: parseInt(lamports.addn(rent).toString())
    })

    initTokenAccountIx = Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      NATIVE_MINT,
      depositSourcePubkey,
      wallet.publicKey
    );

    closeTokenAccountIx = Token.createCloseAccountInstruction(
      TOKEN_PROGRAM_ID,
      depositSourcePubkey,
      wallet.publicKey,
      wallet.publicKey,
      []);
  } else if (!asset.walletTokenExists) {
    return [false, undefined];
  }

  // Obligatory refresh instruction
  const refreshReserveIx = buildRefreshReserveIx(abbrev);

  const repayIx = program.instruction.repay(amount, {
    accounts: {
      market: market.accountPubkey,
      marketAuthority: market.authorityPubkey,

      obligation: assets.obligationPubkey,
      reserve: reserve.accountPubkey,
      vault: reserve.vaultPubkey,
      loanNoteMint: reserve.loanNoteMintPubkey,

      payer: wallet.publicKey,
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
    return [false, undefined];
  }
};

const buildInitObligationIx = ()
  : TransactionInstruction | undefined => {
  if (!program || !assets) {
    return;
  }

  return program.instruction.initObligation(assets.obligationBump, {
    accounts: {
      market: market.accountPubkey,
      marketAuthority: market.authorityPubkey,

      borrower: wallet.publicKey,
      obligation: assets.obligationPubkey,

      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    },
  });
};

/** Creates ixs to refresh all reserves. */
const buildRefreshReserveIxs = () => {
  const ix: TransactionInstruction[] = [];

  if (!assets) {
    return ix;
  }

  for (const assetAbbrev in assets.tokens) {
    const refreshReserveIx = buildRefreshReserveIx(assetAbbrev);
    ix.push(refreshReserveIx);
  }
  return ix;
}

/**Sends transactions to refresh all reserves
 * until it can be fully refreshed once more. */
const refreshOldReserves = async ()
  : Promise<[ok: boolean, txid: string | undefined]> => {
  if (!program) {
    return [false, undefined];
  }

  let result: [ok: boolean, txid: string | undefined] = [true, undefined];

  for (const abbrev in market.reserves) {
    let reserve = market.reserves[abbrev];
    let accruedUntil = reserve.accruedUntil;

    while (accruedUntil.add(MAX_ACCRUAL_SECONDS).lt(new BN(Math.floor(Date.now() / 1000)))) {
      const refreshReserveIx = buildRefreshReserveIx(abbrev);

      const ix = [
        refreshReserveIx
      ].filter(ix => ix) as TransactionInstruction[];

      try {
        result = await sendTransaction(program.provider, ix);
      } catch (err) {
        console.log(transactionErrorToString(err));
        return [false, undefined];
      }
      accruedUntil = accruedUntil.add(MAX_ACCRUAL_SECONDS);
    }
  }
  return result;
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
  : Promise<[ok: boolean, txid: string | undefined]> => {
  if (program == null || assets == null) {
    return [false, undefined];
  }

  let reserve = market.reserves[abbrev];
  const asset = Object.values(assets.tokens).find(asset => asset.tokenMintPubkey.equals(reserve.tokenMintPubkey));

  if (asset == null) {
    return [false, undefined];
  }

  let ix: TransactionInstruction[] = [];
  let signers: Signer[] = [];

  //optionally create a token account for wallet

  let ok: boolean = false, txid: string | undefined;

  if (!asset.walletTokenExists) {
    const createTokenAccountIx = Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      asset.tokenMintPubkey,
      asset.walletTokenPubkey,
      wallet.publicKey,
      wallet.publicKey);
    ix.push(createTokenAccountIx);
  }

  if (reserve.tokenMintPubkey.equals(NATIVE_MINT)) {
    // Sol airdrop
    try {
      // Use a specific endpoint. A hack because some devnet endpoints are unable to airdrop
      const endpoint = new anchor.web3.Connection('https://api.devnet.solana.com', (anchor.Provider.defaultOptions()).commitment);
      const txid = await endpoint.requestAirdrop(wallet.publicKey, parseInt(lamports.toString()));
      console.log(`Transaction ${explorerUrl(txid)}`);
      const confirmation = await endpoint.confirmTransaction(txid);
      if (confirmation.value.err) {
        console.error(`Airdrop error: ${transactionErrorToString(confirmation.value.err.toString())}`);
        return [false, txid];
      } else {
        return [true, txid];
      }
    } catch (error) {
      console.error(`Airdrop error: ${transactionErrorToString(error)}`);
      rollbar.error(`Airdrop error: ${transactionErrorToString(error)}`);
      return [false, undefined]
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

    [ok, txid] = await sendTransaction(program.provider, ix, signers);
  } else {
    // Mint to the destination token account
    const mintToIx = Token.createMintToInstruction(TOKEN_PROGRAM_ID, reserve.tokenMintPubkey, asset.walletTokenPubkey, wallet.publicKey, [], new u64(lamports.toArray()));
    ix.push(mintToIx);

    [ok, txid] = await sendTransaction(program.provider, ix, signers);
  }

  return [ok, txid];
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
