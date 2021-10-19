<svelte:head>
  <title>Jet Protocol | {dictionary[$USER.language].transactions.title}</title>
</svelte:head>
<script lang="ts">
  import { Datatable, rows } from 'svelte-simple-datatables';
  import { USER } from '../store';
  import { totalAbbrev, shortenPubkey } from '../scripts/util';
  import { dictionary } from '../scripts/localization';  
  import Loader from '../components/Loader.svelte';

  // Datatable Settings
  const tableSettings: any = {
    sortable: false,
    pagination: true,
    rowPerPage: 8,
    scrollY: false,
    blocks: {
      searchInput: false
    },
    labels: {
      noRows: dictionary[$USER.language].transactions.noTrades,
      info: dictionary[$USER.language].transactions.entries,
      previous: '<',
      next: '>'
    }
  };
</script>

<div class="view-container flex justify-center column">
  <h1 class="view-title text-gradient">
    {dictionary[$USER.language].transactions.title}
  </h1>
  <div class="divider">
  </div>
  {#if $USER.transactionLogs}
    <div class="transaction-logs flex">
      <Datatable settings={tableSettings} data={$USER.transactionLogs}>
        <thead>
          <th data-key="blockDate">
            {dictionary[$USER.language].transactions.date} 
          </th>
          <th data-key="signature">
            {dictionary[$USER.language].transactions.signature} 
          </th>
          <th data-key="tradeAction"
            style="text-align: center !important;">
            {dictionary[$USER.language].transactions.tradeAction} 
          </th>
          <th data-key="tradeAmount" class="asset">
            {dictionary[$USER.language].transactions.tradeAmount} 
          </th>
          <th>
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
                {shortenPubkey($rows[i].signature, 4)}
              </td>
              <td class="reserve-detail"
                style="text-align: center !important;">
                {$rows[i].tradeAction}
              </td>
              <td class="asset">
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
          {/each}
        </tbody>
      </Datatable>
    </div>
  {:else}
    <Loader fullview />
  {/if}
</div>

<style>
  .transaction-logs {
    width: 100%;
    max-width: 600px;
    padding: var(--spacing-lg);
    margin: var(--spacing-lg) 0;
    box-shadow: var(--neu-shadow);
    border-radius: var(--border-radius);
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
      padding: unset;
      margin: unset;
      box-shadow: unset;
    }
  }
</style>