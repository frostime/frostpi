<script lang="ts">
  import type { RpcModel, ThinkingLevel } from "@frostime/pi-rpc";

  import { postToHost } from "../../bridge/vscodeBridge";
  import { getSupportedThinkingLevels, normalizeThinkingLevel } from "./thinkingLevels";

  let {
    sessionId,
    model,
    level,
    disabled = false,
  }: {
    sessionId: string;
    model: RpcModel | null;
    level: ThinkingLevel;
    disabled?: boolean;
  } = $props();

  let open = $state(false);
  const options = $derived(getSupportedThinkingLevels(model));
  const effectiveLevel = $derived(normalizeThinkingLevel(model, level));
  const active = $derived(options.find((option) => option.level === effectiveLevel) ?? options[0]);
  const selectable = $derived(Boolean(model?.reasoning) && options.length > 1 && !disabled);

  function choose(next: ThinkingLevel): void {
    open = false;
    if (next === level) return;
    postToHost({ type: "setThinkingLevel", sessionId, level: next });
  }
</script>

<div class="thinking-picker">
  {#if open}<button class="picker-scrim" type="button" aria-label="Close thinking level picker" onclick={() => open = false}></button>{/if}
  <button
    class="composer-chip thinking-trigger-button"
    class:active={open}
    type="button"
    aria-haspopup="listbox"
    aria-expanded={open}
    title={selectable ? "Change thinking level" : "The active model does not expose configurable thinking levels"}
    disabled={!selectable}
    onclick={() => open = !open}
  >
    <span class="codicon codicon-lightbulb"></span>
    <span class="thinking-chip-copy"><span class="thinking-prefix">Thinking</span><strong>{active?.label ?? "Off"}</strong></span>
    {#if selectable}<span class="codicon codicon-chevron-down thinking-chevron"></span>{/if}
  </button>

  {#if open}
    <div class="thinking-picker-panel" role="listbox" aria-label="Thinking level">
      <div class="thinking-picker-heading">
        <strong>Thinking level</strong>
        <span>{model?.name ?? model?.id}</span>
      </div>
      <div class="thinking-options">
        {#each options as option (option.level)}
          <button
            class:selected={option.level === effectiveLevel}
            type="button"
            role="option"
            aria-selected={option.level === effectiveLevel}
            onclick={() => choose(option.level)}
          >
            <span class="thinking-option-mark">
              {#if option.level === effectiveLevel}<span class="codicon codicon-check"></span>{/if}
            </span>
            <span class="thinking-option-copy">
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
