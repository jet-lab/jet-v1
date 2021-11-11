import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionSignature,
} from "@solana/web3.js";
import { Connection } from "@solana/web3.js";
import { BN, Program, Wallet } from "@project-serum/anchor";
import { DataManager } from "./data";
import { TestToken, TestUtils, toBN, toPublicKeys } from ".";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from "@project-serum/anchor";
import { DEX_ID, DEX_ID_DEVNET}from "@jet-lab/jet-client";
import { IdlInstruction } from "@project-serum/anchor/dist/idl";

export interface ReserveAccounts {
  accounts: {
    reserve: Keypair;

    vault: PublicKey;
    feeNoteVault: PublicKey;
    dexOpenOrders: PublicKey;
    dexSwapTokens: PublicKey;
    tokenMint: TestToken;

    dexMarket: PublicKey;
    pythPrice: PublicKey;
    pythProduct: PublicKey;

    loanNoteMint: PublicKey;
    depositNoteMint: PublicKey;
    faucet?: PublicKey;
  };
  bump: {
    vault: number;
    feeNoteVault: number;
    dexOpenOrders: number;
    dexSwapTokens: number;
    loanNoteMint: number;
    depositNoteMint: number;
  };
}

export interface ReserveConfig {
  utilizationRate1: BN;
  utilizationRate2: BN;
  borrowRate0: BN;
  borrowRate1: BN;
  borrowRate2: BN;
  borrowRate3: BN;
  minCollateralRatio: BN;
  liquidationPremium: BN;
  manageFeeRate: BN;
  manageFeeCollectionThreshold: BN,
  loanOriginationFee: BN,
  liquidationSlippage: BN,
  liquidationDexTradeMax: BN,
}

export class JetUtils {
  static readonly programId = DataManager.programId;

  conn: Connection;
  wallet: Wallet;
  config: DataManager;
  utils: TestUtils;
  program: Program;
  dex_id: PublicKey;

  constructor(conn: Connection, wallet: Wallet, program: Program, devnet: boolean) {
    this.conn = conn;
    this.wallet = wallet;
    this.config = new DataManager(conn, wallet);
    this.utils = new TestUtils(conn, wallet);
    this.program = program;
    this.dex_id = devnet ? DEX_ID_DEVNET : DEX_ID;
  }

  public async createReserveAccount(
    tokenMint: TestToken,
    dexMarket: PublicKey,
    pythPrice: PublicKey,
    pythProduct: PublicKey,
    faucet?: PublicKey
  ): Promise<ReserveAccounts> {
    const reserve = Keypair.generate();
    const [depositNoteMint, depositNoteMintBump] =
      await this.utils.findProgramAddress(this.program.programId, [
        "deposits",
        reserve,
        tokenMint,
      ]);
    const [loanNoteMint, loanNoteMintBump] =
      await this.utils.findProgramAddress(this.program.programId, [
        "loans",
        reserve,
        tokenMint,
      ]);
    const [depositNoteDest, depositNoteDestBump] =
      await this.utils.findProgramAddress(this.program.programId, [
        reserve,
        this.wallet,
      ]);
    const [vault, vaultBump] = await this.utils.findProgramAddress(
      this.program.programId,
      ["vault", reserve]
    );
    const [feeNoteVault, feeNoteVaultBump] =
      await this.utils.findProgramAddress(this.program.programId, [
        "fee-vault",
        reserve,
      ]);
    const [dexSwapTokens, dexSwapTokensBump] =
      await this.utils.findProgramAddress(this.program.programId, [
        "dex-swap-tokens",
        reserve,
      ]);
    const [dexOpenOrders, dexOpenOrdersBump] =
      await this.utils.findProgramAddress(this.program.programId, [
        "dex-open-orders",
        reserve,
      ]);

    return {
      accounts: {
        reserve,
        vault,
        feeNoteVault,
        dexOpenOrders,
        dexSwapTokens,
        tokenMint,

        dexMarket,
        pythPrice,
        pythProduct,

        depositNoteMint,
        loanNoteMint,
        faucet,
      },

      bump: {
        vault: vaultBump,
        feeNoteVault: feeNoteVaultBump,
        dexOpenOrders: dexOpenOrdersBump,
        dexSwapTokens: dexSwapTokensBump,
        depositNoteMint: depositNoteMintBump,
        loanNoteMint: loanNoteMintBump,
      },
    };
  }

