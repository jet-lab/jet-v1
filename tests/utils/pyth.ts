/**
 * Utilities for mocking Pyth during tests
 *
 * @module
 */

import { Wallet } from "@project-serum/anchor";
import * as pyth from "@pythnetwork/client";
import {
    Connection,
    Keypair,
    PublicKey,
} from "@solana/web3.js";

import { DataManager } from "./data";

const PRICE_ACCOUNT_SIZE = 3312;

export interface Price {
    version?: number;
    type?: number;
    size?: number;
    priceType?: string;
    exponent?: number;
    currentSlot?: bigint;
    validSlot?: bigint;
    productAccountKey?: PublicKey;
    nextPriceAccountKey?: PublicKey;
    aggregatePriceUpdaterAccountKey?: PublicKey;
    aggregatePriceInfo?: PriceInfo;
    priceComponents?: PriceComponent[];
}

export interface PriceInfo {
    price?: bigint;
    conf?: bigint;
    status?: string;
    corpAct?: string;
    pubSlot?: bigint;
}

export interface PriceComponent {
    publisher?: PublicKey;
    agg?: PriceInfo;
    latest?: PriceInfo;
}

export interface Product {
    version?: number;
    atype?: number;
    size?: number;
    priceAccount?: PublicKey;
    attributes?: Record<string, string>;
}

export class PythUtils {
    static readonly programId = DataManager.programId;

    conn: Connection;
    wallet: Wallet;
    config: DataManager;

    constructor(conn: Connection, wallet: Wallet) {
        this.conn = conn;
        this.wallet = wallet;
        this.config = new DataManager(conn, wallet);
    }

    /**
     * Create an account large enough to store the Pyth price data
     *
     * @returns The keypair for the created account.
     */
    async createPriceAccount(): Promise<Keypair> {
        return this.config.createAccount(PRICE_ACCOUNT_SIZE);
    }

    /**
     * Create an account large enough to store the Pyth product data
     *
     * @returns The keypair for the created account.
     */
    async createProductAccount(): Promise<Keypair> {
        return this.createPriceAccount();
    }

    /**
     * Update a Pyth price account with new data
     * @param account The account to update
     * @param data The new data to place in the account
     */
    async updatePriceAccount(account: Keypair, data: Price) {
        const buf = Buffer.alloc(512);
        const d = getPriceDataWithDefaults(data);
        d.aggregatePriceInfo = getPriceInfoWithDefaults(d.aggregatePriceInfo);

        writePriceBuffer(buf, 0, d);
        await this.config.store(account, 0, buf);
    }

    /**
     * Update a Pyth price account with new data
     * @param account The account to update
     * @param data The new data to place in the account
     */
    async updateProductAccount(account: Keypair, data: Product) {
        const buf = Buffer.alloc(512);
        const d = getProductWithDefaults(data);

        writeProductBuffer(buf, 0, d);
        await this.config.store(account, 0, buf);
    }

    /**
     * Get a Pyth price, returns null if:
     * - the account data size differs from the expected `PRICE_ACCOUNT_SIZE`
     * - the account is not a valid Pyth account
     * 
     * @param account The account to update
     */
    async getPriceAccountData(account: Keypair): Promise<Price | null> {
        let data = await this.config.retrieve(account);
        // Check if data is expected length
        if (data.data.length !== PRICE_ACCOUNT_SIZE) {
            return Promise.resolve(null);
        }
        // Decode account data
        return Promise.resolve(readPriceBuffer(data.data, 0))
    }
}

function readPriceBuffer(buf: Buffer, offset: number): Price | null {
    // Check the header magic
    if (buf.readUInt32LE(offset + 0) !== pyth.Magic) {
        return null
    }

    let price = {
        version: buf.readUInt32LE(offset + 4),
        type: buf.readUInt32LE(offset + 8),
        size: buf.readUInt32LE(offset + 12),
        priceType: "price",
        exponent: buf.readInt32LE(offset + 20),
        currentSlot: buf.readBigUInt64LE(offset + 32),
        validSlot: buf.readBigUInt64LE(offset + 40),
        productAccountKey: readPublicKeyBuffer(buf, offset + 112),
        nextPriceAccountKey: readPublicKeyBuffer(buf, offset + 144),
        aggregatePriceUpdaterAccountKey: readPublicKeyBuffer(buf, offset + 176),
        aggregatePriceInfo: readPriceInfoBuffer(buf, offset + 208),
        priceComponents: []
    }

    const priceComponentSize = 96;
    let pos = 240;
    const priceComponentsLength = buf.readUInt32LE(offset + 24);
    let priceComponentIndex = 0;
    while (priceComponentIndex++ < priceComponentsLength) {
        price.priceComponents.push(readPriceComponentBuffer(buf, pos));
        pos += priceComponentSize;
    }

    return price
}

// FIXME: test that this works
function readPublicKeyBuffer(buf: Buffer, start: number): PublicKey {
    let string = buf.toString("binary", start, start + 32);
    let key = new PublicKey(Buffer.from(string, 'binary'));
    return key;
}

