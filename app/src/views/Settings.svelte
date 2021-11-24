<svelte:head>
  <title>Jet Protocol | {dictionary[$USER.language].settings.title}</title>
</svelte:head>
<script lang="ts">
  import Select from 'svelte-select';
  import { USER } from '../store';
  import { getIDLAndAnchorAndMarketPubkeys, disconnectWallet, initTransactionLogs } from '../scripts/jet';
  import { setDark, shortenPubkey } from '../scripts/util';
  import { dictionary } from '../scripts/localization';
  import Button from '../components/Button.svelte';
  import Toggle from '../components/Toggle.svelte';
  import Input from '../components/Input.svelte';

  let rpcNodeInput: string | null = null;
  let inputError: string | null = null;

  // Reset connection to default
  const resetRPC = async () => {
    localStorage.removeItem('jetPreferredNode');
    USER.update(user => {
      user.rpcPing = 0;
      return user;
    });
    await getIDLAndAnchorAndMarketPubkeys();
    initTransactionLogs();
  };
  
  // Check RPC input and set localStorage, restart app
  const checkRPC = async () => {
    if (!rpcNodeInput) {
      inputError = dictionary[$USER.language].settings.noUrl;
      return;
    }
    
    localStorage.setItem('jetPreferredNode', rpcNodeInput);
    USER.update(user => {
      user.rpcPing = 0;
      return user;
    });
    await getIDLAndAnchorAndMarketPubkeys();
    initTransactionLogs();
    inputError = null;
    rpcNodeInput = null;
  };
</script>

<div class="view-container flex column">
  <h1 class="view-title text-gradient">
    {dictionary[$USER.language].settings.title}
  </h1>
  <div class="divider">
  </div>
  <div class="settings">
    <div class="setting flex align-start justify-center column">
      <span>
        {dictionary[$USER.language].settings.rpcNode.toUpperCase()}
      </span>
      <div class="flex align-center justify-start"
        style="padding: var(--spacing-xs) 0;">
        <p>
          {$USER.rpcNode ?? dictionary[$USER.language].settings.defaultNode}
        </p>
        {#if $USER.rpcPing}
          <div class="ping-indicator"
            style={$USER.rpcPing < 1000 
              ? 'background: var(--success);' 
                : 'background: var(--failure);'}>
          </div>
          <p style={$USER.rpcPing < 1000 
            ? 'color: var(--success);' 
              : 'color: var(--failure);'}>
            ({$USER.rpcPing}ms)
          </p>
        {/if}
        {#if $USER.rpcNode}
          <p class="reset-rpc bicyclette-bold text-gradient"
            on:click={() => resetRPC()}>
            {dictionary[$USER.language].settings.reset.toUpperCase()}
          </p>
        {/if}
      </div>
      <Input type="text"
        bind:value={rpcNodeInput} 
        placeholder="ex: https://api.devnet.solana.com/"
        submit={checkRPC}
        error={inputError}
      />
    </div>
    <div class="divider"></div>
    <div class="setting flex align-start justify-center column">
      <span>
        {dictionary[$USER.language].settings.wallet.toUpperCase()}
      </span>
      {#if $USER.wallet}
        <div class="wallet flex-centered">
          <img width="28px" height="auto" 
            style="margin-right: var(--spacing-xs);"
            src="img/wallets/{$USER.wallet.name.replace(' ', '_').toLowerCase()}.png"
            alt="{$USER.wallet.name} Logo"
          />
          <p style="margin: 0 var(--spacing-lg) 0 var(--spacing-xs);">
            {shortenPubkey($USER.wallet.publicKey.toString(), 4)}
          </p>
          <Button small secondary
            text={dictionary[$USER.language].settings.disconnect} 
            onClick={() => disconnectWallet()} 
          />
        </div>
      {:else}
        <Button small secondary
          text={dictionary[$USER.language].settings.connect} 
          onClick={() => USER.update(user => {
            user.connectingWallet = true;
            return user;
          })} 
        />
      {/if}
    </div>
    <div class="divider">
    </div>
    <div class="setting flex align-start justify-center column">
      <span>
        {dictionary[$USER.language].settings.theme.toUpperCase()}
      </span>
      <div class="theme-toggle-container flex align-center justify-start">
        <Toggle onClick={() => setDark(!$USER.darkTheme)}
          text={$USER.darkTheme ? dictionary[$USER.language].settings.dark : dictionary[$USER.language].settings.light}
          icon="❂" 
          active={$USER.darkTheme} 
        />
      </div>
    </div>
    <div class="divider"></div>
    <div class="setting flex align-start justify-center column">
      <span>
        {dictionary[$USER.language].language.toUpperCase()}
      </span>
      <div class="dropdown-select">
        <Select items={Object.keys(dictionary).map(k => ({value: k, label: dictionary[k].language}))}
          value={dictionary[$USER.language].language}
          on:select={e => {
            // Fix odd bug where it calls on:select twice
            Object.keys(dictionary).forEach(k => {
              if (k === e.detail.value) {
                localStorage.setItem('jetPreferredLanguage', e.detail.value);
                USER.update(user => {
                  user.language = e.detail.value;
                  return user;
                });
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

  @media screen and (max-width: 600px) {
    .settings {
      width: 100%;
      padding: unset;
      margin: unset;
      box-shadow: unset;
    }
  }
</style>
