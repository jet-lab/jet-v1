<script lang="ts">
  import { onMount } from "svelte";
  import { Router, Route } from "svelte-navigator";
  import { getMarketAndIDL } from './scripts/jet';
  import { getLocale } from './scripts/localization';
  import { initDarkTheme } from './scripts/util';
  import Nav from './components/Nav.svelte';
  import Cockpit from './views/Cockpit.svelte';
  import TransactionLogs from "./views/TransactionLogs.svelte";
  import Settings from './views/Settings.svelte';
  import Loader from './components/Loader.svelte';
  import ConnectWallet from './components/ConnectWallet.svelte';
  import Copilot from './components/Copilot.svelte';
  import Notifications from './components/Notifications.svelte';

  let launchUI: boolean = false;
  onMount(async () => {
    // Initialize dark theme
    initDarkTheme();

    // Get user's locale and check for banned region
    await getLocale();

    // get IDL whith market reserve data
    await getMarketAndIDL();

    // Display Interface
    launchUI = true;
  });
</script>

<Router primary={false}>
  <Nav {launchUI} />
  {#if launchUI}
    <Route path="/">
      <Cockpit />
    </Route>
    <Route path="/transactions">
      <TransactionLogs />
    </Route>
    <Route path="/settings">
      <Settings />
    </Route>
  {:else}
    <Loader fullscreen />
  {/if}
  <ConnectWallet />
  <Copilot />
  <Notifications />
</Router>