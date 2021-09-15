import * as anchor from "@project-serum/anchor";
import { Amount, JetClient, JetReserve, JetUser, ReserveConfig } from "@jet-lab/jet-client";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { CreateMarketParams, JetMarket } from "libraries/ts/src/market";
import { TestToken, TestUtils, toBN } from "./utils";
import { BN } from "@project-serum/anchor";
import { NodeWallet } from '@project-serum/anchor/dist/provider';
import { CreateReserveParams } from "libraries/ts/src/reserve";
import * as serum from "@project-serum/serum";
import { SerumUtils } from "./utils/serum";
import { assert } from "chai";
import * as splToken from "@solana/spl-token";

describe("jet", async () => {
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
        1000000 // * LAMPORTS_PER_SOL
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
      borrowRate0: 50,
      borrowRate1: 392,
      borrowRate2: 3365,
      borrowRate3: 10116,
      minCollateralRatio: 12500,
      liquidationPremium: 100,
      manageFeeRate: 50,
      manageFeeCollectionThreshold: new BN(10),
      loanOriginationFee: 10,
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

  it("user A deposits usdc", async () => {
    const user = userA;
    const asset = usdc;
    const amount = Amount.tokens(100000);
    const tokenAccountKey = user.tokenAccounts[asset.token.publicKey.toBase58()];

    await user.client.deposit(asset.reserve, tokenAccountKey, amount);
    await user.client.depositCollateral(asset.reserve, amount);
  });

  it("user B deposits wsol", async () => {
    const user = userB;
    const asset = wsol;
    const amount = Amount.tokens(1000);
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
    assert.equal(tokenBalance.toString(), toBN(0).toString());

    await user.client.deposit(asset.reserve, tokenAccountKey, amount);

    tokenBalance = await checkBalance(vaultKey);
    assert.equal(tokenBalance.toString(), toBN(1000).toString());

    let noteBalance = await checkBalance(notesKey);
    assert.equal(noteBalance.toString(), toBN(1000).toString());

    await user.client.depositCollateral(asset.reserve, amount);

    noteBalance = await checkBalance(notesKey);
    assert.equal(noteBalance.toString(), toBN(0).toString());

    const collateralBalance = await checkBalance(collateralKey);
    assert.equal(collateralBalance.toString(), toBN(1000).toString());
  });

  it("user B borrows usdc", async () => {
    const user = userB;
    const asset = usdc;
    const amount = Amount.tokens(40000); // Max: 80k
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

    await user.client.borrow(asset.reserve, tokenAccountKey, amount);
    await jetMarket.refresh();

    // FIXME check debt

    const tokenBalance = await checkBalance(tokenAccountKey);
    const notesBalance = await checkBalance(notesKey);

    assert.equal(tokenBalance.toString(), "1040000");
    assert.equal(notesBalance.toString(), "40040");
  });

  it("user B fails to borrow beyond limit", async () => {
    const user = userB;
    const amount = Amount.tokens(40001);
    const tokenAccount = user.tokenAccounts[usdc.token.publicKey.toBase58()];

    await wsol.reserve.refresh();

    const tx = await user.client.makeBorrowTx(usdc.reserve, tokenAccount, amount);
    let result = await client.program.provider.simulate(tx, [user.wallet]);
    assert.notStrictEqual(result.value.err, null, "expected instruction to fail");
  });

  it("user B wsol withdrawal blocked", async () => {
    const user = userB;
    const amount = Amount.tokens(500); // At threshold for opened loan

    // Give it some seconds for interest to accrue
    await new Promise(r => setTimeout(r, 2000));

    await usdc.reserve.refresh();

    const tx = await user.client.makeWithdrawCollateralTx(wsol.reserve, amount);
    let result = await client.program.provider.simulate(tx, [user.wallet]);
    assert.notStrictEqual(result.value.err, null, "expected instruction to failed");
  });

  it("user B withdraws some wsol", async () => {
    const user = userB;
    const amount = Amount.tokens(495);
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

    assert.equal(tokenBalance.toString(), "999495");
    assert.equal(notesBalance.toString(), "0");
    assert.equal(collateralBalance.toString(), "505");
    assert.equal(vaultBalance.toString(), "505");
  });

  it("user B repays some usdc", async () => {
    const user = userB;
    const amount = Amount.tokens(30000);
    const tokenAccount = user.tokenAccounts[usdc.token.publicKey.toBase58()];

    await user.client.repay(usdc.reserve, tokenAccount, amount);

    // FIXME check some numbers - let's get the interest accrued

  });

  it("user A withdraws some usdc", async () => {
    const user = userA;
    const amount = Amount.tokens(90000);
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
    assert.equal(collateralBalance.toString(), "10001"); // FIXME derive this
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

  // it("user B repays all usdc debt", async () => {

  // });

  // it("user B withdraws all wsol", async () => {

  // });

  // it("user A withdraws all usdc", async () => {

  // });
});
