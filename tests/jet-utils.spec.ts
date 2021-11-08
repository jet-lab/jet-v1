import * as anchor from "@project-serum/anchor";
import {
  PublicKey,
} from "@solana/web3.js";

import { TestUtils } from "./utils";
import { Price as PythPrice, Product as PythProduct } from "./utils/pyth";
import { assert } from "chai";

describe("jet-utils", () => {
  let IDL: anchor.Idl;
  const program: anchor.Program = anchor.workspace.Jet;
  const provider = anchor.Provider.local();
  const wallet = provider.wallet as anchor.Wallet;

  const utils = new TestUtils(provider.connection, wallet);
  
  it("should roundtrip Pyth prices", async () => {
    const pricePublisher = await PublicKey.createWithSeed(wallet.publicKey, 'price-publisher', program.programId);
    const nextPriceAccount = await PublicKey.createWithSeed(wallet.publicKey, 'next-price', program.programId);
    const productAccount = await PublicKey.createWithSeed(wallet.publicKey, 'product-account', program.programId);

    const pythPrice = await utils.pyth.createPriceAccount();
    const expectedPrice: PythPrice = {
      exponent: -9,
      aggregatePriceInfo: {
        price: 12n * 1000000000n,
        conf: 0n,
        status: 'trading',
        pubSlot: 111n,
      },
      priceType: 'price',
      version: 3,
      size: 3312,
      type: 1,
      validSlot: 554n,
      currentSlot: 12345n,
      aggregatePriceUpdaterAccountKey: PublicKey.default,
      nextPriceAccountKey: nextPriceAccount,
      productAccountKey: productAccount,
      priceComponents: [{
        agg: {
          price: 13n * 1000000000n,
          conf: 0n,
          status: 'trading',
          pubSlot: 1n,
        },
        latest: {
          price: 11n * 1000000000n,
          // This fails if the conf is not set
          conf: 1n,
          status: 'trading',
          pubSlot: 1n,
        },
        publisher: pricePublisher
      }]
    };
    await utils.pyth.updatePriceAccount(pythPrice, expectedPrice);

    // Get the account's price
    const price = await utils.pyth.getPriceAccountData(pythPrice);

    // The price retrieved should equal the price saved
    assert.deepEqual(price, expectedPrice);
  });
});