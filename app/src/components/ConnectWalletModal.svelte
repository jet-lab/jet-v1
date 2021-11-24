<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import type { WalletProvider } from '../models/JetTypes';
  import { USER } from '../store';
  import { getWalletAndAnchor } from '../scripts/jet';
  import { dictionary } from '../scripts/localization';
  import Logo from './Logo.svelte';

  let walletChoice: string;
  const providers: WalletProvider[] = [
    {
      name: "Phantom",
      logo: "img/wallets/phantom.png",
      url: "https://phantom.app/"
    },
    {
      name: "Slope",
      logo: "img/wallets/slope.png",
      url: "https://slope.finance/"
    },
    {
      name: "Solflare",
      logo: "img/wallets/solflare.png",
      url: "https://solflare.com/"
    },
    {
      name: "Solong",
      logo: "img/wallets/solong.png",
      url: "https://solongwallet.com/"
    },
    {
      name: "Sollet",
      logo: "img/wallets/sollet.png",
      url: "https://www.sollet.io/"
    },
    {
      name: "Math Wallet",
      logo: "img/wallets/math_wallet.png",
      url: "https://mathwallet.org/en-us/"
    }
  ];
</script>

{#if $USER.connectingWallet && !$USER.wallet}
  <div class="modal-bg"
    transition:fade={{duration: 50}}
    on:click={() => USER.update(user => {
      user.connectingWallet = false;
      return user;
    })}>
  </div>
  <div class="modal flex-centered column"
    in:fly={{y: 25, duration: 500}}
    out:fade={{duration: 50}}>
    <Logo width={120} />
    <span>
      {dictionary[$USER.language].settings.worldOfDefi}
    </span>
    <div class="divider">
    </div>
    <div class="wallets flex-centered column">
      {#each providers as p}
        <div class="{p.name.toLowerCase()} wallet flex align-center justify-between"
          class:active={walletChoice === p.name} 
          on:click={() => {
            walletChoice = p.name;
            getWalletAndAnchor(p);
          }}>
          <div class="flex-centered">
            <img src={p.logo} alt="{p.name} Logo" />
            <p>
              {p.name}
            </p>
          </div>
          <i class="text-gradient jet-icons">
            ➜
          </i>
        </div>
      {/each} 
    </div>
    <i class="jet-icons close"
      on:click={() => USER.update(user => {
        user.connectingWallet = false;
        return user;
      })}>
      ✕
    </i>
  </div>
{/if}

<style>
  .modal-bg {
    z-index: 102;
  }
  .modal {
    padding: var(--spacing-lg) var(--spacing-md);
    z-index: 103;
  }
  .wallets {
    margin: var(--spacing-md);
    position: relative;
  }
  .wallet {
    width: 200px;
    margin: var(--spacing-xs) 0;
    padding: var(--spacing-sm) var(--spacing-lg);
    cursor: pointer;
    border-radius: 50px;
  }
  .wallet img {
    width: 30px;
    height: auto;
    margin: 0 var(--spacing-md);
  }
  .wallet .jet-icons {
    opacity: 0 !important;
    margin-left: var(--spacing-lg);
  }
  .wallet:hover, .wallet:active, .wallet.active {
    background: var(--grey);
    box-shadow: var(--neu-shadow-inset);
  }
  .wallet:hover .jet-icons, .wallet:active .jet-icons, .wallet.active .jet-icons {
    opacity: 1 !important;
  }
  span {
    font-size: 12px;
    margin: var(--spacing-sm);
  }
  p {
    font-size: 14px;
    text-align: center;
  }

  @media screen and (max-width: 600px) {
    .wallets {
      height: 250px;
      overflow-y: scroll;
      justify-content: flex-start;
    }
  }
</style>