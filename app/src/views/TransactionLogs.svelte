<svelte:head>
  <title>Jet Protocol | {dictionary[$PREFERRED_LANGUAGE].transactions.title}</title>
</svelte:head>
<script lang="ts">
  import { onMount } from 'svelte';
  import { Datatable, rows } from 'svelte-simple-datatables';
  import { TRANSACTION_LOGS, PREFERRED_LANGUAGE, WALLET_INIT } from '../store';
  import { getTransactionLogs } from '../scripts/jet'; 
  import { totalAbbrev, shortenPubkey } from '../scripts/utils';
  import { dictionary } from '../scripts/localization';  
  import ConnectWallet from '../components/ConnectWallet.svelte';
  import Loader from '../components/Loader.svelte';

  // Datatable Settings
  const tableSettings: any = {
    sortable: false,
    pagination: true,
    rowPerPage: 10,
    scrollY: false,
    blocks: {
      searchInput: false
    },
    labels: {
      noRows: dictionary[$PREFERRED_LANGUAGE].transactions.noTrades,
      info: dictionary[$PREFERRED_LANGUAGE].transactions.entries,
      previous: '<',
      next: '>'
    }
  };
</script>

<div class="view-container flex justify-center column">
  <h1 class="view-title text-gradient">
    {dictionary[$PREFERRED_LANGUAGE].transactions.title}
  </h1>
  <div class="divider">
  </div>
  {#if $TRANSACTION_LOGS && $WALLET_INIT}
    <div class="transaction-logs flex">
      <Datatable settings={tableSettings} data={$TRANSACTION_LOGS}>
        <thead>
          <th data-key="blockDate">
            {dictionary[$PREFERRED_LANGUAGE].transactions.date} 
          </th>
          <th data-key="signature">
            {dictionary[$PREFERRED_LANGUAGE].transactions.signature} 
          </th>
          <th data-key="tradeAction"
            style="text-align: center !important;">
            {dictionary[$PREFERRED_LANGUAGE].transactions.tradeAction} 
          </th>
          <th data-key="tradeAmount">
            {dictionary[$PREFERRED_LANGUAGE].transactions.tradeAmount} 
          </th>
          <th data-key="">
            <i class="text-gradient fas fa-sync"
              on:click={() => getTransactionLogs()}>
            </i>
          </th>
        </thead>
        <div class="datatable-divider">
        </div>
        <tbody>
          {#if $TRANSACTION_LOGS.length}
            {#each $rows as row, i}
              <tr class="datatable-spacer">
                <td><!-- Extra Row for spacing --></td>
              </tr>
              <tr on:click={() => window.open($rows[i].explorerUrl, '_blank')}>
                <td>
                  {$rows[i].blockDate}
                </td>
                <td style="color: var(--success);">
                  {shortenPubkey($rows[i].signature, 8)}
                </td>
                <td class="reserve-detail"
                  style="text-align: center !important;">
                  {$rows[i].tradeAction}
                </td>
                <td>
                  {totalAbbrev(
                    Math.abs($rows[i].tradeAmount.uiAmountFloat),
                    $rows[i].tokenPrice,
                    true,
                    $rows[i].tokenDecimals
                  )}&nbsp;
                  {$rows[i].tokenAbbrev}
                  </td>
                <td>
                  <i class="text-gradient jet-icons">
                    ➜
                  </i>
                </td>
              </tr>
              <tr class="datatable-spacer">
                <td><!-- Extra Row for spacing --></td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td></td>
              <td>
                {dictionary[$PREFERRED_LANGUAGE].transactions.noTrades} 
              </td>
            </tr>
            {/if}
        </tbody>
      </Datatable>
    </div>
  {:else if !$WALLET_INIT}
    <ConnectWallet />
  {:else}
    <Loader fullview />
  {/if}
</div>

<style>
  .transaction-logs th {
    text-align: left !important;
  }
  .transaction-logs td {
    font-size: 12px !important;
    font-weight: 500 !important;
    text-align: left !important;
  }
  .divider {
    max-width: 400px;
  }

  @media screen and (max-width: 1100px) {
    .transaction-logs {
      display: block;
    }
  }
</style>