function writePublicKeyBuffer(buf: Buffer, offset: number, key: PublicKey) {
    buf.write(key.toBuffer().toString("binary"), offset, "binary");
}

function writePriceBuffer(buf: Buffer, offset: number, data: Price) {
    buf.writeUInt32LE(pyth.Magic, offset + 0);
    buf.writeUInt32LE(data.version, offset + 4);
    buf.writeUInt32LE(data.type, offset + 8);
    buf.writeUInt32LE(data.size, offset + 12);
    buf.writeUInt32LE(convertPriceType(data.priceType), offset + 16);
    buf.writeInt32LE(data.exponent, offset + 20);
    buf.writeUInt32LE(data.priceComponents.length, offset + 24);
    buf.writeBigUInt64LE(data.currentSlot, offset + 32);
    buf.writeBigUInt64LE(data.validSlot, offset + 40);
    writePublicKeyBuffer(buf, offset + 112, data.productAccountKey);
    writePublicKeyBuffer(buf, offset + 144, data.nextPriceAccountKey);
    writePublicKeyBuffer(
        buf,
        offset + 176,
        data.aggregatePriceUpdaterAccountKey
    );

    writePriceInfoBuffer(buf, 208, data.aggregatePriceInfo);

    let pos = offset + 240;
    for (const component of data.priceComponents) {
        writePriceComponentBuffer(buf, pos, component);
        pos += 96;
    }
}

function readPriceInfoBuffer(buf: Buffer, offset: number): PriceInfo {
    return {
        price: buf.readBigInt64LE(offset),
        conf: buf.readBigUInt64LE(offset + 8),
        status: "trading",
        pubSlot: buf.readBigUInt64LE(offset + 24)
    }
}

function writePriceInfoBuffer(buf: Buffer, offset: number, info: PriceInfo) {
    buf.writeBigInt64LE(info.price, offset + 0);
    buf.writeBigUInt64LE(info.conf, offset + 8);
    buf.writeUInt32LE(convertPriceStatus(info.status), offset + 16);
    buf.writeBigUInt64LE(info.pubSlot, offset + 24);
}

function readPriceComponentBuffer(
    buf: Buffer,
    offset: number,
): PriceComponent {
    return {
        // FIXME: is this right?
        publisher: new PublicKey(buf.slice(offset, 32)),
        agg: readPriceInfoBuffer(buf, offset + 32),
        latest: readPriceInfoBuffer(buf, offset + 64)
    }
}

function writePriceComponentBuffer(
    buf: Buffer,
    offset: number,
    component: PriceComponent
) {
    component.publisher.toBuffer().copy(buf, offset);
    writePriceInfoBuffer(buf, offset + 32, component.agg);
    writePriceInfoBuffer(buf, offset + 64, component.latest);
}

function writeProductBuffer(buf: Buffer, offset: number, product: Product) {
    let accountSize = product.size;

    if (!accountSize) {
        accountSize = 48;

        for (const key in product.attributes) {
            accountSize += 1 + key.length;
            accountSize += 1 + product.attributes[key].length;
        }
    }

    buf.writeUInt32LE(pyth.Magic, offset + 0);
    buf.writeUInt32LE(product.version, offset + 4);
    buf.writeUInt32LE(product.atype, offset + 8);
    buf.writeUInt32LE(accountSize, offset + 12);

    writePublicKeyBuffer(buf, offset + 16, product.priceAccount);

    let pos = offset + 48;

    for (const key in product.attributes) {
        buf.writeUInt8(key.length, pos);
        buf.write(key, pos + 1);

        pos += 1 + key.length;

        const value = product.attributes[key];
        buf.writeUInt8(value.length, pos);
        buf.write(value, pos + 1);
    }
}

function convertPriceType(type: string): number {
    return 1;
}

function convertPriceStatus(status: string): number {
    return 1;
}

function getPriceDataWithDefaults({
    version = pyth.Version2,
    type = 0,
    size = PRICE_ACCOUNT_SIZE,
    priceType = "price",
    exponent = 0,
    currentSlot = 0n,
    validSlot = 0n,
    productAccountKey = PublicKey.default,
    nextPriceAccountKey = PublicKey.default,
    aggregatePriceUpdaterAccountKey = PublicKey.default,
    aggregatePriceInfo = {},
    priceComponents = [],
}: Price): Price {
    return {
        version,
        type,
        size,
        priceType,
        exponent,
        currentSlot,
        validSlot,
        productAccountKey,
        nextPriceAccountKey,
        aggregatePriceUpdaterAccountKey,
        aggregatePriceInfo,
        priceComponents,
    };
}

function getPriceInfoWithDefaults({
    price = 0n,
    conf = 0n,
    status = "trading",
    corpAct = "no_corp_act",
    pubSlot = 0n,
}: PriceInfo): PriceInfo {
    return {
        price,
        conf,
        status,
        corpAct,
        pubSlot,
    };
}

function getProductWithDefaults({
    version = pyth.Version2,
    atype = 2,
    size = 0,
    priceAccount = PublicKey.default,
    attributes = {},
}: Product): Product {
    return {
        version,
        atype,
        size,
        priceAccount,
        attributes,
    };
}
