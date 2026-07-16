<script lang="ts">
  import type { SessionNoticeView } from "$shared/model/agentTurnModel";
  import MarkdownContent from "./MarkdownContent.svelte";

  let { notice }: { notice: SessionNoticeView } = $props();
</script>

<div class="session-notice" class:session-notice-error={notice.status === "error"}>
  <span class={`codicon codicon-${notice.status === "error" ? "error" : "info"}`}></span>
  <MarkdownContent content={notice.text} />
</div>
