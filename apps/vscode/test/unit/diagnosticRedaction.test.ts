import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  env: {},
  version: "test",
  window: {
    createOutputChannel: () => ({
      debug() {},
      dispose() {},
      error() {},
      info() {},
      show() {},
    }),
  },
  workspace: { isTrusted: true },
}));

const { redactDiagnosticText } = await import("../../src/extension/diagnostics/DiagnosticLogger.js");

describe("diagnostic redaction", () => {
  it("removes environment and URL credentials", () => {
    const redacted = redactDiagnosticText("API_TOKEN=abc https://alice:secret@proxy.example Bearer xyz.123");
    expect(redacted).not.toContain("abc");
    expect(redacted).not.toContain("alice");
    expect(redacted).not.toContain("secret");
    expect(redacted).not.toContain("xyz.123");
    expect(redacted).toContain("<redacted>");
  });
});
