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

<style>
.session-metrics {
  width: 100%;
  max-width: var(--content-max-width);
  min-height: 17px;
  margin: 0 auto 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--frost-faint);
  font-size: 9px;
}
.extension-statuses { display: flex; align-items: center; gap: 8px; }
.metrics-right { display: flex; align-items: center; gap: 8px; }
.extension-statuses { overflow: hidden; }
.extension-statuses :global(span) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-mini-dot {
  display: inline-block;
  width: 4px;
  height: 4px;
  margin-right: 4px;
  border-radius: 50%;
  background: var(--frost-link);
}

@media (max-width: 430px) {
  .session-metrics { min-width: 0; }
  .extension-statuses { flex: 1; }
  .metrics-right { flex: none; }
}
</style>
