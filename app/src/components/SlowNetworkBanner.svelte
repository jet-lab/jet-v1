<script lang="ts">
  import { dictionary } from "../scripts/localization";
  import { SLOW_NETWORK, USER } from "../store";

  let slowNetwork: boolean;
  SLOW_NETWORK.subscribe(data => slowNetwork = data);
</script>

{#if slowNetwork}
  <div class="slow-network">
    {@html dictionary[$USER.language].settings.degradedNetworkPerformance}
  </div>
{/if}