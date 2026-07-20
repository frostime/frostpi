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

<style>
.image-gallery { display: flex; flex-wrap: wrap; gap: 7px; margin: 7px 0 2px; }
.image-thumb {
  position: relative;
  width: 112px;
  height: 78px;
  padding: 0;
  overflow: hidden;
  background: var(--frost-bg-alt);
  border: 1px solid var(--frost-border);
  border-radius: 7px;
  cursor: zoom-in;
}
.image-thumb :global(img) { width: 100%; height: 100%; object-fit: cover; }
.image-thumb :global(span) {
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: 3px;
  padding: 2px 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 3px;
  background: rgba(0,0,0,.58);
  color: white;
  font-size: 9px;
}
.image-lightbox {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(0,0,0,.72);
  backdrop-filter: blur(4px);
}
.image-lightbox :global(img) {
  max-width: 92vw;
  max-height: 86vh;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 20px 60px rgba(0,0,0,.5);
}
.lightbox-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(20,20,20,.75);
  color: white;
  cursor: pointer;
}
</style>
