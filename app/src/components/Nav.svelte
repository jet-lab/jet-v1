<script lang="ts">
  import { onMount } from 'svelte';
  import { useLocation } from 'svelte-navigator';
  import { USER } from '../store';
  import { dictionary } from '../scripts/localization';
  import Logo from './Logo.svelte';
  import NavLink from './NavLink.svelte';
  import ConnectWalletButton from './ConnectWalletButton.svelte';

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
<nav class="desktop flex flex align-center justify-between column">
	<div class="top flex align-center column">
    <div class="nav-logo-container flex-centered"
      on:click={() => window.open('https://jetprotocol.io/', '_blank')}>
      <Logo width={!expanded ? 50 : 105} logoMark={!expanded} />
    </div>
    <NavLink active={$location.pathname === '/'} 
      path="/" icon={$location.pathname === '/' ? '✔' : '✈'}
      text={expanded ? dictionary[$USER.language].nav.cockpit : ''} 
    />
    <NavLink active={$location.pathname === '/transactions'} 
      path='/transactions' icon={$location.pathname === '/transactions' ? '➺' : '➸'}
      text={expanded ? dictionary[$USER.language].nav.transactions : ''} 
    />
    <NavLink active={$location.pathname === '/settings'} 
      path='/settings' icon={$location.pathname === '/settings' ? '✎' : '✀'}
      text={expanded ? dictionary[$USER.language].nav.settings : ''} 
    />
	</div>
  <div class="bottom flex align-center justify-end column">
    <div on:click={() => toggleNav()} class="bottom-expand flex-centered">
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
          {dictionary[$USER.language].nav.collapse.toUpperCase()}
        </span>
      {/if}
    </div>
	</div>
</nav>
<!--Tablet-->
<nav class="tablet flex flex align-center justify-between">
	<div class="top flex align-center justify-evenly">
    <NavLink active={$location.pathname === '/'} 
      path="/" icon={$location.pathname === '/' ? '✔' : '✈'} 
      text={dictionary[$USER.language].nav.cockpit} 
    />
    <NavLink active={$location.pathname === '/transactions'} 
      path='/transactions' icon={$location.pathname === '/transactions' ? '➺' : '➸'} 
      text={dictionary[$USER.language].nav.transactions} 
    />
    <NavLink active={$location.pathname === '/settings'} 
      path='/settings' icon={$location.pathname === '/settings' ? '✎' : '✀'} 
      text={dictionary[$USER.language].nav.settings} 
    />
  </div>
  <div class="bottom flex align-center justify-evenly">
    <ConnectWalletButton />
  </div>
</nav>
<!--Mobile-->
<nav class="mobile flex flex align-center justify-between">
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
    <ConnectWalletButton mobile />
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
  .top, .bottom {
    width: 100%;
  }
  .bottom-expand {
    width: 100%;
    padding: var(--spacing-md) 0 var(--spacing-xs) 0;
    border-top: 2px solid var(--grey);
    cursor: pointer;
  }

  @media screen and (max-width: 600px) {
    .desktop, .mobile {
      display: none;
    }
    .tablet {
      display: flex;
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
    .bottom {
      justify-content: center;
    }
  }
</style>