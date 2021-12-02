use anchor_client::solana_sdk::{instruction::Instruction, signature::Keypair};
use anchor_lang::prelude::Pubkey;
use anchor_lang::{InstructionData, ToAccountMetas};
use jet::state::{Market, Obligation, Reserve};
use structopt::StructOpt;

#[derive(StructOpt)]
enum RunCommand {
    /// Read the contents of a market account
    ReadMarket {
        /// The address of the market account
        address: Pubkey,
    },

    /// Read the contents of a reserve account
    ReadReserve {
        /// The address of the reserve account
        address: Pubkey,
    },

    /// Read the contents of an obligation account
    ReadObligation {
        /// The address of the obligation account
        address: Pubkey,
    },

    /// Read the contents of a user's obligation account
    FindObligation {
        /// The address of the relevant market account
        #[structopt(long, short)]
        market: Pubkey,

        /// The address of the user/wallet interacting with the program
        address: Pubkey,
    },

    /// Close a deposit account
    CloseDepositAccount {
        /// The address of the reserve, for which the deposit account should be
        /// closed for the active wallet.
        #[structopt(long, short)]
        reserve: Pubkey,
    },
}

fn load_default_keypair() -> anyhow::Result<Keypair> {
    let keypair_path = shellexpand::tilde("~/.config/solana/id.json");
    let keypair_data = std::fs::read_to_string(keypair_path.to_string())?;
    let keypair_bytes: Vec<u8> = serde_json::from_str(&keypair_data)?;
    let keypair = Keypair::from_bytes(&keypair_bytes)?;

    Ok(keypair)
}

fn load_default_client() -> anyhow::Result<anchor_client::Program> {
    let keypair = load_default_keypair()?;
    let rpc = "https://api.devnet.solana.com".to_owned();
    let wss = rpc.replace("https", "wss");
    let connection = anchor_client::Client::new(anchor_client::Cluster::Custom(rpc, wss), keypair);

    let client = connection.program(jet::ID);

    Ok(client)
}

fn run_read_market(client: &anchor_client::Program, address: Pubkey) -> anyhow::Result<()> {
    let market = client.account::<Market>(address)?;

    println!("{:#?}", market);
    Ok(())
}

fn run_read_reserve(client: &anchor_client::Program, address: Pubkey) -> anyhow::Result<()> {
    let reserve = client.account::<Reserve>(address)?;

    println!("{:#?}", reserve);
    Ok(())
}

fn run_read_obligation(client: &anchor_client::Program, address: Pubkey) -> anyhow::Result<()> {
    let obligation = client.account::<Obligation>(address)?;

    println!("{:#?}", obligation);
    Ok(())
}

fn run_find_obligation(
    client: &anchor_client::Program,
    market: Pubkey,
    address: Pubkey,
) -> anyhow::Result<()> {
    let (obligation_addr, _) = Pubkey::find_program_address(
        &[b"obligation".as_ref(), market.as_ref(), address.as_ref()],
        &jet::ID,
    );
    let obligation = client.account::<Obligation>(obligation_addr)?;

    println!("{:#?}", obligation);
    Ok(())
}

fn run_close_deposit_account(
    client: &anchor_client::Program,
    reserve: Pubkey,
) -> anyhow::Result<()> {
    let reserve_data = client.account::<Reserve>(reserve)?;
    let market_data = client.account::<Market>(reserve_data.market)?;

    let (deposit_account, bump) = Pubkey::find_program_address(
        &[
            "deposits".as_ref(),
            reserve.as_ref(),
            client.payer().as_ref(),
        ],
        &client.id(),
    );

    let close_ix = Instruction {
        program_id: client.id(),
        accounts: jet::accounts::CloseDepositAccount {
            market: reserve_data.market,
            market_authority: market_data.market_authority,

            reserve,
            vault: reserve_data.vault,
            deposit_note_mint: reserve_data.deposit_note_mint,
            depositor: client.payer(),

            receiver_account: reserve_data.vault,
            deposit_account,

            token_program: anchor_spl::token::ID,
        }
        .to_account_metas(None),
        data: jet::instruction::CloseDepositAccount { bump }.data(),
    };

    let sig = client.request().instruction(close_ix).send();
    println!("confirmed: {:?}", sig);

    Ok(())
}

fn main() -> anyhow::Result<()> {
    let client = load_default_client()?;
    let command = RunCommand::from_args();

    match command {
        RunCommand::ReadMarket { address } => run_read_market(&client, address)?,
        RunCommand::ReadReserve { address } => run_read_reserve(&client, address)?,
        RunCommand::ReadObligation { address } => run_read_obligation(&client, address)?,
        RunCommand::FindObligation { market, address } => {
            run_find_obligation(&client, market, address)?
        }
        RunCommand::CloseDepositAccount { reserve } => run_close_deposit_account(&client, reserve)?,
    }

    Ok(())
}
