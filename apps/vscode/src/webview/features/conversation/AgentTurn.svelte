<script lang="ts">
  import type { AgentTurnView } from "$shared/model/agentTurnModel";
  import type { SessionViewModel } from "$shared/model/sessionViewModel";

  import UserMessage from "./UserMessage.svelte";
  import ThinkingActivity from "./ThinkingActivity.svelte";
  import ToolActivity from "./ToolActivity.svelte";
  import ResponseActivity from "./ResponseActivity.svelte";
  import SessionNotice from "./SessionNotice.svelte";

  let { turn, session }: { turn: AgentTurnView; session: SessionViewModel } = $props();
</script>

<section class="agent-turn" data-turn-id={turn.id}>
  {#if turn.userMessage}<UserMessage message={turn.userMessage} {session} />{/if}
  <div class="turn-activities">
    {#each turn.activities as activity (activity.id)}
      {#if activity.type === "reasoning"}
        <ThinkingActivity {activity} />
      {:else if activity.type === "tool"}
        <ToolActivity {activity} />
      {:else if activity.type === "notice"}
        <SessionNotice notice={activity} />
      {:else}
        <ResponseActivity {activity} />
      {/if}
    {/each}
  </div>
</section>
