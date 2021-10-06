<svelte:head>
  <title>Jet Protocol | {dictionary[$PREFERRED_LANGUAGE].cockpit.title}</title>
</svelte:head>
<script lang="ts">
  import { Datatable, rows } from 'svelte-simple-datatables';
  import { NATIVE_MINT } from '@solana/spl-token';
  import type { Reserve, Obligation } from '../models/JetTypes';
  import { TRADE_ACTION, MARKET, ASSETS, CURRENT_RESERVE, NATIVE, COPILOT, PREFERRED_LANGUAGE, WALLET_INIT, INIT_FAILED, LIQUIDATION_WARNED } from '../store';
  import { inDevelopment, airdrop, deposit, withdraw, borrow, repay, getTransactionLogs } from '../scripts/jet';
  import { currencyFormatter, totalAbbrev, getObligationData, TokenAmount, Amount } from '../scripts/utils';
  import { generateCopilotSuggestion } from '../scripts/copilot';
  import { dictionary, definitions } from '../scripts/localization'; 
  import { explorerUrl } from '../scripts/programUtil';
  import Loader from '../components/Loader.svelte';
  import ConnectWallet from '../components/ConnectWallet.svelte';
  import ReserveDetail from '../components/ReserveDetail.svelte';
  import Toggle from '../components/Toggle.svelte';
  import InitFailed from '../components/InitFailed.svelte';

  let marketTVL: number = 0;
  let walletBalances: Record<string, TokenAmount> = {};
  let collateralBalances: Record<string, number> = {};
  let loanBalances: Record<string, number> = {};
  let maxBorrowAmounts: Record<string, number> = {};
  let maxWithdrawAmounts: Record<string, number> = {};
  let assetsAreCurrentDeposit: Record<string, boolean> = {};
  let assetsAreCurrentBorrow: Record<string, boolean> = {};
  let obligation: Obligation;
  let adjustedRatio: number;
  let belowMinCRatio: boolean = false;
  let noDeposits: boolean = true;
  let inputAmount: number | null;
  let maxInputValue: number;
  let inputError: string;
  let disabledInput: boolean = true;
  let disabledMessage: string = '';
  let reserveDetail: Reserve | null = null;
  let sendingTrade: boolean = false;
  let showAirdrop: boolean = inDevelopment || window.location.hostname.indexOf('devnet') !== -1;

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
        search: dictionary[$PREFERRED_LANGUAGE].cockpit.search,    
    }
  };

  // If in development, can request airdrop for testing
  const doAirdrop = async (reserve: Reserve): Promise<void> => {
    let amount = TokenAmount.tokens("100", reserve.decimals);
    if(reserve.tokenMintPubkey.equals(NATIVE_MINT)) {
      amount = TokenAmount.tokens("1", reserve.decimals);
    }

    const [ok, txid] = await airdrop(reserve.abbrev, amount.amount);
    if (ok && txid) {
      COPILOT.set({
        alert: {
          good: true,
          header: dictionary[$PREFERRED_LANGUAGE].copilot.alert.success,
          text:  dictionary[$PREFERRED_LANGUAGE].copilot.alert.airdropSuccess
            .replaceAll('{{UI AMOUNT}}', amount.uiAmount)
            .replaceAll('{{RESERVE ABBREV}}', reserve.abbrev)
        }
      });
    } else if (!ok && !txid) {
      COPILOT.set({
        alert: {
          good: false,
          header: dictionary[$PREFERRED_LANGUAGE].copilot.alert.failed,
          text: dictionary[$PREFERRED_LANGUAGE].cockpit.txFailed
        }
      });
    }
  };

  // Change current reserve
  const changeReserve = (reserve: Reserve): void => {
    if (sendingTrade) {
      return;
    }

    inputError = '';
    inputAmount = null;
    CURRENT_RESERVE.set(reserve);
    updateValues();
  };

  // Check if user input should be disabled
  // depending on wallet balance and position
  const checkDisabledInput = (): void => {
    if (!$ASSETS || !$CURRENT_RESERVE) {
      return;
    }

    disabledMessage = '';
    disabledInput = false;
    if ($TRADE_ACTION === 'deposit' && (walletBalances[$CURRENT_RESERVE.abbrev]?.amount.isZero() || assetsAreCurrentBorrow[$CURRENT_RESERVE.abbrev])) {
      disabledInput = true;
      if (walletBalances[$CURRENT_RESERVE.abbrev]?.amount.isZero()) {
        disabledMessage = dictionary[$PREFERRED_LANGUAGE].cockpit.noBalanceForDeposit
          .replaceAll('{{ASSET}}', $CURRENT_RESERVE.abbrev);
      } else if (assetsAreCurrentBorrow[$CURRENT_RESERVE.abbrev]) {
        disabledMessage = dictionary[$PREFERRED_LANGUAGE].cockpit.assetIsCurrentBorrow
          .replaceAll('{{ASSET}}', $CURRENT_RESERVE.abbrev);
      }
    } else if ($TRADE_ACTION === 'withdraw' && (!collateralBalances[$CURRENT_RESERVE.abbrev] || belowMinCRatio)) {
      disabledInput = true;
      if (!collateralBalances[$CURRENT_RESERVE.abbrev]) {
        disabledMessage = disabledMessage = dictionary[$PREFERRED_LANGUAGE].cockpit.noDepositsForWithdraw
          .replaceAll('{{ASSET}}', $CURRENT_RESERVE.abbrev);
      } else {
        disabledMessage = disabledMessage = dictionary[$PREFERRED_LANGUAGE].cockpit.belowMinCRatio;
      }
    } else if ($TRADE_ACTION === 'borrow' && (noDeposits || belowMinCRatio || assetsAreCurrentDeposit[$CURRENT_RESERVE.abbrev] || !$CURRENT_RESERVE.availableLiquidity.uiAmountFloat)) {
      disabledInput = true;
      if (noDeposits) {
        disabledMessage = disabledMessage = dictionary[$PREFERRED_LANGUAGE].cockpit.noDepositsForBorrow;
      } else if (belowMinCRatio) {
        disabledMessage = disabledMessage = dictionary[$PREFERRED_LANGUAGE].cockpit.belowMinCRatio;
      } else if (assetsAreCurrentDeposit[$CURRENT_RESERVE.abbrev]) {
        disabledMessage = disabledMessage = dictionary[$PREFERRED_LANGUAGE].cockpit.assetIsCurrentDeposit
          .replaceAll('{{ASSET}}', $CURRENT_RESERVE.abbrev);
      }
    } else if ($TRADE_ACTION === 'repay' && !loanBalances[$CURRENT_RESERVE.abbrev]) {
      disabledInput = true;
      disabledMessage = disabledMessage = dictionary[$PREFERRED_LANGUAGE].cockpit.noDebtForRepay
          .replaceAll('{{ASSET}}', $CURRENT_RESERVE.abbrev);
    }

    return;
  };

  // Get the maximum value a user can input
  // depending on wallet balance and position
  const getMaxInputValue = (): void => {
    if (!$ASSETS || !$CURRENT_RESERVE) {
      return;
    }

    if ($TRADE_ACTION === 'deposit') {
      maxInputValue = walletBalances[$CURRENT_RESERVE.abbrev]?.uiAmountFloat;
    } else if ($TRADE_ACTION === 'withdraw') {
      maxInputValue = maxWithdrawAmounts[$CURRENT_RESERVE.abbrev];
    } else if ($TRADE_ACTION === 'borrow') {
      maxInputValue = maxBorrowAmounts[$CURRENT_RESERVE.abbrev];
    } else {
      maxInputValue =  loanBalances[$CURRENT_RESERVE.abbrev]
    }

    return;
  };

  // Adjust user input and calculate updated c-ratio if 
  // they were to submit current trade
  const adjustCollateralizationRatio = (): void => {
    if (!$CURRENT_RESERVE || !$ASSETS) {
      return;
    }

    if ($TRADE_ACTION === 'deposit') {
      adjustedRatio = (obligation.depositedValue + ((inputAmount ?? 0) * $CURRENT_RESERVE.price)) / (
          obligation.borrowedValue > 0
            ? obligation.borrowedValue
              : 1
        );
    } else if ($TRADE_ACTION === 'withdraw') {
      adjustedRatio = (obligation.depositedValue - ((inputAmount ?? 0) * $CURRENT_RESERVE.price)) / (
          obligation.borrowedValue > 0 
            ? obligation.borrowedValue
              : 1
        );
    } else if ($TRADE_ACTION === 'borrow') {
      adjustedRatio = obligation.depositedValue / (
          (obligation.borrowedValue + ((inputAmount ?? 0) * $CURRENT_RESERVE.price)) > 0
            ? (obligation.borrowedValue + ((inputAmount ?? 0) * $CURRENT_RESERVE.price))
              : 1
        );
    } else if ($TRADE_ACTION === 'repay') {
      adjustedRatio = obligation.depositedValue / (
          (obligation.borrowedValue - ((inputAmount ?? 0) * $CURRENT_RESERVE.price)) > 0 
            ? (obligation.borrowedValue - ((inputAmount ?? 0) * $CURRENT_RESERVE.price))
             : 1
      );
    }
  };

  // Update all market/user data
  const updateValues = (): void => {
    marketTVL = 0;
    tableData = [];
    for (let r in $MARKET.reserves) {
      // Market data
      marketTVL += $MARKET.reserves[r].marketSize.muln($MARKET.reserves[r].price).uiAmountFloat;
      if ($MARKET.reserves[r]) {
        tableData.push($MARKET.reserves[r]);
      }

      // Position balances
      collateralBalances[r] = $ASSETS?.tokens[r]?.collateralBalance.uiAmountFloat ?? 0;
      loanBalances[r] = $ASSETS?.tokens[r]?.loanBalance.uiAmountFloat ?? 0;

      // Deposit data
     if ($ASSETS) {
        walletBalances[r] = $ASSETS.tokens[r]?.tokenMintPubkey.equals(NATIVE_MINT) 
          ? $ASSETS.sol
          : $ASSETS.tokens[r]?.walletTokenBalance;
      }
      
      // Withdraw data
      maxWithdrawAmounts[r] = obligation?.borrowedValue
        ? (obligation.depositedValue - ($MARKET.minColRatio * obligation.borrowedValue)) / $MARKET.reserves[r].price
          : collateralBalances[r];
      if (maxWithdrawAmounts[r] > collateralBalances[r]) {
        maxWithdrawAmounts[r] = collateralBalances[r];
      }

      // Borrow data
      obligation = getObligationData();
      belowMinCRatio = obligation.depositedValue / obligation.borrowedValue <= $MARKET.minColRatio;
      noDeposits = !obligation.depositedValue;
      assetsAreCurrentDeposit[r] = collateralBalances[r] > 0;
      assetsAreCurrentBorrow[r] = loanBalances[r] > 0;
      maxBorrowAmounts[r] = ((obligation.depositedValue / $MARKET.minColRatio) - obligation.borrowedValue) / $MARKET.reserves[r].price;
      if (maxBorrowAmounts[r] > $MARKET.reserves[r].availableLiquidity.uiAmountFloat) {
        maxBorrowAmounts[r] = $MARKET.reserves[r].availableLiquidity.uiAmountFloat;
      }
    };

    // Set adjusted ratio to current ratio
    if (!adjustedRatio && obligation?.colRatio) {
      adjustedRatio = obligation.colRatio;
    }

    // Check if user's current position shouldn't allow trades
    checkDisabledInput();

    // Get max input value for current trade scenario
    getMaxInputValue();
  };

  // Check scenario and submit trade
  const checkSubmit = () => {
    // If depositing all SOL, inform user about insufficient lamports and reject 
    if ($CURRENT_RESERVE?.abbrev === 'SOL' && inputAmount 
      && (walletBalances[$CURRENT_RESERVE.abbrev]?.uiAmountFloat - 0.02) <= inputAmount) {
      COPILOT.set({
        suggestion: {
          good: false,
          detail: dictionary[$PREFERRED_LANGUAGE].cockpit.insufficientLamports
        }
      });
    // If trade would result in c-ratio below min ratio, inform user and reject
    } else if ((obligation?.borrowedValue || $TRADE_ACTION === 'borrow') && adjustedRatio < $MARKET.minColRatio) {
      if (adjustedRatio < obligation?.colRatio) {
        COPILOT.set({
        suggestion: {
        good: false,
        detail: dictionary[$PREFERRED_LANGUAGE].cockpit.rejectTrade
          .replaceAll('{{NEW-C-RATIO}}', currencyFormatter(adjustedRatio * 100, false, 1))
          .replaceAll('{{JET MIN C-RATIO}}', $MARKET.minColRatio * 100)
        }
      });
    } else {
      // If this trade still results in undercollateralization, inform user
      COPILOT.set({
        suggestion: {
          good: false,
          detail: dictionary[$PREFERRED_LANGUAGE].cockpit.stillUndercollateralized
            .replaceAll('{{NEW-C-RATIO}}', currencyFormatter(adjustedRatio * 100, false, 1))
            .replaceAll('{{JET MIN C-RATIO}}', $MARKET.minColRatio * 100),
          action: {
            text: dictionary[$PREFERRED_LANGUAGE].cockpit.confirm,
            onClick: () => submitTrade()
          }
        }
      });
    }
    // If trade would result in possible undercollateralization, inform user
    } else if ((obligation?.borrowedValue || $TRADE_ACTION === 'borrow') && adjustedRatio <= $MARKET.minColRatio + 0.2 && adjustedRatio >= $MARKET.minColRatio) {
        COPILOT.set({
          suggestion: {
            good: false,
            detail: dictionary[$PREFERRED_LANGUAGE].cockpit.subjectToLiquidation
              .replaceAll('{{NEW-C-RATIO}}', currencyFormatter(adjustedRatio * 100, false, 1)),                        
            action: {
              text: dictionary[$PREFERRED_LANGUAGE].cockpit.confirm,
              onClick: () => submitTrade()
            }
          }
        });
      } else {
        submitTrade();
      }
  };

  // Check user input and submit trade RPC call
  const submitTrade = async (): Promise<void> => {
    sendingTrade = true;
    if (!$CURRENT_RESERVE || !$ASSETS) {
      return;
    }

    if (!inputAmount) {
      inputError = dictionary[$PREFERRED_LANGUAGE].cockpit.noInputAmount;
      inputAmount = null;
      sendingTrade = false;
      return;
    }

    let ok;
    let txid;
    let tradeAmountString = inputAmount.toString();

    if ($TRADE_ACTION === 'deposit') {
      if (TokenAmount.tokens(tradeAmountString, walletBalances[$CURRENT_RESERVE.abbrev]?.decimals).amount.gt(walletBalances[$CURRENT_RESERVE.abbrev]?.amount)) {
        inputError = dictionary[$PREFERRED_LANGUAGE].cockpit.notEnoughAsset
          .replaceAll('{{ASSET}}', $CURRENT_RESERVE.abbrev);
        inputAmount = null;
        sendingTrade = false;
        return;
      }

      inputError = '';
      const depositLamports = TokenAmount.tokens(tradeAmountString, $CURRENT_RESERVE.decimals).amount;
      [ok, txid] = await deposit($CURRENT_RESERVE.abbrev, depositLamports);
    } else if ($TRADE_ACTION === 'withdraw') {
      if (TokenAmount.tokens(tradeAmountString, $CURRENT_RESERVE.decimals).amount.gt($CURRENT_RESERVE.availableLiquidity.amount)) {
        inputAmount = null;
        inputError = dictionary[$PREFERRED_LANGUAGE].cockpit.noLiquidity;
        sendingTrade = false;
        return;
      }

      let collateralBalance = $ASSETS.tokens[$CURRENT_RESERVE.abbrev]?.collateralBalance;
      if (TokenAmount.tokens(tradeAmountString, $CURRENT_RESERVE.decimals).amount.gt(collateralBalance.amount)) {
        inputAmount = null;
        inputError = dictionary[$PREFERRED_LANGUAGE].cockpit.lessFunds;
        sendingTrade = false;
        return;
      }

      inputError = '';
      const withdrawLamports = TokenAmount.tokens(inputAmount.toString(), $CURRENT_RESERVE.decimals).amount;
      const withdrawAmount = inputAmount === collateralBalances[$CURRENT_RESERVE.abbrev] ?
        Amount.depositNotes($ASSETS.tokens[$CURRENT_RESERVE.abbrev].collateralNoteBalance.amount) :
        Amount.tokens(withdrawLamports);
      [ok, txid] = await withdraw($CURRENT_RESERVE.abbrev, withdrawAmount);
    } else if ($TRADE_ACTION === 'borrow') {
      if (TokenAmount.tokens(tradeAmountString, $CURRENT_RESERVE.decimals).amount.gt($CURRENT_RESERVE.availableLiquidity.amount)) {
        inputAmount = null;
        inputError = dictionary[$PREFERRED_LANGUAGE].cockpit.noLiquidity;
        sendingTrade = false;
        return;
      }

       if ((adjustedRatio && Math.ceil((adjustedRatio * 1000) / 1000) < $MARKET.minColRatio) || inputAmount > maxBorrowAmounts[$CURRENT_RESERVE.abbrev]) {
        inputAmount = null;
        inputError = dictionary[$PREFERRED_LANGUAGE].cockpit.belowMinCRatio;
        sendingTrade = false;
        return;
      }

      inputError = '';
      const borrowLamports = TokenAmount.tokens(tradeAmountString, $CURRENT_RESERVE.decimals);
      const borrowAmount = Amount.tokens(borrowLamports.amount);
      [ok, txid] = await borrow($CURRENT_RESERVE.abbrev, borrowAmount);
    } else if ($TRADE_ACTION === 'repay') {
      let loanBalance = $ASSETS.tokens[$CURRENT_RESERVE.abbrev].loanBalance;
      if(!loanBalance) {
        sendingTrade = false;
        return;
      }

      if (TokenAmount.tokens(tradeAmountString, $CURRENT_RESERVE.decimals).amount.gt(loanBalance.amount)) {
        inputAmount = null;
        inputError = dictionary[$PREFERRED_LANGUAGE].cockpit.oweLess;
        sendingTrade = false;
        return;
      }

      inputError = '';
      const repayLamports = TokenAmount.tokens(inputAmount.toString(), $CURRENT_RESERVE.decimals).amount;
      const repayAmount = inputAmount === loanBalances[$CURRENT_RESERVE.abbrev]
        ? Amount.loanNotes($ASSETS.tokens[$CURRENT_RESERVE.abbrev].loanNoteBalance.amount)
        : Amount.tokens(repayLamports);
      [ok, txid] = await repay($CURRENT_RESERVE.abbrev, repayAmount);
    }
    
    if (ok && txid) {
      COPILOT.set({
        alert: {
          good: true,
          header: dictionary[$PREFERRED_LANGUAGE].copilot.alert.success,
          text: dictionary[$PREFERRED_LANGUAGE].cockpit.txSuccess
            .replaceAll('{{TRADE ACTION}}', $TRADE_ACTION)
            .replaceAll('{{AMOUNT AND ASSET}}', `${inputAmount} ${$CURRENT_RESERVE.abbrev}`)
            .replaceAll('{{EXPLORER LINK}}', explorerUrl(txid))
        }
      });
      inputAmount = null;
    } else if (!ok && !txid) {
      COPILOT.set({
        alert: {
          good: false,
          header: dictionary[$PREFERRED_LANGUAGE].copilot.alert.failed,
          text: dictionary[$PREFERRED_LANGUAGE].cockpit.txFailed
        }
      });
      inputAmount = null;
    }

    updateValues();
    adjustCollateralizationRatio();
    getTransactionLogs();
    sendingTrade = false;
    return;
  };

  // Once we've fetched all asset data, update values
  $: if ($WALLET_INIT) {
    updateValues();
  }

  // Reactive statement to update data
  // on any reserve, user account or price change
  // every 3 seconds, on tx call, trade action or reserve change
  let updateTime: number = 0;
  $: if ($MARKET || $ASSETS || $CURRENT_RESERVE || $TRADE_ACTION) {
    const currentTime = performance.now();
    if (currentTime > updateTime) {
      updateValues();
      updateTime = currentTime + 3000;
    }

    // Add search icon to table search input
    if (!document.querySelector('.dt-search i')) {
      const searchIcon = document.createElement('i');
      searchIcon.classList.add('search', 'text-gradient', 'fas', 'fa-search');
      document.querySelector('.dt-search')?.appendChild(searchIcon);
    }

    // Hardcode min c-ratio to 130% for now
    MARKET.update(market => {
      market.minColRatio = 1.3;
      return market;
    });

    // If user is subject to liquidation, warn them once
    if ($WALLET_INIT && !$LIQUIDATION_WARNED && obligation?.borrowedValue && obligation?.colRatio <= $MARKET.minColRatio) {
      generateCopilotSuggestion();
    }
  }
