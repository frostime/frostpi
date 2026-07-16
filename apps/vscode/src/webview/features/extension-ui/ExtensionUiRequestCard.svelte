<script lang="ts">
  import type { PendingExtensionUiView } from "$shared/model/extensionUiModel";
  import { postToHost } from "../../bridge/vscodeBridge";

  let { sessionId, request }: { sessionId: string; request: PendingExtensionUiView } = $props();
  let value = $state("");
  let initializedRequestId = $state("");

  $effect(() => {
    if (initializedRequestId === request.id) return;
    initializedRequestId = request.id;
    value = request.prefill ?? "";
  });

  function cancel(): void {
    postToHost({ type: "respondExtensionUi", sessionId, requestId: request.id, response: { cancelled: true } });
  }

  function submitValue(): void {
    postToHost({ type: "respondExtensionUi", sessionId, requestId: request.id, response: { value } });
  }
</script>

<section class="extension-ui-card" aria-labelledby={`extension-ui-${request.id}`}>
  <div class="extension-ui-heading">
    <span class="codicon codicon-question"></span>
    <div>
      <strong id={`extension-ui-${request.id}`}>{request.title}</strong>
      {#if request.message}<p>{request.message}</p>{/if}
    </div>
  </div>

  {#if request.method === "select"}
    <div class="extension-select-options">
      {#each request.options ?? [] as option (option)}
        <button type="button" onclick={() => postToHost({ type: "respondExtensionUi", sessionId, requestId: request.id, response: { value: option } })}>{option}</button>
      {/each}
    </div>
    <div class="extension-ui-actions"><button class="secondary" type="button" onclick={cancel}>Cancel</button></div>
  {:else if request.method === "confirm"}
    <div class="extension-ui-actions">
      <button class="secondary" type="button" onclick={() => postToHost({ type: "respondExtensionUi", sessionId, requestId: request.id, response: { confirmed: false } })}>No</button>
      <button class="primary" type="button" onclick={() => postToHost({ type: "respondExtensionUi", sessionId, requestId: request.id, response: { confirmed: true } })}>Yes</button>
    </div>
  {:else if request.method === "editor"}
    <textarea class="extension-editor" bind:value rows="7" aria-label={request.title}></textarea>
    <div class="extension-ui-actions">
      <button class="secondary" type="button" onclick={cancel}>Cancel</button>
      <button class="primary" type="button" onclick={submitValue}>Submit</button>
    </div>
  {:else}
    <input
      class="extension-input"
      bind:value
      placeholder={request.placeholder ?? ""}
      aria-label={request.title}
      onkeydown={(event) => event.key === "Enter" && submitValue()}
    />
    <div class="extension-ui-actions">
      <button class="secondary" type="button" onclick={cancel}>Cancel</button>
      <button class="primary" type="button" onclick={submitValue}>Submit</button>
    </div>
  {/if}
</section>
