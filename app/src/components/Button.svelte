<script lang="ts">
  export let text: string;
  export let img: string = '';
  export let disabled: boolean = false;
  export let secondary: boolean = false;
  export let small: boolean = false;
  export let error: boolean = false;
  export let noCaps: boolean = false;
  export let bicyclette: boolean = true;
  export let onClick: Function;
</script>

<button class="flex-centered" class:bicyclette
  class:secondary class:small class:disabled class:error class:noCaps
  title={text}
  on:click={() => {if(!disabled) onClick()}}>
  {#if img}
    <img src={img} alt={text} />
  {/if}
  {text}
</button>

<style>
  button {
    background: var(--gradient);
    color: var(--white);
    border: none;
    border-radius: var(--btn-radius);
    padding: var(--btn-padding);
    cursor: pointer;
    -webkit-tap-highlight-color: rgba(0,0,0,0);
    -webkit-touch-callout: none;
    margin: var(--spacing-sm) 0;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-size: 14px;
  }
  button:active {
    box-shadow: var(--neu-shadow-inset-gradient-low);
    opacity: var(--disabled-opacity);
  }
  .secondary {
    /* Using #9D9D9D to match grayscaled wallet logo */
    background: var(--white);
    border: 1px solid #9D9D9D;
    padding: var(--secondary-btn-padding);
    color: #9D9D9D;
  }
  .secondary:active {
    box-shadow: unset;
  }
  .error {
    background: var(--failure);
  }
  .error:active {
    box-shadow: var(--neu-shadow-inset-failure);
  }
  .small {
    font-size: 10px !important;
  }
  .disabled:active {
    box-shadow: var(--neu-shadow);
  }
  .noCaps {
    text-transform: unset !important;
  }
  img {
    width: 20px;
    margin-right: var(--spacing-sm);
    filter: grayscale(1);
  }

  @media screen and (max-width: 600px) {
    button {
      font-size: 10px;
    }
  }
</style>