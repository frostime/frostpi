<script lang="ts">
  import type { DraftImage } from "../../state/composerDraftStore.svelte";

  let { images, onremove }: { images: DraftImage[]; onremove: (id: string) => void } = $props();
</script>

{#if images.length}
  <div class="attachment-strip">
    {#each images as image (image.id)}
      <div class="attachment-item" title={`${image.name} (${formatSize(image.size)})`}>
        <img src={image.dataUrl} alt={image.name} />
        <div class="attachment-meta"><span>{image.name}</span><small>{formatSize(image.size)}</small></div>
        <button type="button" aria-label={`Remove ${image.name}`} title={`Remove ${image.name}`} onclick={() => onremove(image.id)}><span class="codicon codicon-close"></span></button>
      </div>
    {/each}
  </div>
{/if}

<script lang="ts" module>
  function formatSize(size: number): string {
    return size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(size / 1024)} KB`;
  }
</script>
