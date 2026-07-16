<script lang="ts">
  import { Collapsible } from "bits-ui";
  import type { RpcModel } from "@frostime/pi-rpc";

  let {
    provider,
    models,
    selected,
    onselect,
  }: {
    provider: string;
    models: RpcModel[];
    selected: RpcModel | null;
    onselect: (model: RpcModel) => void;
  } = $props();
  let open = $state(true);
</script>

<Collapsible.Root bind:open class="provider-group">
  <Collapsible.Trigger class="provider-trigger">
    <span class={`codicon codicon-chevron-${open ? "down" : "right"}`}></span>
    <span>{provider}</span>
    <span class="provider-count">{models.length}</span>
  </Collapsible.Trigger>
  <Collapsible.Content class="provider-models">
    {#each models as model (`${model.provider}/${model.id}`)}
      <button
        class:selected={selected?.provider === model.provider && selected?.id === model.id}
        class="model-option"
        type="button"
        onclick={() => onselect(model)}
      >
        <span class="model-option-main">
          <span>{model.name ?? model.id}</span>
          <span class="model-id">{model.id}</span>
        </span>
        <span class="model-capabilities">
          {#if model.reasoning}<span title="Reasoning model" class="codicon codicon-lightbulb"></span>{/if}
          {#if supportsImages(model)}<span title="Supports images" class="codicon codicon-file-media"></span>{/if}
          {#if selected?.provider === model.provider && selected?.id === model.id}<span class="codicon codicon-check"></span>{/if}
        </span>
      </button>
    {/each}
  </Collapsible.Content>
</Collapsible.Root>

<script lang="ts" module>
  function supportsImages(model: RpcModel): boolean {
    return model.supportsImages === true || (Array.isArray(model.input) && model.input.includes("image"));
  }
</script>
