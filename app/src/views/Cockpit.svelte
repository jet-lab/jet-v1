<svelte:head>
  <title>Jet Protocol | {dictionary[$USER.language].cockpit.title}</title>
</svelte:head>
<script lang="ts">
  import { onMount } from 'svelte';
  import { NATIVE_MINT } from '@solana/spl-token'; 
  import type { Reserve } from '../models/JetTypes';
  import { TxnResponse } from '../models/JetTypes';
  import { INIT_FAILED, MARKET, USER } from '../store';
  import { inDevelopment, airdrop } from '../scripts/jet';
  import { currencyFormatter, totalAbbrev, TokenAmount } from '../scripts/util';;
  import { generateCopilotSuggestion } from '../scripts/copilot';
  import { dictionary } from '../scripts/localization'; 
  import Loader from '../components/Loader.svelte';
  import ReserveDetail from '../components/ReserveDetail.svelte';
  import Toggle from '../components/Toggle.svelte';
  import InitFailed from '../components/InitFailed.svelte';
  import ConnectWalletButton from '../components/ConnectWalletButton.svelte';
  import Info from '../components/Info.svelte';
  import TradePanel from '../components/TradePanel.svelte';

  // Reserve detail controller
  let reserveDetail: Reserve | null = null;
  // Market table reserves filteres
  let filteredReserves: Reserve[] = [];
  // Market filter input
  let searchInput: string = '';

  // Datatable settings
  const tableSettings: any = {
    sortable: false,
    pagination: false,
    scrollY: false,
    blocks: {
      searchInput: true
    },
    labels: {
        search: dictionary[$USER.language].cockpit.search,    
    }
  };

  // If in development, can request airdrop for testing
  const doAirdrop = async (reserve: Reserve): Promise<void> => {
    let amount = TokenAmount.tokens("100", reserve.decimals);
    if(reserve.tokenMintPubkey.equals(NATIVE_MINT)) {
      amount = TokenAmount.tokens("1", reserve.decimals);
    }

    const [res, txid] = await airdrop(reserve.abbrev, amount.amount);
    if (res === TxnResponse.Success) {
      $USER.addNotification({
        success: true,
        text: dictionary[$USER.language].copilot.alert.airdropSuccess
          .replaceAll('{{UI AMOUNT}}', amount.uiAmount)
          .replaceAll('{{RESERVE ABBREV}}', reserve.abbrev)
      });
    } else if (res === TxnResponse.Failed) {
      $USER.addNotification({
        success: false,
        text: dictionary[$USER.language].cockpit.txFailed
      });
    }
  };

  // Init filtered reserves array
  $: if ($MARKET.reservesArray.length && !searchInput.length) {
    filteredReserves = $MARKET.reservesArray;
  }

  // Init Cockpit
  onMount(() => {
    // If user is subject to liquidation, warn them
    if ($USER.position.borrowedValue && $USER.position.colRatio <= $MARKET.minColRatio) {
      generateCopilotSuggestion();
    }
  });
</script>

