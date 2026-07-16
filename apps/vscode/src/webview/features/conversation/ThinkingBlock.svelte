<script lang="ts">
  import { Collapsible } from "bits-ui";

  import MarkdownContent from "./MarkdownContent.svelte";

  let { text, streaming = false }: { text: string; streaming?: boolean } = $props();
  let open = $state(false);
</script>

<Collapsible.Root bind:open class="thinking-block">
  <Collapsible.Trigger class="thinking-trigger">
    <span class="codicon codicon-lightbulb" aria-hidden="true"></span>
    <span>{streaming ? "Thinking" : "Reasoning"}</span>
    {#if streaming}<span class="thinking-pulse"></span>{/if}
    <span class={`codicon codicon-chevron-${open ? "down" : "right"}`} aria-hidden="true"></span>
  </Collapsible.Trigger>
  <Collapsible.Content class="thinking-content">
    <MarkdownContent content={text} />
  </Collapsible.Content>
</Collapsible.Root>
