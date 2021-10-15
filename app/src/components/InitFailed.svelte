<script>
  import { USER } from '../store';
  import { getMarketAndIDL } from '../scripts/jet';
  import { dictionary } from '../scripts/localization';
  import Button from './Button.svelte';
</script>

<div class="view-container flex-centered column">
  <img src="img/ui/failed_init.gif" alt="Failed To Init App" />
  <h1 class="bicyclette">
    {dictionary[$USER.preferredLanguage].copilot.alert.failed}
  </h1>
  {#if $USER.isGeobanned}
    <span>
      {dictionary[$USER.preferredLanguage].cockpit.geobanned}
    </span>
  {:else}
    <span>
      {dictionary[$USER.preferredLanguage].cockpit.noMarket}
    </span>
  {/if}
  {#if $USER.preferredNode}
    <p>
      <i class="fas fa-wifi"></i>
      {$USER.preferredNode}
    </p>
    <Button small
      text={dictionary[$USER.preferredLanguage].settings.reset}
      onClick={() => {
        localStorage.removeItem('jetPreferredNode');
        USER.update(user => {
          user.ping = 0;
          return user;
        })
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