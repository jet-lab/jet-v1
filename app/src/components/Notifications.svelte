<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { navigate } from 'svelte-navigator';
  import { NOTIFICATIONS } from '../store';
  import { clearNotification } from '../scripts/utils';
</script>

{#if $NOTIFICATIONS.length}
  <div class="notifications flex align-center justify-center column">
    {#each $NOTIFICATIONS as n, i}
      <div class="notification flex align-center justify-center"
        class:success={n.success}
        in:fly={{y: 50, duration: 500}}
        out:fade={{duration: 50}}>
        <div class="copilot-img flex align-center justify-center"
          on:click={() => {if (n.success) navigate("/transactions")}}>
          <img src="img/copilot/copilot.png" 
            alt="Copilot Icon"
          />
        </div>
        <p on:click={() => {if (n.success) navigate("/transactions")}}>
          {@html n.text}
        </p>
        <i class="jet-icons close"
          on:click={() => clearNotification(i)}>
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
    margin: 0 auto;
    z-index: 9999;
  }
  .notification {
    position: relative;
    background: var(--failure);
    margin-top: var(--spacing-md);
    border-radius: var(--btn-radius);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.2);
    cursor: pointer;
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
    max-width: 300px;
    padding: var(--spacing-sm);
    color: var(--white);
    opacity: 1;
  }
  img {
    width: 100%;
  }
</style> 