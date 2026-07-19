import { describe, expect, it } from "vitest";

import { activeUserEntryReferences } from "../../src/extension/conversation/userEntryReferences.js";

describe("active user entry references", () => {
  it("keeps only user messages on the active root-to-leaf path", () => {
    const entries = [
      entry("root", null, "first", 1),
      entry("answer", "root", undefined, 2, "assistant"),
      entry("abandoned", "answer", "approach A", 3),
      entry("active", "answer", "approach B", 4),
    ];

    expect(activeUserEntryReferences(entries, "active")).toEqual([
      { entryId: "root", timestamp: 1, text: "first" },
      { entryId: "active", timestamp: 4, text: "approach B" },
    ]);
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
