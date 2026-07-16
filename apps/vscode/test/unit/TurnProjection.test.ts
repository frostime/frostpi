import { describe, expect, it } from "vitest";

import { TurnProjection } from "../../src/extension/conversation/TurnProjection.js";

describe("TurnProjection", () => {
  it("keeps reasoning, tools, and response segments in protocol order", () => {
    const projection = new TurnProjection();
    projection.hydrate([
      { role: "user", id: "u1", timestamp: 1, content: "Check release" },
      {
        role: "assistant", id: "a1", timestamp: 2, stopReason: "stop", content: [
          { type: "thinking", thinking: "Inspect repository" },
          { type: "toolCall", id: "t1", name: "bash", arguments: { command: "git status" } },
          { type: "text", text: "The repository is clean." },
        ],
      },
      { role: "toolResult", toolCallId: "t1", toolName: "bash", timestamp: 3, content: [{ type: "text", text: "clean" }] },
    ]);

    expect(projection.snapshot().turns[0]?.activities.map((activity) => activity.type)).toEqual(["reasoning", "tool", "response"]);
    expect(projection.snapshot().turns[0]?.activities[1]).toMatchObject({ type: "tool", tool: { status: "complete", output: "clean" } });
  });

  it("does not attach a new orphan run to the final historical turn", () => {
    const projection = new TurnProjection();
    projection.hydrate([{ role: "user", id: "u1", timestamp: 1, content: "old" }]);
    projection.applyEvent({ type: "agent_start" });
    projection.applyEvent({ type: "message_end", message: { role: "assistant", timestamp: 2, stopReason: "stop", content: [{ type: "text", text: "new" }] } });

    expect(projection.snapshot().turns).toHaveLength(2);
    expect(projection.snapshot().turns[1]?.userMessage).toBeUndefined();
  });

  it("preserves an assistant error when agent_settled follows it", () => {
    const projection = new TurnProjection();
    projection.appendUserPrompt("test", []);
    projection.applyEvent({ type: "agent_start" });
    projection.applyEvent({ type: "message_end", message: { role: "assistant", timestamp: 1, stopReason: "error", content: [{ type: "text", text: "provider failed" }] } });
    projection.applyEvent({ type: "agent_settled" });
    expect(projection.snapshot().turns[0]?.status).toBe("error");
  });
});
