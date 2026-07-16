<script lang="ts">
  import { postToHost } from "../../bridge/vscodeBridge";
  import IconButton from "../../primitives/IconButton.svelte";

  let open = $state(false);

  function choose(type: "addSelection" | "addCurrentFile"): void {
    open = false;
    postToHost({ type });
  }
</script>

<div class="add-context-menu-wrap">
  {#if open}<button class="picker-scrim" type="button" aria-label="Close context menu" onclick={() => open = false}></button>{/if}
  <IconButton icon="add" label="Add context" active={open} onclick={() => open = !open} />
  {#if open}
    <div class="add-context-menu" role="menu" aria-label="Add context">
      <div class="compact-menu-heading">Add context</div>
      <button type="button" role="menuitem" onclick={() => choose("addSelection")}>
        <span class="codicon codicon-selection"></span>
        <span><strong>Editor selection</strong><small>Add the active selection to the prompt</small></span>
      </button>
      <button type="button" role="menuitem" onclick={() => choose("addCurrentFile")}>
        <span class="codicon codicon-file-code"></span>
        <span><strong>Current file</strong><small>Reference the active workspace file</small></span>
      </button>
      <div class="compact-menu-note"><span class="codicon codicon-file-media"></span> Paste images directly into the editor</div>
    </div>
  {/if}
</div>
