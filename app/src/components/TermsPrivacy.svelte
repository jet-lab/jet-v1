<script lang="ts">
    export let launchUI: boolean;
</script>

<div class="flex justify-center terms-footer"
  style={launchUI ? 'opacity: 1;' : 'opacity: 0;'}>
  <a href="https://www.jetprotocol.io/terms-of-use" target="_blank"><span class="bicyclette">Terms of Use</span></a>
  <a href="https://www.jetprotocol.io/privacy-policy" target="_blank"><span class="bicyclette">Privacy Policy</span></a>
</div>

<style>
.terms-footer {
  bottom: 7px;
  width: 100%;
  position: absolute;
}

.terms-footer span {
  padding: 10px;
}
</style>