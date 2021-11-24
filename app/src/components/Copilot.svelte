<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { COPILOT, USER } from '../store';
  import { dictionary } from '../scripts/localization';
  import Button from '../components/Button.svelte';

  onMount(() => {
    document.addEventListener('keypress', (e) => {
      if (e.code === 'Escape' || e.code === 'Enter') {
        COPILOT.set(null);
      }
    });
  });

  const acceptJetDisclaimer = localStorage.getItem('jetDisclaimer');
</script>

{#if $COPILOT}
  <div class="modal-bg flex-centered"
    on:click={() => acceptJetDisclaimer ? COPILOT.set(null) : null}
    transition:fade={{duration: 50}}>
  </div>
  <div class="copilot modal flex-centered column"
    in:fly={{y: 25, duration: 500}}
    out:fade={{duration: 50}}>
    {#if $COPILOT.alert || $COPILOT.suggestion}
      <img src="img/copilot/copilot_white.png" 
        alt="Copilot Icon" 
        class:success={($COPILOT.alert && $COPILOT.alert?.good) || ($COPILOT.suggestion && $COPILOT.suggestion.good)}
        class:failure={($COPILOT.alert && !$COPILOT.alert?.good) || ($COPILOT.suggestion && !$COPILOT.suggestion.good)}
      />
    {:else}
      <img src="img/copilot/copilot.png" 
        alt="Copilot Icon"
      />
    {/if}
    <div class="copilot-body modal-section flex align-start justify-center column">
      {#if $COPILOT.suggestion}
        <h1 class="bicyclette modal-section text-gradient">
          {dictionary[$USER.language].copilot.header}
        </h1>
        {#if $COPILOT.suggestion.overview}
          <h2 class="bicyclette modal-section" 
            style={$COPILOT.suggestion.good ? 'color: var(--jet-blue);' : 'color: var(--failure);'}>
            {$COPILOT.suggestion.overview}
          </h2>
        {/if}
        {#if $COPILOT.suggestion.detail}
          <span class="modal-section">
            {@html $COPILOT.suggestion.detail}
          </span>
        {/if}
        {#if $COPILOT.suggestion.solution}
          <span class="modal-section">
            {@html $COPILOT.suggestion.solution}
          </span>
        {/if}
        <div class="button flex-centered">
          {#if $COPILOT.suggestion.action}
            <Button text={$COPILOT.suggestion.action.text ?? dictionary[$USER.language].copilot.okay} 
              onClick={() => {
                $COPILOT?.suggestion?.action?.onClick();
                COPILOT.set(null);
              }}
              error={!$COPILOT.suggestion?.good}
              small
            />
          {:else}
            <Button text={dictionary[$USER.language].copilot.okay} 
              onClick={() => COPILOT.set(null)}
              error={!$COPILOT.suggestion?.good}
              small
            />
          {/if}
        </div>
      {:else if $COPILOT.definition}
        <h1 class="bicyclette" style="color: var(--jet-blue);">
          {$COPILOT.definition.term}
        </h1>
        <span class="modal-section">
          {@html $COPILOT.definition.definition}
        </span>
        <div class="button flex-centered">
          <Button text={dictionary[$USER.language].copilot.okay} 
            onClick={() => COPILOT.set(null)}
            small
          />
        </div>
      {:else if $COPILOT.alert}
        <h1 class="bicyclette" 
          style={!$COPILOT.alert.good ? 'color: var(--failure);' : 'color: var(--success);'}>
          {$COPILOT.alert.header}
        </h1>
        <span class="modal-section">
          {@html $COPILOT.alert.text}
        </span>
        <div class="button flex-centered">
          {#if $COPILOT.alert.action}
            <Button text={$COPILOT.alert.action.text} 
              onClick={() => {
                $COPILOT?.alert?.action?.onClick();
                COPILOT.set(null);
              }}
              error={!$COPILOT.alert?.good}
              small
            />
          {:else}
            <Button text={dictionary[$USER.language].copilot.okay} 
              onClick={() => COPILOT.set(null)}
              error={!$COPILOT.alert?.good}
              small
            />
          {/if}
        </div>
      {/if}
      <!-- Prevents user from clicking away to avoid disclaimer -->
      {#if acceptJetDisclaimer}
      <i on:click={() => COPILOT.set(null)} class="jet-icons close">
        ✕
      </i>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-bg {
    z-index: 102;
  }
  .modal h2, .modal h1 {
    font-weight: 400;
  }
  .modal h1 {
    font-size: 24px;
  }
  .copilot {
    overflow: hidden;
    flex-wrap: nowrap;
    z-index: 103;
    padding: 0 var(--spacing-md);
  }
  .copilot-body {
    max-width: 250px;
    padding: var(--spacing-md);
  }
  .copilot-body span {
    text-align: left;
  }
  .button {
    width: 100%;
  }
  img {
    width: 70px;
    height: auto;
    margin: var(--spacing-md);
    padding: 7px;
    border-radius: 100px;
    background: var(--white);
    box-shadow: var(--neu-shadow-inset);
  }
  img.success {
    background: var(--success);
    box-shadow: var(--neu-shadow-inset-success);
  }
  img.failure {
    background: var(--failure);
    box-shadow: var(--neu-shadow-inset-failure);
  }
  span {
    max-width: 400px;
    line-height: 16px;
    opacity: 1;
  }

  @media screen and (max-width: 600px) {
    img {
      width: 60px;
    }
    span {
      font-size: 11px;
    }
    h1 {
      font-size: 26px;
    }
    h2 {
      font-size: 18px;
    }
  }
</style>