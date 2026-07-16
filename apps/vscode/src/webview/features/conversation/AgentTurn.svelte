<script lang="ts">
  import type { AgentTurnView } from "$shared/model/agentTurnModel";

  import UserMessage from "./UserMessage.svelte";
  import ThinkingActivity from "./ThinkingActivity.svelte";
  import ToolActivity from "./ToolActivity.svelte";
  import ResponseActivity from "./ResponseActivity.svelte";

  let { turn }: { turn: AgentTurnView } = $props();
</script>

<section class="agent-turn" data-turn-id={turn.id}>
  {#if turn.userMessage}<UserMessage message={turn.userMessage} />{/if}
  <div class="turn-activities">
    {#each turn.activities as activity (activity.id)}
      {#if activity.type === "reasoning"}
        <ThinkingActivity {activity} />
      {:else if activity.type === "tool"}
        <ToolActivity {activity} />
      {:else}
        <ResponseActivity {activity} />
      {/if}
    {/each}
  </div>
</section>
