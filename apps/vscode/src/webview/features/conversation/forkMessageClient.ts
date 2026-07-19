import { writable } from "svelte/store";

import type { HostToWebviewMessage } from "$shared/bridge/hostToWebview";
import type { ConversationMessageView } from "$shared/model/conversationModel";
import type { SessionViewModel } from "$shared/model/sessionViewModel";

import { postToHost } from "../../bridge/vscodeBridge";
import { setDraft, type DraftImage } from "../../state/composerDraftStore.svelte";
import { composerFocusTick, showToast } from "../../state/sessionViewStore.svelte";
import { createId } from "../../utils/createId";

const pending = new Set<string>();
let appliedComposerSeedId: string | null = null;
export const pendingForkEntryId = writable<string | null>(null);

export function requestMessageFork(session: SessionViewModel, message: ConversationMessageView): void {
  const entryId = message.sourceEntryId;
  if (!entryId || pending.size > 0) return;

  const requestId = createId("fork");
  pending.add(requestId);
  pendingForkEntryId.set(entryId);
  postToHost({ type: "forkMessage", requestId, sessionId: session.id, entryId });
}

export function resolveForkResult(message: Extract<HostToWebviewMessage, { type: "forkResult" }>): void {
  if (!pending.delete(message.requestId)) return;
  pendingForkEntryId.set(null);
  if (!message.ok) showToast("error", message.error ?? "Unable to fork this message.");
}

export function applyForkComposerSeed(session: SessionViewModel | null): boolean {
  const seed = session?.composerSeed;
  if (!session || !seed || appliedComposerSeedId === seed.id) return false;
  const images = seed.images.map(seedImage);
  appliedComposerSeedId = seed.id;
  setDraft(session.id, { text: seed.text, images });
  composerFocusTick.update((value) => value + 1);
  return true;
}

function seedImage(image: NonNullable<SessionViewModel["composerSeed"]>["images"][number]): DraftImage {
  const prefix = `data:${image.mimeType};base64,`;
  return {
    id: image.id,
    name: image.name,
    mimeType: image.mimeType as DraftImage["mimeType"],
    data: image.dataUrl.slice(prefix.length),
    dataUrl: image.dataUrl,
    size: image.size,
  };
}
