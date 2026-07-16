import { describe, expect, it, vi } from "vitest";

import { ExtensionUiCoordinator } from "../../src/extension/extension-ui/ExtensionUiCoordinator.js";

describe("Pi extension UI coordination", () => {
  it("removes a dialog after Pi's timeout without sending a late response", () => {
    vi.useFakeTimers();
    const sendExtensionUiResponse = vi.fn();
    const onChange = vi.fn();
    const coordinator = new ExtensionUiCoordinator(
      { sendExtensionUiResponse } as never,
      { onChange, onNotify: vi.fn(), onTitle: vi.fn(), onEditorText: vi.fn() },
    );
    coordinator.handle({ type: "extension_ui_request", id: "r1", method: "confirm", timeout: 500 });
    expect(coordinator.snapshot().pending).toHaveLength(1);
    vi.advanceTimersByTime(500);
    expect(coordinator.snapshot().pending).toHaveLength(0);
    expect(sendExtensionUiResponse).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("strips terminal escape sequences from status text", () => {
    const coordinator = new ExtensionUiCoordinator(
      { sendExtensionUiResponse: vi.fn() } as never,
      { onChange: vi.fn(), onNotify: vi.fn(), onTitle: vi.fn(), onEditorText: vi.fn() },
    );
    coordinator.handle({ type: "extension_ui_request", id: "s1", method: "setStatus", statusKey: "preset", statusText: "\u001b[38;5;202mpreset:research\u001b[39m" });
    expect(coordinator.snapshot().statuses[0]?.text).toBe("preset:research");
  });

  it("returns a user response exactly once", async () => {
    const sendExtensionUiResponse = vi.fn().mockResolvedValue(undefined);
    const coordinator = new ExtensionUiCoordinator(
      { sendExtensionUiResponse } as never,
      { onChange: vi.fn(), onNotify: vi.fn(), onTitle: vi.fn(), onEditorText: vi.fn() },
    );
    coordinator.handle({ type: "extension_ui_request", id: "r1", method: "input" });
    await coordinator.respond("r1", { value: "answer" });
    expect(sendExtensionUiResponse).toHaveBeenCalledWith("r1", { value: "answer" });
    await expect(coordinator.respond("r1", { value: "again" })).rejects.toThrow(/no longer pending/);
  });
});
