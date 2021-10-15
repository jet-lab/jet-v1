<script lang="ts">
  import { link } from "svelte-navigator";

  export let icon: string;
  export let text: string = '';
  export let path: string;
  export let active: boolean;
</script>

<a class="flex-centered" 
  class:active class:text class:justify-start={text}
  href={path} use:link>
  <i class="text-gradient jet-icons"
    style={icon === '✔' || icon === '✈'
      ? 'padding: 0 3px 3px 0;' 
        : 'padding: 0 0 3px 3px' }>
    {icon}
  </i>
  {#if text}
    <p class="text-gradient bicyclette-bold">
      {text}
    </p>
  {/if}
</a>

<style>
  a {
    width: 42px;
    height: 42px;
    box-shadow: var(--neu-shadow);
    background: var(--white);
    border-radius: var(--btn-radius);
    border: none;
  }
  i {
    font-size: 30px;
    line-height: 28px;
    width: 25px;
    height: 25px;
  }
  p {
    font-weight: bold;
    text-transform: uppercase;
    font-size: 10.5px;
    margin: 0 0 -2px 0;
  }
  a:active {
    box-shadow: var(--neu-shadow-inset);
  }
  a.active {
    box-shadow: var(--neu-shadow-inset-gradient-low);
    background: var(--gradient);
  }
  a.active i, a.active p {
    color: var(--white);
    -webkit-text-fill-color: unset !important;
  }
  a.active:active {
    box-shadow: var(--neu-shadow-inset-gradient);
  }
  .text {
    padding: 0 var(--spacing-xs);
    width: 100px;
  }
</style>