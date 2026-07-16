<script lang="ts">
  import type { ConversationMessageView } from "$shared/model/conversationModel";
  import MarkdownContent from "./MarkdownContent.svelte";
  let { message }: { message: ConversationMessageView } = $props();
</script>

<div class:system-error={message.status === "error"} class="system-message">
  <span class={`codicon codicon-${message.status === "error" ? "error" : "info"}`} aria-hidden="true"></span>
  <div>
    {#each message.blocks as block, index (index)}
      {#if block.type === "text" || block.type === "error"}<MarkdownContent content={block.text} />{/if}
    {/each}
  </div>
</div>
