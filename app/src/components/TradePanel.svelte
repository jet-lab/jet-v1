<script lang="ts">
  import RangeSlider from "svelte-range-slider-pips";
  import { MARKET, USER } from '../store';
  import { deposit, withdraw, borrow, repay, addTransactionLog } from '../scripts/jet';
  import { currencyFormatter, TokenAmount, Amount } from '../scripts/util';
  import { checkTradeWarning } from '../scripts/copilot';
  import { dictionary } from '../scripts/localization'; 
  import Input from './Input.svelte';
  import Info from './Info.svelte';

  let inputAmount: number | null = null;
  let disabledInput: boolean = true;
  let disabledMessage: string = '';
  let inputError: string;
  let adjustedRatio: number;
  let sendingTrade: boolean;

  // Check if user input should be disabled
  // depending on wallet balance and position
  const checkDisabledInput = (): void => {
    if (!$USER.assets || !$MARKET.currentReserve) {
      return;
    }

    // Initially set to true and reset message
    disabledMessage = '';
    disabledInput = true;
    // Depositing
    if ($USER.tradeAction === 'deposit') {
      // No wallet balance to deposit
      if (!$USER.walletBalances[$MARKET.currentReserve.abbrev]) {
        disabledMessage = dictionary[$USER.language].cockpit.noBalanceForDeposit
          .replaceAll('{{ASSET}}', $MARKET.currentReserve.abbrev);
      // User has a loan of this asset
      } else if ($USER.loanBalances[$MARKET.currentReserve.abbrev]) {
        disabledMessage = dictionary[$USER.language].cockpit.assetIsCurrentBorrow
          .replaceAll('{{ASSET}}', $MARKET.currentReserve.abbrev);
      } else {
        disabledInput = false;
      }
    // Withdrawing
    } else if ($USER.tradeAction === 'withdraw') {
      // No collateral to withdraw
      if (!$USER.collateralBalances[$MARKET.currentReserve.abbrev]) {
        disabledMessage = disabledMessage = dictionary[$USER.language].cockpit.noDepositsForWithdraw
          .replaceAll('{{ASSET}}', $MARKET.currentReserve.abbrev);
      // User is below minimum c-ratio
      } else if ($USER.belowMinCRatio()) {
        disabledMessage = disabledMessage = dictionary[$USER.language].cockpit.belowMinCRatio();
      } else {
        disabledInput = false;
      }
    // Borrowing
    } else if ($USER.tradeAction === 'borrow') {
      // User has not deposited any collateral
      if ($USER.noDeposits()) {
        disabledMessage = disabledMessage = dictionary[$USER.language].cockpit.noDepositsForBorrow;
      // User is below minimum c-ratio
      } else if ($USER.belowMinCRatio()) {
        disabledMessage = disabledMessage = dictionary[$USER.language].cockpit.belowMinCRatio();
      // User has a deposit of this asset
      } else if ($USER.collateralBalances[$MARKET.currentReserve.abbrev]) {
        disabledMessage = disabledMessage = dictionary[$USER.language].cockpit.assetIsCurrentDeposit
          .replaceAll('{{ASSET}}', $MARKET.currentReserve.abbrev);
      // No liquidity in market to borrow from
      } else if ($MARKET.currentReserve.availableLiquidity.amount.isZero()) {
        disabledMessage = disabledMessage = dictionary[$USER.language].cockpit.noLiquidity;
      } else {
        disabledInput = false;
      }
    // Repaying
    } else if ($USER.tradeAction === 'repay') {
      // User has no loan balance to repay
      if (!$USER.loanBalances[$MARKET.currentReserve.abbrev]) {
        disabledMessage = disabledMessage = dictionary[$USER.language].cockpit.noDebtForRepay
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
    
    // Depositing
    if ($USER.tradeAction === 'deposit') {
      adjustedRatio = ($USER.obligation.depositedValue + (inputAmount ?? 0) * $MARKET.currentReserve.price) / (
        $USER.obligation.borrowedValue > 0
            ? $USER.obligation.borrowedValue
              : 1
        );
    // Withdrawing
    } else if ($USER.tradeAction === 'withdraw') {
      adjustedRatio = ($USER.obligation.depositedValue - (inputAmount ?? 0) * $MARKET.currentReserve.price) / (
        $USER.obligation.borrowedValue > 0 
            ? $USER.obligation.borrowedValue
              : 1
        );
    // Borrowing
    } else if ($USER.tradeAction === 'borrow') {
      adjustedRatio = $USER.obligation.depositedValue / (
        ($USER.obligation.borrowedValue + (inputAmount ?? 0) * $MARKET.currentReserve.price) > 0
            ? ($USER.obligation.borrowedValue + ((inputAmount ?? 0) * $MARKET.currentReserve.price))
              : 1
        );
    // Repaying
    } else if ($USER.tradeAction === 'repay') {
      adjustedRatio = $USER.obligation.depositedValue / (
        ($USER.obligation.borrowedValue - (inputAmount ?? 0) * $MARKET.currentReserve.price) > 0
            ? ($USER.obligation.borrowedValue - (inputAmount ?? 0) * $MARKET.currentReserve.price)
             : 1
      );
    }
  };

  // Update input and adjusted ratio on slider change
  const sliderHandler = (e: any) => {
    if ($USER) {
      inputAmount = $USER.maxInput() * (e.detail.value / 100);
      adjustCollateralizationRatio();
    }
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
      if (tradeAmount.uiAmountFloat > $USER.walletBalances[$MARKET.currentReserve.abbrev]) {
        inputError = dictionary[$USER.language].cockpit.notEnoughAsset
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
        inputError = dictionary[$USER.language].cockpit.noLiquidity;
      // User is withdrawing more than they've deposited
      } else if (tradeAmount.uiAmountFloat > $USER.collateralBalances[$MARKET.currentReserve.abbrev]) {
        inputError = dictionary[$USER.language].cockpit.lessFunds;
      // User is below the minimum c-ratio
      } else if ($USER.obligation && $USER.obligation.colRatio <= $MARKET.minColRatio) {
        inputError = dictionary[$USER.language].cockpit.belowMinCRatio();
      // Otherwise, send withdraw
      } else {
        // If user is withdrawing all, use collateral notes
        const withdrawAmount = tradeAmount.uiAmountFloat === $USER.collateralBalances[$MARKET.currentReserve.abbrev]
          ? Amount.depositNotes($USER.assets.tokens[$MARKET.currentReserve.abbrev].collateralNoteBalance.amount)
            : Amount.tokens(tradeAmount.amount);
        [ok, txid] = await withdraw($MARKET.currentReserve.abbrev, withdrawAmount);
      }
    // Borrowing
    } else if (tradeAction === 'borrow') {
      // User is borrowing more than liquidity in market
      if (tradeAmount.amount.gt($MARKET.currentReserve.availableLiquidity.amount)) {
        inputError = dictionary[$USER.language].cockpit.noLiquidity;
      // User is below the minimum c-ratio
      } else if ($USER.obligation && $USER.obligation.colRatio <= $MARKET.minColRatio) {
        inputError = dictionary[$USER.language].cockpit.belowMinCRatio();
      // Otherwise, send borrow
      } else {
        const borrowAmount = Amount.tokens(tradeAmount.amount);
        [ok, txid] = await borrow($MARKET.currentReserve.abbrev, borrowAmount);
      }
    // Repaying
    } else if (tradeAction === 'repay') {
      // User is repaying more than they owe
      if (tradeAmount.uiAmountFloat > $USER.loanBalances[$MARKET.currentReserve.abbrev]) {
        inputError = dictionary[$USER.language].cockpit.oweLess;
      // Otherwise, send repay
      } else {
        // If user is repaying all, use loan notes
        const repayAmount = tradeAmount.uiAmountFloat === $USER.loanBalances[$MARKET.currentReserve.abbrev]
          ? Amount.loanNotes($USER.assets.tokens[$MARKET.currentReserve.abbrev].loanNoteBalance.amount)
            : Amount.tokens(tradeAmount.amount);
        [ok, txid] = await repay($MARKET.currentReserve.abbrev, repayAmount);
      }
    }
    
    // Notify user of successful/unsuccessful trade
    if (ok && txid) {
      $USER.addNotification({
        success: true,
        text: dictionary[$USER.language].cockpit.txSuccess
          .replaceAll('{{TRADE ACTION}}', tradeAction)
          .replaceAll('{{AMOUNT AND ASSET}}', `${tradeAmount.uiAmountFloat} ${$MARKET.currentReserve.abbrev}`)
      });
      addTransactionLog(txid);
      inputAmount = null;
      inputError = '';
      checkDisabledInput();
    } else if (!ok && !txid) {
      $USER.addNotification({
        success: false,
        text: dictionary[$USER.language].cockpit.txFailed
      });
    }

    // End trade submit
    sendingTrade = false;
  };

  // Adjust interface on wallet init and
  // reserve / trade action change
  $: if ($USER.wallet || $USER.tradeAction) {
    inputAmount = null;
    inputError = '';
    checkDisabledInput();
    adjustCollateralizationRatio();
    console.log($USER);
  }
</script>

{#if $MARKET}
  <div class="trade flex align-center justify-start">
    <div class="trade-select-container flex align-center justify-between">
      {#each ['deposit', 'withdraw', 'borrow', 'repay'] as action}
        <div on:click={() => {
            if (!sendingTrade) {
              USER.update(user => {
                user.tradeAction = action;
                return user;
              });
            }
          }}
          class="trade-select flex justify-center align-center"
          class:active={$USER.tradeAction === action}>
          <p class="bicyclette">
            {dictionary[$USER.language].cockpit[action]}
          </p>
        </div>
      {/each}
    </div>
    {#if disabledMessage}
      <div class="trade-section trade-disabled-message flex-centered column">
        <span>
          {disabledMessage}
        </span>
      </div>
    {:else}
      <div class="trade-section flex-centered column"
        class:disabled={disabledInput}>
        <span>
          {#if $USER.tradeAction === 'deposit'}
            {dictionary[$USER.language].cockpit.walletBalance.toUpperCase()}
          {:else if $USER.tradeAction === 'withdraw'}
            {dictionary[$USER.language].cockpit.availableFunds.toUpperCase()}
          {:else if $USER.tradeAction === 'borrow'}
            {dictionary[$USER.language].cockpit.maxBorrowAmount.toUpperCase()}
          {:else if $USER.tradeAction === 'repay'}
            {dictionary[$USER.language].cockpit.amountOwed.toUpperCase()}
          {/if}
        </span>
        <div class="flex-centered">
          {#if $USER.wallet}
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
      <div class="trade-section flex-centered column"
        class:disabled={disabledInput}>
        <div class="flex-centered">
          <span>
            {dictionary[$USER.language].cockpit.adjustedCollateralization.toUpperCase()}
          </span>
          <Info term="adjustedCollateralizationRatio" 
            style="color: var(--white); font-size: 9px;" 
          />
        </div>
        <p class="bicyclette">
          {#if $USER.wallet}
            {#if ($USER.obligation.borrowedValue || ($USER.tradeAction === 'borrow' && inputAmount)) && adjustedRatio > 10}
              &gt; 1000%
            {:else if ($USER.obligation.borrowedValue || ($USER.tradeAction === 'borrow' && inputAmount)) && adjustedRatio < 10}
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
    <div class="trade-section flex-centered column">
      <Input type="number" currency
        value={inputAmount}
        maxInput={$USER.maxInput()}
        disabled={disabledInput}
        error={inputError}
        loading={sendingTrade}
        keyUp={() => {
          // If input is negative, reset to zero
          if (inputAmount && inputAmount < 0) {
            inputAmount = 0;
          }
          adjustCollateralizationRatio();
        }}
        submit={() => {
          // Check for no input
          if (!inputAmount) {
            inputError = dictionary[$USER.language].cockpit.noInputAmount;
            inputAmount = null;
            return;
          }
          // Call for Copilot to check for warnings
          // if there are none, Copilot will call
          checkTradeWarning(inputAmount, adjustedRatio, submitTrade);
        }}
      />
      <RangeSlider pips all="label" range="min"
        values={[inputAmount]}
        min={0} max={100} 
        step={25} suffix="%" 
        disabled={disabledInput}
        springValues={{stiffness: 0.4, damping: 1}}
        on:change={sliderHandler}
      />
    </div>
  </div>
{/if}

<style>
  .trade {
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
  .trade-select-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 11;
  }
  .trade-select {
    width: 25%;
    border-right: 1px solid var(--white);
    padding: var(--spacing-sm) 0;
    background: rgba(255, 255, 255, 0.2);
    opacity: var(--disabled-opacity);
    cursor: pointer;
  }
  .trade-select:last-of-type {
    border-right: unset;
  }
  .trade-select.active {
    background: unset;
    opacity: 1;
  }
  .trade-select p {
    position: relative;
    font-size: 16px;
    letter-spacing: 0.5px;
    line-height: 17px;
    color: var(--white);
  }
  .trade-section {
    position: relative;
    width: calc(25% - (var(--spacing-sm) * 2));
    padding: 0 var(--spacing-sm);
  }
  .trade-section:last-of-type {
    padding-top: var(--spacing-lg);
  }
  .trade-section:last-of-type {
    width: calc(50% - (var(--spacing-sm) * 2));
  }
  .trade-section p, .trade-section span {
    text-align: center;
    color: var(--white);
  }
  .trade-section span {
    font-weight: bold;
    font-size: 10px;
    letter-spacing: 0.5px;
  }
  .trade-section p {
    font-size: 21px;
  }
  .trade-section .max-input:active span, .trade-section .max-input.active span {
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
    .trade {
      padding-top: 55px;
      flex-direction: column;
      justify-content: center;
    }
    .trade-select p {
      font-size: 12px;
    }
    .trade-section {
      width: 100% !important;
      padding: var(--spacing-xs) 0;
    }
    .trade-section:last-of-type {
      padding-bottom: unset;
    }
    .trade-section p {
      font-size: 25px;
    }
    .trade-disabled-message span {
      max-width: 200px;
    }
  }
</style>