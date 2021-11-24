<script lang="ts">
  import { onMount } from 'svelte';
  import { timeout } from '../scripts/util';
  import Info from './Info.svelte';

  export let percentage: number;
  export let text: string = '';
  export let term: string;

  let percent: number = 0;
  const animatePercent = async () => {
    percent = 0;
    while(percent < (percentage > 1 ? Math.floor(percentage) : Math.ceil(percentage))) {
      await timeout(7);
      percent++;
    }
  };

  onMount(() => {
    animatePercent();
  });
</script>

<div class="chart">
  <svg viewBox="0 0 36 36">
    <path
      d="M18 2.0845
        a 15.9155 15.9155 0 0 1 0 31.831
        a 15.9155 15.9155 0 0 1 0 -31.831"
    />
    <path
      stroke-dasharray="{percent}, 100"
      d="M18 2.0845
        a 15.9155 15.9155 0 0 1 0 31.831
        a 15.9155 15.9155 0 0 1 0 -31.831"
    />
  </svg>
  <div class="inset-chart-shadow"></div>
  <div class="chart-info flex-centered column">
    <h2 class="modal-header">
      {percentage > 1 ? Math.floor(percentage) : Math.ceil(percentage)}%
    </h2>
    {#if text}
      <span>
        {text}
        {#if term}
          <Info {term} />
        {/if}
      </span>
    {/if}
  </div>
</div>

<style>
  .chart {
    position: relative;
    width: 140px;
    height: 140px;
    justify-content: space-around;
    box-shadow: var(--neu-shadow);
    border-radius: 100px;
  }
  .chart-info, .inset-chart-shadow, svg {
    width: 140px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  .inset-chart-shadow {
    width: 123px;
    height: 123px;
    box-shadow: var(--neu-shadow-inset);
    border-radius: 100px;
  }
  svg {
    width: 151px;
    stroke: var(--failure);
  }
  svg path:first-of-type {
    fill: none;
    stroke: var(--success);
    stroke-width: 2.5;
  }
  svg path:last-of-type {
    fill: none;
    stroke-width: 2.5;
  }
  span {
    font-size: 10px;
    margin-top: -10px;
  }

  @media screen and (max-width: 600px) {
    .chart {
      width: 106px;
      height: 106px;
      margin: var(--spacing-mg) 0;
    }
    .chart-info, .inset-chart-shadow {
      width: 106px;
    }
    .inset-chart-shadow {
      width: 100px;
      height: 100px
    }
    svg {
      width: 122px;
      stroke: var(--failure);
    }
    span {
      font-size: 8px;
    }
  }
</style>
