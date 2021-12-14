<script lang="ts">
  import { onMount } from "svelte";
  import { Router, Route } from "svelte-navigator";
  import { getIDLAndAnchorAndMarketPubkeys, rollbar } from "./scripts/jet";
  import { checkDarkTheme } from "./scripts/util";
  import Nav from "./components/Nav.svelte";
  import Cockpit from "./views/Cockpit.svelte";
  import TransactionLogs from "./views/TransactionLogs.svelte";
  import Settings from "./views/Settings.svelte";
  import Loader from "./components/Loader.svelte";
  import ConnectWalletModal from "./components/ConnectWalletModal.svelte";
  import Copilot from "./components/Copilot.svelte";
  import Notifications from "./components/Notifications.svelte";
  import TermsConditions from "./components/TermsConditions.svelte";
  import { subscribeToMarket } from "./scripts/subscribe";
  import { INIT_FAILED, MARKET } from "./store";

  let launchUI: boolean = false;
  onMount(async () => {
    // Init dark thtme
    checkDarkTheme();

    // get IDL and market reserve data
    await getIDLAndAnchorAndMarketPubkeys();
    // Display Interface
    launchUI = true;

    try {
      // Subscribe to market
      await subscribeToMarket();
      MARKET.update(market => {
        market.marketInit = true;
        return market;
      })
    } catch (err) {
      console.error(`Unable to connect: ${err}`);
      rollbar.critical(`Unable to connect: ${err}`);
      INIT_FAILED.set(true);
      return;
    }
  });
</script>

<Router primary={false}>
  {#if launchUI}
    <Nav />
    <Route path="/">
      <Cockpit />
    </Route>
    <Route path="/transactions">
      <TransactionLogs />
    </Route>
    <Route path="/settings">
      <Settings />
    </Route>
    <ConnectWalletModal />
    <Copilot />
    <Notifications />
    <TermsConditions />
  {:else}
    <Loader fullscreen />
  {/if}
</Router>
