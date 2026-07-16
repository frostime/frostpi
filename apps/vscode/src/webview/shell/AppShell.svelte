<script lang="ts">
  import type { SessionSummaryView, SessionViewModel } from "$shared/model/sessionViewModel";

  import Composer from "../features/composer/Composer.svelte";
  import ConversationView from "../features/conversation/ConversationView.svelte";
  import ExtensionUiHost from "../features/extension-ui/ExtensionUiHost.svelte";
  import OnboardingView from "../features/onboarding/OnboardingView.svelte";
  import SessionHeader from "../features/sessions/SessionHeader.svelte";
  import ExtensionWidgets from "./ExtensionWidgets.svelte";
  import SessionMetrics from "./SessionMetrics.svelte";

  let { sessions, active }: { sessions: SessionSummaryView[]; active: SessionViewModel } = $props();
  const aboveWidgets = $derived(active.extensionWidgets.filter((widget) => widget.placement === "above"));
  const belowWidgets = $derived(active.extensionWidgets.filter((widget) => widget.placement === "below"));
</script>

<div class="app-shell">
  <SessionHeader {sessions} {active} />
  {#if active.status === "failed"}
    <OnboardingView session={active} />
  {:else}
    {#key active.id}<ConversationView session={active} />{/key}
    <div class="composer-region">
      <SessionMetrics session={active} />
      <ExtensionWidgets widgets={aboveWidgets} />
      <ExtensionUiHost sessionId={active.id} requests={active.pendingExtensionUi} />
      <Composer session={active} />
      <ExtensionWidgets widgets={belowWidgets} />
    </div>
  {/if}
</div>
