<script lang="ts">
  export let text: string;
  export let disabled: boolean = false;
  export let secondary: boolean = false;
  export let small: boolean = false;
  export let error: boolean = false;
  export let onClick: Function;
</script>

<button class="bicyclette" class:secondary class:small class:disabled class:error
  title={text}
  on:click={() => !disabled ? onClick() : null}>
  {text}
</button>

<style>
  button {
    background: var(--gradient);
    color: var(--white);
    box-shadow: var(--neu-shadow);
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
  }
  .secondary {
    background: transparent;
    box-shadow: none;
    border: 1px solid var(--white);
    border-left: none;
    border-top-left-radius: 0px;
    border-bottom-left-radius: 0px;
    height: 47px;
    margin-left: -20px;
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

  @media screen and (max-width: 1100px) {
    button {
      font-size: 12px;
    }
  }
</style>