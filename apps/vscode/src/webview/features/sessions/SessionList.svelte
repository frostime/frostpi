<script lang="ts">
  import type { SessionSummaryView } from "$shared/model/sessionViewModel";

  let {
    sessions,
    activeId,
    onselect,
    onclose,
    oncreate,
    onresume,
  }: {
    sessions: SessionSummaryView[];
    activeId: string;
    onselect: (sessionId: string) => void;
    onclose: (sessionId: string) => void;
    oncreate: () => void;
    onresume: () => void;
  } = $props();

  function statusLabel(session: SessionSummaryView): string {
    if (session.requiresUserInput) return "Action required";
    if (session.status === "queued") return "Waiting to start";
    if (session.status === "running" && session.id !== activeId) return "Running in background";
    if (session.status === "ready") return "Ready";
    if (session.status === "running") return "Running";
    if (session.status === "starting") return "Starting";
    if (session.status === "stopping") return "Stopping";
    if (session.status === "failed") return "Failed";
    return "Stopped";
  }
</script>

<div class="session-list-panel" role="dialog" aria-label="FrostPi sessions">
  <div class="session-list-heading">Sessions</div>
  <div class="session-list-items" role="listbox" aria-label="Open sessions">
    {#each sessions as session (session.id)}
      <div class="session-list-item" class:active={session.id === activeId}>
        <button
          class="session-list-select"
          type="button"
          role="option"
          aria-selected={session.id === activeId}
          onclick={() => onselect(session.id)}
        >
          <span class="session-list-mark">{session.id === activeId ? "✓" : ""}</span>
          <span class="session-list-copy">
            <strong>{session.title}</strong>
            <small class:attention={session.requiresUserInput}>{statusLabel(session)}</small>
          </span>
        </button>
        <button class="session-list-close" type="button" aria-label={`Close ${session.title}`} title="Close session" onclick={() => onclose(session.id)}>
          <span class="codicon codicon-close" aria-hidden="true"></span>
        </button>
      </div>
    {/each}
  </div>
  <div class="session-list-footer">
    <button type="button" onclick={oncreate}><span class="codicon codicon-add" aria-hidden="true"></span> New session</button>
    <button type="button" onclick={onresume}><span class="codicon codicon-history" aria-hidden="true"></span> Resume session</button>
  </div>
</div>
