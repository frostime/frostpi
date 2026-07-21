import { describe, expect, it } from "vitest";

import { shouldStartPromptCompletion } from "../../src/webview/features/composer/completionPolicy.js";

describe("prompt completion activation", () => {
  it("opens file completion for an empty or partial @ mention", () => {
    expect(shouldStartPromptCompletion("@", 1)).toBe(true);
    expect(shouldStartPromptCompletion("Inspect @Session", 16)).toBe(true);
    expect(shouldStartPromptCompletion('Inspect @"docs/design', 21)).toBe(true);
    expect(shouldStartPromptCompletion('Inspect @"my docs/"', 18)).toBe(true);
  });

  it("opens command completion only for the first non-whitespace token", () => {
    expect(shouldStartPromptCompletion("/", 1)).toBe(true);
    expect(shouldStartPromptCompletion("  /review", 9)).toBe(true);
    expect(shouldStartPromptCompletion("Please run /review", 18)).toBe(false);
  });

  it("does not open completion after a completed token", () => {
    expect(shouldStartPromptCompletion("@src/a.ts ", 10)).toBe(false);
    expect(shouldStartPromptCompletion("/review argument", 16)).toBe(false);
  });
});
