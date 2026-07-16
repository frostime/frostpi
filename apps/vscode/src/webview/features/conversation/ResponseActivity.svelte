<script lang="ts">
  import type { ResponseActivityView } from "$shared/model/agentTurnModel";

  import Spinner from "../../primitives/Spinner.svelte";
  import ImageGallery from "./ImageGallery.svelte";
  import MarkdownContent from "./MarkdownContent.svelte";

  let { activity }: { activity: ResponseActivityView } = $props();
</script>

<div class="response-activity" class:response-error={activity.status === "error"}>
  {#each activity.blocks as block, index (index)}
    {#if block.type === "text" && block.text}<MarkdownContent content={block.text} />{/if}
    {#if block.type === "images"}<ImageGallery images={block.images} />{/if}
    {#if block.type === "error"}<div class="inline-error">{block.text}</div>{/if}
  {/each}
  {#if activity.status === "streaming"}<span class="response-streaming"><Spinner /></span>{/if}
  {#if activity.status === "aborted"}<div class="message-footnote">Stopped by user</div>{/if}
</div>
