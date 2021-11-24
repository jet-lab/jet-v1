<script lang="ts">
  export let width: number;
  export let logoMark: boolean = false;
</script>

<div class="logo flex-centered">
  <img src="img/jet/jet_logomark_gradient.png" alt="Jet Logomark"
    style="width: {width}px; {logoMark ? 'height: auto; opacity: 1' : 'height: 0px; opacity: 0; position: absolute;'}" 
  />
  <img src="img/jet/jet_logo_gradient.png" alt="Jext Logo"
    style="width: {width}px; {!logoMark ? 'height: auto; opacity: 1' : 'height: 0px; opacity: 0; position: absolute;'}" 
  />
</div>

<style>
  .logo {
    position: relative;
  }
  img {
    position: relative;
    top: unset;
    left: unset;
    width: 100%;
    height: auto;
    transition: transform 0.5s ease-in-out;
  }
  img:first-of-type:hover {
    transform: rotate(-270deg);
  }

  @media screen and (max-width: 600px) {
    img:first-of-type {
      display: none;
    }
  }
</style>