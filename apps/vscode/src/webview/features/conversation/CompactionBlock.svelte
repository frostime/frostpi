<script lang="ts">
  import type { CompactionView } from "$shared/model/conversationModel";

  import MarkdownContent from "./MarkdownContent.svelte";

  let { compaction }: { compaction: CompactionView } = $props();
  let expanded = $state(false);
</script>

<section class="compaction-block">
  <button
    class="compaction-trigger"
    type="button"
    aria-expanded={expanded}
    aria-label={`${expanded ? "Collapse" : "Expand"} compaction summary from ${compaction.tokensBefore.toLocaleString()} tokens`}
    onclick={() => expanded = !expanded}
  >
    <span class="codicon codicon-fold" aria-hidden="true"></span>
    <span class="compaction-label">Compaction</span>
    <span class="compaction-tokens">Compacted from {compaction.tokensBefore.toLocaleString()} tokens</span>
    <span class={`codicon codicon-chevron-${expanded ? "down" : "right"}`} aria-hidden="true"></span>
  </button>
  {#if expanded}
    <div class="compaction-summary"><MarkdownContent content={compaction.summary} /></div>
  {/if}
</section>
