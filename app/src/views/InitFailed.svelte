<script>
  import { GEOBANNED, PREFERRED_LANGUAGE } from '../store';
  import { dictionary } from '../scripts/localization';
</script>

<div class="view-container flex align-center justify-center column">
  <img src="img/ui/failed_init.gif" alt="Failed To Init App" />
  <h1 class="bicyclette">
    {dictionary[$PREFERRED_LANGUAGE].copilot.alert.failed}
  </h1>
  {#if $GEOBANNED}
    <span>
      {dictionary[$PREFERRED_LANGUAGE].cockpit.geobanned}
    </span>
  {:else}
    <span>
      {dictionary[$PREFERRED_LANGUAGE].cockpit.noMarket}
    </span>
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
  img {
    width: 700px;
  }

  @media screen and (max-width: 1100px) {
    img {
      width: 300px;
    }
  }
</style>