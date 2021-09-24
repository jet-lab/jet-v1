<script lang="ts">
  import { onMount } from "svelte";
  import { Router, Route } from "svelte-navigator";
  import { MARKET, CURRENT_RESERVE, GEOBANNED } from './store';
  import { rollbar, getMarketAndIDL } from './scripts/jet';
  import { getLocale } from './scripts/localization';
  import { initDarkTheme } from './scripts/utils';
  import Nav from './components/Nav.svelte';
  import Cockpit from './views/Cockpit.svelte';
  import Settings from './views/Settings.svelte';
  import Loader from './components/Loader.svelte';
  import Copilot from './components/Copilot.svelte';
  import InitFailed from './views/InitFailed.svelte';
  
  // Try to init app, otherwise fisplay failure message
  let init: boolean;
  onMount(async () => {
    try {
      // Initialize dark theme
      initDarkTheme();

      // Get user's locale and check for banned region
      await getLocale();

      // get IDL whith market reserve data
      await getMarketAndIDL();

      // If document is ready and user's region isn't banned, 
      // set current reserve for UI and init
      if (!$GEOBANNED && document.readyState !== 'loading') {
        CURRENT_RESERVE.set($MARKET.reserves.SOL);
        init = true;
      } else {
        init = false;
      }
    } catch (err) {
      console.error(`Unable to init app: ${err}`)
      rollbar.critical(`Unable to init app: ${err}`);
      init = false;
    }
  });
</script>

<Router primary={false}>
  <Nav {init} />
  {#if init === true}
    <Route path="/">
      <Cockpit />
    </Route>
    <Route path="/settings">
      <Settings />
    </Route>
  {:else if init === false}
    <InitFailed />
  {:else}
    <Loader fullscreen />
  {/if}
  <Copilot />
</Router>