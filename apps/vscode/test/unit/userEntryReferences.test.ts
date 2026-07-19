import { describe, expect, it } from "vitest";

import { activeLeafContinues, activeUserEntryReferences } from "../../src/extension/conversation/userEntryReferences.js";

describe("active user entry references", () => {
  it("keeps only user messages on the active root-to-leaf path", () => {
    const entries = [
      entry("root", null, "first", 1),
      entry("answer", "root", undefined, 2, "assistant"),
      entry("abandoned", "answer", "approach A", 3),
      entry("active", "answer", "approach B", 4),
    ];

    expect(activeUserEntryReferences(entries, "active")).toEqual([
      { entryId: "root", timestamp: 1 },
      { entryId: "active", timestamp: 4 },
    ]);
  });

  it("distinguishes normal leaf extension from movement to another branch", () => {
    expect(activeLeafContinues("answer", [
      entry("tool", "answer", undefined, 3, "toolResult"),
      entry("next", "tool", "continue", 4),
    ], "next")).toBe(true);
    expect(activeLeafContinues("abandoned", [], "active")).toBe(false);
    expect(activeLeafContinues("abandoned", [entry("active", "answer", "branch", 4)], "active")).toBe(false);
  });
});

function entry(id: string, parentId: string | null, text: string | undefined, timestamp: number, role = "user") {
  return {
    type: "message",
    id,
    parentId,
    message: {
      role,
      content: text ?? "answer",
      timestamp,
    },
  };
}
