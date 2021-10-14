<svelte:head>
  <title>Jet Protocol | {dictionary[$USER.preferredLanguage].cockpit.title}</title>
</svelte:head>
<script lang="ts">
  import { onMount } from 'svelte';
  import { Datatable, rows } from 'svelte-simple-datatables';
  import RangeSlider from "svelte-range-slider-pips";
  import type { Reserve } from '../models/JetTypes';
  import { INIT_FAILED, MARKET, USER, COPILOT } from '../store';
  import { inDevelopment, deposit, withdraw, borrow, repay, addTransactionLog } from '../scripts/jet';
  import { currencyFormatter, totalAbbrev, addNotification, doAirdrop, TokenAmount, Amount } from '../scripts/util';
  import { checkTradeWarning, generateCopilotSuggestion } from '../scripts/copilot';
  import { dictionary, definitions } from '../scripts/localization'; 
  import Loader from '../components/Loader.svelte';
  import ReserveDetail from '../components/ReserveDetail.svelte';
  import Toggle from '../components/Toggle.svelte';
  import InitFailed from '../components/InitFailed.svelte';
  import ConnectWalletButton from '../components/ConnectWalletButton.svelte';

  let reserveDetail: Reserve | null = null;
  let disabledInput: boolean = true;
  let disabledMessage: string = '';
  let inputAmount: number | null = null;
  let inputError: string;
  let adjustedRatio: number;
  let sendingTrade: boolean = false;

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

  // Check if user input should be disabled
  // depending on wallet balance and position
  const checkDisabledInput = (): void => {
    if (!$USER.assets || !$MARKET.currentReserve) {
      return;
    }

    disabledMessage = '';
    disabledInput = true;
    // Depositing
    if ($USER.tradeAction === 'deposit') {
      // No wallet balance to deposit
      if (!$USER.walletBalance()) {
        disabledMessage = dictionary[$USER.preferredLanguage].cockpit.noBalanceForDeposit
          .replaceAll('{{ASSET}}', $MARKET.currentReserve.abbrev);
      // User has a loan of this asset
      } else if ($USER.assetIsCurrentBorrow()) {
        disabledMessage = dictionary[$USER.preferredLanguage].cockpit.assetIsCurrentBorrow
          .replaceAll('{{ASSET}}', $MARKET.currentReserve.abbrev);
      } else {
        disabledInput = false;
      }
    // Withdrawing
    } else if ($USER.tradeAction === 'withdraw') {
      // No collateral to withdraw
      if (!$USER.collateralBalance()) {
        disabledMessage = disabledMessage = dictionary[$USER.preferredLanguage].cockpit.noDepositsForWithdraw
          .replaceAll('{{ASSET}}', $MARKET.currentReserve.abbrev);
      // User is below minimum c-ratio
      } else if ($USER.belowMinCRatio()) {
        disabledMessage = disabledMessage = dictionary[$USER.preferredLanguage].cockpit.belowMinCRatio();
      } else {
        disabledInput = false;
      }
    // Borrowing
    } else if ($USER.tradeAction === 'borrow') {
      // User has not deposited any collateral
      if ($USER.noDeposits()) {
        disabledMessage = disabledMessage = dictionary[$USER.preferredLanguage].cockpit.noDepositsForBorrow;
      // User is below minimum c-ratio
      } else if ($USER.belowMinCRatio()) {
        disabledMessage = disabledMessage = dictionary[$USER.preferredLanguage].cockpit.belowMinCRatio();
      // User has a deposit of this asset
      } else if ($USER.assetIsCurrentDeposit()) {
        disabledMessage = disabledMessage = dictionary[$USER.preferredLanguage].cockpit.assetIsCurrentDeposit
          .replaceAll('{{ASSET}}', $MARKET.currentReserve.abbrev);
      // No liquidity in market to borrow from
      } else if ($MARKET.currentReserve.availableLiquidity.amount.isZero()) {
        disabledMessage = disabledMessage = dictionary[$USER.preferredLanguage].cockpit.noLiquidity;
      } else {
        disabledInput = false;
      }
    // Repaying
    } else if ($USER.tradeAction === 'repay') {
      // User has no loan balance to repay
      if (!$USER.loanBalance()) {
        disabledMessage = disabledMessage = dictionary[$USER.preferredLanguage].cockpit.noDebtForRepay
          .replaceAll('{{ASSET}}', $MARKET.currentReserve.abbrev);
      } else {
        disabledInput = false;
      }
    }
  };

  // Adjust user input and calculate updated c-ratio if 
  // they were to submit current trade
  const adjustCollateralizationRatio = (): void => {
    if (!$MARKET.currentReserve || !$USER.assets) {
      return;
    }

    // If input is negative, reset to zero
    if ((inputAmount ?? 0) < 0) {
      inputAmount = 0;
    }
    
    // Depositing
    if ($USER.tradeAction === 'deposit') {
      adjustedRatio = ($USER.obligation().depositedValue + (inputAmount ?? 0) * $MARKET.currentReserve.price) / (
        $USER.obligation().borrowedValue > 0
            ? $USER.obligation().borrowedValue
              : 1
        );
    // Withdrawing
    } else if ($USER.tradeAction === 'withdraw') {
      adjustedRatio = ($USER.obligation().depositedValue - (inputAmount ?? 0) * $MARKET.currentReserve.price) / (
        $USER.obligation().borrowedValue > 0 
            ? $USER.obligation().borrowedValue
              : 1
        );
    // Borrowing
    } else if ($USER.tradeAction === 'borrow') {
      adjustedRatio = $USER.obligation().depositedValue / (
        ($USER.obligation().borrowedValue + (inputAmount ?? 0) * $MARKET.currentReserve.price) > 0
            ? ($USER.obligation().borrowedValue + ((inputAmount ?? 0) * $MARKET.currentReserve.price))
              : 1
        );
    // Repaying
    } else if ($USER.tradeAction === 'repay') {
      adjustedRatio = $USER.obligation().depositedValue / (
        ($USER.obligation().borrowedValue - (inputAmount ?? 0) * $MARKET.currentReserve.price) > 0
            ? ($USER.obligation().borrowedValue - (inputAmount ?? 0) * $MARKET.currentReserve.price)
             : 1
      );
    }
  };

  // Adjust interface and input
  const adjustInterface = () => {
    inputAmount = null;
    inputError = '';
    checkDisabledInput();
    adjustCollateralizationRatio();
  };

  // Update input and adjusted ratio on slider change
  const updateSlider = (e: any) => {
    inputAmount = $USER.maxInput() * (e.detail.value / 100);
    adjustCollateralizationRatio();
  };

  // Check user input and for Copilot warning
  // Then submit trade RPC call
  const submitTrade = async (): Promise<void> => {
    if (!$MARKET.currentReserve || !$USER.assets || !inputAmount) {
      return;
    }

    let tradeAction = $USER.tradeAction;
    let tradeAmount = TokenAmount.tokens(inputAmount.toString(), $MARKET.currentReserve.decimals);
    let ok, txid;
    sendingTrade = true;
    // Depositing
    if (tradeAction === 'deposit') {
      // User is depositing more than they have in their wallet
      if (tradeAmount.uiAmountFloat > $USER.walletBalance()) {
        inputError = dictionary[$USER.preferredLanguage].cockpit.notEnoughAsset
          .replaceAll('{{ASSET}}', $MARKET.currentReserve.abbrev);
      // Otherwise, send deposit
      } else {
        const depositAmount = tradeAmount.amount;
        [ok, txid] = await deposit($MARKET.currentReserve.abbrev, depositAmount);
      }
    // Withdrawing
    } else if (tradeAction === 'withdraw') {
      // User is withdrawing more than liquidity in market
      if (tradeAmount.amount.gt($MARKET.currentReserve.availableLiquidity.amount)) {
        inputError = dictionary[$USER.preferredLanguage].cockpit.noLiquidity;
      // User is withdrawing more than they've deposited
      } else if (tradeAmount.uiAmountFloat > $USER.collateralBalance()) {
        inputError = dictionary[$USER.preferredLanguage].cockpit.lessFunds;
      // User is below the minimum c-ratio
      } else if ($USER.obligation() && $USER.obligation().colRatio <= $MARKET.minColRatio) {
        inputError = dictionary[$USER.preferredLanguage].cockpit.belowMinCRatio();
      // Otherwise, send withdraw
      } else {
        // If user is withdrawing all, use collateral notes
        const withdrawAmount = tradeAmount.uiAmountFloat === $USER.collateralBalance()
          ? Amount.depositNotes($USER.assets.tokens[$MARKET.currentReserve.abbrev].collateralNoteBalance.amount)
            : Amount.tokens(tradeAmount.amount);
        [ok, txid] = await withdraw($MARKET.currentReserve.abbrev, withdrawAmount);
      }
    // Borrowing
    } else if (tradeAction === 'borrow') {
      // User is borrowing more than liquidity in market
      if (tradeAmount.amount.gt($MARKET.currentReserve.availableLiquidity.amount)) {
        inputError = dictionary[$USER.preferredLanguage].cockpit.noLiquidity;
      // User is below the minimum c-ratio
      } else if ($USER.obligation() && $USER.obligation().colRatio <= $MARKET.minColRatio) {
        inputError = dictionary[$USER.preferredLanguage].cockpit.belowMinCRatio();
      // Otherwise, send borrow
      } else {
        const borrowAmount = Amount.tokens(tradeAmount.amount);
        [ok, txid] = await borrow($MARKET.currentReserve.abbrev, borrowAmount);
      }
    // Repaying
    } else if (tradeAction === 'repay') {
      // User is repaying more than they owe
      if (tradeAmount.uiAmountFloat > $USER.loanBalance()) {
        inputError = dictionary[$USER.preferredLanguage].cockpit.oweLess;
      // Otherwise, send repay
      } else {
        // If user is repaying all, use loan notes
        const repayAmount = tradeAmount.uiAmountFloat === $USER.loanBalance()
          ? Amount.loanNotes($USER.assets.tokens[$MARKET.currentReserve.abbrev].loanNoteBalance.amount)
            : Amount.tokens(tradeAmount.amount);
        [ok, txid] = await repay($MARKET.currentReserve.abbrev, repayAmount);
      }
    }
    
    // Notify user of successful/unsuccessful trade
    if (ok && txid) {
      addNotification({
        success: true,
        text: dictionary[$USER.preferredLanguage].cockpit.txSuccess
          .replaceAll('{{TRADE ACTION}}', tradeAction)
          .replaceAll('{{AMOUNT AND ASSET}}', `${tradeAmount.uiAmountFloat} ${$MARKET.currentReserve.abbrev}`)
      });
      addTransactionLog(txid);
      adjustInterface();
    } else if (!ok && !txid) {
      addNotification({
        success: false,
        text: dictionary[$USER.preferredLanguage].cockpit.txFailed
      });
    }

    // End trade submit
    sendingTrade = false;
  };

  // Reactive statement to update market
  // data every 3 seconds
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
  // Init input interface on wallet init
  $: if ($USER.walletInit) {
    adjustInterface();
  }
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
        {#key $MARKET.reserves}
          <h1 class="view-header text-gradient">
            {totalAbbrev($MARKET.totalValueLocked())}
          </h1>
        {/key}
      </div>
      <div class="trade-position-snapshot flex align-center justify-center">
        <div class="trade-position-ratio flex align-start justify-center column">
          <div class="flex align-center justify-center">
            <h2 class="view-subheader">
              {dictionary[$USER.preferredLanguage].cockpit.yourRatio}
            </h2>
            <i class="info fas fa-info-circle"
              on:click={() => COPILOT.set({
                definition: definitions[$USER.preferredLanguage].collateralizationRatio
              })}>
            </i>
          </div>
          <h1 class="view-header"
            style={`margin-bottom: -20px; 
            ${$USER.walletInit ? ($USER.obligation().borrowedValue && ($USER.obligation().colRatio <= $MARKET.minColRatio) 
              ? 'color: var(--failure);' 
                : 'color: var(--success);') : ''}`}>
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
        <div class="flex align-center justify-center column">
          <div class="trade-position-value flex align-center justify-center column">
            <h2 class="view-subheader">
              {dictionary[$USER.preferredLanguage].cockpit.totalDepositedValue}
            </h2>
            <p class={`${$USER.wallet ? 'text-gradient' : ''} bicyclette`}>
              {$USER.walletInit ? totalAbbrev($USER.obligation().depositedValue ?? 0) : '--'}
            </p>
          </div>
          <div class="trade-position-value flex align-center justify-center column">
            <h2 class="view-subheader">
              {dictionary[$USER.preferredLanguage].cockpit.totalBorrowedValue}
            </h2>
            <p class={`${$USER.wallet ? 'text-gradient' : ''} bicyclette`}>
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
          <i class="info fas fa-info-circle"
              on:click={() => COPILOT.set({
                definition: definitions[$USER.preferredLanguage].depositRate
              })}>
          </i>
        </th>
        <th data-key="borrowRate" class="datatable-border-right">
          {dictionary[$USER.preferredLanguage].cockpit.borrowRate}
          <i class="info fas fa-info-circle"
              on:click={() => COPILOT.set({
                definition: definitions[$USER.preferredLanguage].borrowRate
              })}>
          </i>
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
              if (!sendingTrade) {
                MARKET.update(market => {
                  market.currentReserve = $rows[i];
                  return market;
                });
                adjustInterface();
              }
            }}>
            <td class="dt-asset">
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
                  title={`Airdrop ${$rows[i].abbrev}`}
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
    <div class="trade-action flex align-center justify-start">
      <div class="trade-action-select-container flex align-center justify-between">
        {#each ['deposit', 'withdraw', 'borrow', 'repay'] as action}
          <div on:click={() => {
              if (!sendingTrade) {
                USER.update(user => {
                  user.tradeAction = action;
                  return user;
                });
                adjustInterface();
              }
            }} 
            class="trade-action-select flex justify-center align-center"
            class:active={$USER.tradeAction === action}>
            <p class="bicyclette">
              {dictionary[$USER.preferredLanguage].cockpit[action]}
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
            {#if $USER.tradeAction === 'deposit'}
              {dictionary[$USER.preferredLanguage].cockpit.walletBalance.toUpperCase()}
            {:else if $USER.tradeAction === 'withdraw'}
              {dictionary[$USER.preferredLanguage].cockpit.availableFunds.toUpperCase()}
            {:else if $USER.tradeAction === 'borrow'}
              {dictionary[$USER.preferredLanguage].cockpit.maxBorrowAmount.toUpperCase()}
            {:else if $USER.tradeAction === 'repay'}
              {dictionary[$USER.preferredLanguage].cockpit.amountOwed.toUpperCase()}
            {/if}
          </span>
          <div class="flex align-center justify-center">
            {#if $USER.walletInit}
              <p>
                {currencyFormatter($USER.maxInput(), false, $MARKET.currentReserve.decimals)} 
                {$MARKET.currentReserve.abbrev}
              </p>
            {:else}
              <p>
                --
              </p>
            {/if}
          </div>
        </div>
        <div class="trade-action-section flex align-center justify-center column"
          class:disabled={disabledInput}>
          <div class="flex align-center justify-center">
            <span>
              {dictionary[$USER.preferredLanguage].cockpit.adjustedCollateralization.toUpperCase()}
            </span>
            <i class="info fas fa-info-circle" 
              style="color: var(--white);"
              on:click={() => COPILOT.set({
                definition: definitions[$USER.preferredLanguage].adjustedCollateralizationRatio
              })}>
            </i>
          </div>
          <p class="bicyclette">
            {#if $USER.walletInit}
              {#if ($USER.obligation().borrowedValue || ($USER.tradeAction === 'borrow' && inputAmount)) && adjustedRatio > 10}
                &gt; 1000%
              {:else if ($USER.obligation().borrowedValue || ($USER.tradeAction === 'borrow' && inputAmount)) && adjustedRatio < 10}
                {currencyFormatter(adjustedRatio * 100, false, 1) + '%'}
              {:else}
                ∞
              {/if}
            {:else}
              --
            {/if}
          </p>
        </div>
      {/if}
      <div class="trade-action-section flex align-center justify-center column">
        <div class="flex align-center justify-center">
          <div class="submit-input flex align-center justify-center"
            class:active={inputAmount} class:disabled={disabledInput}>
            <input on:keyup={() => {
                // If input is negative, reset to zero
                if (inputAmount && inputAmount < 0) {
                  inputAmount = 0;
                }
                adjustCollateralizationRatio();
              }}
              on:keypress={(e) => {
                if (e.key === "Enter" && !disabledInput) {
                  if (!inputAmount) {
                    inputError = dictionary[$USER.preferredLanguage].cockpit.noInputAmount;
                    inputAmount = null;
                    return;
                  }
                  checkTradeWarning(inputAmount, adjustedRatio, submitTrade);
                }
              }}
              on:click={() => inputError = ''}
              bind:value={inputAmount}
              placeholder={inputError ?? ''}
              class={inputError ? 'input-error' : ''}
              type="number" max={$USER.maxInput()}
              disabled={disabledInput} 
            />
            <img src={`img/cryptos/${$MARKET.currentReserve?.abbrev}.png`} alt={`${$MARKET.currentReserve?.name} Logo`} />
            <div class="asset-abbrev-usd flex align-end justify-center column">
              <span>
                {$MARKET.currentReserve?.abbrev}
              </span>
              <span>
                ≈ {currencyFormatter(
                    (inputAmount ?? 0) * $MARKET.currentReserve.price,
                    true,
                    2
                  )}
              </span>
            </div>
          </div>
          <div class="submit-input-btn flex align-center justify-center"
            class:active={sendingTrade}
            class:disabled={disabledInput}
            on:click={() => {
              if (!inputAmount) {
                inputError = dictionary[$USER.preferredLanguage].cockpit.noInputAmount;
                inputAmount = null;
                return;
              }
              checkTradeWarning(inputAmount, adjustedRatio, submitTrade);
            }}>
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
        <RangeSlider pips all="label" range="min"
          values={[inputAmount]}
          min={0} max={100} 
          step={25} suffix="%" 
          disabled={disabledInput}
          springValues={{stiffness: 1, damping: 1}}
          on:change={updateSlider}
        />
      </div>
    </div>
  </div>
  {#if reserveDetail}
    <ReserveDetail {reserveDetail}
      closeModal={() => {
        if (reserveDetail?.abbrev !== $MARKET.currentReserve?.abbrev) {
          inputAmount = null;
        }
        reserveDetail = null;
      }} />
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
    width: 25%;
    border-right: 1px solid var(--white);
    padding: var(--spacing-sm) 0;
    background: rgba(255, 255, 255, 0.2);
    opacity: var(--disabled-opacity);
    cursor: pointer;
  }
  .trade-action-select:last-of-type {
    border-right: unset;
  }
  .trade-action-select.active {
    background: unset;
    opacity: 1;
  }
  .trade-action-select p {
    position: relative;
    font-size: 16px;
    letter-spacing: 0.5px;
    line-height: 17px;
    color: var(--white);
  }
  .trade-action-section {
    position: relative;
    width: calc(25% - (var(--spacing-sm) * 2));
    padding: 0 var(--spacing-sm);
  }
  .trade-action-section:last-of-type {
    padding-top: var(--spacing-lg);
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
  .trade-action-section .max-input:active span, .trade-action-section .max-input.active span {
    background-image: var(--gradient) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
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
    .trade-action {
      padding-top: 55px;
      flex-direction: column;
      justify-content: center;
    }
    .trade-action-select p {
      font-size: 12px;
    }
    .trade-action-section {
      width: 100% !important;
      padding: var(--spacing-xs) 0;
    }
    .trade-action-section:last-of-type {
      padding-bottom: unset;
    }
    .trade-action-section p {
      font-size: 25px;
    }
    .trade-disabled-message span {
      max-width: 200px;
    }
  }
</style>