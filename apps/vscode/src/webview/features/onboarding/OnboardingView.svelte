<script lang="ts">
  import type { SessionViewModel } from "$shared/model/sessionViewModel";
  import { postToHost } from "../../bridge/vscodeBridge";

  let { session = null, noWorkspace = false }: { session?: SessionViewModel | null; noWorkspace?: boolean } = $props();
</script>

<div class="onboarding-view">
  <div class="onboarding-logo"><span>π</span></div>
  {#if noWorkspace}
    <h1>Open a workspace</h1>
    <p>FrostPi runs Pi in the workspace extension host so its files, tools, and shell environment match the project you are editing.</p>
    <button class="primary" type="button" onclick={() => postToHost({ type: "openFolder" })}>
      <span class="codicon codicon-folder-opened"></span> Open folder
    </button>
  {:else if session?.status === "failed"}
    <h1>Pi could not start</h1>
    <p class="onboarding-error">{session.error ?? "Unknown startup error"}</p>
    <div class="onboarding-actions">
      <button class="primary" type="button" onclick={() => postToHost({ type: "retryStart", sessionId: session.id })}>
        <span class="codicon codicon-refresh"></span> Retry
      </button>
      <button type="button" onclick={() => postToHost({ type: "configureExecutable" })}>
        <span class="codicon codicon-terminal"></span> Configure Pi
      </button>
      <button type="button" onclick={() => postToHost({ type: "openSettings" })}>
        <span class="codicon codicon-settings-gear"></span> Settings
      </button>
    </div>
    <p class="onboarding-note">FrostPi expects a working Pi installation and uses its existing providers, extensions, skills, prompts, and session storage.</p>
  {:else}
    <h1>Start a Pi session</h1>
    <p>Create a session to begin working with Pi in this workspace.</p>
    <button class="primary" type="button" onclick={() => postToHost({ type: "createSession" })}>
      <span class="codicon codicon-add"></span> New session
    </button>
  {/if}
</div>
