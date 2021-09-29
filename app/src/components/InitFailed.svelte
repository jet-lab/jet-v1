<script>
  import { INIT_FAILED, PREFERRED_LANGUAGE, PREFERRED_NODE, PING } from '../store';
  import { getMarketAndIDL } from '../scripts/jet';
  import { dictionary } from '../scripts/localization';
  import Button from './Button.svelte';
</script>

<div class="view-container flex align-center justify-center column">
  <img src="img/ui/failed_init.gif" alt="Failed To Init App" />
  <h1 class="bicyclette">
    {dictionary[$PREFERRED_LANGUAGE].copilot.alert.failed}
  </h1>
  {#if $INIT_FAILED.geobanned}
    <span>
      {dictionary[$PREFERRED_LANGUAGE].cockpit.geobanned}
    </span>
  {:else}
    <span>
      {dictionary[$PREFERRED_LANGUAGE].cockpit.noMarket}
    </span>
  {/if}
  {#if $PREFERRED_NODE}
    <p>
      <i class="fas fa-wifi"></i>
      {$PREFERRED_NODE}
    </p>
    <Button small
      text={dictionary[$PREFERRED_LANGUAGE].settings.reset}
      onClick={() => {
        localStorage.removeItem('jetPreferredNode');
        PING.set(0);
        getMarketAndIDL();
      }} />
  {/if}
</div>

<style>
  .view-container {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    padding: unset !important;
  }
  h1 {
    color: var(--failure);
    font-size: 30px;
  }
  span {
    max-width: 300px;
    font-size: 16px;
  }
  p {
    margin-top: var(--spacing-lg);
    opacity: var(--disabled-opacity);
    color: var(--failure);
  }
  i {
    font-size: 14px;
  }
  img {
    width: 600px;
  }

  @media screen and (max-width: 1100px) {
    img {
      width: 300px;
    }
  }
</style>