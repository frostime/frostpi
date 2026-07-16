<script lang="ts">
  import type { ImageAttachmentView } from "$shared/model/conversationModel";

  let { images }: { images: ImageAttachmentView[] } = $props();
  let selected = $state<ImageAttachmentView | null>(null);
</script>

<div class="image-gallery" aria-label="Image attachments">
  {#each images as image (image.id)}
    <button class="image-thumb" type="button" onclick={() => selected = image} aria-label={`Open ${image.name}`}>
      <img src={image.dataUrl} alt={image.name} />
      <span>{image.name}</span>
    </button>
  {/each}
</div>

{#if selected}
  <div class="image-lightbox" role="presentation" onclick={() => selected = null}>
    <button class="lightbox-close" type="button" aria-label="Close image" onclick={() => selected = null}>
      <span class="codicon codicon-close"></span>
    </button>
    <img src={selected.dataUrl} alt={selected.name} />
  </div>
{/if}
