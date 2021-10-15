<svelte:head>
  <title>Jet Protocol | {dictionary[$USER.preferredLanguage].cockpit.title}</title>
</svelte:head>
<script lang="ts">
  import { onMount } from 'svelte';
  import { Datatable, rows } from 'svelte-simple-datatables';
  import type { Reserve } from '../models/JetTypes';
  import { INIT_FAILED, MARKET, USER } from '../store';
  import { inDevelopment } from '../scripts/jet';
  import { currencyFormatter, totalAbbrev, doAirdrop } from '../scripts/util';
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

  // Datatable settings
  let tableData: Reserve[] = [];
  const tableSettings: any = {
    sortable: false,
    pagination: false,
    scrollY: false,
    blocks: {
      searchInput: true
    },
    labels: {
        search: dictionary[$USER.preferredLanguage].cockpit.search,    
    }
  };

  // Init Cockpit
  onMount(() => {
    // If user is subject to liquidation, warn them once
    if (!$USER.warnedOfLiquidation && $USER.obligation().borrowedValue &&
      $USER.obligation().colRatio <= $MARKET.minColRatio) {
      generateCopilotSuggestion();
    }

    // Add search icon to table search input
    const searchIcon = document.createElement('i');
    searchIcon.classList.add('search', 'text-gradient', 'fas', 'fa-search');
    document.querySelector('.dt-search')?.appendChild(searchIcon);
  });

  // Update market data every 3 seconds
  let updateTime: number = 0;
  $: if ($MARKET.reserves) {
    let currentTime = performance.now()
    if (currentTime > updateTime) {
      updateTime = currentTime + 3000;
      tableData = [];
      for (let r in $MARKET.reserves) {
        if ($MARKET.reserves[r]) {
          tableData.push($MARKET.reserves[r]);
        }
      }
    }
  };
</script>

