<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { USER } from '../store';
  import { getExplorerUrl } from '../scripts/util';
  import { inDevelopment } from '../scripts/jet';
</script>


{#if $USER.notifications?.length}
  <div class="notifications flex-centered column">
    {#each $USER.notifications as n, i}
      <div class="notification flex-centered"
        class:success={n.success}
        in:fly={{y: 50, duration: 500}}
        out:fade={{duration: 50, delay: 2000}}>
        <div class="copilot-img flex-centered"
          on:click={() => {if (n.success) window.open(getExplorerUrl(n.txids[n.txids.length - 1], $USER.explorer, !inDevelopment), '_blank')?.focus()}}>
          <img src="img/copilot/copilot.png" 
            alt="Copilot Icon"
          />
        </div>
        <p on:click={() => {if (n.success) window.open(getExplorerUrl(n.txids[n.txids.length - 1], $USER.explorer, !inDevelopment), '_blank')?.focus()}}>
          {@html n.text}
        </p>
        <i class="jet-icons close"
          on:click={() => $USER.clearNotification(i)}>
          ✕
        </i>
      </div>
    {/each}
  </div>
{/if}

<style>
  .notifications {
    position: fixed;
    bottom: var(--spacing-sm);
    left: 0;
    right: 0;
    bottom: 10px;
    margin: 0 auto;
    z-index: 9999;
  }
  .notification {
    position: relative;
    background: var(--failure);
    margin-top: var(--spacing-md);
    border-radius: var(--btn-radius);
    box-shadow: var(--drop-shadow);;
    cursor: pointer;
  }
  .notification:active {
    opacity: 0.9;
  }
  .notification.success {
    background: var(--success);
  }
  .copilot-img {
    width: 25px;
    height: 25px;
    background: var(--white);
    box-shadow: var(--neu-shadow-inset-low);
    margin: var(--spacing-sm);
    padding: var(--spacing-xs);
    border-radius: 50px;
  }
  .close {
    font-size: 14px;
    padding: var(--spacing-sm);
    color: var(--white);
    cursor: pointer;
  }
  p {
    font-size: 14px;
    max-width: 215px;
    padding: var(--spacing-sm);
    color: var(--white);
    border-right: 1px solid var(--white);
    opacity: 1;
  }
  img {
    width: 100%;
  }
</style> 