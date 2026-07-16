<script lang="ts">
  import type { ThinkingLevel } from "@frostime/pi-rpc";
  import { postToHost } from "../../bridge/vscodeBridge";

  let { sessionId, level, disabled = false }: { sessionId: string; level: ThinkingLevel; disabled?: boolean } = $props();
  const levels: ThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
</script>

<label class="composer-chip thinking-select" title="Thinking level">
  <span class="codicon codicon-lightbulb"></span>
  <select
    aria-label="Thinking level"
    value={level}
    {disabled}
    onchange={(event) => postToHost({ type: "setThinkingLevel", sessionId, level: event.currentTarget.value as ThinkingLevel })}
  >
    {#each levels as item (item)}<option value={item}>{item}</option>{/each}
  </select>
</label>
