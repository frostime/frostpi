<script lang="ts">
  import OnboardingView from "./features/onboarding/OnboardingView.svelte";
  import AppShell from "./shell/AppShell.svelte";
  import { toastStore, workspaceStore } from "./state/sessionViewStore.svelte";
</script>

<main class="frostpi-root">
  {#if !$workspaceStore.workspacePath}
    <OnboardingView noWorkspace />
  {:else if !$workspaceStore.activeSession}
    <OnboardingView />
  {:else}
    <AppShell sessions={$workspaceStore.sessions} active={$workspaceStore.activeSession} />
  {/if}

  <div class="toast-stack" aria-live="polite">
    {#each $toastStore as toast (toast.id)}
      <div class={`toast toast-${toast.level}`}>
        <span class={`codicon codicon-${toast.level === "error" ? "error" : toast.level === "warning" ? "warning" : "info"}`}></span>
        <span>{toast.message}</span>
      </div>
    {/each}
  </div>
</main>
