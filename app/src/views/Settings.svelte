<svelte:head>
  <title>Jet Protocol | {dictionary[$PREFERRED_LANGUAGE].settings.title}</title>
</svelte:head>
<script lang="ts">
  import { WALLET, ASSETS, PREFERRED_LANGUAGE, DARK_THEME } from '../store';
  import { disconnectWallet, setDark } from '../scripts/utils';
  import { dictionary, updateLanguage } from '../scripts/localization';
  import Button from '../components/Button.svelte';
  import Toggle from '../components/Toggle.svelte';
  import ConnectWallet from '../components/ConnectWallet.svelte';

  let connectWallet: boolean = false;
</script>

<div class="view-container flex column">
  <h1 class="view-title text-gradient">
    {dictionary[$PREFERRED_LANGUAGE].settings.title}
  </h1>
  <div class="divider"></div>
  {#if $ASSETS}
    <div class="setting flex align-start justify-center column">
      <span>
        {dictionary[$PREFERRED_LANGUAGE].settings.wallet}
      </span>
      <div class="wallet flex align-center justify-center" 
        on:click={() => disconnectWallet()}>
        <img width="28px" height="auto" 
          src={`img/wallets/${$WALLET.name.replace(' ', '_').toLowerCase()}.png`} 
          alt={`${$WALLET.name} Logo`}
        />
        <span class="text-gradient"
          style="font-size: 12px;">
          {$WALLET.publicKey.toString().substring(0, 4)}..
          {$WALLET.publicKey.toString().substring(
            $WALLET.publicKey.toString().length - 4
          )}
        </span>
      </div>
    </div>
  {:else}
    <div class="setting flex align-start justify-center column">
      <span>
        {dictionary[$PREFERRED_LANGUAGE].settings.wallet}
      </span>
      <Button small 
        text={dictionary[$PREFERRED_LANGUAGE].settings.connect} 
        onClick={() => connectWallet = true} 
      />
    </div>
  {/if}
  <div class="divider">
  </div>
    <div class="setting flex align-start justify-center column">
      <span>
        {dictionary[$PREFERRED_LANGUAGE].settings.theme}
      </span>
      <div class="theme-toggle-container flex align-center justify-center">
        <Toggle onClick={() => setDark(!$DARK_THEME)}
          text={$DARK_THEME ? dictionary[$PREFERRED_LANGUAGE].settings.dark : dictionary[$PREFERRED_LANGUAGE].settings.light}
          icon="❂" 
          active={$DARK_THEME} 
        />
      </div>
    </div>
  <div class="divider"></div>
  <div class="setting flex align-start justify-center column">
    <span>
      {dictionary[$PREFERRED_LANGUAGE].settings.language}
    </span>
    {#each Object.keys(dictionary) as lang}
      <div class="language flex align-center justify-center"
        class:active={dictionary[$PREFERRED_LANGUAGE].language === dictionary[lang].language}
        on:click={() => {
          updateLanguage(lang);
        }}>
        <span class:text-gradient={dictionary[$PREFERRED_LANGUAGE].language === dictionary[lang].language}>
          {dictionary[lang].language}
        </span>
      </div>
    {/each} 
  </div>
  <div class="divider">
  </div>
  <div class="socials flex align-center justify-start">
    <a href="https://twitter.com/jetprotocol" target="_blank"><i class="text-gradient fab fa-twitter"></i></a>
    <a href="https://discord.gg/RW2hsqwfej" target="_blank"><i class="text-gradient fab fa-discord"></i></a>
    <a href="https://github.com/jet-lab/jet-v1" target="_blank"><i class="text-gradient fab fa-github"></i></a>
  </div>
</div>
{#if connectWallet && !$ASSETS}
  <ConnectWallet closeable
    closeModal={() => connectWallet = false}
  />
{/if}

<style>
  .wallet {
    margin: var(--spacing-sm);
    cursor: pointer;
  }
  .wallet:active {
    box-shadow: var(--neu-shadow-inset);
  }
  .wallet img {
    margin: 0ar(--spacing-sm);
  }
  .theme-toggle-container {
    width: 110px;
  }
  .language {
    box-shadow: var(--neu-shadow);
    margin: var(--spacing-sm);
    border-radius: var(--border-radius);
    cursor: pointer;
    width: 100px;
  }
  .language span {
    font-size: 12px !important;
  }
  .language:active, .active {
    box-shadow: var(--neu-shadow-inset);
  }
  .socials {
    margin: var(--spacing-sm);
  }
  .divider {
    max-width: 400px;
    margin: var(--spacing-lg) 0;
  }
  span {
    font-weight: 450;
    font-size: 14px;
    opacity: 0.6;
    padding: var(--spacing-sm);
  }
  @media screen and (max-width: 1100px) {
    .setting {
      padding: 0 var(--spacing-md);
    }
  }
</style>