<script lang="ts">
  import type { AgentActivityView, AgentTurnView } from "$shared/model/agentTurnModel";
  import type { SessionViewModel } from "$shared/model/sessionViewModel";

  import { formatTraceSummaryLabel, planTurnActivities } from "./collapseTurnTrace";
  import UserMessage from "./UserMessage.svelte";
  import ThinkingActivity from "./ThinkingActivity.svelte";
  import ToolActivity from "./ToolActivity.svelte";
  import ResponseActivity from "./ResponseActivity.svelte";
  import SessionNotice from "./SessionNotice.svelte";

  let { turn, session }: { turn: AgentTurnView; session: SessionViewModel } = $props();

  /** Expanded trace for this turn only; cleared when the turn leaves collapsed mode. */
  let traceOpen = $state(false);

  const plan = $derived(planTurnActivities(turn, session.collapseTurnTrace));
  const summaryLabel = $derived(plan.mode === "collapsed" ? formatTraceSummaryLabel(plan.summary) : "");

  $effect(() => {
    if (plan.mode !== "collapsed") traceOpen = false;
  });
</script>

<section class="agent-turn" data-turn-id={turn.id}>
  {#if turn.userMessage}<UserMessage message={turn.userMessage} {session} />{/if}
  <div class="turn-activities">
    {#if plan.mode === "collapsed"}
      <div class="turn-trace-header">
        <button
          type="button"
          class="activity-trigger turn-trace-trigger"
          aria-expanded={traceOpen}
          aria-label={`${traceOpen ? "Collapse" : "Expand"} work trace: ${summaryLabel}`}
          onclick={() => traceOpen = !traceOpen}
        >
          <span class="codicon codicon-list-tree activity-leading" aria-hidden="true"></span>
          <span class="activity-title">Worked</span>
          <span class="turn-trace-meta">{summaryLabel}</span>
          <span class={`codicon codicon-chevron-${traceOpen ? "down" : "right"} activity-chevron`} aria-hidden="true"></span>
        </button>
      </div>
      {#if traceOpen}
        {#each plan.collapsed as activity (activity.id)}
          {@render activityRow(activity)}
        {/each}
      {/if}
      <div class="turn-trace-divider" aria-hidden="true"></div>
      {#each plan.visible as activity (activity.id)}
        {@render activityRow(activity)}
      {/each}
    {:else}
      {#each plan.activities as activity (activity.id)}
        {@render activityRow(activity)}
      {/each}
    {/if}
  </div>
</section>

{#snippet activityRow(activity: AgentActivityView)}
  {#if activity.type === "reasoning"}
    <ThinkingActivity {activity} />
  {:else if activity.type === "tool"}
    <ToolActivity {activity} />
  {:else if activity.type === "notice"}
    <SessionNotice notice={activity} />
  {:else}
    <ResponseActivity {activity} />
  {/if}
{/snippet}
