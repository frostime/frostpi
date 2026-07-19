import { describe, expect, it } from "vitest";

import { forkDraftImages } from "../../src/webview/features/conversation/forkMessageClient.js";

describe("message fork draft restoration", () => {
  it("restores projected image bytes as Composer attachments", () => {
    const images = forkDraftImages({
      id: "message",
      sourceEntryId: "entry",
      role: "user",
      status: "complete",
      timestamp: 1,
      blocks: [{
        type: "images",
        images: [{ id: "image", name: "shot.png", mimeType: "image/png", dataUrl: "data:image/png;base64,AA==", size: 1 }],
      }],
    }, {
      attachmentLimits: { maxImages: 12, maxImageBytes: 1024 },
    } as never);

    expect(images).toEqual([{
      id: "image",
      name: "shot.png",
      mimeType: "image/png",
      data: "AA==",
      dataUrl: "data:image/png;base64,AA==",
      size: 1,
    }]);
  });

  it("blocks the fork before mutation when an attachment cannot be restored exactly", () => {
    expect(() => forkDraftImages({
      id: "message",
      role: "user",
      status: "complete",
      timestamp: 1,
      blocks: [{
        type: "images",
        images: [{ id: "image", name: "large.png", mimeType: "image/png", dataUrl: "data:image/png;base64,AA==", size: 2048 }],
      }],
    }, {
      attachmentLimits: { maxImages: 12, maxImageBytes: 1024 },
    } as never)).toThrow("exceeds the current image size limit");
  });
});