{#if $INIT_FAILED || $USER.geobanned}
  <InitFailed />
{:else if $MARKET && $USER}
  <div class="view-container flex justify-center column">
    <h1 class="view-title text-gradient">
      {dictionary[$USER.language].cockpit.title}
    </h1>
    <div class="connect-wallet-btn">
      <ConnectWalletButton />
    </div>
    <div class="cockpit-top flex align-center justify-between">
      <div class="trade-market-tvl flex align-start justify-center column">
        <div class="divider">
        </div>
        <h2 class="view-subheader">
          {dictionary[$USER.language].cockpit.totalValueLocked}
        </h2>
        <h1 class="view-header text-gradient">
            {#if $MARKET.marketInit}
              {totalAbbrev($MARKET.totalValueLocked)}
            {:else}
              --
            {/if}
          </h1>
      </div>
      <div class="trade-position-snapshot flex-centered">
        <div class="trade-position-ratio flex align-start justify-center column">
          <div class="flex-centered">
            <h2 class="view-subheader">
              {dictionary[$USER.language].cockpit.yourRatio}
            </h2>
            <Info term="collateralizationRatio" />
          </div>
          {#if $USER.walletInit && $MARKET.marketInit}
            <h1 class="view-header"
            style="margin-bottom: -20px; {$USER.wallet
              ? ($USER.position.borrowedValue && (Math.floor($USER.position.colRatio) <= $MARKET.minColRatio) 
                ? 'color: var(--failure);' 
                  : 'color: var(--success);')
                : ''}">
              {#if $USER.position.borrowedValue && $USER.position.colRatio > 10}
                &gt;1000
              {:else if $USER.position.borrowedValue && $USER.position.colRatio < 10}
                {currencyFormatter($USER.position.colRatio * 100, false, 1)}
              {:else}
                ∞
              {/if}
              {#if $USER.position.borrowedValue}
                <span style="color: inherit; padding-left: 2px;">
                  %
                </span>
              {/if}
            </h1>
          {:else}
            <p>
              --
            </p>
          {/if}
        </div>
        <div class="flex-centered column">
          <div class="trade-position-value flex-centered column">
            <h2 class="view-subheader">
              {dictionary[$USER.language].cockpit.totalDepositedValue}
            </h2>
            {#if $USER.walletInit}
              <p class="bicyclette text-gradient">
                {currencyFormatter($USER.position.depositedValue ?? 0, true)}
              </p>
            {:else}
              <p class="bicyclette">
                --
              </p>
            {/if}
          </div>
          <div class="trade-position-value flex-centered column">
            <h2 class="view-subheader">
              {dictionary[$USER.language].cockpit.totalBorrowedValue}
            </h2>
            {#if $USER.walletInit}
              <p class="bicyclette text-gradient">
                {currencyFormatter($USER.position.borrowedValue ?? 0, true)}
              </p>
            {:else}
              <p class="bicyclette">
                --
              </p>
            {/if}
          </div>
        </div>
      </div>
    </div>
    <TradePanel />
    <div class="market-table">
      <div class="table-search">
        <input type="text" 
          bind:value={searchInput}
          placeholder={dictionary[$USER.language].cockpit.search}
          on:keyup={() => {
            let filtered = [];
            for (let reserve of $MARKET.reservesArray) {
              if (reserve.name.toLowerCase().includes(searchInput) 
                || reserve.abbrev.toLowerCase().includes(searchInput)) {
                  filtered.push(reserve);
              }
            }
            
            filteredReserves = filtered;
          }}
        />
        <i class="text-gradient fas fa-search">
        </i>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>
                {dictionary[$USER.language].cockpit.asset} 
              </th>
              <th class="native-toggle">
                <Toggle onClick={() => MARKET.update(market => {
                  market.nativeValues = !market.nativeValues;
                  return market;
                })}
                  active={!$MARKET.nativeValues} 
                  native 
                />
              </th>
              <th>
                {dictionary[$USER.language].cockpit.availableLiquidity}
              </th>
              <th>
                {dictionary[$USER.language].cockpit.depositRate}
                <Info term="depositRate" />
              </th>
              <th class="datatable-border-right">
                {dictionary[$USER.language].cockpit.borrowRate}
                <Info term="borrowRate" />
              </th>
              <th>
                {dictionary[$USER.language].cockpit.walletBalance}
              </th>
              <th>
                {dictionary[$USER.language].cockpit.amountDeposited}
              </th>
              <th>
                {dictionary[$USER.language].cockpit.amountBorrowed}
              </th>
              <th>
                <!--Empty column for arrow-->
              </th>
            </tr>
          </thead>
          <div class="table-divider">
          </div>
          <tbody>
            {#each filteredReserves as reserve}
              <tr class="table-spacer">
                <td><!-- Extra Row for spacing --></td>
              </tr>
              <tr class:active={$MARKET.currentReserve.abbrev === reserve.abbrev}
                on:click={() => MARKET.update(market => {
                  market.currentReserve = reserve;
                  return market;
                })}>
                <td class="market-table-asset">
                  <img src="img/cryptos/{reserve.abbrev}.png" 
                    alt="{reserve.abbrev} Icon"
                  />
                  <span>
                    {reserve.name}
                  </span>
                  <span>
                    ≈ 
                    {#if $MARKET.marketInit}
                      {currencyFormatter(reserve.price, true, 2)}
                    {:else}
                      --
                    {/if}
                  </span>
                </td>
                <td on:click={() => reserveDetail = reserve} 
                  class="reserve-detail text-gradient">
                  {reserve.abbrev} {dictionary[$USER.language].cockpit.detail}
                </td>
                <td>
                  {#if $MARKET.marketInit}
                    {totalAbbrev(
                      reserve.availableLiquidity.uiAmountFloat,
                      reserve.price,
                      $MARKET.nativeValues,
                      2
                    )}
                  {:else}
                    --
                  {/if}
                </td>
                <td>
                  {#if $MARKET.marketInit}
                    {reserve.depositRate ? (reserve.depositRate * 100).toFixed(2) : 0}%
                  {:else}
                    --%
                  {/if}
                </td>
                <td class="datatable-border-right">
                  {#if $MARKET.marketInit}
                    {reserve.borrowRate ? (reserve.borrowRate * 100).toFixed(2) : 0}%
                  {:else}
                    --%
                  {/if}
                </td>
                <td class:bold-text={$USER.walletBalances[reserve.abbrev]} 
                  class:text-gradient={$USER.walletBalances[reserve.abbrev]}>
                  {#if $USER.walletInit}
                    {#if $USER.walletBalances[reserve.abbrev] > 0
                      && $USER.walletBalances[reserve.abbrev] < 0.0005}
                      ~0
                    {:else}
                      {#if $MARKET.marketInit}
                        {totalAbbrev(
                          $USER.walletBalances[reserve.abbrev] ?? 0,
                          reserve.price,
                          $MARKET.nativeValues,
                          3
                        )}
                      {:else}
                        --
                      {/if}
                    {/if}
                  {:else}
                      --
                  {/if}
                </td>
                <td class:bold-text={$USER.collateralBalances[reserve.abbrev]}
                  style={$USER.collateralBalances[reserve.abbrev] ? 
                    'color: var(--jet-green) !important;' : ''}>
                  {#if $USER.walletInit}
                    {#if $USER.collateralBalances[reserve.abbrev] > 0
                      && $USER.collateralBalances[reserve.abbrev] < 0.0005}
                      ~0
                    {:else}
                      {#if $MARKET.marketInit}
                        {totalAbbrev(
                          $USER.collateralBalances[reserve.abbrev] ?? 0,
                          reserve.price,
                          $MARKET.nativeValues,
                          3
                        )}
                      {:else}
                        --
                      {/if}
                    {/if}
                  {:else}
                      --
                  {/if}
                </td>
                <td class:bold-text={$USER.loanBalances[reserve.abbrev]}
                  style={$USER.loanBalances[reserve.abbrev] ? 
                  'color: var(--jet-blue) !important;' : ''}>
                  {#if $USER.walletInit}
                    {#if $USER.loanBalances[reserve.abbrev] > 0
                      && $USER.loanBalances[reserve.abbrev] < 0.0005}
                      ~0
                    {:else}
                      {#if $MARKET.marketInit}
                        {totalAbbrev(
                          $USER.loanBalances[reserve.abbrev] ?? 0,
                          reserve.price,
                          $MARKET.nativeValues,
                          3
                        )}
                      {:else}
                        --
                      {/if}
                    {/if}
                  {:else}
                    --
                  {/if}
                </td>
                <!--Faucet for testing if in development-->
                <!--Replace with inDevelopment for mainnet-->
                {#if inDevelopment}
                  <td class="faucet" on:click={() => doAirdrop(reserve)}>
                    <i class="text-gradient fas fa-parachute-box"
                      title="Airdrop {reserve.abbrev}"
                      style="margin-right: var(--spacing-lg); font-size: 18px !important;">
                    </i>
                  </td>
                {:else}
                  <td>
                      <i class="text-gradient jet-icons">
                        ➜
                      </i>
                    </td>
                {/if}
              </tr>
              <tr class="table-spacer">
                <td><!-- Extra Row for spacing --></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  {#if reserveDetail}
    <ReserveDetail {reserveDetail}
      closeModal={() => reserveDetail = null} 
    />
  {/if}
{:else}
  <Loader fullview />
{/if}

<style>
  .view-container {
    position: relative;
  }
  .cockpit-top {
    flex-wrap: wrap;
    padding: var(--spacing-xs) 0 var(--spacing-lg) 0;
  }
  .connect-wallet-btn {
    position: absolute;
    top: var(--spacing-md);
    right: var(--spacing-sm);
  }
  .trade-market-tvl .divider {
    margin: 0 0 var(--spacing-lg) 0;
  }
  .trade-position-snapshot {
    min-width: 275px;
    border-radius: var(--border-radius);
    box-shadow: var(--neu-shadow-inset);
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--light-grey);
  }
  .trade-position-snapshot p {
    font-size: 25px;
  }
  .trade-position-ratio {
    padding-right: 50px;
  }
  .trade-position-value {
    padding: var(--spacing-sm) 0;
  }
  
  @media screen and (max-width: 600px) {
    .cockpit-top {
      flex-direction: column;
      align-items: flex-start;
      padding-top: unset;
    }
    .connect-wallet-btn {
      display: none;
    }
    .trade-market-tvl, .trade-position-snapshot {
      min-width: unset;
      margin: var(--spacing-xs) 0;
      padding: var(--spacing-xs) var(--spacing-md);
    }
    .trade-position-snapshot h1 {
      font-size: 40px;
      line-height: 40px;
    }
    .trade-position-snapshot p {
      font-size: 20px;
      line-height: 20px;
    }
    .trade-position-ratio {
      padding-right: 30px;
    }
  }
</style>