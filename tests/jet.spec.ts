import * as anchor from "@project-serum/anchor";
import { Amount, JetClient, JetReserve, JetUser, ReserveConfig } from "@jet-lab/jet-client";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import { CreateMarketParams, JetMarket } from "libraries/ts/src/market";
import { TestToken, TestUtils, toBN } from "./utils";
import { BN } from "@project-serum/anchor";
import { NodeWallet } from '@project-serum/anchor/dist/provider';
import { CreateReserveParams } from "libraries/ts/src/reserve";
import * as serum from "@project-serum/serum";
import { SerumUtils } from "./utils/serum";
import { assert } from "chai";
import * as splToken from "@solana/spl-token";
import { ReserveAccount, ReserveStateStruct } from "app/src/models/JetTypes";
import { ReserveStateLayout } from "app/src/scripts/layout";

describe("jet", async () => {
  function bn(z: number): BN { return new BN(z); }

  async function checkBalance(tokenAccount: PublicKey): Promise<BN> {
    let info = await provider.connection.getAccountInfo(tokenAccount);
    const account: splToken.AccountInfo = splToken.AccountLayout.decode(info.data);

    return (new BN(account.amount, undefined, "le"));
  }

  async function createTokenEnv(decimals: number, price: bigint) {
    let pythPrice = await testUtils.pyth.createPriceAccount();
    let pythProduct = await testUtils.pyth.createProductAccount();

    await testUtils.pyth.updatePriceAccount(pythPrice, {
      exponent: -9,
      aggregatePriceInfo: {
        price: price * 1000000000n
      }
    });
    await testUtils.pyth.updateProductAccount(pythProduct, {
      priceAccount: pythPrice.publicKey,
      attributes: {
        quote_currency: "USD",
      },
    });

    return {
      token: await testUtils.createToken(decimals),
      pythPrice,
      pythProduct,
    } as TokenEnv
  }
  interface TokenEnv {
    token: TestToken,
    pythPrice: Keypair,
    pythProduct: Keypair,
    reserve?: JetReserve,
  }

  let IDL: anchor.Idl;
  const program: anchor.Program = anchor.workspace.Jet;
  const provider = anchor.Provider.local();
  const wallet = provider.wallet as anchor.Wallet;

  const testUtils = new TestUtils(provider.connection, wallet);
  const serumUtils = new SerumUtils(testUtils, false);

  let jet: anchor.Program;
  let client: JetClient;
  let usdc: TokenEnv;
  let wsol: TokenEnv;
  let wsolusdc: serum.Market;

  let borrowTimestamp = 0;
  let expectedLoanNotesBalance = bn(0);

  const initialTokenAmount = 1e6 * 1e6;
  const usdcDeposit = initialTokenAmount;
  const wsolDeposit = usdcDeposit / 100 * 1.25 * 0.9;

  async function createTestUser(
    assets: Array<TokenEnv>,
    market: JetMarket
  ): Promise<TestUser> {
    const userWallet = await testUtils.createWallet(100000 * LAMPORTS_PER_SOL);
    const createUserTokens = async (asset: TokenEnv) => {
      const tokenAccount = await asset.token.getOrCreateAssociatedAccountInfo(
        userWallet.publicKey
      );

      await asset.token.mintTo(
        tokenAccount.address,
        wallet.publicKey,
        [],
        initialTokenAmount,
      );
      return tokenAccount.address;
    };

    let tokenAccounts: Record<string, PublicKey> = {};
    for (const asset of assets) {
      tokenAccounts[asset.token.publicKey.toBase58()] = await createUserTokens(asset);
    }

    const userProgram = new anchor.Program(
      IDL,
      program.programId,
      new anchor.Provider(
        program.provider.connection,
        new anchor.Wallet(userWallet),
        {}
      )
    );

    const userClient = new JetClient(userProgram);

    return {
      wallet: userWallet,
      tokenAccounts,
      client: await JetUser.load(userClient, market, userWallet.publicKey),
    };
  }

  let userA: TestUser;
  let userB: TestUser;
  interface TestUser {
    wallet: Keypair;
    tokenAccounts: Record<string, PublicKey>;
    client: JetUser;
  }

  let marketOwner: Keypair;
  let jetMarket: JetMarket;
  let reserveConfig: ReserveConfig;

  before(async () => {
    IDL = program.idl;
    jet = new anchor.Program(IDL, program.programId, provider);
    client = new JetClient(jet);

    usdc = await createTokenEnv(6, 1n);   // FIXME Break decimal symmetry
    wsol = await createTokenEnv(6, 100n); //       and ensure tests pass

    wsolusdc = await serumUtils.createMarket({
      baseToken: wsol.token,
      quoteToken: usdc.token,
      baseLotSize: 100000,
      quoteLotSize: 100,
      feeRateBps: 22,
    });

    // marketOwner = Keypair.generate(); // FIXME ? This _should_ work
    marketOwner = (provider.wallet as any as NodeWallet).payer;

    reserveConfig = {
      utilizationRate1: 8500,
      utilizationRate2: 9500,
      borrowRate0: 20000,
      borrowRate1: 20000,
      borrowRate2: 20000,
      borrowRate3: 20000,
      minCollateralRatio: 12500,
      liquidationPremium: 100,
      manageFeeRate: 50,
      manageFeeCollectionThreshold: new BN(10),
      loanOriginationFee: 0,
      liquidationSlippage: 300,
      liquidationDexTradeMax: new BN(100),
    } as ReserveConfig;
  });

  it("creates lending market", async () => {
    jetMarket = await client.createMarket({
      owner: marketOwner.publicKey,
      quoteCurrencyMint: usdc.token.publicKey,
      quoteCurrencyName: "USD",
    } as CreateMarketParams);

    userA = await createTestUser([usdc, wsol], jetMarket);
    userB = await createTestUser([usdc, wsol], jetMarket);
  });

  it("creates reserves", async () => {
    for (let tokenEnv of [usdc, wsol]) {
      tokenEnv.reserve = await jetMarket.createReserve({
        dexMarket: wsolusdc.publicKey,
        tokenMint: tokenEnv.token.publicKey,
        pythOraclePrice: tokenEnv.pythPrice.publicKey,
        pythOracleProduct: tokenEnv.pythProduct.publicKey,
        config: reserveConfig,
      } as CreateReserveParams);
    }
  });

  it("user A deposits usdc notes", async () => {
    const user = userA;
    const asset = usdc;
    const amount = Amount.depositNotes(usdcDeposit);
    const tokenAccountKey = user.tokenAccounts[asset.token.publicKey.toBase58()];

    await user.client.deposit(asset.reserve, tokenAccountKey, amount);
    await user.client.depositCollateral(asset.reserve, amount);
  });

  it("user B deposits wsol", async () => {
    const user = userB;
    const asset = wsol;
    const amount = Amount.tokens(wsolDeposit);
    const tokenAccountKey = user.tokenAccounts[asset.token.publicKey.toBase58()];
    
    const vaultKey = asset.reserve.data.vault;
    const notesKey = (
      await client.findDerivedAccount([
        "deposits",
        asset.reserve.address,
        user.client.address,
      ])
    ).address;
    const obligationKey = (
      await client.findDerivedAccount([
        "obligation",
        jetMarket.address,
        user.client.address,
      ])
    ).address;
    const collateralKey = (
      await client.findDerivedAccount([
        "collateral",
        asset.reserve.address,
        obligationKey,
        user.client.address,
      ])
    ).address;

    let tokenBalance = await checkBalance(vaultKey);
    assert.equal(tokenBalance.toString(), bn(0).toString());

    await user.client.deposit(asset.reserve, tokenAccountKey, amount);

    tokenBalance = await checkBalance(vaultKey);
    assert.equal(tokenBalance.toString(), bn(wsolDeposit).toString());

    let noteBalance = await checkBalance(notesKey);
    assert.equal(noteBalance.toString(), bn(wsolDeposit).toString());

    await user.client.depositCollateral(asset.reserve, amount);

    noteBalance = await checkBalance(notesKey);
    assert.equal(noteBalance.toString(), bn(0).toString());

    const collateralBalance = await checkBalance(collateralKey);
    assert.equal(collateralBalance.toString(), bn(wsolDeposit).toString());
  });

  it("user B borrows usdc", async () => {
    const user = userB;
    const asset = usdc;
    const usdcBorrow = usdcDeposit * 0.8;
    const amount = Amount.tokens(usdcBorrow);
    const tokenAccountKey = user.tokenAccounts[asset.token.publicKey.toBase58()];

    const obligationKey = (
      await client.findDerivedAccount([
        "obligation",
        jetMarket.address,
        user.client.address,
      ])
    ).address;
    const notesKey = (
      await client.findDerivedAccount([
        "loan",
        asset.reserve.address,
        obligationKey,
        user.client.address,
      ])
    ).address;

    await jetMarket.refresh();
    const txId = await user.client.borrow(asset.reserve, tokenAccountKey, amount);
    await new Promise(r => setTimeout(r, 500));
    const tx = await provider.connection.getTransaction(txId, {commitment: "confirmed"});
    borrowTimestamp = tx.blockTime;

    // FIXME check debt

    const tokenBalance = await checkBalance(tokenAccountKey);
    const notesBalance = await checkBalance(notesKey);

    const expectedTokenBalance = bn(initialTokenAmount).add(amount.value);
    expectedLoanNotesBalance =
      bn(1e4)
      .add(bn(reserveConfig.loanOriginationFee))
      .mul(amount.value)
      .div(bn(1e4));

    assert.equal(tokenBalance.toString(), expectedTokenBalance.toString());
    assert.equal(notesBalance.toString(), expectedLoanNotesBalance.toString());
  });

  it("user B fails to borrow beyond limit", async () => {
    const user = userB;
    const amount = Amount.tokens(usdcDeposit * 0.1001);
    const tokenAccount = user.tokenAccounts[usdc.token.publicKey.toBase58()];

    await wsol.reserve.refresh();

    const tx = await user.client.makeBorrowTx(usdc.reserve, tokenAccount, amount);
    let result = await client.program.provider.simulate(tx, [user.wallet]);
    assert.notStrictEqual(result.value.err, null, "expected instruction to fail");
  });

  it("user B wsol withdrawal blocked", async () => {
    const user = userB;

    const amount = Amount.tokens(wsolDeposit * 0.1112);

    // Give it some seconds for interest to accrue
    await new Promise(r => setTimeout(r, 2000));

    await usdc.reserve.refresh();

    const tx = await user.client.makeWithdrawCollateralTx(wsol.reserve, amount);
    let result = await client.program.provider.simulate(tx, [user.wallet]);
    assert.notStrictEqual(result.value.err, null, "expected instruction to failed");
  });

  it("user B withdraws some wsol", async () => {
    const user = userB;
    const wsolWithdrawal = wsolDeposit * 0.05;
    const amount = Amount.tokens(wsolWithdrawal);
    const tokenAccountKey = user.tokenAccounts[wsol.token.publicKey.toBase58()];

    await usdc.reserve.refresh();

    await user.client.withdrawCollateral(wsol.reserve, amount);
    await user.client.withdraw(wsol.reserve, tokenAccountKey, amount);

    const vaultKey = wsol.reserve.data.vault;
    const notesKey = (
      await client.findDerivedAccount([
        "deposits",
        wsol.reserve.address,
        user.client.address,
      ])
    ).address;
    const obligationKey = (
      await client.findDerivedAccount([
        "obligation",
        jetMarket.address,
        user.client.address,
      ])
    ).address;
    const collateralKey = (
      await client.findDerivedAccount([
        "collateral",
        wsol.reserve.address,
        obligationKey,
        user.client.address,
      ])
    ).address;

    const tokenBalance = await checkBalance(tokenAccountKey);
    const notesBalance = await checkBalance(notesKey);
    const collateralBalance = await checkBalance(collateralKey);
    const vaultBalance = await checkBalance(vaultKey);

    const expectedTokenBalance = initialTokenAmount - wsolDeposit + wsolWithdrawal;
    const expectedCollateralBalance = 0.95 * wsolDeposit;
    const expectedVaultBalance = expectedCollateralBalance;

    assert.equal(tokenBalance.toString(), bn(expectedTokenBalance).toString());
    assert.equal(notesBalance.toString(), "0");
    assert.equal(collateralBalance.toString(), bn(expectedCollateralBalance).toString());
    assert.equal(vaultBalance.toString(), bn(expectedVaultBalance).toString());
  });

  it("user B repays some usdc", async () => {
    const user = userB;
    const asset = usdc;
    const amount = Amount.loanNotes(usdcDeposit * 0.8);
    const tokenAccountKey = user.tokenAccounts[asset.token.publicKey.toBase58()];

    const txId = await user.client.repay(asset.reserve, tokenAccountKey, amount);

    const info = await provider.connection.getAccountInfo(asset.reserve.address);
    let reserve = program.coder.accounts.decode<ReserveAccount>("Reserve", info.data);
    const reserveState = ReserveStateLayout.decode(Buffer.from(reserve.state as any as number[])) as ReserveStateStruct;
    reserve.state = reserveState;

    // FIXME Dig into total debt and interest numbers.

    const obligationKey = (
      await client.findDerivedAccount([
        "obligation",
        jetMarket.address,
        user.client.address,
      ])
    ).address;
    const notesKey = (
      await client.findDerivedAccount([
        "loan",
        asset.reserve.address,
        obligationKey,
        user.client.address,
      ])
    ).address;

    const notesBalance = await checkBalance(notesKey);
    const tokenBalance = await checkBalance(tokenAccountKey);

    await new Promise(r => setTimeout(r, 500));
    const tx = await provider.connection.getTransaction(txId, {commitment: "confirmed"});
    const repayTimestamp = tx.blockTime;

    const t = (repayTimestamp - borrowTimestamp) / (365 * 24 * 60 * 60);
    const r = reserveConfig.borrowRate0;
    const c = Math.expm1(r * t);
    const interest = usdcDeposit * 0.8 * c;
    
    expectedLoanNotesBalance = expectedLoanNotesBalance.sub(amount.value);
    const expectedTokenBalance = initialTokenAmount + usdcDeposit * 0.0 - interest;

    assert.equal(notesBalance.toString(), expectedLoanNotesBalance.toString());
    assert.equal(tokenBalance.toString(), bn(expectedTokenBalance).toString());
  });

  it("user A withdraws some usdc notes", async () => {
    const user = userA;
    const amount = Amount.depositNotes(90000);
    const tokenAccountKey = user.tokenAccounts[usdc.token.publicKey.toBase58()];

    await wsol.reserve.refresh();

    await user.client.withdrawCollateral(usdc.reserve, amount);
    await user.client.withdraw(usdc.reserve, tokenAccountKey, amount);

    const vaultKey = usdc.reserve.data.vault;
    const notesKey = (
      await client.findDerivedAccount([
        "deposits",
        usdc.reserve.address,
        user.client.address,
      ])
    ).address;
    const obligationKey = (
      await client.findDerivedAccount([
        "obligation",
        jetMarket.address,
        user.client.address,
      ])
    ).address;
    const collateralKey = (
      await client.findDerivedAccount([
        "collateral",
        usdc.reserve.address,
        obligationKey,
        user.client.address,
      ])
    ).address;

    let tokenBalance = await checkBalance(tokenAccountKey);
    let notesBalance = await checkBalance(notesKey);
    let collateralBalance = await checkBalance(collateralKey);
    let vaultBalance = await checkBalance(vaultKey);

    assert.equal(tokenBalance.toString(), "990000");
    assert.equal(notesBalance.toString(), "0");
    assert.equal(collateralBalance.toString(), "10000");
    assert.equal(vaultBalance.toString(), "0");
  });

  // it("user A fails to withdraw lent-out usdc", async () => {
  //   const user = userA;
  //   const amount = Amount.tokens(40000);
  //   const tokenAccount = user.tokenAccounts[usdc.token.publicKey.toBase58()];

  //   await wsol.reserve.refresh();

  //   // await user.client.withdrawCollateral(usdc.reserve, amount); // FIXME This should fail
  //   // await user.client.withdraw(usdc.reserve, tokenAccount, amount);
  // });

  it("user B repays all usdc debt", async () => {
    const user = userB;
    const asset = usdc;
    const amount = Amount.loanNotes(expectedLoanNotesBalance.toNumber()); // FIXME Can user B overpay?
    const tokenAccountKey = user.tokenAccounts[asset.token.publicKey.toBase58()];

    const obligationKey = (
      await client.findDerivedAccount([
        "obligation",
        jetMarket.address,
        user.client.address,
      ])
    ).address;
    const notesKey = (
      await client.findDerivedAccount([
        "loan",
        asset.reserve.address,
        obligationKey,
        user.client.address,
      ])
    ).address;

    let notesBalance = await checkBalance(notesKey);
    assert.equal(notesBalance.toString(), expectedLoanNotesBalance.toString());

    await user.client.repay(usdc.reserve, tokenAccountKey, amount);

    notesBalance = await checkBalance(notesKey);
    assert.equal(notesBalance.toString(), "0");

    const tokenBalance = await checkBalance(tokenAccountKey);
    assert.equal(tokenBalance.toString(), "1000000");
  });

  it("user B withdraws all wsol", async () => {
    const user = userB;
    const amount = Amount.tokens(505);
    const tokenAccountKey = user.tokenAccounts[wsol.token.publicKey.toBase58()];

    await usdc.reserve.refresh();

    await user.client.withdrawCollateral(wsol.reserve, amount);
    await user.client.withdraw(wsol.reserve, tokenAccountKey, amount);

    const vaultKey = wsol.reserve.data.vault;
    const notesKey = (
      await client.findDerivedAccount([
        "deposits",
        wsol.reserve.address,
        user.client.address,
      ])
    ).address;
    const obligationKey = (
      await client.findDerivedAccount([
        "obligation",
        jetMarket.address,
        user.client.address,
      ])
    ).address;
    const collateralKey = (
      await client.findDerivedAccount([
        "collateral",
        wsol.reserve.address,
        obligationKey,
        user.client.address,
      ])
    ).address;

    let tokenBalance = await checkBalance(tokenAccountKey);
    let notesBalance = await checkBalance(notesKey);
    let collateralBalance = await checkBalance(collateralKey);
    let vaultBalance = await checkBalance(vaultKey);

    assert.equal(tokenBalance.toString(), "1000000");
    assert.equal(notesBalance.toString(), "0");
    assert.equal(collateralBalance.toString(), "0");
    assert.equal(vaultBalance.toString(), "0");
  });

  it("user A withdraws the remaining usdc notes", async () => {
    const user = userA;
    const amount = Amount.depositNotes(10000);
    const tokenAccountKey = user.tokenAccounts[usdc.token.publicKey.toBase58()];

    await wsol.reserve.refresh();

    await user.client.withdrawCollateral(usdc.reserve, amount);
    await user.client.withdraw(usdc.reserve, tokenAccountKey, amount);

    const vaultKey = usdc.reserve.data.vault;
    const notesKey = (
      await client.findDerivedAccount([
        "deposits",
        usdc.reserve.address,
        user.client.address,
      ])
    ).address;
    const obligationKey = (
      await client.findDerivedAccount([
        "obligation",
        jetMarket.address,
        user.client.address,
      ])
    ).address;
    const collateralKey = (
      await client.findDerivedAccount([
        "collateral",
        usdc.reserve.address,
        obligationKey,
        user.client.address,
      ])
    ).address;

    let tokenBalance = await checkBalance(tokenAccountKey);
    let notesBalance = await checkBalance(notesKey);
    let collateralBalance = await checkBalance(collateralKey);
    let vaultBalance = await checkBalance(vaultKey);

    assert.equal(tokenBalance.toString(), "1000000");  // FIXME What about interest?
    assert.equal(notesBalance.toString(), "0");
    assert.equal(collateralBalance.toString(), "0");
    assert.equal(vaultBalance.toString(), "40"); // FIXME Where is the interest accrued?
  });
});
