<script lang="ts">
  import type { PendingExtensionUiView } from "$shared/model/extensionUiModel";
  import ExtensionUiRequestCard from "./ExtensionUiRequestCard.svelte";

  let { sessionId, requests }: { sessionId: string; requests: PendingExtensionUiView[] } = $props();
</script>

{#if requests.length}
  <div class="extension-ui-host">
    {#each requests as request (request.id)}
      <ExtensionUiRequestCard {sessionId} {request} />
    {/each}
  </div>
{/if}

<style>
.extension-ui-host { width: 100%; max-width: 820px; margin: 0 auto 7px; display: grid; gap: 6px; }
</style>
