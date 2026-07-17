<script lang="ts">
  import type { SessionViewModel } from "$shared/model/sessionViewModel";

  let { session }: { session: SessionViewModel } = $props();
  let open = $state(false);
  let closeTimer: number | undefined;

  const stats = $derived(session.stats);
  const context = $derived(stats?.contextUsage);
  const modelLabel = $derived(session.model ? `${session.model.name ?? session.model.id}` : "—");

  function show(): void {
    if (closeTimer) window.clearTimeout(closeTimer);
    open = true;
  }

  function scheduleClose(): void {
    closeTimer = window.setTimeout(() => { open = false; }, 120);
  }
</script>

<div class="context-usage-wrap" role="presentation" onmouseenter={show} onmouseleave={scheduleClose}>
  <button class="context-usage-trigger" type="button" aria-expanded={open} onfocus={show} onblur={scheduleClose}>
    Context {context?.percent === null || context?.percent === undefined ? "—" : `${Math.round(context.percent)}%`}
  </button>
  {#if open && stats}
    <div class="context-usage-popover" role="dialog" tabindex="-1" aria-label="Context and session usage" onmouseenter={show} onmouseleave={scheduleClose}>
      <div class="usage-heading">
        <strong>Context</strong>
        <span>{session.isCompacting ? "Compacting" : session.status}</span>
      </div>
      <div class="usage-current">
        <div>
          <span>In use</span>
          <strong>{context?.tokens == null ? "—" : compactNumber(context.tokens)} / {context ? compactNumber(context.contextWindow) : "—"}</strong>
        </div>
        <div class="usage-bar" aria-hidden="true"><span style={`width:${clamp(context?.percent ?? 0)}%`}></span></div>
      </div>
      <dl class="usage-grid">
        <dt>Input</dt><dd>{compactNumber(stats.tokens.input)}</dd>
        <dt>Output</dt><dd>{compactNumber(stats.tokens.output)}</dd>
        <dt>Cache read</dt><dd>{compactNumber(stats.tokens.cacheRead)}</dd>
        <dt>Cache write</dt><dd>{compactNumber(stats.tokens.cacheWrite)}</dd>
        <dt>Total</dt><dd>{compactNumber(stats.tokens.total)}</dd>
        <dt>Messages</dt><dd title={`${stats.userMessages} user · ${stats.assistantMessages} assistant`}>{stats.userMessages}u · {stats.assistantMessages}a</dd>
        <dt>Tools</dt><dd>{compactNumber(stats.toolCalls)}</dd>
        <dt>Cost</dt><dd>${stats.cost.toFixed(3)}</dd>
        <dt>Model</dt><dd title={session.model ? `${session.model.provider}/${session.model.id}` : ""}>{modelLabel}</dd>
      </dl>
    </div>
  {/if}
</div>

<script lang="ts" module>
  const full = new Intl.NumberFormat();
  const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

  function compactNumber(value: number): string {
    if (!Number.isFinite(value)) return "—";
    // Keep exact values for small counts; compress large token totals that force width.
    return Math.abs(value) >= 10_000 ? compact.format(value) : full.format(value);
  }

  function clamp(value: number): number {
    return Math.max(0, Math.min(100, value));
  }
</script>
