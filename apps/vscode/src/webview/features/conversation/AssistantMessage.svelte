<script lang="ts">
  import type { ConversationMessageView } from "$shared/model/conversationModel";

  import Spinner from "../../primitives/Spinner.svelte";
  import ImageGallery from "./ImageGallery.svelte";
  import MarkdownContent from "./MarkdownContent.svelte";
  import ThinkingBlock from "./ThinkingBlock.svelte";

  let { message }: { message: ConversationMessageView } = $props();
</script>

<article class="message message-assistant" class:message-error={message.status === "error"}>
  <div class="assistant-gutter">
    {#if message.status === "streaming"}<Spinner />{:else}<span class="assistant-mark">π</span>{/if}
  </div>
  <div class="assistant-content">
    {#each message.blocks as block, index (index)}
      {#if block.type === "text" && block.text}<MarkdownContent content={block.text} />{/if}
      {#if block.type === "thinking" && block.text}<ThinkingBlock text={block.text} streaming={message.status === "streaming"} />{/if}
      {#if block.type === "images"}<ImageGallery images={block.images} />{/if}
      {#if block.type === "error"}<div class="inline-error">{block.text}</div>{/if}
    {/each}
    {#if message.status === "aborted"}<div class="message-footnote">Stopped by user</div>{/if}
  </div>
</article>
