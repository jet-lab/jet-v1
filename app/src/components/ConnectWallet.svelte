<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import type { WalletProvider } from '../models/JetTypes';
  import { PREFERRED_LANGUAGE } from '../store';
  import { getWalletAndAnchor } from '../scripts/jet';
  import { dictionary } from '../scripts/localization';
  import Logo from '../components/Logo.svelte';

  export let closeable: boolean = false;
  export let closeModal: Function = () => null;

  let walletChoice: string;
  const providers: WalletProvider[] = [
    {
      name: "Phantom",
      logo: "img/wallets/phantom.png",
      url: "https://phantom.app/"
    },
    {
      name: "Sollet",
      logo: "img/wallets/sollet.png",
      url: "https://www.sollet.io/"
    },
    {
      name: "Solong",
      logo: "img/wallets/solong.png",
      url: "https://solongwallet.com/"
    },
    {
      name: "Math Wallet",
      logo: "img/wallets/math_wallet.png",
      url: "https://mathwallet.org/en-us/"
    }
  ];
</script>

<div class="modal-bg"
  transition:fade={{duration: closeable ? 50 : 0}}
  on:click={() => closeable ? closeModal() : null}>
</div>
<div class="modal flex align-center justify-center column"
  in:fly={{y: closeable ? 50 : 0, duration: closeable ? 500 : 0}}
  out:fade={{duration: closeable ? 50 : 0}}>
  <Logo width={120} />
  <span>
    {dictionary[$PREFERRED_LANGUAGE].settings.worldOfDefi}
  </span>
  <div class="divider">
  </div>
  <div class="wallets flex align-center justify-center column">
    {#each providers as p}
      <div class="wallet flex align-center justify-between" 
        class:active={walletChoice === p.name} 
        on:click={() => {
          walletChoice = p.name;
          getWalletAndAnchor(p);
        }}>
        <div class="flex align-center justify-center">
          <img src={p.logo} alt={`${p.name} Logo`} />
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
</div>

<style>
  .modal-bg {
    z-index: 100;
  }
  .modal {
    padding: var(--spacing-lg) var(--spacing-md);
    z-index: 101;
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
    opacity: 0.8;
  }
</style>