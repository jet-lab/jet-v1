<script lang="ts">
  import { USER } from '../store';
  import { shortenPubkey } from '../scripts/util';
  import { disconnectWallet } from '../scripts/jet';
  import { dictionary } from '../scripts/localization'; 
  import Button from './Button.svelte';

  export let mobile: boolean = false;
</script>

<div class="flex-centered">
  {#if $USER.wallet}
    <Button secondary noCaps bicyclette={false}
      img="img/wallets/{$USER.wallet.name.replace(' ', '_').toLowerCase()}.png"
      text={shortenPubkey($USER.wallet.publicKey.toString(), 4) + ' ' + 
        (!mobile
          ? dictionary[$USER.preferredLanguage].settings.connected.toLowerCase()
            : '')}
      onClick={() => disconnectWallet()}
    />
  {:else}
    <Button small secondary
      text={dictionary[$USER.preferredLanguage].settings.connect}
      onClick={() => USER.update(user => {
        user.connectingWallet = true;
        return user;
      })}
    />
  {/if}
</div>