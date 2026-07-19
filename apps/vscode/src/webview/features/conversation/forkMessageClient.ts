import { writable } from "svelte/store";

import type { HostToWebviewMessage } from "$shared/bridge/hostToWebview";
import type { ConversationMessageView } from "$shared/model/conversationModel";
import type { SessionViewModel } from "$shared/model/sessionViewModel";

import { postToHost } from "../../bridge/vscodeBridge";
import { moveDraft, setDraft, type DraftImage } from "../../state/composerDraftStore.svelte";
import { composerFocusTick, showToast } from "../../state/sessionViewStore.svelte";
import { createId } from "../../utils/createId";

interface PendingFork {
  sessionId: string;
  entryId: string;
  images: DraftImage[];
}

const pending = new Map<string, PendingFork>();
export const pendingForkEntryId = writable<string | null>(null);

export function requestMessageFork(session: SessionViewModel, message: ConversationMessageView): void {
  const entryId = message.sourceEntryId;
  if (!entryId || pending.size > 0) return;

  let images: DraftImage[];
  try {
    images = forkDraftImages(message, session);
  } catch (error) {
    showToast("error", error instanceof Error ? error.message : String(error));
    return;
  }

  const requestId = createId("fork");
  pending.set(requestId, { sessionId: session.id, entryId, images });
  pendingForkEntryId.set(entryId);
  postToHost({ type: "forkMessage", requestId, sessionId: session.id, entryId });
}

export function resolveForkResult(message: Extract<HostToWebviewMessage, { type: "forkResult" }>): void {
  const request = pending.get(message.requestId);
  if (!request) return;
  pending.delete(message.requestId);
  pendingForkEntryId.set(null);

  if (!message.ok) {
    showToast("error", message.error ?? "Unable to fork this message.");
    return;
  }
  if (message.cancelled) return;
  if (!message.forkSessionId || !message.originalSessionId) {
    showToast("error", "Pi forked the session, but FrostPi could not restore the Composer draft.");
    return;
  }

  // The live runtime keeps its FrostPi id and becomes the fork. Move the previous
  // draft to the retained original session before replacing the fork draft.
  moveDraft(request.sessionId, message.originalSessionId);
  setDraft(message.forkSessionId, { text: message.text ?? "", images: request.images });
  composerFocusTick.update((value) => value + 1);
}

export function forkDraftImages(message: ConversationMessageView, session: SessionViewModel): DraftImage[] {
  const images = message.blocks.flatMap((block) => block.type === "images" ? block.images : []);
  if (images.length > session.attachmentLimits.maxImages) {
    throw new Error(`This message has more than ${session.attachmentLimits.maxImages} images and cannot be restored exactly.`);
  }
  return images.map((image) => {
    if (!isSupportedMime(image.mimeType)) throw new Error(`Unsupported image type: ${image.mimeType}`);
    if (image.size > session.attachmentLimits.maxImageBytes) {
      throw new Error(`${image.name} exceeds the current image size limit.`);
    }
    const separator = image.dataUrl.indexOf(",");
    if (separator < 0) throw new Error(`${image.name} has invalid image data.`);
    return {
      id: image.id,
      name: image.name,
      mimeType: image.mimeType,
      data: image.dataUrl.slice(separator + 1),
      dataUrl: image.dataUrl,
      size: image.size,
    };
  });
}

function isSupportedMime(mimeType: string): mimeType is DraftImage["mimeType"] {
  return mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/webp";
}