</script>

{#if $MARKET && $CURRENT_RESERVE && !$INIT_FAILED}
  <div class="view-container flex justify-center column">
    <h1 class="view-title text-gradient">
      {dictionary[$PREFERRED_LANGUAGE].cockpit.title}
    </h1>
    <div class="cockpit-top flex align-center justify-between">
      <div class="trade-market-tvl flex align-start justify-center column">
        <div class="divider">
        </div>
        <h2 class="view-subheader">
          {dictionary[$PREFERRED_LANGUAGE].cockpit.totalValueLocked}
        </h2>
        <h1 class="view-header text-gradient">
          {totalAbbrev(marketTVL)} 
        </h1>
      </div>
      <div class="trade-position-snapshot flex align-center justify-center">
        <div class="trade-position-ratio flex align-start justify-center column">
          <div class="flex align-center justify-center">
            <h2 class="view-subheader">
              {dictionary[$PREFERRED_LANGUAGE].cockpit.yourRatio}
            </h2>
            <i class="info far fa-question-circle"
              on:click={() => COPILOT.set({
                definition: definitions[$PREFERRED_LANGUAGE].collateralizationRatio
              })}>
            </i>
          </div>
          <h1 class="view-header"
            style={`margin-bottom: -20px; 
            ${$WALLET_INIT ? (obligation?.borrowedValue && (obligation?.colRatio <= $MARKET.minColRatio) 
              ? 'color: var(--failure);' 
                : 'color: var(--success);') : ''}`}>
            {#if $WALLET_INIT}
              {#if obligation?.borrowedValue && obligation?.colRatio > 10}
                &gt;1000
              {:else if obligation?.borrowedValue && obligation?.colRatio < 10}
                {currencyFormatter(obligation?.colRatio * 100, false, 1)}
              {:else}
                ∞
              {/if}
            {:else}
              --
            {/if}
            {#if obligation?.borrowedValue}
              <span style="color: inherit;">
                %
              </span>
            {/if}
          </h1>
        </div>
        <div class="flex align-center justify-center column">
          <div class="trade-position-value flex align-center justify-center column">
            <h2 class="view-subheader">
              {dictionary[$PREFERRED_LANGUAGE].cockpit.totalDepositedValue}
            </h2>
            <p class={`${$WALLET_INIT ? 'text-gradient' : ''} bicyclette`}>
              {$WALLET_INIT ? totalAbbrev(obligation?.depositedValue ?? 0) : '--'}
            </p>
          </div>
          <div class="trade-position-value flex align-center justify-center column">
            <h2 class="view-subheader">
              {dictionary[$PREFERRED_LANGUAGE].cockpit.totalBorrowedValue}
            </h2>
            <p class={`${$WALLET_INIT ? 'text-gradient' : ''} bicyclette`}>
              {$WALLET_INIT ? totalAbbrev(obligation?.borrowedValue ?? 0) : '--'}
            </p>
          </div>
        </div>
      </div>
    </div>
    <Datatable settings={tableSettings} data={tableData}>
      <thead>
        <th data-key="name">
          {dictionary[$PREFERRED_LANGUAGE].cockpit.asset} 
        </th>
        <th data-key="abbrev"
          class="native-toggle">
          <Toggle onClick={() => NATIVE.set(!$NATIVE)}
            active={!$NATIVE} 
            native 
          />
        </th>
        <th data-key="availableLiquidity">
          {dictionary[$PREFERRED_LANGUAGE].cockpit.availableLiquidity}
        </th>
        <th data-key="depositRate">
          {dictionary[$PREFERRED_LANGUAGE].cockpit.depositRate}
          <i class="info far fa-question-circle"
              on:click={() => COPILOT.set({
                definition: definitions[$PREFERRED_LANGUAGE].depositRate
              })}>
          </i>
        </th>
        <th data-key="borrowRate" class="datatable-border-right">
          {dictionary[$PREFERRED_LANGUAGE].cockpit.borrowRate}
          <i class="info far fa-question-circle"
              on:click={() => COPILOT.set({
                definition: definitions[$PREFERRED_LANGUAGE].borrowRate
              })}>
          </i>
        </th>
        <th data-key="">
          {dictionary[$PREFERRED_LANGUAGE].cockpit.walletBalance}
        </th>
        <th data-key="">
          {dictionary[$PREFERRED_LANGUAGE].cockpit.amountDeposited}
        </th>
        <th data-key="">
          {dictionary[$PREFERRED_LANGUAGE].cockpit.amountBorrowed}
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
          <tr class:active={$CURRENT_RESERVE.abbrev === $rows[i].abbrev}>
            <td class="dt-asset" on:click={() => changeReserve($rows[i])}>
              <img src={`img/cryptos/${$rows[i].abbrev}.png`} 
                alt={`${$rows[i].abbrev} Icon`}
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
              {$rows[i].abbrev} {dictionary[$PREFERRED_LANGUAGE].cockpit.detail}
            </td>
            <td on:click={() => changeReserve($rows[i])}>
              {totalAbbrev(
                $rows[i].availableLiquidity.uiAmountFloat,
                $rows[i].price,
                $NATIVE,
                2
              )}
            </td>
            <td on:click={() => changeReserve($rows[i])}>
              {$rows[i].depositRate ? ($rows[i].depositRate * 100).toFixed(2) : 0}%
            </td>
            <td on:click={() => changeReserve($rows[i])} 
              class="datatable-border-right">
              {$rows[i].borrowRate ? ($rows[i].borrowRate * 100).toFixed(2) : 0}%
            </td>
            <td class:dt-bold={walletBalances[$rows[i].abbrev]?.uiAmountFloat} 
              class:dt-balance={walletBalances[$rows[i].abbrev]?.uiAmountFloat} 
              on:click={() => changeReserve($rows[i])}>
              {#if $WALLET_INIT}
                {#if walletBalances[$rows[i].abbrev]?.uiAmountFloat && walletBalances[$rows[i].abbrev]?.uiAmountFloat < 0.0005}
                  ~0
                {:else}
                  {totalAbbrev(
                    walletBalances[$rows[i].abbrev]?.uiAmountFloat ?? 0,
                    $rows[i].price,
                    $NATIVE,
                    3
                  )}
                {/if}
              {:else}
                  --
              {/if}
            </td>
            <td class:dt-bold={collateralBalances[$rows[i].abbrev]} 
              on:click={() => changeReserve($rows[i])}
              style={collateralBalances[$rows[i].abbrev] ? 
                'color: var(--jet-green) !important;' : ''}>
              {#if $WALLET_INIT}
                {#if collateralBalances[$rows[i].abbrev] && collateralBalances[$rows[i].abbrev] < 0.0005}
                  ~0
                {:else}
                  {totalAbbrev(
                    collateralBalances[$rows[i].abbrev],
                    $rows[i].price,
                    $NATIVE,
                    3
                  )}
                {/if}
              {:else}
                  --
              {/if}
            </td>
            <td class:dt-bold={loanBalances[$rows[i].abbrev]} 
              on:click={() => changeReserve($rows[i])}
              style={loanBalances[$rows[i].abbrev] ? 
              'color: var(--jet-blue) !important;' : ''}>
              {#if $WALLET_INIT}
                {#if loanBalances[$rows[i].abbrev] && loanBalances[$rows[i].abbrev] < 0.0005}
                  ~0
                {:else}
                  {totalAbbrev(
                    loanBalances[$rows[i].abbrev],
                    $rows[i].price,
                    $NATIVE,
                    3
                  )}
                {/if}
              {:else}
                --
              {/if}
            </td>
            <!--Faucet for testing if in development-->
            <!--Replace with inDevelopment for mainnet-->
            {#if showAirdrop}
              <td class="faucet" on:click={() => doAirdrop($rows[i])}>
                <i class="text-gradient fas fa-parachute-box"
                  title={`Airdrop ${$rows[i].abbrev}`}
                  style="margin-right: var(--spacing-lg); font-size: 18px !important;">
                </i>
              </td>
            {:else}
              <td on:click={() => changeReserve($rows[i])}>
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
    <div class="trade-action flex align-center justify-start">
      <div class="trade-action-select-container flex align-center justify-between">
        {#each ['deposit', 'withdraw', 'borrow', 'repay'] as action}
          <div on:click={() => {
              if (sendingTrade) {
                return;
              }

              inputAmount = null;
              inputError = '';
              TRADE_ACTION.set(action);
              updateValues();
            }} 
            class="trade-action-select flex justify-center align-center"
            class:active={$TRADE_ACTION === action}>
            <p class="bicyclette">
              {dictionary[$PREFERRED_LANGUAGE].cockpit[action].toUpperCase()}
            </p>
          </div>
        {/each}
      </div>
      {#if disabledMessage}
        <div class="trade-action-section trade-disabled-message flex align-center justify-center column">
          <span>
            {disabledMessage}
          </span>
        </div>
      {:else}
        <div class="trade-action-section flex align-center justify-center column"
          class:disabled={disabledInput}>
          <span>
            {#if $TRADE_ACTION === 'deposit'}
              {dictionary[$PREFERRED_LANGUAGE].cockpit.walletBalance.toUpperCase()}
            {:else if $TRADE_ACTION === 'withdraw'}
              {dictionary[$PREFERRED_LANGUAGE].cockpit.availableFunds.toUpperCase()}
            {:else if $TRADE_ACTION === 'borrow'}
              {dictionary[$PREFERRED_LANGUAGE].cockpit.maxBorrowAmount.toUpperCase()}
            {:else if $TRADE_ACTION === 'repay'}
              {dictionary[$PREFERRED_LANGUAGE].cockpit.amountOwed.toUpperCase()}
            {/if}
          </span>
          <div class="flex align-center justify-center">
            {#if $WALLET_INIT}
              {#if $TRADE_ACTION === 'deposit'}
                <p>
                  {currencyFormatter(
                    walletBalances[$CURRENT_RESERVE.abbrev]?.uiAmountFloat ?? 0,
                    false,
                    $CURRENT_RESERVE.decimals
                  )} 
                  {$CURRENT_RESERVE.abbrev}
                </p>
              {:else if $TRADE_ACTION === 'withdraw'}
                <p>
                  {currencyFormatter(maxWithdrawAmounts[$CURRENT_RESERVE.abbrev], false, $CURRENT_RESERVE.decimals)} 
                  {$CURRENT_RESERVE.abbrev}
                </p>
              {:else if $TRADE_ACTION === 'borrow'}
                <p>
                  {currencyFormatter(maxBorrowAmounts[$CURRENT_RESERVE.abbrev], false, $CURRENT_RESERVE.decimals)} 
                  {$CURRENT_RESERVE.abbrev}
                </p>
              {:else if $TRADE_ACTION === 'repay'}
                <p>
                  {currencyFormatter(
                    loanBalances[$CURRENT_RESERVE.abbrev],
                    false, 
                    $CURRENT_RESERVE.decimals
                  )} 
                  {$CURRENT_RESERVE.abbrev}
                </p>
              {/if}
            {:else}
              <p>
                --
              </p>
            {/if}
          </div>
        </div>
        <div class="trade-action-section flex align-center justify-center column"
          class:disabled={disabledInput}>
          <span>
            {dictionary[$PREFERRED_LANGUAGE].cockpit.adjustedCollateralization.toUpperCase()}
          </span>
          <p class="bicyclette">
            {#if $WALLET_INIT}
              {#if (obligation?.borrowedValue || ($TRADE_ACTION === 'borrow' && inputAmount)) && adjustedRatio > 10}
                &gt; 1000%
              {:else if (obligation?.borrowedValue || ($TRADE_ACTION === 'borrow' && inputAmount)) && adjustedRatio < 10}
                {currencyFormatter(adjustedRatio * 100, false, 1) + '%'}
              {:else}
                ∞
              {/if}
            {:else}
              --
            {/if}
            <i class="info far fa-question-circle"
              style="position: absolute; color: var(--white); top: 5px; margin-left: 5px;" 
              on:click={() => COPILOT.set({
                definition: definitions[$PREFERRED_LANGUAGE].adjustedCollateralizationRatio
              })}>
            </i>
          </p>
        </div>
      {/if}
      <div class="trade-action-section flex align-center justify-center">
        <div class="max-input"
          class:active={maxInputValue 
            ? inputAmount === maxInputValue
              : false}
          class:disabled={disabledInput}
          on:click={() => {
            if (!disabledInput) {
              inputAmount = maxInputValue;
              adjustCollateralizationRatio();
            }
          }}>
          <span>
            {dictionary[$PREFERRED_LANGUAGE].cockpit.max.toUpperCase()}
          </span>
        </div>
        <div class="submit-input flex align-center justify-center"
          class:active={inputAmount} class:disabled={disabledInput}>
          <input on:keyup={() => adjustCollateralizationRatio()}
            on:keypress={(e) => {
              if (e.key === "Enter"){
                return checkSubmit()
              }
            }}
            on:click={() => inputError = ''}
            bind:value={inputAmount}
            placeholder={inputError ?? ''}
            class={inputError ? 'input-error' : ''}
            type="number" max={maxInputValue}
            disabled={disabledInput} 
          />
          <img src={`img/cryptos/${$CURRENT_RESERVE?.abbrev}.png`} alt={`${$CURRENT_RESERVE?.name} Logo`} />
          <div class="asset-abbrev-usd flex align-end justify-center column">
            <span>
              {$CURRENT_RESERVE?.abbrev}
            </span>
            <span>
              ≈ {currencyFormatter(
                  (inputAmount ?? 0) * $CURRENT_RESERVE.price,
                  true,
                  2
                )}
            </span>
          </div>
        </div>
        <div class="submit-input-btn flex align-center justify-center"
          class:active={sendingTrade}
          class:disabled={disabledInput}
          on:click={() => checkSubmit()}>
          {#if sendingTrade}
            <Loader button />
          {:else}
            <i class="jet-icons"
              title="Submit Trade">
              ➜
            </i>
          {/if}
        </div>
      </div>
    </div>
  </div>
  {#if !$ASSETS}
    <ConnectWallet />
  {:else if reserveDetail}
    <ReserveDetail {reserveDetail}
      {updateValues}
      closeReserveDetail={() => {
        if (reserveDetail?.abbrev !== $CURRENT_RESERVE?.abbrev) {
          inputAmount = null;
        }
        reserveDetail = null;
      }} />
  {/if}
{:else if $INIT_FAILED}
  <InitFailed />
{:else}
  <Loader fullview />
{/if}

<style>
  .cockpit-top {
    flex-wrap: wrap;
    padding: var(--spacing-xs) 0 var(--spacing-lg) 0;
  }
  .trade-market-tvl .divider {
    margin: 0 0 var(--spacing-lg) 0;
  }
  .trade-position-snapshot {
    min-width: 275px;
    border-radius: var(--border-radius);
    box-shadow: var(--neu-shadow-inset-low);
    padding: var(--spacing-sm) var(--spacing-lg);
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
  .trade-action {
    position: relative;
    width: 100%;
    padding-top: calc(var(--spacing-lg) * 1.75);
    border-bottom-left-radius: var(--border-radius);
    border-bottom-right-radius: var(--border-radius);
    box-shadow: var(--neu--datatable-bottom-shadow);
    background: var(--gradient);
    overflow: hidden;
    z-index: 10;
  }
  .trade-action-select-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 11;
  }
  .trade-action-select {
    width: calc(25% - 1px);
    padding: var(--spacing-sm) 0;
    background: rgba(0, 0, 0, 0.15);
    opacity: var(--disabled-opacity);
    cursor: pointer;
  }
  .trade-action-select.active {
    background: unset;
    opacity: 1;
  }
  .trade-action-select p {
    position: relative;
    font-size: 12px;
    letter-spacing: 0.5px;
    line-height: 10px;
    color: var(--white);
  }
  .trade-action-select p::after {
    position: absolute;
    content: '';
    width: 100%;
    height: 0px;
    bottom: -1px;
    left: 0;
    background: var(--white);
    opacity: 0.5;
  }
  .trade-action-select.active p::after {
    height: 1px;
  }
  .trade-action-section {
    position: relative;
    width: calc(25% - (var(--spacing-sm) * 2));
    padding: var(--spacing-lg) var(--spacing-sm);
  }
  .trade-action-section:last-of-type {
    width: calc(50% - (var(--spacing-sm) * 2));
  }
  .trade-action-section p, .trade-action-section span {
    text-align: center;
    color: var(--white);
  }
  .trade-action-section span {
    font-weight: bold;
    font-size: 10px;
    letter-spacing: 0.5px;
  }
  .trade-action-section p {
    font-size: 21px;
  }
  .trade-action-section .max-input {
    font-family: 'Bicyclette';
    padding: 6px var(--spacing-xs);
    margin-right: var(--spacing-sm);
    border: 1px solid var(--white);
    border-radius: 50px;
    cursor: pointer;
  }
  .trade-action-section .max-input:active, .trade-action-section .max-input.active {
    background: var(--white);
    box-shadow: var(--neu-shadow-inset-low);
  }
  .trade-action-section .max-input:active span, .trade-action-section .max-input.active span {
    background-image: var(--gradient) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
  }
  .trade-action-section .max-input.disabled:active, .trade-action-section .max-input.disabled:active span, .trade-action-section .max-input.active.disabled span {
    background: unset !important;
    box-shadow: unset !important;
    background-image: unset !important;
    -webkit-background-clip: unset !important;
    -webkit-text-fill-color: unset !important;
  }

  .trade-disabled-message {
    width: calc(50% - (var(--spacing-sm) * 2))
  }
  .trade-disabled-message span {
    font-weight: 400;
    font-size: 14px;
    padding: var(--spacing-sm);
  }
  
  @media screen and (max-width: 1100px) {
    .cockpit-top {
      flex-direction: column;
      align-items: flex-start;
      padding-top: unset;
    }
    .trade-market-tvl, .trade-position-snapshot {
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
    .trade-action {
      flex-direction: column;
      justify-content: center;
    }
    .trade-action-section {
      width: 100% !important;
      padding: var(--spacing-md) 0;
    }
    .trade-action-section p {
      font-size: 25px;
    }
  }
</style>
