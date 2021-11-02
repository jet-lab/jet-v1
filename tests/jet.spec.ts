import * as anchor from "@project-serum/anchor";
import {
  Amount,
  JetClient,
  JetReserve,
  JetUser,
  ReserveConfig,
} from "@jet-lab/jet-client";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  CreateMarketParams,
  JetMarket,
  MarketFlags,
} from "libraries/ts/src/market";
import { TestToken, TestUtils, toBN } from "./utils";
import { BN } from "@project-serum/anchor";
import { NodeWallet } from "@project-serum/anchor/dist/provider";
import {
  CreateReserveParams,
  UpdateReserveConfigParams,
} from "libraries/ts/src/reserve";
import * as serum from "@project-serum/serum";
import { SerumUtils } from "./utils/serum";
import { assert, expect, use as chaiUse } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as splToken from "@solana/spl-token";
import { ReserveAccount, ReserveStateStruct } from "app/src/models/JetTypes";
import { ReserveStateLayout } from "app/src/scripts/layout";
import { isEqualWith } from "lodash";


chaiUse(chaiAsPromised.default);

describe("jet", async () => {
  async function loadReserve(address: PublicKey) {
    const info = await provider.connection.getAccountInfo(address);
    let reserve = program.coder.accounts.decode<ReserveAccount>(
      "Reserve",
      info.data
    );
    const reserveState = ReserveStateLayout.decode(
      Buffer.from(reserve.state as any as number[])
    ) as ReserveStateStruct;
    reserve.state = reserveState;

    return reserve;
  }

  function displayReserveState(state: ReserveStateStruct) {
    console.log("accruedUntil:    ", state.accruedUntil.toString());
    console.log("invalidated:     ", state.invalidated);
    console.log("lastUpdated:     ", state.lastUpdated.toString());
    console.log(
      "outstandingDebt: ",
      state.outstandingDebt.div(bn(1e15)).toString()
    );
    console.log("totalDeposits:   ", state.totalDeposits.toString());
    console.log("totalLoanNotes:  ", state.totalLoanNotes.toString());
    console.log("uncollectedFees: ", state.uncollectedFees.toString());
  }

  function bn(z: number): BN {
    return new BN(z);
  }

  function compareReserveConfig(a: ReserveConfig, b: ReserveConfig): boolean {
  
    const keys = Object.keys(a);
    for (let key in keys) {
  
      let aField = a[keys[key]];
      let bField = b[keys[key]];
  
      if (BN.isBN(aField)) {
        if (aField.cmp(bField) != 0) {
          return false;
        }
      } else if (aField != bField) {
        return false;
      }
    }
  
    return true;
  }

  async function checkBalance(tokenAccount: PublicKey): Promise<BN> {
    let info = await provider.connection.getAccountInfo(tokenAccount);
    const account: splToken.AccountInfo = splToken.AccountLayout.decode(
      info.data
    );

    return new BN(account.amount, undefined, "le");
  }

  async function createTokenEnv(decimals: number, price: bigint) {
    let pythPrice = await testUtils.pyth.createPriceAccount();
    let pythProduct = await testUtils.pyth.createProductAccount();

    await testUtils.pyth.updatePriceAccount(pythPrice, {
      exponent: -9,
      aggregatePriceInfo: {
        price: price * 1000000000n,
      },
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
    } as TokenEnv;
  }
  interface TokenEnv {
    token: TestToken;
    pythPrice: Keypair;
    pythProduct: Keypair;
    reserve?: JetReserve;
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

  let expectedLoanNotesBalance = bn(0);

  const initialTokenAmount = 1e6 * 1e6;
  const usdcDeposit = initialTokenAmount;
  const wsolDeposit = (usdcDeposit / 100) * 1.25 * 0.9;

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
        initialTokenAmount
      );
      return tokenAccount.address;
    };

    let tokenAccounts: Record<string, PublicKey> = {};
    for (const asset of assets) {
      tokenAccounts[asset.token.publicKey.toBase58()] = await createUserTokens(
        asset
      );
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

    usdc = await createTokenEnv(6, 1n); // FIXME Break decimal symmetry
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
      loanOriginationFee: 10,
      liquidationSlippage: 300,
      liquidationDexTradeMax: new BN(100),
      confidenceThreshold: 200,
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

  it("halts deposits", async () => {
    await jetMarket.setFlags(new splToken.u64(MarketFlags.HaltDeposits));

    await expect(
      userA.client.deposit(
        usdc.reserve,
        userA.tokenAccounts[usdc.token.publicKey.toBase58()],
        Amount.tokens(1)
      )
    ).to.be.rejectedWith("0x142");

    await jetMarket.setFlags(new splToken.u64(0));
  });

  it("user A deposits usdc", async () => {
    const user = userA;
    const asset = usdc;
    const amount = Amount.depositNotes(usdcDeposit);
    const tokenAccountKey =
      user.tokenAccounts[asset.token.publicKey.toBase58()];

    await user.client.deposit(asset.reserve, tokenAccountKey, amount);
    await user.client.depositCollateral(asset.reserve, amount);

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
  });

  it("user B deposits wsol", async () => {
    const user = userB;
    const asset = wsol;
    const amount = Amount.tokens(wsolDeposit);
    const tokenAccountKey =
      user.tokenAccounts[asset.token.publicKey.toBase58()];

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

  it("halts borrows", async () => {
    await jetMarket.setFlags(new splToken.u64(MarketFlags.HaltBorrows));

    await wsol.reserve.sendRefreshTx();
    await expect(
      userB.client.borrow(
        usdc.reserve,
        userB.tokenAccounts[usdc.token.publicKey.toBase58()],
        Amount.tokens(10)
      )
    ).to.be.rejectedWith("0x142");

    await jetMarket.setFlags(new splToken.u64(0));
  });

  it("user B fails to borrow usdc when pyth confidence out of range", async () => {
    await testUtils.pyth.updatePriceAccount(usdc.pythPrice, {
      exponent: -9,
      aggregatePriceInfo: {
        price: 1000000000n,
        conf: 60000000n, // 600 bps or 6% of the price of USDC
      },
      twap: {
        valueComponent: 1000000000n,
      },
    });

    const user = userB;
    const asset = usdc;
    const usdcBorrow = usdcDeposit * 0.8;
    const amount = Amount.tokens(usdcBorrow);
    const tokenAccountKey =
      user.tokenAccounts[asset.token.publicKey.toBase58()];

    await jetMarket.refresh();
    await wsol.reserve.refresh();
    await expect(
      user.client.borrow(
        asset.reserve,
        tokenAccountKey,
        amount
      )
    ).to.be.rejectedWith("0x131");
  });

  it("user B borrows usdc", async () => {
    // return pyth to acceptable confidence
    await testUtils.pyth.updatePriceAccount(usdc.pythPrice, {
      exponent: -9,
      aggregatePriceInfo: {
        price: 1000000000n,
        conf: 10000000n, // 100 bps or 1% of the price of USDC
      },
      twap: {
        valueComponent: 1000000000n,
      },
    });

    const user = userB;
    const asset = usdc;
    const usdcBorrow = usdcDeposit * 0.8;
    const amount = Amount.tokens(usdcBorrow);
    const tokenAccountKey =
      user.tokenAccounts[asset.token.publicKey.toBase58()];

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
    await wsol.reserve.sendRefreshTx();
    const txId = await user.client.borrow(
      asset.reserve,
      tokenAccountKey,
      amount
    );
    await new Promise((r) => setTimeout(r, 500));
    const tx = await provider.connection.getTransaction(txId, {
      commitment: "confirmed",
    });

    const reserve = await loadReserve(asset.reserve.address);

    const tokenBalance = await checkBalance(tokenAccountKey);
    const notesBalance = await checkBalance(notesKey);

    const expectedTokenBalance = bn(initialTokenAmount).add(amount.value);
    expectedLoanNotesBalance = bn(1e4)
      .add(bn(reserveConfig.loanOriginationFee))
      .mul(amount.value)
      .div(bn(1e4));

    assert.equal(tokenBalance.toString(), expectedTokenBalance.toString());
    assert.equal(notesBalance.toString(), expectedLoanNotesBalance.toString());
    assert.equal(
      reserve.state.outstandingDebt.div(bn(1e15)).toString(),
      expectedLoanNotesBalance.toString()
    );
  });

  it("user B fails to borrow beyond limit", async () => {
    const user = userB;
    const amount = Amount.tokens(usdcDeposit * 0.1001);
    const tokenAccount = user.tokenAccounts[usdc.token.publicKey.toBase58()];

    await wsol.reserve.sendRefreshTx();

    const tx = await user.client.makeBorrowTx(
      usdc.reserve,
      tokenAccount,
      amount
    );
    let result = await client.program.provider.simulate(tx, [user.wallet]);
    assert.notStrictEqual(
      result.value.err,
      null,
      "expected instruction to fail"
    );
  });

  it("user B wsol withdrawal blocked", async () => {
    const user = userB;

    const amount = Amount.tokens(wsolDeposit * 0.1112);

    // Give it some seconds for interest to accrue
    await new Promise((r) => setTimeout(r, 2000));

    await usdc.reserve.sendRefreshTx();

    const tx = await user.client.makeWithdrawCollateralTx(wsol.reserve, amount);
    let result = await client.program.provider.simulate(tx, [user.wallet]);
    assert.notStrictEqual(
      result.value.err,
      null,
      "expected instruction to failed"
    );
  });

  it("user B withdraws some wsol", async () => {
    const user = userB;
    const wsolWithdrawal = wsolDeposit * 0.05;
    const amount = Amount.tokens(wsolWithdrawal);
    const tokenAccountKey = user.tokenAccounts[wsol.token.publicKey.toBase58()];

    await usdc.reserve.sendRefreshTx();

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

    const expectedTokenBalance =
      initialTokenAmount - wsolDeposit + wsolWithdrawal;
    const expectedCollateralBalance = 0.95 * wsolDeposit;
    const expectedVaultBalance = expectedCollateralBalance;

    assert.equal(tokenBalance.toString(), bn(expectedTokenBalance).toString());
    assert.equal(notesBalance.toString(), "0");
    assert.equal(
      collateralBalance.toString(),
      bn(expectedCollateralBalance).toString()
    );
    assert.equal(vaultBalance.toString(), bn(expectedVaultBalance).toString());
  });

  it("interest accrues", async () => {
    const asset = usdc;

    await asset.reserve.sendRefreshTx();
    let _reserve = await loadReserve(asset.reserve.address);
    const _debt0 = _reserve.state.outstandingDebt;
    const t0 = _reserve.state.accruedUntil;

    await new Promise((r) => setTimeout(r, 2000));

    await asset.reserve.sendRefreshTx();
    _reserve = await loadReserve(asset.reserve.address);
    const debt1 = _reserve.state.outstandingDebt;
    const t1 = _reserve.state.accruedUntil;

    const interestAccrued = debt1.sub(_debt0).div(bn(1e15)).toNumber();
    const t = t1.sub(t0).toNumber() / (365 * 24 * 60 * 60);

    const debt0 = _debt0.div(bn(1e15)).toNumber();
    const impliedRate = Math.log1p(interestAccrued / debt0) / t;
    const naccRate = reserveConfig.borrowRate0 * 1e-4;

    assert.approximately(impliedRate, naccRate, 1e-4);
  });

  it("halts repays", async () => {
    await jetMarket.setFlags(new splToken.u64(MarketFlags.HaltRepays));

    await expect(
      userB.client.repay(
        usdc.reserve,
        userB.tokenAccounts[usdc.token.publicKey.toBase58()],
        Amount.tokens(1)
      )
    ).to.be.rejectedWith("0x142");

    await jetMarket.setFlags(new splToken.u64(0));
  });

  it("user B repays some usdc", async () => {
    const user = userB;
    const asset = usdc;
    const amount = Amount.loanNotes(usdcDeposit * 0.1);
    const tokenAccountKey =
      user.tokenAccounts[asset.token.publicKey.toBase58()];

    const txId = await user.client.repay(
      asset.reserve,
      tokenAccountKey,
      amount
    );

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

    expectedLoanNotesBalance = expectedLoanNotesBalance.sub(amount.value);

    assert.equal(notesBalance.toString(), expectedLoanNotesBalance.toString());
  });

  it("user A withdraws some usdc notes", async () => {
    const user = userA;
    const amount = Amount.depositNotes(usdcDeposit * 0.2);
    const tokenAccountKey = user.tokenAccounts[usdc.token.publicKey.toBase58()];

    await wsol.reserve.sendRefreshTx();

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

    let notesBalance = await checkBalance(notesKey);
    let collateralBalance = await checkBalance(collateralKey);

    const expectedCollateralBalance = bn(usdcDeposit * 0.8);

    assert.equal(notesBalance.toString(), "0");
    assert.equal(
      collateralBalance.toString(),
      expectedCollateralBalance.toString()
    );
  });

  it("user B repays all usdc debt", async () => {
    const user = userB;
    const asset = usdc;
    const amount = Amount.loanNotes(expectedLoanNotesBalance.toNumber()); // FIXME Can user B overpay?
    const tokenAccountKey =
      user.tokenAccounts[asset.token.publicKey.toBase58()];

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
  });

  it("user B withdraws all wsol", async () => {
    const user = userB;
    const amount = Amount.tokens(wsolDeposit * 0.95);
    const tokenAccountKey = user.tokenAccounts[wsol.token.publicKey.toBase58()];

    await usdc.reserve.sendRefreshTx();

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

    assert.equal(tokenBalance.toString(), bn(initialTokenAmount).toString());
    assert.equal(notesBalance.toString(), "0");
    assert.equal(collateralBalance.toString(), "0");
    assert.equal(vaultBalance.toString(), "0");
  });

  it("user A withdraws the remaining usdc notes", async () => {
    const user = userA;
    const amount = Amount.depositNotes(usdcDeposit * 0.8);
    const tokenAccountKey = user.tokenAccounts[usdc.token.publicKey.toBase58()];

    await wsol.reserve.sendRefreshTx();

    await user.client.withdrawCollateral(usdc.reserve, amount);
    await user.client.withdraw(usdc.reserve, tokenAccountKey, amount);

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

    let notesBalance = await checkBalance(notesKey);
    let collateralBalance = await checkBalance(collateralKey);

    assert.equal(notesBalance.toString(), "0");
    assert.equal(collateralBalance.toString(), "0");
  });

  it("balances", async () => {
    const tokenKeyA = userA.tokenAccounts[usdc.token.publicKey.toBase58()];
    const tokenKeyB = userB.tokenAccounts[usdc.token.publicKey.toBase58()];
    const vaultKey = usdc.reserve.data.vault;

    const finalBalanceA = await checkBalance(tokenKeyA);
    const finalBalanceB = await checkBalance(tokenKeyB);
    const vaultBalance = await checkBalance(vaultKey);

    const baseFee = bn(
      usdcDeposit * reserveConfig.loanOriginationFee * 0.8 * 1e-4
    );

    assert.ok(finalBalanceA.gt(finalBalanceB));
    assert.ok(vaultBalance.gt(baseFee));
    assert.equal(
      finalBalanceA.add(finalBalanceB).add(vaultBalance).toString(),
      bn(2 * initialTokenAmount).toString()
    );
  });

  it("market owner changes wsol reserve config", async () => {
    const newConfig = {
      utilizationRate1: 6500,
      utilizationRate2: 7500,
      borrowRate0: 10000,
      borrowRate1: 20000,
      borrowRate2: 30000,
      borrowRate3: 40000,
      minCollateralRatio: 15000,
      liquidationPremium: 120,
      manageFeeRate: 60,
      manageFeeCollectionThreshold: new BN(11),
      loanOriginationFee: 20,
      liquidationSlippage: 350,
      liquidationDexTradeMax: new BN(120),
      confidenceThreshold: 500,
    } as ReserveConfig;

    const updateReserveConfigParams = {
      config: newConfig,
      reserve: wsol.reserve.address,
      market: jetMarket.address,
      owner: marketOwner,
    } as UpdateReserveConfigParams;

    await wsol.reserve.updateReserveConfig(updateReserveConfigParams);

    const fetchConfig = async () => {
      const config = (await loadReserve(wsol.reserve.address)).config;

      return {
        utilizationRate1: config.utilizationRate1,
        utilizationRate2: config.utilizationRate2,
        borrowRate0: config.borrowRate0,
        borrowRate1: config.borrowRate1,
        borrowRate2: config.borrowRate2,
        borrowRate3: config.borrowRate3,
        minCollateralRatio: config.minCollateralRatio,
        liquidationPremium: config.liquidationPremium,
        manageFeeRate: config.manageFeeRate,
        manageFeeCollectionThreshold: config.manageFeeCollectionThreshold,
        loanOriginationFee: config.loanOriginationFee,
        liquidationDexTradeMax: new BN(config.liquidationDexTradeMax),
        confidenceThreshold: config.confidenceThreshold,
      } as ReserveConfig;
    };
    const fetchedConfig = await fetchConfig();

    assert(
      compareReserveConfig(fetchedConfig, newConfig),
      "reserve config failed to update"
    );
  });

  it("user A fails to change wsol reserve config", async () => {
    const user = userA;
    const newConfig = {
      utilizationRate1: 6500,
      utilizationRate2: 7500,
      borrowRate0: 10000,
      borrowRate1: 20000,
      borrowRate2: 30000,
      borrowRate3: 40000,
      minCollateralRatio: 15000,
      liquidationPremium: 120,
      manageFeeRate: 60,
      manageFeeCollectionThreshold: new BN(11),
      loanOriginationFee: 20,
      liquidationSlippage: 350,
      liquidationDexTradeMax: new BN(120),
      confidenceThreshold: 100,
    } as ReserveConfig;

    const tx = new anchor.web3.Transaction();
    tx.add(
      program.instruction.updateReserveConfig(newConfig, {
        accounts: {
          market: jetMarket.address,
          reserve: wsol.reserve.address,
          owner: user.wallet.publicKey,
        },
      })
    );

    let result = await client.program.provider.simulate(tx, [user.wallet]);
    const expectedErr = { InstructionError: [ 0, { Custom: 141 } ] }
    
    assert(
      isEqualWith(result.value.err, expectedErr),
      "expected instruction to fail"
    );
  });
});
