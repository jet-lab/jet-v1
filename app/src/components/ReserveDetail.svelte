<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import type { Reserve } from '../models/JetTypes';
  import { CONNECT_WALLET, WALLET, COPILOT, CURRENT_RESERVE, PREFERRED_LANGUAGE, NATIVE} from '../store';
  import { currencyFormatter, } from '../scripts/util';
  import { dictionary, definitions } from '../scripts/localization';
  import Button from './Button.svelte';
  import PercentageChart from './PercentageChart.svelte';
  import Toggle from './Toggle.svelte';

  export let reserveDetail: Reserve;
  export let updateValues: Function;
  export let closeModal: Function;

  onMount(() => {
    document.addEventListener('keypress', (e) => {
      if (e.code === 'Escape' || e.code === 'Enter') {
        closeModal();
      }
    });
  });
</script>

{#if reserveDetail}
  <div class="modal-bg flex align-center justify-center"
    transition:fade={{duration: 50}}
    on:click={() => closeModal()}>
  </div>
  <div class="reserve-detail modal flex align-center justify-center column"
    in:fly={{y: 50, duration: 500}}
    out:fade={{duration: 50}}>
    <div class="modal-section flex align-center justify-center column">
      <div class="flex align-center-justify-center">
        <img src={`img/cryptos/${reserveDetail.abbrev}.png`} 
          alt={`${reserveDetail.abbrev} Logo`}
        />
        <h1 class="modal-header">
          {reserveDetail.name.toUpperCase()}
        </h1>
      </div>
      <span>
        1 {reserveDetail.abbrev} ≈ {currencyFormatter(reserveDetail.price, true, 2)}
      </span>
    </div>
    <div class="native-toggle">
      <div class="divider">
      </div>
      <div class="toggler">
        <Toggle onClick={() => NATIVE.set(!$NATIVE)}
          active={!$NATIVE} 
          native 
        />
      </div>
    </div>
    <div class="modal-section flex align-center justify-center column">
      <span class="flex align-center justify-center">
        {dictionary[$PREFERRED_LANGUAGE].reserveDetail.reserveSize.toUpperCase()}
      </span>
      <h2 class="modal-subheader text-gradient">
        {currencyFormatter(
          $NATIVE
            ? reserveDetail.marketSize.uiAmountFloat
              : reserveDetail.marketSize.muln(reserveDetail.price).uiAmountFloat, 
          !$NATIVE, 
          2
        )}
      </h2>
    </div>
    <div class="divider">
    </div>
    <div class="modal-section flex align-center justify-evenly">
      <PercentageChart percentage={reserveDetail.utilizationRate * 100} 
        text={dictionary[$PREFERRED_LANGUAGE].reserveDetail.utilisationRate.toUpperCase()} 
        percentageDefinition={definitions[$PREFERRED_LANGUAGE].utilisationRate}
      />
      <div class="flex align-start justify-center column">
        <div class="flex align-start justify-center" style="margin: var(--spacing-sm);">
          <div class="asset-info-color"
            style="background: var(--failure); box-shadow: var(--neu-shadow-inset-failure);">
          </div>
          <span style="text-align: start;">
            {dictionary[$PREFERRED_LANGUAGE].reserveDetail.totalBorrowed.toUpperCase()}
            <br>
            <p>
              {currencyFormatter(
                $NATIVE
                  ? reserveDetail.outstandingDebt.uiAmountFloat
                    : reserveDetail.outstandingDebt.muln(reserveDetail.price).uiAmountFloat, 
                !$NATIVE, 
                2
              )}
              {#if $NATIVE}
                {reserveDetail.abbrev}
              {/if}
            </p>
          </span>
        </div>
        <div class="flex align-start justify-center" style="margin: var(--spacing-sm);">
          <div class="asset-info-color"
            style="background: var(--success); box-shadow: var(--neu-shadow-inset-success);">
          </div>
          <span style="text-align: start;">
            {dictionary[$PREFERRED_LANGUAGE].reserveDetail.availableLiquidity.toUpperCase()}
            <br>
            <p>
              {currencyFormatter(
                $NATIVE
                  ? reserveDetail.availableLiquidity.uiAmountFloat
                    : reserveDetail.availableLiquidity.muln(reserveDetail.price).uiAmountFloat, 
                !$NATIVE, 
                2
              )}
              {#if $NATIVE}
                {reserveDetail.abbrev}
              {/if}
            </p>
          </span>
        </div>
      </div>
    </div>
    <div class="divider">
    </div>
    <div class="modal-section flex align-center justify-center">
      <div class="modal-detail flex align-center justify-center column">
        <span>
          {dictionary[$PREFERRED_LANGUAGE].reserveDetail.minimumCollateralizationRatio.toUpperCase()}
          <i class="info fas fa-info-circle"
            on:click={() => COPILOT.set({
              definition: definitions[$PREFERRED_LANGUAGE].collateralizationRatio
            })}>
          </i>
        </span>
        <p>
          {reserveDetail.maximumLTV / 100}%
        </p>
      </div>
      <div class="modal-detail flex align-center justify-center column">
        <span>
          {dictionary[$PREFERRED_LANGUAGE].reserveDetail.liquidationPremium.toUpperCase()}
          <i on:click={() => COPILOT.set({
            definition: definitions[$PREFERRED_LANGUAGE].liquidationPremium
          })} 
            class="info fas fa-info-circle">
          </i>
        </span>
        <p>
          {reserveDetail.liquidationPremium / 100}%
        </p>
      </div>
    </div>
    <div class="divider">
    </div>
    <div class="modal-section flex align-center justify-center">
      {#if $WALLET}
        <Button text={dictionary[$PREFERRED_LANGUAGE].reserveDetail.tradeAsset.replace('{{ASSET}}', reserveDetail.abbrev)} 
          onClick={() => {
            closeModal();
            CURRENT_RESERVE.set(reserveDetail);
            updateValues();
          }} 
        />
      {:else}
        <Button text={dictionary[$PREFERRED_LANGUAGE].settings.connect} 
          onClick={() => {
            CONNECT_WALLET.set(true);
          }} 
        />
      {/if}
    </div>
    <i on:click={() => closeModal()} class="jet-icons close">
      ✕
    </i>
  </div>
{/if}

<style>
  .modal-bg {
    z-index: 100;
  }
  .modal {
    padding: var(--spacing-lg) var(--spacing-sm);
  }
  .reserve-detail {
    z-index: 101;
  }
  .asset-info-color {
    width: 10px;
    height: 12px;
    margin: 2.5px var(--spacing-sm);
  }
  .info {
    position: absolute;
    top: -2px;
  }
  .native-toggle {
    position: relative;
    width: 100%;
    margin: var(--spacing-md) 0;
  }
  .toggler {
    position: absolute;
    top: -2px;
    left: 50%;
    transform: translateX(-50%);
  }
  img {
    width: 40px;
    height: 40px;
    padding: 0 var(--spacing-sm);
  }

  @media screen and (max-width: 1100px) {
    .modal, .reserve-detail {
      max-width: unset;
      height: calc((var(--vh, 1vh) * 95) - var(--mobile-nav-height));
      position: fixed;
      display: block;
      top: 0;
      left: 50%;
      transform: translate(-50%, 0);
      box-shadow: unset;
      border-radius: unset;
      background: var(--white);
      overflow-y: scroll;
    }
    .divider {
      margin: var(--spacing-lg) 0;
    }
    .info {
      position: relative;
    }
    .asset-info-color {
      width: 6px;
      height: 6px;
      margin: var(--spacing-md) var(--spacing-sm);
    }
    .toggler {
      top: -10px;
    }
    img {
      width: 30px;
      height: 30px;
    }
  }
</style>