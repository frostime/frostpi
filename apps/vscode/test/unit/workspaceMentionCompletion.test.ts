import { describe, expect, it } from "vitest";

import {
  workspaceMentionEdit,
  workspaceMentionReplaceTo,
} from "../../src/webview/features/composer/workspaceMentionCompletion.js";

describe("workspace mention completion", () => {
  it("finishes file mentions with a space", () => {
    expect(workspaceMentionEdit("src/app.ts", false)).toEqual({ text: "@src/app.ts ", cursorOffset: 12 });
  });

  it("keeps directory mentions open for continued completion", () => {
    expect(workspaceMentionEdit("src/features", true)).toEqual({ text: "@src/features/", cursorOffset: 14 });
  });

  it("keeps the cursor inside quotes for directories containing whitespace", () => {
    expect(workspaceMentionEdit("my docs", true)).toEqual({ text: '@"my docs/"', cursorOffset: 10 });
  });

  it("consumes an existing closing quote only while continuing a quoted mention", () => {
    expect(workspaceMentionReplaceTo('@"my docs/', 10, '"')).toBe(11);
    expect(workspaceMentionReplaceTo("@my", 10, '"')).toBe(10);
  });
});
