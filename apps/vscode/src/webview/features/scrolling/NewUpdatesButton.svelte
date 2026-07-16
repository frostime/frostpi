<script lang="ts">
  let { count, onclick }: { count: number; onclick: () => void } = $props();
</script>

<button class="new-updates-button" type="button" {onclick} aria-label="Jump to latest activity">
  <span class="codicon codicon-arrow-down"></span>
  <span>{count > 0 ? `${count} new update${count === 1 ? "" : "s"}` : "Jump to latest"}</span>
</button>
