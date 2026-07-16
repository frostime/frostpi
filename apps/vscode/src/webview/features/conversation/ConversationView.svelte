<script lang="ts">
  import type { ConversationMessageView } from "$shared/model/conversationModel";
  import type { SessionViewModel } from "$shared/model/sessionViewModel";
  import type { ToolCallView } from "$shared/model/toolCallModel";

  import ToolCallRow from "../tools/ToolCallRow.svelte";
  import AssistantMessage from "./AssistantMessage.svelte";
  import SystemMessage from "./SystemMessage.svelte";
  import UserMessage from "./UserMessage.svelte";

  let { session }: { session: SessionViewModel } = $props();
  let scroller: HTMLDivElement;
  let wasNearBottom = true;

  type TimelineItem =
    | { kind: "message"; timestamp: number; value: ConversationMessageView }
    | { kind: "tool"; timestamp: number; value: ToolCallView };

  const timeline = $derived.by<TimelineItem[]>(() => [
    ...session.messages.map((value) => ({ kind: "message" as const, timestamp: value.timestamp, value })),
    ...session.toolCalls.map((value) => ({ kind: "tool" as const, timestamp: value.startedAt, value })),
  ].sort((a, b) => a.timestamp - b.timestamp));

  $effect(() => {
    session.updatedAt;
    if (!scroller) return;
    requestAnimationFrame(() => {
      if (wasNearBottom) scroller.scrollTop = scroller.scrollHeight;
    });
  });

  function handleScroll(): void {
    wasNearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;
  }
</script>

<div class="conversation" bind:this={scroller} onscroll={handleScroll}>
  <div class="conversation-inner">
    {#if timeline.length === 0}
      <div class="conversation-empty">
        <div class="empty-orbit"><span>π</span></div>
        <h2>What are you working on?</h2>
        <p>Ask Pi to inspect code, make changes, run commands, or explain the current project.</p>
      </div>
    {:else}
      {#each timeline as item (`${item.kind}-${item.value.id}`)}
        {#if item.kind === "tool"}
          <ToolCallRow tool={item.value} />
        {:else if item.value.role === "user"}
          <UserMessage message={item.value} />
        {:else if item.value.role === "assistant"}
          <AssistantMessage message={item.value} />
        {:else}
          <SystemMessage message={item.value} />
        {/if}
      {/each}
    {/if}
    <div class="conversation-tail" aria-hidden="true"></div>
  </div>
</div>
