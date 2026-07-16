<script lang="ts">
  import type { SessionViewModel } from "$shared/model/sessionViewModel";
  import ContextUsagePopover from "../features/usage/ContextUsagePopover.svelte";

  let { session }: { session: SessionViewModel } = $props();
</script>

{#if session.stats || session.extensionStatuses.length}
  <div class="session-metrics">
    <div class="extension-statuses">
      {#each session.extensionStatuses as status (status.key)}
        <span><span class="status-mini-dot"></span>{status.text}</span>
      {/each}
    </div>
    {#if session.stats}
      <div class="metrics-right">
        <ContextUsagePopover {session} />
        <span title="Estimated session cost">${session.stats.cost.toFixed(3)}</span>
      </div>
    {/if}
  </div>
{/if}
