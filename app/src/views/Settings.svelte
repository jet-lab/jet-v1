<svelte:head>
  <title>Jet Protocol | {dictionary[$PREFERRED_LANGUAGE].settings.title}</title>
</svelte:head>
<script lang="ts">
  import Select from 'svelte-select';
  import { WALLET, ASSETS, PREFERRED_LANGUAGE, DARK_THEME, PREFERRED_NODE, PING, CONNECT_WALLET } from '../store';
  import { getMarketAndIDL, getTransactionLogs } from '../scripts/jet';
  import { disconnectWallet, setDark, shortenPubkey } from '../scripts/util';
  import { dictionary } from '../scripts/localization';
  import Button from '../components/Button.svelte';
  import Toggle from '../components/Toggle.svelte';

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
    getTransactionLogs();
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
  <div class="settings">
    <div class="setting flex align-start justify-center column">
      <span>
        {dictionary[$PREFERRED_LANGUAGE].settings.rpcNode.toUpperCase()}
      </span>
      <div class="flex align-center justify-start"
        style="padding: var(--spacing-xs) 0;">
        <p>
          {$PREFERRED_NODE ?? dictionary[$PREFERRED_LANGUAGE].settings.defaultNode}
        </p>
        {#if $PING}
          <div class="ping-indicator"
            style={$PING < 1000 
              ? 'background: var(--success);' 
                : 'background: var(--failure);'}>
          </div>
          <p style={$PING < 1000 
            ? 'color: var(--success);' 
              : 'color: var(--failure);'}>
            ({$PING}ms)
          </p>
        {/if}
        {#if $PREFERRED_NODE}
          <p class="reset-rpc bicyclette-bold text-gradient"
            on:click={() => {
              localStorage.removeItem('jetPreferredNode');
              PING.set(0);
              getMarketAndIDL();
              getTransactionLogs();
            }}>
            {dictionary[$PREFERRED_LANGUAGE].settings.reset.toUpperCase()}
          </p>
        {/if}
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
      </div>
    </div>
    <div class="divider"></div>
    <div class="setting flex align-start justify-center column">
      <span>
        {dictionary[$PREFERRED_LANGUAGE].settings.wallet.toUpperCase()}
      </span>
      {#if $WALLET && $ASSETS}
        <div class="wallet flex align-center justify-center">
          <img width="28px" height="auto" 
            style="margin-right: var(--spacing-xs);"
            src={`img/wallets/${$WALLET.name.replace(' ', '_').toLowerCase()}.png`} 
            alt={`${$WALLET.name} Logo`}
          />
          <p style="margin: 0 var(--spacing-lg) 0 var(--spacing-xs);">
            {shortenPubkey($WALLET.publicKey.toString(), 4)}
          </p>
          <Button small secondary
            text={dictionary[$PREFERRED_LANGUAGE].settings.disconnect} 
            onClick={() => disconnectWallet()} 
          />
        </div>
      {:else}
        <Button small secondary
          text={dictionary[$PREFERRED_LANGUAGE].settings.connect} 
          onClick={() => CONNECT_WALLET.set(true)} 
        />
      {/if}
    </div>
    <div class="divider">
    </div>
    <div class="setting flex align-start justify-center column">
      <span>
        {dictionary[$PREFERRED_LANGUAGE].settings.theme.toUpperCase()}
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
        {dictionary[$PREFERRED_LANGUAGE].settings.language.toUpperCase()}
      </span>
      <div class="dropdown-select">
        <Select items={Object.keys(dictionary).map(k => ({value: k, label: dictionary[k].language}))}
          value={dictionary[$PREFERRED_LANGUAGE].language}
          on:select={e => {
            // Fix odd bug where it calls on:select twice
            Object.keys(dictionary).forEach(k => {
              if (k === e.detail.value) {
                PREFERRED_LANGUAGE.set(e.detail.value);
                localStorage.setItem('jetPreferredLanguage', e.detail.value);
              }
            })
          }}
        />
        <i class="fas fa-caret-down"></i>
      </div>
    </div>
    <div class="divider">
    </div>
    <div class="socials flex align-center justify-start">
      <a href="https://twitter.com/jetprotocol" target="_blank"><i class="text-gradient fab fa-twitter"></i></a>
      <a href="https://discord.gg/RW2hsqwfej" target="_blank"><i class="text-gradient fab fa-discord"></i></a>
      <a href="https://github.com/jet-lab/jet-v1" target="_blank"><i class="text-gradient fab fa-github"></i></a>
      <a href="https://www.jetprotocol.io/terms-of-use" target="_blank"><i class="text-gradient fas fa-file-contract"></i></a>
      <a href="https://www.jetprotocol.io/privacy-policy" target="_blank"><i class="text-gradient fas fa-user-secret"></i></a>
    </div>
  </div>
</div>

<style>
  .settings {
    width: 350px;
    padding: var(--spacing-lg);
    margin: var(--spacing-lg) 0;
    box-shadow: var(--neu-shadow);
    border-radius: var(--border-radius);
  }
  .wallet {
    margin: var(--spacing-sm) 0;
    cursor: pointer;
  }
  .wallet img {
    margin: 0 mar(--spacing-xs);
  }
  .theme-toggle-container {
    width: 100px;
  }
  .socials {
    margin: var(--spacing-sm);
  }
  .divider {
    margin: var(--spacing-md) 0;
  }
  .submit-input-btn {
    height: 39px;
    margin-left: -2px;
    background: var(--gradient);
    border-left: none;
    cursor: pointer;
  }
  .submit-input-btn:active {
    opacity: 0.8;
  }
  .submit-input-btn:active i {
    -webkit-background-clip: unset !important;
    -webkit-text-fill-color: unset !important;
  }
  .ping-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50px;
    margin: 0 var(--spacing-xs);
    opacity: var(--disabled-opacity);
  }
  .reset-rpc {
    margin: var(--spacing-xs) 0 0 var(--spacing-sm);
    cursor: pointer;
  }
  input {
    width: 250px;
    padding-left: var(--spacing-lg);
    padding-right: var(--spacing-lg);
    font-size: 13px;
  }
  span {
    font-weight: bold;
    font-size: 10px;
    opacity: var(--disabled-opacity);
    padding: var(--spacing-sm) 0;
  }
  p {
    font-size: 13px;
  }
  i {
    cursor: pointer;
  }

  @media screen and (max-width: 1100px) {
    .settings {
      width: 100%;
      padding: unset;
      margin: unset;
      box-shadow: unset;
    }
  }
</style>