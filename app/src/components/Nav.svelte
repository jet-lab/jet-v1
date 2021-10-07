<script lang="ts">
  import { onMount } from 'svelte';
  import { useLocation } from 'svelte-navigator';
  import { WALLET, ASSETS, PREFERRED_LANGUAGE } from '../store';
  import { disconnectWallet, shortenPubkey } from '../scripts/util';
  import { dictionary } from '../scripts/localization';
  import Logo from './Logo.svelte';
  import NavLink from './NavLink.svelte';

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
    <div class="nav-logo-container flex align-center justify-center"
      on:click={() => window.open('https://jetprotocol.io/', '_blank')}>
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
	</div>
  <div class="bottom flex align-center justify-end column">
    <div on:click={() => toggleNav()} class="bottom-expand flex align-center justify-center">
      <i class="text-gradient jet-icons">
        {#if expanded}
          ➧
        {:else}
          ➪
        {/if}
      </i>
      {#if expanded}
        <span class="bicyclette-bold text-gradient"
          style="font-size: 10.5px;">
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
      <div class="wallet flex align-center justify-center"
        on:click={() => disconnectWallet()}>
        <img width="100%" height="auto" 
          src={`img/wallets/${$WALLET.name.replace(' ', '_').toLowerCase()}.png`} 
          alt={`${$WALLET.name} Logo`}
        />
        <span>
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
      <div class="wallet flex align-center justify-center"
        on:click={() => disconnectWallet()}>
        <img width="100%" height="auto" 
          src={`img/wallets/${$WALLET.name.replace(' ', '_').toLowerCase()}.png`} 
          alt={`${$WALLET.name} Logo`}
        />
        <span>
          {shortenPubkey($WALLET.publicKey.toString(), 4)}
        </span>
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
    cursor: pointer;
  }
  .wallet {
    width: 100%;
    cursor: pointer;
    margin: var(--spacing-sm) auto;
  }
  .wallet img {
    margin: 0 var(--spacing-xs);
  }
  .wallet span {
    margin: 0 2px;
  }
  .top, .bottom {
    width: 100%;
  }
  .bottom-expand {
    width: 100%;
    padding: var(--spacing-md) 0 var(--spacing-xs) 0;
    border-top: 2px solid var(--grey);
    cursor: pointer;
  }

  @media screen and (max-width: 1100px) {
    .desktop, .mobile {
      display: none;
    }
    .tablet {
      display: flex;
    }
    .wallet {
      width: 35px;
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