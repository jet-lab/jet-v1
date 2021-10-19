<script lang="ts">
  import { onMount } from "svelte";
  import { Router, Route } from "svelte-navigator";
  import { getMarketAndIDL } from './scripts/jet';
  import { checkDarkTheme } from './scripts/util';
  import Nav from './components/Nav.svelte';
  import Cockpit from './views/Cockpit.svelte';
  import TransactionLogs from "./views/TransactionLogs.svelte";
  import Settings from './views/Settings.svelte';
  import Loader from './components/Loader.svelte';
  import ConnectWalletModal from './components/ConnectWalletModal.svelte';
  import Copilot from './components/Copilot.svelte';
  import Notifications from './components/Notifications.svelte';
  import TermsConditions from './components/TermsConditions.svelte';

  let launchUI: boolean = false;
  onMount(async () => {
    // Init dark thtme
    checkDarkTheme();
    // get IDL and market reserve data
    await getMarketAndIDL();
    // Display Interface
    launchUI = true;
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