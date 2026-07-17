<script lang="ts">
  import type { SessionNoticeView } from "$shared/model/agentTurnModel";
  import MarkdownContent from "./MarkdownContent.svelte";

  let { notice }: { notice: SessionNoticeView } = $props();
</script>

<div class={`session-notice session-notice-${notice.level}`}>
  <span class={`codicon codicon-${notice.level}`}></span>
  <MarkdownContent content={notice.text} />
</div>
