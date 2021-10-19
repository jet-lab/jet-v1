<svelte:head>
  <title>Jet Protocol | {dictionary[$PREFERRED_LANGUAGE].transactions.title}</title>
</svelte:head>
<script lang="ts">
  import { Datatable, rows, PaginationButtons, PaginationRowCount } from 'svelte-simple-datatables';
  import { TRANSACTION_LOGS, PREFERRED_LANGUAGE, TxnsHistoryLoading, CountOfSigsAndHistoricTxns, SignaturesFromAddress } from '../store';
  import type { TransactionLog } from '../models/JetTypes' 
  import { getTransactionLogs, getMoreJetTxnsDetails } from '../scripts/jet'; 
  import { totalAbbrev, shortenPubkey } from '../scripts/util';
  import { dictionary } from '../scripts/localization';  
  import Loader from '../components/Loader.svelte';
  import { onMount } from 'svelte';
  import Button from '../components/Button.svelte';

  let transactionLogs: TransactionLog[];
  $: pageCount = Math.ceil(transactionLogs.length / 8);
  let currentPage: number = 1; 
  $: txnLogsToShow = sliceData(currentPage, transactionLogs);


  const sliceData = (page: number, txns: TransactionLog[]) => {
    const p = page - 1
    return txns.slice(p, p + 8)
  }

  const handleMore = async () => {
    if(currentPage < pageCount) {  
      currentPage += 1;
    } else {
      getMoreJetTxnsDetails(8, true)
      .then(() => {
        if (currentPage < pageCount) {
          currentPage += 1;
        }
      })
    }
  }

  const handlePrevious = () => {
    if(currentPage > 1) {
      currentPage -= 1;
    }
  }

  TRANSACTION_LOGS.subscribe((data) => {
    transactionLogs = data;
  })


  // Datatable Settings
  const tableSettings: any = {
    sortable: false,
    pagination: true,
    rowPerPage: 8,
    scrollY: false,
    blocks: {
      searchInput: false,
      paginationButtons: false,
      paginationRowCount: false,
    },
    labels: {
      noRows: dictionary[$PREFERRED_LANGUAGE].transactions.noTrades,
      info: dictionary[$PREFERRED_LANGUAGE].transactions.entries,
      previous: 'previous',
      next: 'next',
      
    }
  };
  
  onMount(() => {
    //sneak in 8 more txns
    getMoreJetTxnsDetails(8, false);
  })
</script>
<br/>
<div class="view-container flex justify-center column">
  <h1 class="view-title text-gradient">
    {dictionary[$PREFERRED_LANGUAGE].transactions.title}
  </h1>
  <div class="divider"></div>
  {#if !$TxnsHistoryLoading}
    <div class="logs-buttons-container">
      <div class="transaction-logs flex column">
        <Datatable settings={tableSettings} data={txnLogsToShow}>
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
            <th data-key="tradeAmount" class="asset">
              {dictionary[$PREFERRED_LANGUAGE].transactions.tradeAmount} 
            </th>
            <th>
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
      <div class="txn-logs-ops flex column align-center">
        <p class="page-nums">
          {`Showing ${currentPage} of ${pageCount} pages`}
        </p>
        <div class="flex" id="txn-logs-buttons">
          <div class="logs-buttons">
            <Button text={'Previous'} onClick={handlePrevious}/>
          </div>
          <div class="logs-buttons">
            <Button text={'More'} onClick={handleMore} />
          </div>
        </div>   
      </div>
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
  .refresh-logs {
    color: var(--jet-blue);
    cursor: pointer;
  }
  .logs-buttons-container {
    display: inline-block;
  }
  .txn-logs-ops {
    width: 100%;
    max-width: 600px;
    padding: var(--spacing-lg);
    margin: var(--spacing-lg) 0;
  }

  @media screen and (max-width: 1100px) {
    .transaction-logs {
      display: block;
      padding: unset;
      margin: unset;
      box-shadow: unset;
    }
    .txn-logs-ops {
      display: block;
      padding: unset;
      margin: unset;
    }
  }
  .logs-buttons {
    margin: 5px;
  }
  .page-nums {
    margin: 5px;
  }
  

</style>