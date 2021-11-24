<script lang="ts">
  import { MARKET } from '../store';
  import { currencyFormatter } from '../scripts/util';
  import Loader from './Loader.svelte';

  export let type: 'text' | 'number';
  export let value: string | number | null;
  export let placeholder: string = '';
  export let currency: boolean = false;
  export let maxInput: number | null = null;
  export let error: string | null = null;
  export let disabled: boolean = false;
  export let loading: boolean = false;
  export let keyUp: Function = () => null;
  export let submit: Function;

  // Call submit fn on enter
  const enterKeySubmit = (e: any) => {
    if (e.code === 'Enter' && !disabled) {
      submit();
    }
  };

  // Set input type
  const typeAction = (node: any) => {
    node.type = type;
    if (type === 'number') {
      node.max = maxInput;
    }
  };
</script>

<div class="flex-centered" class:disabled>
  <div class="flex-centered" class:currency>
    <input {disabled}
      bind:value
      placeholder={error ?? placeholder}
      class:error
      use:typeAction
      on:keyup={() => keyUp()}
      on:keypress={(e) => enterKeySubmit(e)}
      on:click={() => {
        error = null;
      }}
    />
    {#if currency}
      <img src="img/cryptos/{$MARKET.currentReserve?.abbrev}.png" alt="{$MARKET.currentReserve?.name} Logo" />
      <div class="asset-abbrev-usd flex align-end justify-center column">
        <span>
          {$MARKET.currentReserve?.abbrev}
        </span>
        <span>
          ≈ {currencyFormatter(
              (Number(value) ?? 0) * $MARKET.currentReserve.price,
              true,
              2
            )}
        </span>
      </div>
    {/if}
  </div>
  <div class="input-btn flex-centered"
    class:loading
    on:click={() => {
      if (!disabled) {
        submit();
      }
    }}>
    {#if loading}
      <Loader button />
    {:else}
      <i class="jet-icons"
        title="Save">
        ➜
      </i>
    {/if}
  </div>
</div>

<style>
  input {
    border-top-right-radius: 0px;
    border-bottom-right-radius: 0px;
  }
  .error {
    border-color: var(--failure);
  }
  .error::placeholder {
    color: var(--failure);
  }
  .input-btn {
    height: 39px;
    margin-left: -2px;
    background: var(--gradient);
    border-top-right-radius: 50px;
    border-bottom-right-radius: 50px;
    padding: 0 var(--spacing-md);
    cursor: pointer;
  }
  .input-btn i {
    color: var(--white);
  }
  .input-btn:active {
    opacity: 0.9;
  }
  .disabled input {
    cursor: not-allowed;
  }
  .disabled .input-btn, .disabled .input-btn:active {
    opacity: 0.5;
  }
  /* Currency Input */
  .currency {
    position: relative;
  }
  .currency input {
    position: relative;
    font-size: 20px;
    padding-left: 50px;
    padding-right: 80px;
  }
  .currency span {
    font-weight: 400 !important;
    font-size: 15px !important;
    color: var(--black) !important;
  }
  .currency .asset-abbrev-usd {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: var(--spacing-md);
    padding: unset;
  }
  .currency .asset-abbrev-usd span:last-of-type {
    font-size: 10px !important;
  }
  .currency img {
    width: 25px;
    height: auto;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    left: var(--spacing-md);
  }
  .currency + .input-btn {
    height: 43px;
    margin: unset;
    border: 2px solid var(--white);
    border-left: unset;;
    background: unset;
  }
  .currency + .input-btn:active, .currency + .input-btn.loading {
    background: var(--white);
  }
  .currency + .input-btn:active i {
    opacity: 1;
    background-image: var(--gradient) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
  }
  .disabled .currency + .input-btn:active {
    background: unset !important;
  }
  .disabled .currency + .input-btn:active i {
    -webkit-text-fill-color: unset !important;
  }

  @media screen and (max-width: 600px) {
    input {
      font-size: 15px;
    }
    .input-btn {
      height: 41px;
    }
    .currency input {
      width: 220px;
      padding-left: 30px !important;
      padding-right: 40px !important;
    }
    .currency .asset-abbrev-usd {
      right: var(--spacing-sm);
    }
    .currency img {
      width: 18px;
      left: var(--spacing-sm);
    }
    .currency span {
      font-size: 8px !important;
    }
    .currency + .input-btn {
      height: 43px;
    }
  }
</style>