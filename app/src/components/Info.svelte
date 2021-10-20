<script lang="ts">
  import { USER, COPILOT } from '../store';
  import { definitions } from '../scripts/localization';

  export let term: string;
  export let style: string = '';
</script>

<i class="info fas fa-info-circle"
  style={style}
  on:click={() => COPILOT.set({
    definition: definitions[$USER.language][term]
  })}>
</i>

<style>
  .info {
    color: var(--black);
    opacity: var(--disabled-opacity);
    font-size: 9px;
    line-height: 9px;
    cursor: pointer;
  }
  .info:hover {
    opacity: 1;
  }
</style>