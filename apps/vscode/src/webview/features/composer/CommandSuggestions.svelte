<script lang="ts">
  import type { RpcCommandDescriptor } from "@frostime/pi-rpc";

  let {
    commands,
    activeIndex,
    onactive,
    onselect,
  }: {
    commands: RpcCommandDescriptor[];
    activeIndex: number;
    onactive: (index: number) => void;
    onselect: (command: RpcCommandDescriptor) => void;
  } = $props();
</script>

{#if commands.length}
  <div class="command-suggestions" role="listbox" aria-label="Pi commands">
    {#each commands as command, index (`${command.source}-${command.name}`)}
      <button
        type="button"
        role="option"
        aria-selected={index === activeIndex}
        class:active={index === activeIndex}
        onmouseenter={() => onactive(index)}
        onmousedown={(event) => event.preventDefault()}
        onclick={() => onselect(command)}
      >
        <span class="command-name">/{command.name}</span>
        <span class="command-description">{command.description ?? command.source}</span>
        <span class={`command-source source-${command.source}`}>{command.source}</span>
      </button>
    {/each}
  </div>
{/if}
