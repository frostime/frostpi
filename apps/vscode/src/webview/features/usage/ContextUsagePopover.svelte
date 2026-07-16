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
  <button class="context-usage-trigger" type="button" aria-expanded={open} onfocus={show} onblur={scheduleClose} onclick={() => open = !open}>
    Context {context?.percent === null || context?.percent === undefined ? "—" : `${Math.round(context.percent)}%`}
  </button>
  {#if open && stats}
    <div class="context-usage-popover" role="dialog" tabindex="-1" aria-label="Context and session usage" onmouseenter={show} onmouseleave={scheduleClose}>
      <div class="usage-heading"><strong>Context</strong><span>{session.isCompacting ? "Compacting" : session.status}</span></div>
      <div class="usage-current">
        <div><span>Current context</span><strong>{context?.tokens === null || context?.tokens === undefined ? "—" : number(context.tokens)} / {context ? number(context.contextWindow) : "—"}</strong></div>
        <div class="usage-bar"><span style={`width:${clamp(context?.percent ?? 0)}%`}></span></div>
      </div>
      <dl class="usage-grid">
        <dt>Input</dt><dd>{number(stats.tokens.input)}</dd>
        <dt>Output</dt><dd>{number(stats.tokens.output)}</dd>
        <dt>Cache read</dt><dd>{number(stats.tokens.cacheRead)}</dd>
        <dt>Cache write</dt><dd>{number(stats.tokens.cacheWrite)}</dd>
        <dt>Total tokens</dt><dd>{number(stats.tokens.total)}</dd>
        <dt>Messages</dt><dd>{stats.userMessages} user · {stats.assistantMessages} assistant</dd>
        <dt>Tool calls</dt><dd>{stats.toolCalls}</dd>
        <dt>Estimated cost</dt><dd>${stats.cost.toFixed(4)}</dd>
        <dt>Model</dt><dd title={session.model ? `${session.model.provider}/${session.model.id}` : ""}>{modelLabel}</dd>
      </dl>
    </div>
  {/if}
</div>

<script lang="ts" module>
  const formatter = new Intl.NumberFormat();
  function number(value: number): string { return formatter.format(value); }
  function clamp(value: number): number { return Math.max(0, Math.min(100, value)); }
</script>
