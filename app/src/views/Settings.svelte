<svelte:head>
  <title>Jet Protocol | {dictionary[$PREFERRED_LANGUAGE].settings.title}</title>
</svelte:head>
<script lang="ts">
  import { WALLET, ASSETS, PREFERRED_LANGUAGE, DARK_THEME, PREFERRED_NODE, PING } from '../store';
  import { getMarketAndIDL } from '../scripts/jet';
  import { disconnectWallet, setDark } from '../scripts/utils';
  import { dictionary, updateLanguage } from '../scripts/localization';
  import Button from '../components/Button.svelte';
  import Toggle from '../components/Toggle.svelte';
  import ConnectWallet from '../components/ConnectWallet.svelte';

  let connectWallet: boolean = false;
  let rpcNodeInput: string | null = null;
  let inputError: string | null = null;
  
  // Check RPC input and set localStorage, restart app
  const checkRPC = async () => {
    if (!rpcNodeInput) {
      inputError = dictionary[$PREFERRED_LANGUAGE].settings.noUrl;
      return;
    }
    
    localStorage.setItem('jetPreferredNode', rpcNodeInput);
    PING.set(0);
    getMarketAndIDL();
    inputError = null;
    rpcNodeInput = null;
  };
</script>

<div class="view-container flex column">
  <h1 class="view-title text-gradient">
    {dictionary[$PREFERRED_LANGUAGE].settings.title}
  </h1>
  <div class="divider">
  </div>
  <div class="setting flex align-start justify-center column">
    <span>
      {dictionary[$PREFERRED_LANGUAGE].settings.rpcNode}
    </span>
    <div class="flex align-center justify-start"
      style="padding: var(--spacing-xs) 0;">
      <div class="flex align-center justify-start">
        <span style="font-size: 12px; padding: unset;">
          {dictionary[$PREFERRED_LANGUAGE].settings.current}:&nbsp;
        </span>
      </div>
      <div class="flex align-center justify-start">
        <p style="font-weight: bold;">
          {$PREFERRED_NODE ?? dictionary[$PREFERRED_LANGUAGE].settings.defaultNode}
        </p>
        {#if $PING}
          <div class="ping-indicator"
            style={$PING < 1000 ? 'background: var(--success);' : 'background: var(--failure);'}>
          </div>
          <p style={$PING < 1000 ? 'color: var(--success);' : 'color: var(--failure);'}>
            ({$PING}ms)
          </p>
        {/if}
      </div>
    </div>
    <div class="submit-input flex align-center justify-center">
      <input
        bind:value={rpcNodeInput}
        placeholder={inputError ?? 'ex: https://api.devnet.solana.com/'}
        class={inputError ? 'input-error' : ''}
        class:active={rpcNodeInput}
        type="text"
        on:keypress={(e) => {
          if (e.code === 'Enter') {
            checkRPC();
          }
        }}
        on:click={() => {
          inputError = null;
        }}
      />
      <div class="submit-input-btn flex align-center justify-center"
        on:click={() => checkRPC()}>
        <i class="jet-icons"
          title="Save">
          ➜
        </i>
      </div>
      {#if $PREFERRED_NODE}
        <Button small
          text={dictionary[$PREFERRED_LANGUAGE].settings.reset}
          onClick={() => {
            localStorage.removeItem('jetPreferredNode');
            PING.set(0);
            getMarketAndIDL();
          }} />
      {/if}
    </div>
  </div>
  <div class="divider"></div>
  {#if $ASSETS}
    <div class="setting flex align-start justify-center column">
      <span>
        {dictionary[$PREFERRED_LANGUAGE].settings.wallet}
      </span>
      <div class="wallet flex align-center justify-center"
        on:click={() => disconnectWallet()}>
        <img width="28px" height="auto" 
          style="margin-right: var(--spacing-xs);"
          src={`img/wallets/${$WALLET.name.replace(' ', '_').toLowerCase()}.png`} 
          alt={`${$WALLET.name} Logo`}
        />
        <span class="text-gradient"
          style="font-size: 12px;">
          {$WALLET.publicKey.toString().substring(0, 4)}...{$WALLET.publicKey.toString().substring(
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
    <div class="theme-toggle-container flex align-center justify-start">
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
    margin: var(--spacing-sm) 0;
    cursor: pointer;
  }
  .wallet img {
    margin: 0 mar(--spacing-xs);
  }
  .theme-toggle-container {
    width: 110px;
  }
  .language {
    box-shadow: var(--neu-shadow);
    margin: var(--spacing-sm) 0;
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
    margin: var(--spacing-md) 0;
  }
  .submit-input-btn {
    height: 27px;
    margin: 0 var(--spacing-sm) 0 -5px;
    background: var(--gradient);
    border-left: none;
    border-top-right-radius: var(--btn-radius);
    border-bottom-right-radius: var(--btn-radius);
    padding: 0 var(--spacing-md);
    cursor: pointer;
  }
  .submit-input-btn:active i {
    -webkit-background-clip: unset !important;
    -webkit-text-fill-color: unset !important;
  }
  .submit-input-btn i {
    font-size: 16px;
  }
  .ping-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50px;
    margin: 0 var(--spacing-xs);
    opacity: var(--disabled-opacity);
  }
  input {
    padding: var(--spacing-sm) var(--spacing-md);
    width: 150px;
    font-size: 10px;
  }
  span {
    font-weight: 450;
    font-size: 14px;
    opacity: var(--disabled-opacity);
    padding: var(--spacing-sm) 0;
  }
  i {
    cursor: pointer;
  }
  p {
    font-size: 12px;
    opacity: 0.7;
  }
  @media screen and (max-width: 1100px) {
    .setting {
      padding: 0 var(--spacing-md);
    }
  }
</style>