<script lang="ts">
  import { onMount } from "svelte";
  import { Router, Route } from "svelte-navigator";
  import { getMarketAndIDL } from './scripts/jet';
  import { getLocale } from './scripts/localization';
  import { setDark } from './scripts/util';
  import Nav from './components/Nav.svelte';
  import Cockpit from './views/Cockpit.svelte';
  import TransactionLogs from "./views/TransactionLogs.svelte";
  import Settings from './views/Settings.svelte';
  import Loader from './components/Loader.svelte';
  import ConnectWalletModal from './components/ConnectWalletModal.svelte';
  import Copilot from './components/Copilot.svelte';
  import Notifications from './components/Notifications.svelte';

  let darkTheme: boolean = localStorage.getItem('jetDark') === 'true';
  let launchUI: boolean = false;
  onMount(async () => {
    // Initialize dark theme
    if (darkTheme) setDark(true);
    // Get user's locale and check for banned region
    await getLocale();
    // get IDL whith market reserve data
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
  {:else}
    <Loader fullscreen />
  {/if}
</Router>