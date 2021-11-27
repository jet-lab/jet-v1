<script lang="ts">
  import RangeSlider from "svelte-range-slider-pips";
  import { MARKET, USER } from '../store';
  import { deposit, withdraw, borrow, repay, addTransactionLog } from '../scripts/jet';
  import { currencyFormatter, TokenAmount, Amount } from '../scripts/util';
  import { checkTradeWarning } from '../scripts/copilot';
  import { dictionary } from '../scripts/localization'; 
  import { TxnResponse } from '../models/JetTypes';
  import Input from './Input.svelte';
  import Info from './Info.svelte';

  let inputAmount: number | null = null;
  let maxInput: number = 0;
  let disabledInput: boolean = true;
  let disabledMessage: string = '';
  let inputError: string;
  let adjustedRatio: number;
  let sendingTrade: boolean;

  // Adjust interface
  const adjustInterface = () => {
    inputError = ''
    inputAmount = null;
    checkDisabledInput();
    getMaxInput();
    adjustCollateralizationRatio();
  };

  // Check if user input should be disabled
  // depending on wallet balance and position
  const checkDisabledInput = (): void => {
    // Initially set to true and reset message
    disabledMessage = '';
    disabledInput = true;
    if (!$USER.assets || !$MARKET.currentReserve) {
      return;
    }

    // Depositing
    if ($USER.tradeAction === 'deposit') {
      // No wallet balance to deposit
      if (!$USER.walletBalances[$MARKET.currentReserve.abbrev]) {
        disabledMessage = dictionary[$USER.language].cockpit.noBalanceForDeposit
          .replaceAll('{{ASSET}}', $MARKET.currentReserve.abbrev);
      } else {
        disabledInput = false;
      }
    // Withdrawing
    } else if ($USER.tradeAction === 'withdraw') {
      // No collateral to withdraw
      if (!$USER.collateralBalances[$MARKET.currentReserve.abbrev]) {
        disabledMessage = dictionary[$USER.language].cockpit.noDepositsForWithdraw
          .replaceAll('{{ASSET}}', $MARKET.currentReserve.abbrev);
      // User is below the PROGRAM'S minimum c-ratio (not the frontend buffer)
      } else if ($USER.position.borrowedValue && $USER.position.colRatio <= $MARKET.programMinColRatio) {
        disabledMessage = dictionary[$USER.language].cockpit.belowMinCRatio;
      } else {
        disabledInput = false;
      }
    // Borrowing
    } else if ($USER.tradeAction === 'borrow') {
      // User has not deposited any collateral
      if (!$USER.position.depositedValue) {
        disabledMessage = dictionary[$USER.language].cockpit.noDepositsForBorrow;
      // User is below minimum c-ratio
      } else if ($USER.position.borrowedValue && $USER.position.colRatio <= $MARKET.minColRatio) {
        disabledMessage = dictionary[$USER.language].cockpit.belowMinCRatio;
      // No liquidity in market to borrow from
      } else if ($MARKET.currentReserve.availableLiquidity.amount.isZero()) {
        disabledMessage = dictionary[$USER.language].cockpit.noLiquidity;
      } else {
        disabledInput = false;
      }
    // Repaying
    } else if ($USER.tradeAction === 'repay') {
      // User has no loan balance to repay
      if (!$USER.loanBalances[$MARKET.currentReserve.abbrev]) {
        disabledMessage = dictionary[$USER.language].cockpit.noDebtForRepay
          .replaceAll('{{ASSET}}', $MARKET.currentReserve.abbrev);
      } else {
        disabledInput = false;
      }
    }
  };

  // Get max input for current trade action and reserve
  const getMaxInput = () => {
    let max = 0;
    if ($USER.assets) {
      if ($USER.tradeAction === 'deposit') {
        max = $USER.assets.tokens[$MARKET.currentReserve.abbrev].maxDepositAmount;
      } else if ($USER.tradeAction === 'withdraw') {
        max = $USER.assets.tokens[$MARKET.currentReserve.abbrev].maxWithdrawAmount;
      } else if ($USER.tradeAction === 'borrow') {
        max = $USER.assets.tokens[$MARKET.currentReserve.abbrev].maxBorrowAmount;
      } else if ($USER.tradeAction === 'repay') {
        max = $USER.assets.tokens[$MARKET.currentReserve.abbrev].maxRepayAmount;
      }
    }
    maxInput = max;
  };

  // Adjust user input and calculate updated c-ratio if 
  // they were to submit current trade
  const adjustCollateralizationRatio = (): void => {
    if (!$MARKET.currentReserve || !$USER.assets) {
      return;
    }
    
    // Depositing
    if ($USER.tradeAction === 'deposit') {
      adjustedRatio = ($USER.position.depositedValue + (inputAmount ?? 0) * $MARKET.currentReserve.price) / (
        $USER.position.borrowedValue > 0
            ? $USER.position.borrowedValue
              : 1
        );
    // Withdrawing
    } else if ($USER.tradeAction === 'withdraw') {
      adjustedRatio = ($USER.position.depositedValue - (inputAmount ?? 0) * $MARKET.currentReserve.price) / (
        $USER.position.borrowedValue > 0 
            ? $USER.position.borrowedValue
              : 1
        );
    // Borrowing
    } else if ($USER.tradeAction === 'borrow') {
      adjustedRatio = $USER.position.depositedValue / (
        ($USER.position.borrowedValue + (inputAmount ?? 0) * $MARKET.currentReserve.price) > 0
            ? ($USER.position.borrowedValue + ((inputAmount ?? 0) * $MARKET.currentReserve.price))
              : 1
        );
    // Repaying
    } else if ($USER.tradeAction === 'repay') {
      adjustedRatio = $USER.position.depositedValue / (
        ($USER.position.borrowedValue - (inputAmount ?? 0) * $MARKET.currentReserve.price) > 0
            ? ($USER.position.borrowedValue - (inputAmount ?? 0) * $MARKET.currentReserve.price)
             : 1
      );
    }
  };

  // Update input and adjusted ratio on slider change
  const sliderHandler = (e: any) => {
    inputAmount = maxInput * (e.detail.value / 100);
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
    let res: TxnResponse = TxnResponse.Cancelled;
    let txids: string[] = [];
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
        [res, txids] = await deposit($MARKET.currentReserve.abbrev, depositAmount);
      }
    // Withdrawing
    } else if (tradeAction === 'withdraw') {
      // User is withdrawing more than liquidity in market
      if (tradeAmount.gt($MARKET.currentReserve.availableLiquidity)) {
        inputError = dictionary[$USER.language].cockpit.noLiquidity;
      // User is withdrawing more than they've deposited
      } else if (tradeAmount.uiAmountFloat > $USER.collateralBalances[$MARKET.currentReserve.abbrev]) {
        inputError = dictionary[$USER.language].cockpit.lessFunds;
      // User is below the minimum c-ratio
      } else if ($USER.position.borrowedValue && $USER.position.colRatio <= $MARKET.programMinColRatio) {
        inputError = dictionary[$USER.language].cockpit.belowMinCRatio;
      // Otherwise, send withdraw
      } else {
        // If user is withdrawing all, use collateral notes
        const withdrawAmount = tradeAmount.uiAmountFloat === $USER.collateralBalances[$MARKET.currentReserve.abbrev]
          ? Amount.depositNotes($USER.assets.tokens[$MARKET.currentReserve.abbrev].collateralNoteBalance.amount)
            : Amount.tokens(tradeAmount.amount);
        [res, txids] = await withdraw($MARKET.currentReserve.abbrev, withdrawAmount);
      }
    // Borrowing
    } else if (tradeAction === 'borrow') {
      // User is borrowing more than liquidity in market
      if (tradeAmount.gt($MARKET.currentReserve.availableLiquidity)) {
        inputError = dictionary[$USER.language].cockpit.noLiquidity;
      // User is below the minimum c-ratio
      } else if ($USER.position.borrowedValue && $USER.position.colRatio <= $MARKET.minColRatio) {
        inputError = dictionary[$USER.language].cockpit.belowMinCRatio;
      // Otherwise, send borrow
      } else {
        const borrowAmount = Amount.tokens(tradeAmount.amount);
        [res, txids] = await borrow($MARKET.currentReserve.abbrev, borrowAmount);
      }
    // Repaying
    } else if (tradeAction === 'repay') {
      // User is repaying more than they owe
      if (tradeAmount.uiAmountFloat > $USER.loanBalances[$MARKET.currentReserve.abbrev]) {
        inputError = dictionary[$USER.language].cockpit.oweLess;
      // User input amount is larger than wallet balance
      } else if (tradeAmount.uiAmountFloat > $USER.walletBalances[$MARKET.currentReserve.abbrev]) {
        inputError = dictionary[$USER.language].cockpit.notEnoughAsset
          .replaceAll('{{ASSET}}', $MARKET.currentReserve.abbrev);
      // Otherwise, send repay
      } else {
        // If user is repaying all, use loan notes
        const repayAmount = tradeAmount.uiAmountFloat === $USER.loanBalances[$MARKET.currentReserve.abbrev]
          ? Amount.loanNotes($USER.assets.tokens[$MARKET.currentReserve.abbrev].loanNoteBalance.amount)
            : Amount.tokens(tradeAmount.amount);
        [res, txids] = await repay($MARKET.currentReserve.abbrev, repayAmount);
      }
    }

    // If input error, remove trade amount and return
    if (inputError) {
      inputAmount = null;
      sendingTrade = false;
      return;
    }
    
    // Notify user of successful/unsuccessful trade
    if (res === TxnResponse.Success) {
      $USER.addNotification({
        success: true,
        text: dictionary[$USER.language].cockpit.txSuccess
          .replaceAll('{{TRADE ACTION}}', tradeAction)
          .replaceAll('{{AMOUNT AND ASSET}}', `${tradeAmount.uiAmountFloat} ${$MARKET.currentReserve.abbrev}`)
      });
      const lastTxn = txids[txids.length - 1];
      addTransactionLog(lastTxn);
    } else if (res === TxnResponse.Failed) {
      $USER.addNotification({
        success: false,
        text: dictionary[$USER.language].cockpit.txFailed
      });
    } else if (res === TxnResponse.Cancelled) {
      $USER.addNotification({
        success: false,
        text: dictionary[$USER.language].cockpit.txCancelled
      });
    }

    // Readjust interface
    adjustInterface();
    // End trade submit
    sendingTrade = false;
  };

  // Adjust interface on wallet init
  let walletHasInit = false;
  $: if ($USER.walletInit && !walletHasInit) {
    adjustInterface();
    walletHasInit = true;
  }
  // Readjust interface on current reserve change
  let currentReserve = $MARKET.currentReserve;
  $: if (currentReserve !== $MARKET.currentReserve) {
    adjustInterface();
    currentReserve = $MARKET.currentReserve;
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
              adjustInterface();
            }
          }}
          class="trade-select flex justify-center align-center"
          class:active={$USER.tradeAction === action}>
          <p class="bicyclette-bold text-gradient">
            {dictionary[$USER.language].cockpit[action].toUpperCase()}
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
          {#if $USER.walletInit}
            <p>
              {currencyFormatter(maxInput, false, $MARKET.currentReserve.decimals)} 
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
          {#if $USER.walletInit}
            {#if ($USER.position.borrowedValue || ($USER.tradeAction === 'borrow' && inputAmount)) && adjustedRatio > 10}
              &gt; 1000%
            {:else if ($USER.position.borrowedValue || ($USER.tradeAction === 'borrow' && inputAmount)) && adjustedRatio < 10}
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
        bind:value={inputAmount}
        maxInput={maxInput}
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
          if (!inputAmount || inputAmount <= 0) {
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
        values={[inputAmount ? (inputAmount / maxInput) * 100 : 0]}
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
    border-top-left-radius: var(--border-radius);
    border-top-right-radius: var(--border-radius);
    box-shadow: var(--neu--datatable-top-shadow);
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
    border-right: 2px solid var(--white);
    box-shadow: inset 0px -5px 8px -5px rgba(0, 0, 0, 0.3);
    padding: var(--spacing-sm) 0;
    background: var(--grey);
    cursor: pointer;
  }
  .trade-select:last-of-type {
    border-right: unset;
  }
  .trade-select.active {
    background: unset;
    box-shadow: unset;
  }
  .trade-select p {
    position: relative;
    font-size: 12px;
    letter-spacing: 0.5px;
    line-height: 17px;
    opacity: var(--disabled-opacity) !important;
  }
  .trade-select.active p {
    color: var(--white) !important;
    -webkit-text-fill-color: unset !important;
    opacity: 1 !important;
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

  @media screen and (max-width: 1000px) {
    .trade {
      padding-top: 55px;
      flex-direction: column;
      justify-content: center;
    }
  }
  @media screen and (max-width: 600px) {
    .trade-select p {
      font-size: 9px;
      line-height: 12px;
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