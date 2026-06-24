<script lang="ts">
  import GameControls from './lib/components/GameControls.svelte';
  import Hand from './lib/components/Hand.svelte'
  import { version } from '../package.json';

  let versionText: string;
  let href: string;
  
  const repoUrl = 'https://github.com/kenakofer/hanabi';

  $: {
    // BASE_URL is normalised by Vite (e.g. "/hanabi/", "/dev/").
    const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
    switch (base) {
      case '/hanabi':
        versionText = `Version ${version}`;
        href = `${repoUrl}/tree/v${version}`;
        break;
      case '/dev':
        versionText = `Dev ${version}`;
        href = repoUrl;
        break;
      default:
        versionText = `Version ${version}`;
        href = repoUrl;
        break;
    }
  };
</script>

<main>
  <GameControls />
  <Hand />
  <div class="bottom-text">
    {versionText} ·
    <a href={href} target="_blank"><u>Check out my code!</u></a>
  </div>
</main>

<style>
  .bottom-text {
    display: flex;
    flex-direction: left;
    align-content: center;
    justify-content: center;
    gap: 4px;
  }
</style>