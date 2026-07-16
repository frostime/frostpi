<script lang="ts">
  import type { RpcCommandDescriptor, RpcModel } from "@frostime/pi-rpc";
  import type { SessionViewModel } from "$shared/model/sessionViewModel";

  import { postToHost } from "../../bridge/vscodeBridge";
  import { clearDraft, composerDrafts, updateDraft, type DraftImage } from "../../state/composerDraftStore.svelte";
  import { promptSubmissionResult } from "../../state/promptSubmissionStore.svelte";
  import { composerFocusTick, showToast } from "../../state/sessionViewStore.svelte";
  import { createId } from "../../utils/createId";
  import ModelPicker from "../models/ModelPicker.svelte";
  import ThinkingLevelPicker from "../models/ThinkingLevelPicker.svelte";
  import AddContextMenu from "./AddContextMenu.svelte";
  import AttachmentStrip from "./AttachmentStrip.svelte";
  import PromptEditor from "./PromptEditor.svelte";

  let { session }: { session: SessionViewModel } = $props();
  let editor: PromptEditor;
  let pendingRequestId = $state<string | null>(null);

  const draft = $derived($composerDrafts[session.id] ?? { text: "", images: [] });
  const commands = $derived(withLocalCommands(session.commands));
  const canSend = $derived((draft.text.trim().length > 0 || draft.images.length > 0) && session.status !== "starting" && session.status !== "failed" && !pendingRequestId);
  const supportsImages = $derived(modelSupportsImages(session.model));

  $effect(() => {
    $composerFocusTick;
    requestAnimationFrame(() => editor?.focus());
  });

  $effect(() => {
    const result = $promptSubmissionResult;
    if (!result || result.requestId !== pendingRequestId) return;
    if (result.ok) clearDraft(session.id);
    pendingRequestId = null;
  });

  function setText(text: string): void {
    updateDraft(session.id, (current) => ({ ...current, text }));
  }

  function submit(): void {
    if (!canSend) return;
    if (draft.images.length === 0 && draft.text.trim() === "/resume") {
      clearDraft(session.id);
      postToHost({ type: "resumeSession" });
      return;
    }
    const requestId = createId("prompt");
    pendingRequestId = requestId;
    postToHost({
      type: "sendPrompt",
      requestId,
      sessionId: session.id,
      text: draft.text,
      images: draft.images.map(({ id, name, mimeType, data, size }) => ({ id, name, mimeType, data, size })),
    });
  }

  async function handlePastedImages(files: File[]): Promise<void> {
    const accepted: DraftImage[] = [];
    for (const file of files) {
      if (!isSupportedMime(file.type)) {
        showToast("warning", `Unsupported image type: ${file.type}`);
        continue;
      }
      if (file.size > session.attachmentLimits.maxImageBytes) {
        showToast("warning", `${file.name || "Pasted image"} is larger than ${formatBytes(session.attachmentLimits.maxImageBytes)}.`);
        continue;
      }
      const dataUrl = await readDataUrl(file);
      accepted.push({
        id: createId("image"),
        name: file.name || `pasted-image-${Date.now()}.${extensionForMime(file.type)}`,
        mimeType: file.type as DraftImage["mimeType"],
        data: dataUrl.slice(dataUrl.indexOf(",") + 1),
        dataUrl,
        size: file.size,
      });
    }
    if (!accepted.length) return;
    updateDraft(session.id, (current) => {
      const images = [...current.images, ...accepted].slice(0, session.attachmentLimits.maxImages);
      if (current.images.length + accepted.length > session.attachmentLimits.maxImages) {
        showToast("warning", `A prompt can include at most ${session.attachmentLimits.maxImages} images.`);
      }
      return { ...current, images };
    });
  }
</script>

<div class="composer-shell">
  <AttachmentStrip images={draft.images} onremove={(id) => updateDraft(session.id, (current) => ({ ...current, images: current.images.filter((image) => image.id !== id) }))} />
  {#if draft.images.length && session.model && !supportsImages}
    <div class="composer-warning"><span class="codicon codicon-warning"></span> The selected model may not accept images.</div>
  {/if}
  <div class="composer-box" class:composer-running={session.isStreaming}>
    <PromptEditor
      bind:this={editor}
      sessionId={session.id}
      value={draft.text}
      {commands}
      placeholder={session.isStreaming ? "Queue a follow-up…" : "Ask Pi about this workspace…"}
      onchange={setText}
      onsubmit={submit}
      onpasteimages={handlePastedImages}
    />
    <div class="composer-toolbar">
      <div class="composer-toolbar-left">
        <AddContextMenu />
        <ModelPicker sessionId={session.id} model={session.model} models={session.availableModels} disabled={session.status === "starting"} />
        <ThinkingLevelPicker sessionId={session.id} model={session.model} level={session.thinkingLevel} disabled={session.status === "starting"} />
      </div>
      <div class="composer-toolbar-right">
        <span class="send-hint">Ctrl ↵</span>
        {#if session.isStreaming}
          <button class="send-button stop-button" type="button" aria-label="Stop Pi" title="Stop current run" onclick={() => postToHost({ type: "abort", sessionId: session.id })}>
            <span class="codicon codicon-debug-stop"></span>
          </button>
        {:else}
          <button class="send-button" type="button" aria-label="Send to Pi" title="Send (Ctrl+Enter)" disabled={!canSend} onclick={submit}>
            <span class="codicon codicon-arrow-up"></span>
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>

<script lang="ts" module>
  function withLocalCommands(commands: RpcCommandDescriptor[]): RpcCommandDescriptor[] {
    const local: RpcCommandDescriptor = {
      name: "resume",
      description: "Open an existing Pi session for this workspace",
      source: "frostpi",
    };
    return commands.some((command) => command.name === local.name) ? commands : [local, ...commands];
  }

  function modelSupportsImages(model: RpcModel | null): boolean {
    return Boolean(model && (model.supportsImages === true || (Array.isArray(model.input) && model.input.includes("image"))));
  }

  function isSupportedMime(mime: string): boolean {
    return ["image/png", "image/jpeg", "image/webp"].includes(mime);
  }

  function formatBytes(bytes: number): string {
    const megabytes = bytes / 1024 / 1024;
    return `${Number.isInteger(megabytes) ? megabytes.toFixed(0) : megabytes.toFixed(1)} MB`;
  }

  function extensionForMime(mime: string): string {
    return mime === "image/jpeg" ? "jpg" : mime.split("/")[1] ?? "png";
  }

  function readDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error("Unable to read pasted image"));
      reader.readAsDataURL(file);
    });
  }
</script>
