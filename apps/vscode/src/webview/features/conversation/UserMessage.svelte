<script lang="ts">
  import type { ConversationMessageView } from "$shared/model/conversationModel";
  import type { SessionViewModel } from "$shared/model/sessionViewModel";

  import ImageGallery from "./ImageGallery.svelte";
  import MarkdownContent from "./MarkdownContent.svelte";
  import { pendingForkEntryId, requestMessageFork } from "./forkMessageClient";

  let { message, session }: { message: ConversationMessageView; session: SessionViewModel } = $props();
  const unavailable = $derived(
    session.status !== "ready" || session.isStreaming || session.isCompacting || session.isForking
    || session.historyStatus !== "loaded" || session.pendingExtensionUi.length > 0,
  );
  const pending = $derived($pendingForkEntryId === message.sourceEntryId);
</script>

<article class="message message-user" data-pi-entry-id={message.sourceEntryId}>
  <div class="user-message-stack">
    <div class="user-bubble">
      {#each message.blocks as block, index (index)}
        {#if block.type === "text"}<MarkdownContent content={block.text} />{/if}
        {#if block.type === "images"}<ImageGallery images={block.images} />{/if}
        {#if block.type === "error"}<div class="inline-error">{block.text}</div>{/if}
      {/each}
    </div>
    {#if message.sourceEntryId}
      <div class="message-actions">
        <button
          type="button"
          aria-label="Fork session from this message"
          title="Fork session from this message"
          disabled={unavailable || $pendingForkEntryId !== null}
          onclick={() => requestMessageFork(session, message)}
        >
          <span class="codicon codicon-git-branch" aria-hidden="true"></span>
          <span>{pending ? "Forking…" : "Fork"}</span>
        </button>
      </div>
    {/if}
  </div>
</article>
