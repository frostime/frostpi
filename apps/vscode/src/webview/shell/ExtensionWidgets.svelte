<script lang="ts">
  import type { ExtensionWidgetView } from "$shared/model/extensionUiModel";
  let { widgets }: { widgets: ExtensionWidgetView[] } = $props();
</script>

{#if widgets.length}
  <div class="extension-widgets">
    {#each widgets as widget (widget.key)}
      <div class="extension-widget">
        <span class="codicon codicon-extensions"></span>
        <pre>{widget.lines.join("\n")}</pre>
      </div>
    {/each}
  </div>
{/if}
