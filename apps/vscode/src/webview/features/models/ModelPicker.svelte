<script lang="ts">
  import { tick } from "svelte";
  import type { RpcModel } from "@frostime/pi-rpc";

  import { postToHost } from "../../bridge/vscodeBridge";
  import ProviderGroup from "./ProviderGroup.svelte";

  let { sessionId, model, models, disabled = false }: { sessionId: string; model: RpcModel | null; models: RpcModel[]; disabled?: boolean } = $props();
  let open = $state(false);
  let query = $state("");
  let searchInput = $state<HTMLInputElement | null>(null);
  let scrollContainer = $state<HTMLDivElement | null>(null);
  let expandedProviders = $state<Set<string>>(new Set());

  const groups = $derived.by(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = normalized
      ? models.filter((item) => `${item.provider} ${item.name ?? ""} ${item.id}`.toLowerCase().includes(normalized))
      : models;
    const map = new Map<string, RpcModel[]>();
    for (const item of filtered) map.set(item.provider, [...(map.get(item.provider) ?? []), item]);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  });

  const allVisibleOpen = $derived(groups.length > 0 && groups.every(([provider]) => query.trim().length > 0 || expandedProviders.has(provider)));

  function selectModel(next: RpcModel): void {
    open = false;
    query = "";
    postToHost({ type: "setModel", sessionId, provider: next.provider, modelId: next.id });
  }

  async function togglePicker(): Promise<void> {
    if (open) {
      open = false;
      return;
    }

    query = "";
    if (model?.provider && !expandedProviders.has(model.provider)) {
      expandedProviders = new Set(expandedProviders).add(model.provider);
    }
    open = true;

    await tick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (!open) return;

    searchInput?.focus();
    const selected = scrollContainer?.querySelector<HTMLButtonElement>(".model-option.selected");
    if (!selected || !scrollContainer) return;

    const selectedBounds = selected.getBoundingClientRect();
    const containerBounds = scrollContainer.getBoundingClientRect();
    scrollContainer.scrollTop += selectedBounds.top + selectedBounds.height / 2 - (containerBounds.top + containerBounds.height / 2);
  }

  function toggleProvider(provider: string): void {
    const next = new Set(expandedProviders);
    if (next.has(provider)) next.delete(provider);
    else next.add(provider);
    expandedProviders = next;
  }

  function setAllExpanded(expanded: boolean): void {
    expandedProviders = expanded ? new Set(groups.map(([provider]) => provider)) : new Set();
  }
</script>

<div class="model-picker">
  <button class="composer-chip model-picker-trigger" type="button" {disabled} onclick={togglePicker} title={model ? `${model.provider}/${model.id}` : "Choose model"}>
    <span class="codicon codicon-sparkle"></span>
    <span class="chip-text">{model?.name ?? model?.id ?? "Model"}</span>
    <span class={`codicon codicon-chevron-${open ? "down" : "up"}`}></span>
  </button>
  {#if open}
    <button class="picker-scrim" type="button" aria-label="Close model picker" onclick={() => open = false}></button>
    <div class="model-picker-panel">
      <div class="picker-header">
        <strong>Models</strong>
        <div class="picker-header-actions">
          <button type="button" aria-label={allVisibleOpen ? "Collapse all providers" : "Expand all providers"} title={allVisibleOpen ? "Collapse all" : "Expand all"} onclick={() => setAllExpanded(!allVisibleOpen)}>
            <span class={`codicon codicon-${allVisibleOpen ? "collapse-all" : "expand-all"}`}></span>
          </button>
          <button type="button" aria-label="Refresh models" title="Refresh models" onclick={() => postToHost({ type: "refreshModels", sessionId })}><span class="codicon codicon-refresh"></span></button>
        </div>
      </div>
      <div class="picker-search">
        <span class="codicon codicon-search"></span>
        <input bind:this={searchInput} bind:value={query} placeholder="Search models" aria-label="Search models" onkeydown={(event) => { if (event.key === "Escape") open = false; }} />
      </div>
      <div class="picker-scroll" bind:this={scrollContainer}>
        {#if groups.length}
          {#each groups as [provider, providerModels] (provider)}
            <ProviderGroup
              {provider}
              models={providerModels}
              selected={model}
              open={query.trim().length > 0 || expandedProviders.has(provider)}
              toggle={() => toggleProvider(provider)}
              onselect={selectModel}
            />
          {/each}
        {:else}
          <div class="picker-empty">No matching models</div>
        {/if}
      </div>
    </div>
  {/if}
</div>
