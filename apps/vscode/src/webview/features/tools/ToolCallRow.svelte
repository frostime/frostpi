<script lang="ts">
  import { Collapsible } from "bits-ui";

  import type { ToolCallView } from "$shared/model/toolCallModel";
  import { postToHost } from "../../bridge/vscodeBridge";

  let { tool }: { tool: ToolCallView } = $props();
  let open = $state(false);

  $effect(() => {
    if (tool.status === "error") open = true;
  });

  const icon = $derived(toolIcon(tool.name));
  const statusIcon = $derived(tool.status === "running" ? "loading codicon-modifier-spin" : tool.status === "error" ? "error" : "check");

  function toolIcon(name: string): string {
    if (["read", "grep", "find", "ls"].includes(name)) return "search";
    if (["edit", "write"].includes(name)) return "edit";
    if (name === "bash") return "terminal";
    return "tools";
  }
</script>

<Collapsible.Root bind:open class={`tool-row${tool.isError ? " tool-error" : ""}`}>
  <Collapsible.Trigger class="tool-trigger">
    <span class={`codicon codicon-${icon} tool-icon`} aria-hidden="true"></span>
    <span class="tool-name">{tool.name}</span>
    <span class="tool-label" title={tool.label}>{tool.label}</span>
    <span class={`codicon codicon-${statusIcon} tool-status`} aria-hidden="true"></span>
    <span class={`codicon codicon-chevron-${open ? "down" : "right"}`} aria-hidden="true"></span>
  </Collapsible.Trigger>
  <Collapsible.Content class="tool-content">
    <div class="tool-actions">
      {#if tool.filePath}
        <button type="button" onclick={() => postToHost({ type: "openFile", path: tool.filePath!, ...(tool.line ? { line: tool.line } : {}) })}>
          <span class="codicon codicon-go-to-file"></span> Open file
        </button>
        {#if tool.name === "edit" || tool.name === "write"}
          <button type="button" onclick={() => postToHost({ type: "openDiff", path: tool.filePath! })}>
            <span class="codicon codicon-diff"></span> Open diff
          </button>
        {/if}
      {/if}
    </div>
    {#if Object.keys(tool.args).length}
      <div class="tool-section-label">Input</div>
      <pre class="tool-json">{JSON.stringify(tool.args, null, 2)}</pre>
    {/if}
    {#if tool.output}
      <div class="tool-section-label">Output</div>
      <pre class="tool-output">{tool.output}</pre>
    {/if}
  </Collapsible.Content>
</Collapsible.Root>
