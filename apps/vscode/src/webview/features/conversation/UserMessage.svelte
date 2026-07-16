<script lang="ts">
  import type { ConversationMessageView } from "$shared/model/conversationModel";

  import ImageGallery from "./ImageGallery.svelte";
  import MarkdownContent from "./MarkdownContent.svelte";

  let { message }: { message: ConversationMessageView } = $props();
</script>

<article class="message message-user">
  <div class="user-bubble">
    {#each message.blocks as block, index (index)}
      {#if block.type === "text"}<MarkdownContent content={block.text} />{/if}
      {#if block.type === "images"}<ImageGallery images={block.images} />{/if}
      {#if block.type === "error"}<div class="inline-error">{block.text}</div>{/if}
    {/each}
  </div>
</article>
