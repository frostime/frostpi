<script lang="ts">
  import type { SessionViewModel } from "$shared/model/sessionViewModel";
  let { session }: { session: SessionViewModel } = $props();

  const context = $derived(session.stats?.contextUsage);
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
        {#if context}<span title={`${context.tokens ?? "Unknown"} / ${context.contextWindow} context tokens`}>Context {context.percent === null ? "—" : `${Math.round(context.percent)}%`}</span>{/if}
        <span title="Estimated session cost">${session.stats.cost.toFixed(3)}</span>
      </div>
    {/if}
  </div>
{/if}
