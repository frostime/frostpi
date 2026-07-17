<script lang="ts">
  import { Collapsible } from "bits-ui";
  import type { ToolActivityView } from "$shared/model/agentTurnModel";

  import { postToHost } from "../../bridge/vscodeBridge";

  let { activity }: { activity: ToolActivityView } = $props();
  let open = $state(false);

  const tool = $derived(activity.tool);
  const icon = $derived(toolIcon(tool.name));
  const statusIcon = $derived(tool.status === "running" ? "loading codicon-modifier-spin" : tool.status === "error" ? "error" : "check");
  const errorSummary = $derived(tool.status === "error" ? firstLine(tool.output) : "");
</script>

<Collapsible.Root bind:open class={`activity-row tool-activity${tool.isError ? " activity-error" : ""}`}>
  <Collapsible.Trigger class="activity-trigger tool-activity-trigger">
    <span class={`codicon codicon-${icon} activity-leading`} aria-hidden="true"></span>
    <span class="tool-activity-name">{tool.name}</span>
    <span class="tool-activity-label" title={tool.label}>{tool.label}</span>
    {#if errorSummary}<span class="tool-error-summary" title={tool.output}>{errorSummary}</span>{/if}
    <span class={`codicon codicon-${statusIcon} activity-status`} aria-hidden="true"></span>
    <span class={`codicon codicon-chevron-${open ? "down" : "right"} activity-chevron`} aria-hidden="true"></span>
  </Collapsible.Trigger>
  <Collapsible.Content class="activity-content tool-activity-content">
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
      <div class="tool-input">
        {#each Object.entries(tool.args) as [key, value] (key)}
          {@const rendered = renderArg(value)}
          {#if rendered.kind === "block"}
            <div class="tool-section-label">{key}</div>
            <pre class="tool-json">{rendered.text}</pre>
          {:else}
            <div class="tool-input-row">
              <span class="tool-input-key">{key}:</span>
              <span class="tool-input-value">{rendered.text}</span>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
    {#if tool.output}
      <div class="tool-section-label">Output</div>
      <pre class="tool-output">{tool.output}</pre>
    {/if}
  </Collapsible.Content>
</Collapsible.Root>

<script lang="ts" module>
  function toolIcon(name: string): string {
    if (["read", "grep", "find", "ls"].includes(name)) return "search";
    if (["edit", "write"].includes(name)) return "edit";
    if (name === "bash") return "terminal";
    return "tools";
  }

  function firstLine(value: string | undefined): string {
    if (!value) return "Failed";
    const line = value.split(/\r?\n/, 1)[0]?.trim() || "Failed";
    return line.length > 72 ? `${line.slice(0, 69)}…` : line;
  }

  interface RenderedArg {
    kind: "inline" | "block";
    text: string;
  }

  function renderArg(value: unknown): RenderedArg {
    if (typeof value === "string") {
      if (value.includes("\n") || value.length > 120) {
        return { kind: "block", text: value };
      }
      return { kind: "inline", text: value };
    }
    if (value === null || value === undefined || typeof value === "number" || typeof value === "boolean") {
      return { kind: "inline", text: String(value) };
    }
    return { kind: "block", text: JSON.stringify(value, null, 2) };
  }
</script>
