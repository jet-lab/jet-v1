import * as anchor from "@project-serum/anchor";
import { Market as SerumMarket } from "@project-serum/serum";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";

import { TestToken, TestUtils } from "./utils";
import { JetUtils, LiquidateDexInstruction } from "./utils/jet";
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
import { initTransactionLogs } from "app/src/scripts/jet";
import { assert, expect } from "chai";

const TEST_CURRENCY = "LTD";

describe("jet-serum", () => {
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
        loanOriginationFee: 0,
        liquidationSlippage: 300,
        liquidationDexTradeMax: new BN(1000 * LAMPORTS_PER_SOL),
        confidenceThreshold: 500,
      },
    });

    const createWsol = createAssetMarket({
      pythPrice: {
        exponent: -9,
        aggregatePriceInfo: {
          price: 20n * 1000000000n,
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
        confidenceThreshold: 1000,
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
        confidenceThreshold: 1000,
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
        confidenceThreshold: 1500,
      },
    });

    [usdc, wsol, wbtc, weth] = await Promise.all([
      createUsdc,
      createWsol,
      createWbtc,
      createWeth,
    ]);

    users = await Promise.all(
      Array.from(Array(4).keys()).map(() => createTestUser())
    );
    await placeMarketOrders(
      wsol,
      MarketMaker.makeOrders([[84.95, 100]]),
      MarketMaker.makeOrders([[85.15, 100]])
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

    await jetMarket.refresh();
  });

  it("user deposits", async () => {
    for (let i = 0; i < users.length; ++i) {
      const user = users[i];

      await Promise.all([
        user.client.deposit(
          usdc.reserve,
          user.usdc,
          Amount.tokens(usdc.token.amount(10000))
        ),
        user.client.deposit(
          wsol.reserve,
          user.wsol,
          Amount.tokens(wsol.token.amount(10000))
        ),
        user.client.deposit(
          weth.reserve,
          user.weth,
          Amount.tokens(weth.token.amount(100))
        ),
        user.client.deposit(
          wbtc.reserve,
          user.wbtc,
          Amount.tokens(wbtc.token.amount(10))
        ),
      ]);
    }
  });

  it("user borrows", async () => {
    await Promise.all([
      users[0].client.depositCollateral(
        usdc.reserve,
        Amount.tokens(usdc.token.amount(1000))
      ),
      users[1].client.depositCollateral(
        wsol.reserve,
        Amount.tokens(wsol.token.amount(100))
      ),
      users[2].client.depositCollateral(
        weth.reserve,
        Amount.tokens(weth.token.amount(15))
      ),
      users[3].client.depositCollateral(
        wbtc.reserve,
        Amount.tokens(wbtc.token.amount(1))
      ),
    ]);

    await Promise.all([
      users[0].client.borrow(
        wsol.reserve,
        users[0].wsol,
        Amount.tokens(wsol.token.amount(10))
      ),
      users[1].client.borrow(
        weth.reserve,
        users[1].weth,
        Amount.tokens(weth.token.amount(1))
      ),
      users[2].client.borrow(
        wbtc.reserve,
        users[2].wbtc,
        Amount.tokens(wbtc.token.amount(1))
      ),
      users[3].client.borrow(
        usdc.reserve,
        users[3].usdc,
        Amount.tokens(usdc.token.amount(870))
      ),
    ]);
  });

  it("allow basic dex sell liquidation", async () => {
    await utils.pyth.updatePriceAccount(wbtc.pythPrice, {
      exponent: -9,
      aggregatePriceInfo: {
        price: 1000n * 1000000000n,
      },
    });

    await users[3].client.refresh();
    let collateralBalance = users[3].client
      .collateral()
      .find(
        (a) => a.mint.toBase58() == wbtc.reserve.data.depositNoteMint.toBase58()
      ).amount;
    let loanBalance = users[3].client
      .loans()
      .find(
        (a) => a.mint.toBase58() == usdc.reserve.data.loanNoteMint.toBase58()
      ).amount;
    assert.equal(collateralBalance.toString(), wbtc.token.amount(1).toString());
    assert.equal(loanBalance.toString(), usdc.token.amount(870).toString());

    await users[3].client.liquidateDex(usdc.reserve, wbtc.reserve);

    await users[3].client.refresh();
    collateralBalance = users[3].client
      .collateral()
      .find(
        (a) => a.mint.toBase58() == wbtc.reserve.data.depositNoteMint.toBase58()
      ).amount;
    loanBalance = users[3].client
      .loans()
      .find(
        (a) => a.mint.toBase58() == usdc.reserve.data.loanNoteMint.toBase58()
      ).amount;
    expect(collateralBalance.toNumber()).to.be.closeTo(631578940, 10);
    expect(loanBalance.toNumber()).to.be.closeTo(505226680, 10);
  });

  it("allow basic dex buy liquidation", async () => {
    await utils.pyth.updatePriceAccount(wsol.pythPrice, {
      exponent: -9,
      aggregatePriceInfo: {
        price: 85n * 1000000000n,
      },
    });

    await users[0].client.refresh();
    let collateralBalance = users[0].client
      .collateral()
      .find(
        (a) => a.mint.toBase58() == usdc.reserve.data.depositNoteMint.toBase58()
      ).amount;
    let loanBalance = users[0].client
      .loans()
      .find(
        (a) => a.mint.toBase58() == wsol.reserve.data.loanNoteMint.toBase58()
      ).amount;
    assert.equal(
      collateralBalance.toString(),
      usdc.token.amount(1000).toString()
    );
    assert.equal(loanBalance.toString(), "10010000000".toString());

    await users[0].client.liquidateDex(wsol.reserve, usdc.reserve);

    await users[0].client.refresh();
    collateralBalance = users[0].client
      .collateral()
      .find(
        (a) => a.mint.toBase58() == usdc.reserve.data.depositNoteMint.toBase58()
      ).amount;
    loanBalance = users[0].client
      .loans()
      .find(
        (a) => a.mint.toBase58() == wsol.reserve.data.loanNoteMint.toBase58()
      ).amount;
    expect(collateralBalance.toNumber()).to.be.closeTo(732368420, 10);
    expect(loanBalance.toNumber()).to.be.closeTo(6892567500, 10);
  });

  it("dex liquidation with 10 collaterals", async () => {
    const MAX_POSITIONS = 10;
    const user = await createTestUser();
    const lender = await createTestUser();
    const assets = await Promise.all(
      Array.from(Array(MAX_POSITIONS).keys()).map(async (i) => {
        return createAssetMarket({
          pythPrice: {
            exponent: -9,
            aggregatePriceInfo: {
              price: (1000n + BigInt(i)) * 1000000000n,
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
            confidenceThreshold: 1500,
          },
        });
      })
    );

    const lenderTokenAccount = await createUserTokens(
      lender.wallet.publicKey,
      usdc,
      new u64(1000000 * LAMPORTS_PER_SOL)
    );
    await lender.client.deposit(
      usdc.reserve,
      lenderTokenAccount,
      Amount.tokens(usdc.token.amount(1000000))
    );

    const tokenAccounts = await Promise.all(
      assets.map((asset) =>
        createUserTokens(
          user.wallet.publicKey,
          asset,
          new u64(10000 * LAMPORTS_PER_SOL)
        )
      )
    );

    await user.client.deposit(
      assets[0].reserve,
      tokenAccounts[0],
      Amount.tokens(10)
    );
    await user.client.depositCollateral(assets[0].reserve, Amount.tokens(1));

    await Promise.all(
      [
        assets.map((asset) =>
          placeMarketOrders(
            asset,
            MarketMaker.makeOrders([[119.5, 1000]]),
            MarketMaker.makeOrders([[120.5, 1000]])
          )
        ),
        assets.map(async (asset, i) => {
          await user.client.deposit(
            asset.reserve,
            tokenAccounts[i],
            Amount.tokens(asset.token.amount(1))
          );
          await user.client.depositCollateral(
            asset.reserve,
            Amount.tokens(asset.token.amount(1))
          );
        }),
      ].flat()
    );

    await Promise.all(assets.map((asset) => asset.reserve.sendRefreshTx()));
    await Promise.all(
      [
        assets.map((asset) => asset.reserve.sendRefreshTx()),
        user.client.borrow(
          usdc.reserve,
          lenderTokenAccount,
          Amount.tokens(usdc.token.amount(1000))
        ),
      ].flat()
    );

    await Promise.all(
      assets.map((asset) =>
        utils.pyth.updatePriceAccount(asset.pythPrice, {
          exponent: -9,
          aggregatePriceInfo: {
            price: 120n * 1000000000n,
          },
        })
      )
    );

    await Promise.all(assets.map((asset) => asset.reserve.sendRefreshTx()));
    await Promise.all(
      [
        user.client.liquidateDex(usdc.reserve, assets[0].reserve),
        user.client.liquidateDex(usdc.reserve, assets[1].reserve),
        assets.map((asset) => asset.reserve.sendRefreshTx()),
      ].flat()
    );
  });

  it("dex will not liquidate when confidence out of range", async () => {
    await utils.pyth.updatePriceAccount(usdc.pythPrice, {
      exponent: -9,
      aggregatePriceInfo: {
        price: 1000000000n,
        conf: 60000000n, // 600 bps or 6% of the price of USDC
      },
      twap: {
        valueComponent: 1000000000n,
      },
    });

    await expect(
      users[0].client.liquidateDex(
        wsol.reserve,
        usdc.reserve
      )
    ).to.be.rejectedWith("0x131");
  });
});
