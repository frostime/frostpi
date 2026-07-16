<script lang="ts">
  import { AlertDialog } from "bits-ui";
  import type { SessionSummaryView, SessionViewModel } from "$shared/model/sessionViewModel";

  import { postToHost } from "../../bridge/vscodeBridge";
  import IconButton from "../../primitives/IconButton.svelte";
  import StatusDot from "../../primitives/StatusDot.svelte";

  let { sessions, active }: { sessions: SessionSummaryView[]; active: SessionViewModel } = $props();
  let editing = $state(false);
  let titleDraft = $state("");
  let menuOpen = $state(false);
  let launcherOpen = $state(false);
  let titleInput = $state<HTMLInputElement | null>(null);
  let closeDialogOpen = $state(false);

  $effect(() => {
    if (editing) requestAnimationFrame(() => titleInput?.focus());
  });

  function beginRename(): void {
    titleDraft = active.title;
    editing = true;
    menuOpen = false;
    launcherOpen = false;
  }

  function commitRename(): void {
    const name = titleDraft.trim();
    if (name && name !== active.title) postToHost({ type: "renameSession", sessionId: active.id, name });
    editing = false;
  }

  function requestCloseSession(): void {
    menuOpen = false;
    closeDialogOpen = true;
  }

  function closeSession(): void {
    postToHost({ type: "closeSession", sessionId: active.id });
  }
</script>

<header class="session-header">
  <div class="session-heading">
    <StatusDot status={active.status} />
    <div class="session-title-wrap">
      {#if editing}
        <input
          class="session-title-input"
          bind:this={titleInput}
          bind:value={titleDraft}
          aria-label="Session name"
          onkeydown={(event) => {
            if (event.key === "Enter") commitRename();
            if (event.key === "Escape") editing = false;
          }}
          onblur={commitRename}
        />
      {:else}
        <button class="session-title" type="button" title="Rename session" ondblclick={beginRename}>
          {active.title}
        </button>
      {/if}
      <div class="session-subtitle">
        {active.model ? (active.model.name ?? `${active.model.provider}/${active.model.id}`) : "Starting Pi"}
        <span>·</span>
        <span>{active.status}</span>
        {#if active.networkProxy.restartRequired}<span>·</span><button class="proxy-restart-badge" type="button" title={`Proxy is currently ${active.networkProxy.label}; ${active.networkProxy.pendingLabel ?? "new settings"} applies after restart.`} onclick={() => postToHost({ type: "restartSession", sessionId: active.id })}>restart proxy</button>{/if}
      </div>
    </div>
  </div>

  <div class="session-actions">
    <label class="session-switcher-label" title="Switch session">
      <span class="codicon codicon-list-selection"></span>
      <select
        class="session-switcher"
        aria-label="Active session"
        value={active.id}
        onchange={(event) => postToHost({ type: "activateSession", sessionId: event.currentTarget.value })}
      >
        {#each sessions as session (session.id)}
          <option value={session.id}>{session.title}{session.status === "running" ? " • running" : ""}</option>
        {/each}
      </select>
    </label>
    <div class="session-menu-wrap">
      <IconButton icon="add" label="New or resume session" active={launcherOpen} onclick={() => { launcherOpen = !launcherOpen; menuOpen = false; }} />
      {#if launcherOpen}
        <div class="session-menu session-launcher-menu">
          <button type="button" onclick={() => { launcherOpen = false; postToHost({ type: "createSession" }); }}>
            <span class="codicon codicon-add"></span><span><strong>New session</strong><small>Start a clean Pi conversation</small></span>
          </button>
          <button type="button" onclick={() => { launcherOpen = false; postToHost({ type: "resumeSession" }); }}>
            <span class="codicon codicon-history"></span><span><strong>Resume session</strong><small>Open an existing Pi conversation</small></span>
          </button>
        </div>
      {/if}
    </div>
    <div class="session-menu-wrap">
      <IconButton icon="ellipsis" label="Session actions" active={menuOpen} onclick={() => { menuOpen = !menuOpen; launcherOpen = false; }} />
      {#if menuOpen}
        <div class="session-menu">
          <button type="button" onclick={beginRename}><span class="codicon codicon-edit"></span> Rename</button>
          <button type="button" onclick={() => { menuOpen = false; postToHost({ type: "restartSession", sessionId: active.id }); }}><span class="codicon codicon-debug-restart"></span> Restart session</button>
          <button type="button" onclick={() => { menuOpen = false; postToHost({ type: "openProxySettings" }); }}>
            <span class="codicon codicon-globe"></span>
            <span>
              <strong>Network & proxy</strong>
              <small>{active.networkProxy.restartRequired ? `${active.networkProxy.pendingLabel ?? active.networkProxy.label} · restart required` : active.networkProxy.label}</small>
            </span>
          </button>
          <button type="button" onclick={() => postToHost({ type: "refreshCommands", sessionId: active.id })}><span class="codicon codicon-refresh"></span> Refresh commands</button>
          <button type="button" onclick={() => postToHost({ type: "exportDiagnostics" })}><span class="codicon codicon-save"></span> Export diagnostics</button>
          <div class="menu-separator"></div>
          <button class="danger" type="button" onclick={requestCloseSession}><span class="codicon codicon-close"></span> Close session</button>
        </div>
      {/if}
    </div>
  </div>
</header>

<AlertDialog.Root bind:open={closeDialogOpen}>
  <AlertDialog.Portal>
    <AlertDialog.Overlay class="dialog-overlay" />
    <AlertDialog.Content class="dialog-content">
      <AlertDialog.Title class="dialog-title">Close this session?</AlertDialog.Title>
      <AlertDialog.Description class="dialog-description">
        The Pi process for “{active.title}” will stop. Pi's persisted session file is not deleted.
      </AlertDialog.Description>
      <div class="dialog-actions">
        <AlertDialog.Cancel class="dialog-button">Cancel</AlertDialog.Cancel>
        <AlertDialog.Action class="dialog-button danger" onclick={closeSession}>Close session</AlertDialog.Action>
      </div>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>
