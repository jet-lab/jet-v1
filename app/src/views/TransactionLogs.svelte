<svelte:head>
  <title>Jet Protocol | {dictionary[$PREFERRED_LANGUAGE].transactions.title}</title>
</svelte:head>
<script lang="ts">
  import { Datatable, rows } from 'svelte-simple-datatables';
  import { ASSETS, TRANSACTION_LOGS, PREFERRED_LANGUAGE, WALLET_INIT } from '../store';
  import { getTransactionLogs } from '../scripts/jet'; 
  import { totalAbbrev, shortenPubkey } from '../scripts/utils';
  import { dictionary, definitions } from '../scripts/localization'; 
  import ConnectWallet from '../components/ConnectWallet.svelte';
  import Toggle from '../components/Toggle.svelte';
  import Loader from '../components/Loader.svelte';

  // Datatable Settings
  const tableSettings: any = {
    sortable: false,
    pagination: false,
    scrollY: false,
    blocks: {
      searchInput: false
    }
  };

  // Reactive statement to update data
  // on any account change every 10 seconds
  let updateTime: number = 0;
  $: if ($ASSETS || $TRANSACTION_LOGS) {
    const currentTime = performance.now();
    if (currentTime > updateTime) {
      getTransactionLogs();
      updateTime = currentTime + 10000;
    }
  }
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
  .transaction-logs {
    padding: var(--spacing-lg) 0;
  }
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