  public async initReserve(
    reserve: ReserveAccounts,
    reserveConfig: ReserveConfig,
    market: PublicKey,
    marketOwner: PublicKey,
    quoteTokenMint: PublicKey,
  ): Promise<TransactionSignature> {
    let [marketAuthority] = await this.findMarketAuthorityAddress(market);

    return await this.program.rpc.initReserve(reserve.bump, reserveConfig, {
      accounts: toPublicKeys({
        market,
        marketAuthority,
        owner: marketOwner,

        oracleProduct: reserve.accounts.pythProduct,
        oraclePrice: reserve.accounts.pythPrice,

        quoteTokenMint,

        tokenProgram: TOKEN_PROGRAM_ID,
        dexProgram: this.dex_id,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,

        ...reserve.accounts,
      }),
      signers: [reserve.accounts.reserve],
      instructions: [
        await this.program.account.reserve.createInstruction(
          reserve.accounts.reserve
        ),
      ],
    });
  }

  public async findMarketAuthorityAddress(market: PublicKey) {
    return PublicKey.findProgramAddress(
      [market.toBuffer()],
      this.program.programId
    );
  }
}

export const LiquidateDexInstruction = {
  name: "liquidateDex",
  accounts: [
    {
      name: "sourceMarket",
      accounts: [
        {
          name: "market",
          isMut: true,
          isSigner: false,
        },
        {
          name: "openOrders",
          isMut: true,
          isSigner: false,
        },
        {
          name: "requestQueue",
          isMut: true,
          isSigner: false,
        },
        {
          name: "eventQueue",
          isMut: true,
          isSigner: false,
        },
        {
          name: "bids",
          isMut: true,
          isSigner: false,
        },
        {
          name: "asks",
          isMut: true,
          isSigner: false,
        },
        {
          name: "coinVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "pcVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vaultSigner",
          isMut: false,
          isSigner: false,
        },
      ],
    },
    {
      name: "targetMarket",
      accounts: [
        {
          name: "market",
          isMut: true,
          isSigner: false,
        },
        {
          name: "openOrders",
          isMut: true,
          isSigner: false,
        },
        {
          name: "requestQueue",
          isMut: true,
          isSigner: false,
        },
        {
          name: "eventQueue",
          isMut: true,
          isSigner: false,
        },
        {
          name: "bids",
          isMut: true,
          isSigner: false,
        },
        {
          name: "asks",
          isMut: true,
          isSigner: false,
        },
        {
          name: "coinVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "pcVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vaultSigner",
          isMut: false,
          isSigner: false,
        },
      ],
    },
    {
      name: "market",
      isMut: false,
      isSigner: false,
    },
    {
      name: "marketAuthority",
      isMut: false,
      isSigner: false,
    },
    {
      name: "obligation",
      isMut: true,
      isSigner: false,
    },
    {
      name: "loanReserve",
      isMut: true,
      isSigner: false,
    },
    {
      name: "loanReserveVault",
      isMut: true,
      isSigner: false,
    },
    {
      name: "loanNoteMint",
      isMut: true,
      isSigner: false,
    },
    {
      name: "loanAccount",
      isMut: true,
      isSigner: false,
    },
    {
      name: "collateralReserve",
      isMut: false,
      isSigner: false,
    },
    {
      name: "collateralReserveVault",
      isMut: true,
      isSigner: false,
    },
    {
      name: "depositNoteMint",
      isMut: true,
      isSigner: false,
    },
    {
      name: "collateralAccount",
      isMut: true,
      isSigner: false,
    },
    {
      name: "dexSwapTokens",
      isMut: true,
      isSigner: false,
    },
    {
      name: "dexProgram",
      isMut: false,
      isSigner: false,
    },
    {
      name: "tokenProgram",
      isMut: false,
      isSigner: false,
    },
    {
      name: "rent",
      isMut: false,
      isSigner: false,
    },
  ],
  args: [],
};

export const LiquidateInstruction: IdlInstruction = {
  name: "liquidate",
  accounts: [
    {
      "name": "market",
      "isMut": false,
      "isSigner": false
    },
    {
      "name": "marketAuthority",
      "isMut": false,
      "isSigner": false
    },
    {
      "name": "obligation",
      "isMut": true,
      "isSigner": false
    },
    {
      "name": "reserve",
      "isMut": true,
      "isSigner": false
    },
    {
      "name": "collateralReserve",
      "isMut": false,
      "isSigner": false
    },
    {
      "name": "vault",
      "isMut": true,
      "isSigner": false
    },
    {
      "name": "loanNoteMint",
      "isMut": true,
      "isSigner": false
    },
    {
      "name": "loanAccount",
      "isMut": true,
      "isSigner": false
    },
    {
      "name": "collateralAccount",
      "isMut": true,
      "isSigner": false
    },
    {
      "name": "payerAccount",
      "isMut": true,
      "isSigner": false
    },
    {
      "name": "receiverAccount",
      "isMut": true,
      "isSigner": false
    },
    {
      "name": "payer",
      "isMut": false,
      "isSigner": true
    },
    {
      "name": "tokenProgram",
      "isMut": false,
      "isSigner": false
    }
  ],
  args: [
    {
      name: "amount",
      type: {
        "defined": "Amount"
      }
    },
    {
      name: "minCollateral",
      type: "u64"
    }
  ]
};