{#if $MARKET && $MARKET.currentReserve && !$INIT_FAILED}
  <div class="view-container flex justify-center column">
    <h1 class="view-title text-gradient">
      {dictionary[$USER.preferredLanguage].cockpit.title}
    </h1>
    <div class="connect-wallet-btn">
      <ConnectWalletButton />
    </div>
    <div class="cockpit-top flex align-center justify-between">
      <div class="trade-market-tvl flex align-start justify-center column">
        <div class="divider">
        </div>
        <h2 class="view-subheader">
          {dictionary[$USER.preferredLanguage].cockpit.totalValueLocked}
        </h2>
        <h1 class="view-header text-gradient">
          {totalAbbrev($MARKET.totalValueLocked())}
        </h1>
      </div>
      <div class="trade-position-snapshot flex-centered">
        <div class="trade-position-ratio flex align-start justify-center column">
          <div class="flex-centered">
            <h2 class="view-subheader">
              {dictionary[$USER.preferredLanguage].cockpit.yourRatio}
            </h2>
            <Info term="collateralizationRatio" />
          </div>
          <h1 class="view-header"
            style="margin-bottom: -20px; {$USER.walletInit
              ? ($USER.obligation().borrowedValue && ($USER.obligation().colRatio <= $MARKET.minColRatio) 
                ? 'color: var(--failure);' 
                  : 'color: var(--success);')
                : ''}">
            {#if $USER.walletInit}
              {#if $USER.obligation().borrowedValue && $USER.obligation().colRatio > 10}
                &gt;1000
              {:else if $USER.obligation().borrowedValue && $USER.obligation().colRatio < 10}
                {currencyFormatter($USER.obligation().colRatio * 100, false, 1)}
              {:else}
                ∞
              {/if}
            {:else}
              --
            {/if}
            {#if $USER.obligation().borrowedValue}
              <span style="color: inherit; padding-left: 2px;">
                %
              </span>
            {/if}
          </h1>
        </div>
        <div class="flex-centered column">
          <div class="trade-position-value flex-centered column">
            <h2 class="view-subheader">
              {dictionary[$USER.preferredLanguage].cockpit.totalDepositedValue}
            </h2>
            <p class="{$USER.wallet ? 'text-gradient' : ''} bicyclette">
              {$USER.walletInit ? totalAbbrev($USER.obligation().depositedValue ?? 0) : '--'}
            </p>
          </div>
          <div class="trade-position-value flex-centered column">
            <h2 class="view-subheader">
              {dictionary[$USER.preferredLanguage].cockpit.totalBorrowedValue}
            </h2>
            <p class="{$USER.wallet ? 'text-gradient' : ''} bicyclette">
              {$USER.walletInit ? totalAbbrev($USER.obligation().borrowedValue ?? 0) : '--'}
            </p>
          </div>
        </div>
      </div>
    </div>
    <Datatable settings={tableSettings} data={tableData}>
      <thead>
        <th data-key="name">
          {dictionary[$USER.preferredLanguage].cockpit.asset} 
        </th>
        <th data-key="abbrev"
          class="native-toggle">
          <Toggle onClick={() => MARKET.update(market => {
            market.nativeValues = !$MARKET.nativeValues;
            return market;
          })}
            active={!$MARKET.nativeValues} 
            native 
          />
        </th>
        <th data-key="availableLiquidity">
          {dictionary[$USER.preferredLanguage].cockpit.availableLiquidity}
        </th>
        <th data-key="depositRate">
          {dictionary[$USER.preferredLanguage].cockpit.depositRate}
          <Info term="depositRate" />
        </th>
        <th data-key="borrowRate" class="datatable-border-right">
          {dictionary[$USER.preferredLanguage].cockpit.borrowRate}
          <Info term="borrowRate" />
        </th>
        <th data-key="">
          {dictionary[$USER.preferredLanguage].cockpit.walletBalance}
        </th>
        <th data-key="">
          {dictionary[$USER.preferredLanguage].cockpit.amountDeposited}
        </th>
        <th data-key="">
          {dictionary[$USER.preferredLanguage].cockpit.amountBorrowed}
        </th>
        <th data-key="">
          <!--Empty column for arrow-->
        </th>
      </thead>
      <div class="datatable-divider">
      </div>
      <tbody>
        {#each $rows as row, i}
          <tr class="datatable-spacer">
            <td><!-- Extra Row for spacing --></td>
          </tr>
          <tr class:active={$MARKET.currentReserve.abbrev === $rows[i].abbrev}
            on:click={() => {
              MARKET.update(market => {
                market.currentReserve = $rows[i];
                return market;
              });
            }}>
            <td class="dt-asset">
              <img src="img/cryptos/{$rows[i].abbrev}.png" 
                alt="{$rows[i].abbrev} Icon"
              />
              <span>
                {$rows[i].name}
              </span>
              <span>
                ≈ {currencyFormatter($rows[i].price, true, 2)}
              </span>
            </td>
            <td on:click={() => reserveDetail = $rows[i]} 
              class="reserve-detail">
              {$rows[i].abbrev} {dictionary[$USER.preferredLanguage].cockpit.detail}
            </td>
            <td>
              {totalAbbrev(
                $rows[i].availableLiquidity?.uiAmountFloat,
                $rows[i].price,
                $MARKET.nativeValues,
                2
              )}
            </td>
            <td>
              {$rows[i].depositRate ? ($rows[i].depositRate * 100).toFixed(2) : 0}%
            </td>
            <td class="datatable-border-right">
              {$rows[i].borrowRate ? ($rows[i].borrowRate * 100).toFixed(2) : 0}%
            </td>
            <td class:dt-bold={$USER.walletBalance($rows[i])} 
              class:dt-balance={$USER.walletBalance($rows[i])}>
              {#if $USER.walletInit}
                {#if $USER.walletBalance($rows[i]) && $USER.walletBalance($rows[i]) < 0.0005}
                  ~0
                {:else}
                  {totalAbbrev(
                    $USER.walletBalance($rows[i]) ?? 0,
                    $rows[i].price,
                    $MARKET.nativeValues,
                    3
                  )}
                {/if}
              {:else}
                  --
              {/if}
            </td>
            <td class:dt-bold={$USER.collateralBalance($rows[i])}
              style={$USER.collateralBalance($rows[i]) ? 
                'color: var(--jet-green) !important;' : ''}>
              {#if $USER.walletInit}
                {#if $USER.collateralBalance($rows[i]) && $USER.collateralBalance($rows[i]) < 0.0005}
                  ~0
                {:else}
                  {totalAbbrev(
                    $USER.collateralBalance($rows[i]),
                    $rows[i].price,
                    $MARKET.nativeValues,
                    3
                  )}
                {/if}
              {:else}
                  --
              {/if}
            </td>
            <td class:dt-bold={$USER.loanBalance($rows[i])}
              style={$USER.loanBalance($rows[i]) ? 
              'color: var(--jet-blue) !important;' : ''}>
              {#if $USER.walletInit}
                {#if $USER.loanBalance($rows[i]) && $USER.loanBalance($rows[i]) < 0.0005}
                  ~0
                {:else}
                  {totalAbbrev(
                    $USER.loanBalance($rows[i]),
                    $rows[i].price,
                    $MARKET.nativeValues,
                    3
                  )}
                {/if}
              {:else}
                --
              {/if}
            </td>
            <!--Faucet for testing if in development-->
            <!--Replace with inDevelopment for mainnet-->
            {#if inDevelopment}
              <td class="faucet" on:click={() => doAirdrop($rows[i])}>
                <i class="text-gradient fas fa-parachute-box"
                  title="Airdrop {$rows[i].abbrev}"
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
          <tr class="datatable-spacer">
            <td><!-- Extra Row for spacing --></td>
          </tr>
        {/each}
      </tbody>
    </Datatable>
    <TradePanel />
  </div>
  {#if reserveDetail}
    <ReserveDetail {reserveDetail}
      closeModal={() => reserveDetail = null} 
    />
  {/if}
{:else if $INIT_FAILED || $USER.isGeobanned}
  <InitFailed />
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
  
  @media screen and (max-width: 1100px) {
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
    }
    .trade-position-snapshot h1 {
      font-size: 50px;
      line-height: 50px;
    }
    .trade-position-snapshot p {
      font-size: 20px;
      line-height: 20px;
    }
    .trade-position-ratio {
      padding-right: 20px;
    }
  }
</style>