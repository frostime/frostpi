import { describe, expect, it } from "vitest";

import { BRIDGE_VERSION } from "../../src/shared/bridge/bridgeVersion.js";
import { webviewToHostSchema } from "../../src/shared/bridge/webviewToHost.js";

describe("Webview bridge validation", () => {
  it("accepts a correlated image prompt", () => {
    const parsed = webviewToHostSchema.safeParse({
      bridgeVersion: BRIDGE_VERSION, type: "sendPrompt", requestId: "request-1", sessionId: "session-1", text: "inspect",
      images: [{ id: "image-1", name: "shot.png", mimeType: "image/png", data: "AA==", size: 1 }],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects uncorrelated prompt submissions and excessive attachments", () => {
    expect(webviewToHostSchema.safeParse({ bridgeVersion: BRIDGE_VERSION, type: "sendPrompt", sessionId: "s", text: "x", images: [] }).success).toBe(false);
    const images = Array.from({ length: 13 }, (_, index) => ({ id: String(index), name: `${index}.png`, mimeType: "image/png", data: "AA==", size: 1 }));
    expect(webviewToHostSchema.safeParse({ bridgeVersion: BRIDGE_VERSION, type: "sendPrompt", requestId: "r", sessionId: "s", text: "x", images }).success).toBe(false);
  });

  it("accepts local session, history, and correlated message-fork actions", () => {
    expect(webviewToHostSchema.safeParse({ bridgeVersion: BRIDGE_VERSION, type: "resumeSession" }).success).toBe(true);
    expect(webviewToHostSchema.safeParse({ bridgeVersion: BRIDGE_VERSION, type: "loadHistory", sessionId: "session-1" }).success).toBe(true);
    expect(webviewToHostSchema.safeParse({ bridgeVersion: BRIDGE_VERSION, type: "cancelFork", sessionId: "session-1" }).success).toBe(true);
    expect(webviewToHostSchema.safeParse({
      bridgeVersion: BRIDGE_VERSION,
      type: "forkMessage",
      requestId: "fork-1",
      sessionId: "session-1",
      entryId: "entry-1",
    }).success).toBe(true);
  });

  it("rejects incompatible bridge versions", () => {
    expect(webviewToHostSchema.safeParse({ bridgeVersion: "stale-version", type: "ready" }).success).toBe(false);
  });
});
