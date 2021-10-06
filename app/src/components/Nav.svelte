<script lang="ts">
  import { onMount } from 'svelte';
  import { useLocation } from 'svelte-navigator';
  import { WALLET, ASSETS, DARK_THEME, PREFERRED_LANGUAGE } from '../store';
  import { disconnectWallet, setDark, shortenPubkey } from '../scripts/utils';
  import { dictionary } from '../scripts/localization';
  import { generateCopilotSuggestion } from '../scripts/copilot';
  import Logo from './Logo.svelte';
  import NavLink from './NavLink.svelte';
  import Toggle from './Toggle.svelte';

  export let launchUI: boolean;

  let expanded: boolean = false;
  const location = useLocation();
  
  // Toggle navbar expansion (desktop)
  const toggleNav = () => {
    if (expanded) {
      document.documentElement.style.setProperty('--nav-width', '60px');
    } else {
      document.documentElement.style.setProperty('--nav-width', '120px');
    }

    expanded = !expanded;
    localStorage.setItem('jetNavExpanded', JSON.stringify(expanded));
  };

  // If user prefers their nav to be expanded, toggle it on init
  onMount(() => {
    if (localStorage.getItem('jetNavExpanded') === 'true') {
      toggleNav();
    }
  });
</script>

<!--Desktop-->
<nav class="desktop flex flex align-center justify-between column" 
  class:expanded
  style={launchUI ? 'opacity: 1;' : 'opacity: 0;'}>
	<div class="top flex align-center column">
    <div class="nav-logo-container flex align-center justify-center">
      <Logo width={!expanded ? 50 : 100} logoMark={!expanded} />
    </div>
    <NavLink active={$location.pathname === '/'} 
      path="/" icon={$location.pathname === '/' ? '✔' : '✈'}
      text={expanded ? dictionary[$PREFERRED_LANGUAGE].nav.cockpit : ''} 
    />
    <NavLink active={$location.pathname === '/transactions'} 
      path='/transactions' icon={$location.pathname === '/transactions' ? '➺' : '➸'}
      text={expanded ? dictionary[$PREFERRED_LANGUAGE].nav.transactions : ''} 
    />
    <NavLink active={$location.pathname === '/settings'} 
      path='/settings' icon={$location.pathname === '/settings' ? '✎' : '✀'}
      text={expanded ? dictionary[$PREFERRED_LANGUAGE].nav.settings : ''} 
    />
    <div class="nav-toggle-container flex align-center justify-center">
      <Toggle onClick={() => setDark(!$DARK_THEME)} 
        text={expanded ? 
          ($DARK_THEME ? dictionary[$PREFERRED_LANGUAGE].settings.dark : dictionary[$PREFERRED_LANGUAGE].settings.light) 
            : ''}
        icon="❂" 
        active={$DARK_THEME} 
      />
    </div>
	</div>
  <div class="bottom flex align-center justify-end column">
    <div class="bottom-buttons flex align-center justify-center column">
      {#if $WALLET && $ASSETS}
        <div class="copilot flex align-center justify-center" 
          class:justify-start={expanded}
          title={dictionary[$PREFERRED_LANGUAGE].nav.getCopilotSuggestion}
          on:click={() => generateCopilotSuggestion()}>
          <img width="25px" height="auto" 
            src="img/copilot/copilot.png" 
            alt="Copilot Icon" 
          />
          {#if expanded}
            <div class="flex align-start justify-start column">
              <span class="bicyclette text-gradient">
                {dictionary[$PREFERRED_LANGUAGE].copilot.name.toUpperCase()}
              </span>
            </div>
          {/if}
        </div>
        <div class="wallet flex align-center justify-center"
          class:justify-start={expanded} 
          title={dictionary[$PREFERRED_LANGUAGE].nav.disconnectWallet}
          on:click={() => disconnectWallet()}>
          <img width="25px" height="auto" 
            src={`img/wallets/${$WALLET.name.replace(' ', '_').toLowerCase()}.png`} 
            alt={`${$WALLET.name} Logo`}
          />
          {#if expanded}
            <span class="text-gradient">
              {shortenPubkey($WALLET.publicKey.toString(), 4)}
            </span>
          {/if}
        </div>
      {/if}
    </div>
    <div on:click={() => toggleNav()} class="bottom-expand flex align-center justify-center">
      <i class="text-gradient jet-icons">
        {#if expanded}
          ➧
        {:else}
          ➪
        {/if}
      </i>
      {#if expanded}
        <span class="text-gradient">
          {dictionary[$PREFERRED_LANGUAGE].nav.collapse.toUpperCase()}
        </span>
      {/if}
    </div>
	</div>
</nav>
<!--Tablet-->
<nav class="tablet flex flex align-center justify-between" 
  style={launchUI ? 'opacity: 1;' : 'opacity: 0;'}>
	<div class="top flex align-center justify-evenly">
    <NavLink active={$location.pathname === '/'} 
      path="/" icon={$location.pathname === '/' ? '✔' : '✈'} 
      text={dictionary[$PREFERRED_LANGUAGE].nav.cockpit} 
    />
    <NavLink active={$location.pathname === '/transactions'} 
      path='/transactions' icon={$location.pathname === '/transactions' ? '➺' : '➸'} 
      text={dictionary[$PREFERRED_LANGUAGE].nav.transactions} 
    />
    <NavLink active={$location.pathname === '/settings'} 
      path='/settings' icon={$location.pathname === '/settings' ? '✎' : '✀'} 
      text={dictionary[$PREFERRED_LANGUAGE].nav.settings} 
    />
  </div>
  <div class="bottom flex align-center justify-evenly">
    {#if $WALLET && $ASSETS}
      <div class="copilot flex align-center justify-center"
        on:click={() => generateCopilotSuggestion()}>
        <img width="100%" height="auto" 
          src="img/copilot/copilot.png" 
          alt="Copilot Icon" 
        />
        <div class="flex align-start justify-start column">
          <span class="text-gradient">
            {dictionary[$PREFERRED_LANGUAGE].copilot.name.toUpperCase()}
          </span>
        </div>
      </div>
      <div class="wallet flex align-center justify-center"
        on:click={() => disconnectWallet()}>
        <img width="100%" height="auto" 
          src={`img/wallets/${$WALLET.name.replace(' ', '_').toLowerCase()}.png`} 
          alt={`${$WALLET.name} Logo`}
        />
        <span class="text-gradient">
          {shortenPubkey($WALLET.publicKey.toString(), 4)}
        </span>
      </div>
    {/if}
  </div>
</nav>
<!--Mobile-->
<nav class="mobile flex flex align-center justify-between" 
  style={launchUI ? 'opacity: 1;' : 'opacity: 0;'}>
	<div class="top flex align-center justify-evenly">
    <NavLink active={$location.pathname === '/'} 
      path="/" icon={$location.pathname === '/' ? '✔' : '✈'} 
    />
    <NavLink active={$location.pathname === '/transactions'} 
      path='/transactions' icon={$location.pathname === '/transactions' ? '➺' : '➸'} 
    />
    <NavLink active={$location.pathname === '/settings'} 
      path='/settings' icon={$location.pathname === '/settings' ? '✎' : '✀'} 
    />
  </div>
  <div class="bottom flex align-center justify-evenly">
    {#if $WALLET && $ASSETS}
      <div class="copilot flex align-center justify-center" 
        on:click={() => generateCopilotSuggestion()}>
        <img width="100%" height="auto" 
          src="img/copilot/copilot.png" 
          alt="Copilot Icon" 
        />
      </div>
      <div class="wallet flex align-center justify-center"
        on:click={() => disconnectWallet()}>
        <img width="100%" height="auto" 
          src={`img/wallets/${$WALLET.name.replace(' ', '_').toLowerCase()}.png`} 
          alt={`${$WALLET.name} Logo`}
        />
      </div>
    {/if}
  </div>
</nav>

<style>
	nav {
		position: fixed;
		left: 0;
		top: 0;
		z-index: 100;
		height: calc(100vh - var(--spacing-lg));
    padding: calc(var(--spacing-lg)/2) 0;
		width: var(--nav-width);
    box-shadow: var(--neu-shadow);
    background: var(--white);
    z-index: 1000;
	}
  .tablet, .mobile {
    width: 100vw;
    height: var(--mobile-nav-height);
    padding: unset;
    top: unset;
    bottom: 0;
    flex-wrap: nowrap;
    display: none;
  }
  .nav-logo-container {
    height: 80px;
  }
  .expanded .wallet, .expanded .copilot {
    width: 100px;
  }
  .wallet, .copilot {
    width: 100%;
    cursor: pointer;
    margin: var(--spacing-sm) auto;
  }
  .wallet img, .copilot img {
    margin: 0 var(--spacing-xs);
  }
  .copilot span, .wallet span {
    margin: 0 2px;
  }
  .nav-toggle-container  {
    width: 100%;
  }
  .top, .bottom, .bottom-buttons, .bottom-expand {
    width: 100%;
  }
  .bottom-buttons {
    padding: var(--spacing-sm) 0;
  }
  .bottom-expand {
    padding: var(--spacing-md) 0 var(--spacing-xs) 0;
    border-top: 2px solid var(--grey);
    cursor: pointer;
  }
  span {
    font-weight: bold;
    font-size: 10px;
  }

  @media screen and (max-width: 1100px) {
    .desktop, .mobile {
      display: none;
    }
    .tablet {
      display: flex;
    }
    .wallet, .copilot {
      width: 35px;
    }
    .nav-toggle-container  {
      width: 60px;
    }
    .top, .bottom {
      width: 50%;
    }
  }
  @media screen and (max-width: 600px) {
    .desktop, .tablet {
      display: none;
    }
    .mobile {
      display: flex;
    }
  }
</style>