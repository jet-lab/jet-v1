import * as anchor from "@project-serum/anchor";
import { Market as SerumMarket } from "@project-serum/serum";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import * as splToken from "@solana/spl-token";

import { TestToken, TestUtils } from "./utils";
import { JetUtils, LiquidateDexInstruction, LiquidateInstruction } from "./utils/jet";
import { MarketMaker, SerumUtils, Order } from "./utils/serum";
import { Price as PythPrice, Product as PythProduct } from "./utils/pyth";

import {
  Amount,
  JetClient,
  JetMarket,
  JetReserve,
  JetUser,
  ReserveConfig,
} from "@jet-lab/jet-client";
import BN from "bn.js";
import { u64 } from "@solana/spl-token";
import * as util from "util";

const TEST_CURRENCY = "LTD";


/**
 * Test: jet-liquidate
 * Plan: The following test spec addresses the following testing scenarios.
 * 
 * 1. depositor liquidation consistency
 *    If the user is subject to liquidation, their position should be the same
 *    regardless of whether they are liquidated via Serum or internally.
 * 
 *    Steps:
 *    1. Create two test users and deposit the same ETH token amounts per user
 *    2. Borrow the same USDC amounts per user
 *    3. Decrease the Oracle price to the point where both users are subject to liquidation
 *    4. Liquidate the first user with the internal liquidation process
 *    5. Liquidate the second user with the Serum liquidation process
 *    6. Compare that both users have similar positions after liquidation
 * 
 * 2. multiple collateral liquidation
 * 
 *    TODO
 * 
 * 3. multiple loan liquidation
 * 
 *    TODO
 * 
 */
