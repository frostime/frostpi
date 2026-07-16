import { describe, expect, it } from "vitest";

import { hydrateConversation } from "../../src/extension/conversation/messageAssembler.js";

describe("Pi history projection", () => {
  it("reconstructs messages and joins a tool result to its tool call", () => {
    const result = hydrateConversation([
      { role: "user", id: "u1", timestamp: 1, content: [{ type: "text", text: "read it" }, { type: "image", mimeType: "image/png", data: "AA==", fileName: "shot.png" }] },
      { role: "assistant", id: "a1", timestamp: 2, stopReason: "stop", content: [
        { type: "thinking", thinking: "inspect" },
        { type: "text", text: "Working" },
        { type: "toolCall", id: "t1", name: "read", arguments: { path: "src/a.ts", line: 7 } },
      ] },
      { role: "toolResult", timestamp: 3, toolCallId: "t1", toolName: "read", isError: false, content: [{ type: "text", text: "file body" }] },
    ]);

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]?.blocks.map((block) => block.type)).toEqual(["text", "images"]);
    expect(result.messages[1]?.blocks.map((block) => block.type)).toEqual(["thinking", "text"]);
    expect(result.toolCalls).toEqual([expect.objectContaining({ id: "t1", name: "read", filePath: "src/a.ts", line: 7, status: "complete", output: "file body" })]);
  });
});
