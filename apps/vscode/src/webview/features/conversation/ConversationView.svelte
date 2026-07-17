<script lang="ts">
  import type { AgentTurnView, SessionNoticeView } from "$shared/model/agentTurnModel";
  import type { CompactionView } from "$shared/model/conversationModel";
  import type { SessionViewModel } from "$shared/model/sessionViewModel";
  import { onDestroy, onMount } from "svelte";

  import NewUpdatesButton from "../scrolling/NewUpdatesButton.svelte";
  import { INITIAL_SCROLL_FOLLOW_STATE, reduceScrollFollow } from "../scrolling/scrollFollowState";
  import AgentTurn from "./AgentTurn.svelte";
  import CompactionBlock from "./CompactionBlock.svelte";
  import SessionNotice from "./SessionNotice.svelte";

  let { session }: { session: SessionViewModel } = $props();
  let scroller: HTMLDivElement;
  let content: HTMLDivElement;
  let followState = $state({ ...INITIAL_SCROLL_FOLLOW_STATE });
  let lastUpdatedAt = 0;
  let lastTurnCount = 0;
  let programmaticScroll = false;
  let resizeObserver: ResizeObserver | null = null;

  type TimelineItem =
    | { kind: "turn"; timestamp: number; value: AgentTurnView }
    | { kind: "notice"; timestamp: number; value: SessionNoticeView }
    | { kind: "compaction"; timestamp: number; value: CompactionView };

  const timeline = $derived.by<TimelineItem[]>(() => [
    ...session.turns.map((value) => ({ kind: "turn" as const, timestamp: value.startedAt, value })),
    ...session.notices.map((value) => ({ kind: "notice" as const, timestamp: value.timestamp, value })),
    ...session.compactions.map((value) => ({ kind: "compaction" as const, timestamp: value.timestamp, value })),
  ].sort((left, right) => left.timestamp - right.timestamp));

  onMount(() => {
    resizeObserver = new ResizeObserver(() => {
      if (followState.mode === "following") scrollToBottom(false);
    });
    resizeObserver.observe(content);
    requestAnimationFrame(() => scrollToBottom(false));
  });

  onDestroy(() => resizeObserver?.disconnect());

  $effect(() => {
    const updatedAt = session.updatedAt;
    const turnCount = session.turns.length;
    if (!scroller || updatedAt === lastUpdatedAt) return;
    const isNewTurn = turnCount > lastTurnCount;
    lastUpdatedAt = updatedAt;
    lastTurnCount = turnCount;
    if (isNewTurn) {
      followState = reduceScrollFollow(followState, { type: "contentUpdate", newTurn: true });
      requestAnimationFrame(() => scrollToBottom(false));
    } else {
      followState = reduceScrollFollow(followState, { type: "contentUpdate", newTurn: false });
      if (followState.mode === "following") requestAnimationFrame(() => scrollToBottom(false));
    }
  });

  function handleScroll(): void {
    if (!scroller) return;
    followState = reduceScrollFollow(followState, {
      type: "userScroll",
      distanceFromBottom: distanceFromBottom(),
      threshold: 64,
      programmatic: programmaticScroll,
    });
  }

  function resumeFollowing(): void {
    followState = reduceScrollFollow(followState, { type: "resume" });
    scrollToBottom(true);
  }

  function scrollToBottom(smooth: boolean): void {
    if (!scroller) return;
    programmaticScroll = true;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    window.setTimeout(() => { programmaticScroll = false; }, smooth ? 220 : 0);
  }

  function distanceFromBottom(): number {
    return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
  }
</script>

<div class="conversation-frame">
  <div class="conversation" bind:this={scroller} onscroll={handleScroll}>
    <div class="conversation-inner" bind:this={content}>
      {#if timeline.length === 0}
        <div class="conversation-empty">
          <div class="empty-orbit"><span>π</span></div>
          <h2>What are you working on?</h2>
          <p>Ask Pi to inspect code, make changes, run commands, or explain the current project.</p>
        </div>
      {:else}
        {#each timeline as item (`${item.kind}-${item.value.id}`)}
          {#if item.kind === "turn"}
            <AgentTurn turn={item.value} />
          {:else if item.kind === "compaction"}
            <CompactionBlock compaction={item.value} />
          {:else}
            <SessionNotice notice={item.value} />
          {/if}
        {/each}
      {/if}
      <div class="conversation-tail" aria-hidden="true"></div>
    </div>
  </div>
  {#if followState.mode === "paused"}<NewUpdatesButton count={followState.unseenUpdates} onclick={resumeFollowing} />{/if}
</div>
