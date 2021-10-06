import { rollbar } from '../scripts/jet';
import { parseObligationAccount } from "../scripts/programUtil";
import { timeout } from "../scripts/util";
import { liquidateObligation } from "./liquidateObligation";
import { setupEnv } from "./setupEnv";
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

export const scanObligations = async () => {
  const env = await setupEnv();
  const obligationSpan = (env.coder.accounts as any).accountLayouts.get("Obligation").span;

  while (true) {
    const sleep = timeout(1000);
    try {
      const timeStart = Date.now();
      const accounts = await env.connection.getProgramAccounts(env.program.programId, {
        filters: [{ dataSize: obligationSpan }]
      });
      const timeGetAccounts = Date.now();
      for (const account of accounts) {
        try {
          const obligation = parseObligationAccount(account.account.data, env.coder);
          liquidateObligation(env, account.pubkey, obligation).catch(error => {
            console.log(error);
          });
        } catch (error) {
          console.error(`Liquidator error: ${error}`);
          rollbar.error(`Liquidator error: ${error}`);
        }
      }
      const timeEnd = Date.now();
      console.log(`${accounts.length} scanned in ${(timeEnd - timeStart).toFixed()}ms (getProgramAccounts ${(timeGetAccounts - timeStart).toFixed()}ms)`)
    } catch (error) {
      console.error(`Liquidator error: ${error}`);
      rollbar.error(`Liquidator error: ${error}`);
    }
    await sleep;
  }
}

const argv = yargs(hideBin(process.argv))
  .option('prod', {
    type: 'boolean',
    description: 'Use IDL from Firestore and wallet from Google secrets',
    default: false,
  })
  .argv

const prod: boolean = argv.prod;

scanObligations();