describe("jet-liquidate", () => {
  async function checkBalance(tokenAccount: PublicKey): Promise<BN> {
    let info = await provider.connection.getAccountInfo(tokenAccount);
    const account: splToken.AccountInfo = splToken.AccountLayout.decode(
      info.data
    );

    return new BN(account.amount, undefined, "le");
  }

  let IDL: anchor.Idl;
  const program: anchor.Program = anchor.workspace.Jet;
  const provider = anchor.Provider.local();
  const wallet = provider.wallet as anchor.Wallet;

  const utils = new TestUtils(provider.connection, wallet);
  const serum = new SerumUtils(utils, false);
  const jetUtils = new JetUtils(provider.connection, wallet, program, false);

  let jet: anchor.Program;
  let client: JetClient;
  let usdcToken: TestToken;

  let jetMarket: JetMarket;
  let usdc: AssetMarket;
  let wsol: AssetMarket;
  let wbtc: AssetMarket;
  let weth: AssetMarket;


  let users: TestUser[];

  interface TestUser {
    wallet: Keypair;
    usdc: PublicKey;
    wsol: PublicKey;
    wbtc: PublicKey;
    weth: PublicKey;
    client: JetUser;
  }

  interface AssetMarket {
    token: TestToken;
    dexMarket: SerumMarket | null;
    marketMaker: MarketMaker;
    reserve: JetReserve;
    pythPrice: Keypair;
    pythProduct: Keypair;
  }

  async function placeMarketOrders(
    market: AssetMarket,
    bids: Order[],
    asks: Order[]
  ) {
    await market.marketMaker.placeOrders(market.dexMarket, bids, asks);
  }

  interface AssetMarketConfig {
    decimals?: number;
    token?: TestToken;

    pythPrice: PythPrice;

    reserveConfig: ReserveConfig;
  }

  async function createAssetMarket(
    config: AssetMarketConfig
  ): Promise<AssetMarket> {
    const decimals = config.decimals ?? 9;
    const token = config.token ?? (await utils.createToken(decimals));
    const [dexMarket, marketMaker] = await createSerumMarket(token);

    const pythPrice = await utils.pyth.createPriceAccount();
    const pythProduct = await utils.pyth.createProductAccount();

    await utils.pyth.updatePriceAccount(pythPrice, config.pythPrice);
    await utils.pyth.updateProductAccount(pythProduct, {
      priceAccount: pythPrice.publicKey,
      attributes: {
        quote_currency: TEST_CURRENCY,
      },
    });

    const reserve = await jetMarket.createReserve({
      pythOraclePrice: pythPrice.publicKey,
      pythOracleProduct: pythProduct.publicKey,
      tokenMint: token.publicKey,
      config: config.reserveConfig,
      dexMarket: dexMarket?.publicKey ?? PublicKey.default,
    });

    return {
      token,
      dexMarket,
      marketMaker,
      pythPrice,
      pythProduct,
      reserve,
    };
  }

  async function createSerumMarket(
    token: TestToken
  ): Promise<[SerumMarket, MarketMaker]> {
    const dexMarket =
      token == usdcToken
        ? Promise.resolve(null)
        : serum.createMarket({
          baseToken: token,
          quoteToken: usdcToken,
          baseLotSize: 1000000,
          quoteLotSize: 1000,
          feeRateBps: 1,
        });

    const dexMarketMaker = serum.createMarketMaker(1000 * LAMPORTS_PER_SOL, [
      [token, token.amount(1000000)],
      [usdcToken, usdcToken.amount(5000000)],
    ]);

    return Promise.all([dexMarket, dexMarketMaker]);
  }

  async function createUserTokens(
    user: PublicKey,
    asset: AssetMarket,
    amount: u64
  ): Promise<PublicKey> {
    const tokenAccount = await asset.token.getOrCreateAssociatedAccountInfo(
      user
    );

    await asset.token.mintTo(
      tokenAccount.address,
      wallet.publicKey,
      [],
      amount
    );
    return tokenAccount.address;
  }

  async function createTestUser(): Promise<TestUser> {
    const userWallet = await utils.createWallet(100000 * LAMPORTS_PER_SOL);

    const [_usdc, _wsol, _wbtc, _weth] = await Promise.all([
      createUserTokens(
        userWallet.publicKey,
        usdc,
        new u64(10000 * LAMPORTS_PER_SOL)
      ),
      createUserTokens(
        userWallet.publicKey,
        wsol,
        new u64(10000 * LAMPORTS_PER_SOL)
      ),
      createUserTokens(
        userWallet.publicKey,
        wbtc,
        new u64(10000 * LAMPORTS_PER_SOL)
      ),
      createUserTokens(
        userWallet.publicKey,
        weth,
        new u64(10000 * LAMPORTS_PER_SOL)
      ),
    ]);

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
      usdc: _usdc,
      wsol: _wsol,
      wbtc: _wbtc,
      weth: _weth,
      client: await JetUser.load(userClient, jetMarket, userWallet.publicKey),
    };
  }

  before(async () => {
    IDL = program.idl;
    IDL.instructions.push(LiquidateDexInstruction);
    IDL.instructions.push(LiquidateInstruction);
    jet = new anchor.Program(IDL, program.programId, provider);
    client = new JetClient(jet);

    console.log(client.program.account.reserve.programId.toString());
    usdcToken = await utils.createToken(6);

    jetMarket = await client.createMarket({
      owner: wallet.publicKey,
      quoteCurrencyName: TEST_CURRENCY,
      quoteCurrencyMint: usdcToken.publicKey,
    });

    const createUsdc = createAssetMarket({
      token: usdcToken,
      pythPrice: {
        exponent: -9,
        aggregatePriceInfo: {
          price: 1000000000n,
        },
      },
      reserveConfig: {
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
        liquidationDexTradeMax: new BN(1000 * LAMPORTS_PER_SOL),
      },
    });

    const createWsol = createAssetMarket({
      pythPrice: {
        exponent: -9,
        aggregatePriceInfo: {
          price: 200n * 1000000000n,
        },
      },
      reserveConfig: {
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
        liquidationDexTradeMax: new BN(1000 * LAMPORTS_PER_SOL),
      },
    });

    const createWbtc = createAssetMarket({
      pythPrice: {
        exponent: -9,
        aggregatePriceInfo: {
          price: 2000n * 1000000000n,
        },
      },
      reserveConfig: {
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
        liquidationDexTradeMax: new BN(1000 * LAMPORTS_PER_SOL),
      },
    });

    const createWeth = createAssetMarket({
      pythPrice: {
        exponent: -9,
        aggregatePriceInfo: {
          price: 200n * 1000000000n,
        },
      },
      reserveConfig: {
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
        liquidationDexTradeMax: new BN(1000 * LAMPORTS_PER_SOL),
      },
    });

    [usdc, wsol, wbtc, weth] = await Promise.all([
      createUsdc,
      createWsol,
      createWbtc,
      createWeth,
    ]);

    // Create 2 users, A and B
    users = await Promise.all(
      Array.from(Array(2).keys()).map(() => createTestUser())
    );
    // Create orders on different markets, takes price and number
    await placeMarketOrders(
      wsol,
      MarketMaker.makeOrders([[195, 100]]),
      MarketMaker.makeOrders([[215, 100]])
    );
    await placeMarketOrders(
      wbtc,
      MarketMaker.makeOrders([[999.5, 100]]),
      MarketMaker.makeOrders([[1000.5, 100]])
    );
    await placeMarketOrders(
      weth,
      MarketMaker.makeOrders([[200.08, 100]]),
      MarketMaker.makeOrders([[199.04, 100]])
    );
  });

  /**
   * - Create 2 users
   * - Create obligation accounts for them, and deposit collateral in SOL
   * - Borrow USDC
   * - Move price adversely such that accounts can be liquidated
   * - Liquidate user1 internally
   * - Liquidate user2 through Serum
   * - Compare that user accounts are in the same/similar positions
   */
  it("compare liquidations", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const lender = await createTestUser();

    // The liquidator is a third party (treasury or external party) that will swap
    // the tokens with the borrower on liquidation.
    const liquidator = await createTestUser();

    const liquidatorUsdcTokenAccount = await createUserTokens(
      liquidator.wallet.publicKey,
      usdc,
      new u64(1000000 * LAMPORTS_PER_SOL)
    );
    const liquidatorWsolTokenAccount = await createUserTokens(
      liquidator.wallet.publicKey,
      wsol,
      new u64(10000 * LAMPORTS_PER_SOL)
    );

    // Mint 1'000'000 to lender's token account using the USDC market
    const lenderTokenAccount = await createUserTokens(
      lender.wallet.publicKey,
      usdc,
      new u64(1000000 * LAMPORTS_PER_SOL)
    );
    // Lender deposits 1'000'000 USDC
    await lender.client.deposit(
      usdc.reserve,
      lenderTokenAccount,
      Amount.tokens(usdc.token.amount(10000000))
    );

    const tokenAccount1 = await createUserTokens(
      user1.wallet.publicKey,
      wsol,
      new u64(10000 * LAMPORTS_PER_SOL)
    );
    const tokenAccount2 = await createUserTokens(
      user2.wallet.publicKey,
      wsol,
      new u64(10000 * LAMPORTS_PER_SOL)
    );

    // Deposit 10 tokens on user token account
    await user1.client.deposit(
      wsol.reserve,
      tokenAccount1,
      Amount.tokens(10)
    );
    await user2.client.deposit(
      wsol.reserve,
      tokenAccount2,
      Amount.tokens(10)
    );
    // Deposit 1 token as collateral
    await user1.client.depositCollateral(wsol.reserve, Amount.tokens(1));
    await user2.client.depositCollateral(wsol.reserve, Amount.tokens(1));

    await placeMarketOrders(
      wsol,
      MarketMaker.makeOrders([[179.5, 10000]]),
      MarketMaker.makeOrders([[180.5, 10000]])
    );
    await user1.client.deposit(
      wsol.reserve,
      tokenAccount1,
      Amount.tokens(wsol.token.amount(10))
    );
    await user2.client.deposit(
      wsol.reserve,
      tokenAccount2,
      Amount.tokens(wsol.token.amount(10))
    );

    await user1.client.depositCollateral(
      wsol.reserve,
      Amount.tokens(wsol.token.amount(10))
    );
    await user2.client.depositCollateral(
      wsol.reserve,
      Amount.tokens(wsol.token.amount(10))
    );

    await wsol.reserve.refresh();

    await Promise.all([
      user1.client.borrow(
        usdc.reserve,
        lenderTokenAccount,
        Amount.tokens(usdc.token.amount(1500))
      ),
      user2.client.borrow(
        usdc.reserve,
        lenderTokenAccount,
        Amount.tokens(usdc.token.amount(1500))
      )
    ]);

    await utils.pyth.updatePriceAccount(wsol.pythPrice, {
      exponent: -9,
      aggregatePriceInfo: {
        price: 180n * 1000000000n,
      },
    });
    
    await wsol.reserve.refresh();
    // SOL is now 180
    // user1 has deposited 1 SOL
    // user1 has borrowed 150 USDC
    // c-ratio = 180 / 150 = 120%

    await user1.client.liquidateDex(usdc.reserve, wsol.reserve);

    // TODO: Determine the correct liquidation amount
    let liquidationAmount = Amount.tokens(wsol.token.amount(25));
    
    await user2.client.liquidate(
      usdc.reserve, 
      wsol.reserve,
      liquidatorUsdcTokenAccount,
      liquidatorWsolTokenAccount,
      liquidationAmount,
    );
    await wsol.reserve.refresh();

    // Both users are liquidated, we now check that both users
    // are in similar positions after the liquidation.
    
  });
})