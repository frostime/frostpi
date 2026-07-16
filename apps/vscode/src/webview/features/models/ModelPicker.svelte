<script lang="ts">
  import type { RpcModel } from "@frostime/pi-rpc";

  import { postToHost } from "../../bridge/vscodeBridge";
  import ProviderGroup from "./ProviderGroup.svelte";

  let { sessionId, model, models, disabled = false }: { sessionId: string; model: RpcModel | null; models: RpcModel[]; disabled?: boolean } = $props();
  let open = $state(false);
  let query = $state("");

  const groups = $derived.by(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = normalized
      ? models.filter((item) => `${item.provider} ${item.name ?? ""} ${item.id}`.toLowerCase().includes(normalized))
      : models;
    const map = new Map<string, RpcModel[]>();
    for (const item of filtered) map.set(item.provider, [...(map.get(item.provider) ?? []), item]);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  });

  function selectModel(next: RpcModel): void {
    open = false;
    query = "";
    postToHost({ type: "setModel", sessionId, provider: next.provider, modelId: next.id });
  }
</script>

<div class="model-picker">
  <button class="composer-chip model-picker-trigger" type="button" {disabled} onclick={() => open = !open} title={model ? `${model.provider}/${model.id}` : "Choose model"}>
    <span class="codicon codicon-sparkle"></span>
    <span class="chip-text">{model?.name ?? model?.id ?? "Model"}</span>
    <span class="codicon codicon-chevron-up"></span>
  </button>
  {#if open}
    <button class="picker-scrim" type="button" aria-label="Close model picker" onclick={() => open = false}></button>
    <div class="model-picker-panel">
      <div class="picker-header">
        <strong>Choose model</strong>
        <button type="button" aria-label="Refresh models" onclick={() => postToHost({ type: "refreshModels", sessionId })}><span class="codicon codicon-refresh"></span></button>
      </div>
      <div class="picker-search">
        <span class="codicon codicon-search"></span>
        <input bind:value={query} placeholder="Search providers and models" aria-label="Search models" />
      </div>
      <div class="picker-scroll">
        {#if groups.length}
          {#each groups as [provider, providerModels] (provider)}
            <ProviderGroup {provider} models={providerModels} selected={model} onselect={selectModel} />
          {/each}
        {:else}
          <div class="picker-empty">No matching models</div>
        {/if}
      </div>
    </div>
  {/if}
</div>
