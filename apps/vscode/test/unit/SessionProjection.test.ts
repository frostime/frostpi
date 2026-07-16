import { describe, expect, it } from "vitest";

import { SessionProjection } from "../../src/extension/conversation/SessionProjection.js";

describe("live Pi event projection", () => {
  it("updates one assistant message throughout a streaming turn and settles it", () => {
    const projection = new SessionProjection("s1", "/workspace", "Session");
    projection.applyEvent({ type: "agent_start" });
    projection.applyEvent({ type: "message_start", message: { role: "assistant", timestamp: 1, content: [{ type: "text", text: "A" }] } });
    projection.applyEvent({ type: "message_update", message: { role: "assistant", timestamp: 1, content: [{ type: "text", text: "AB" }] }, assistantMessageEvent: { type: "text_delta" } });
    projection.applyEvent({ type: "message_end", message: { role: "assistant", timestamp: 1, stopReason: "stop", content: [{ type: "text", text: "ABC" }] } });
    projection.applyEvent({ type: "agent_settled" });

    const view = projection.snapshot();
    expect(view.status).toBe("ready");
    expect(view.isStreaming).toBe(false);
    expect(view.turns).toHaveLength(1);
    expect(view.turns[0]?.activities).toEqual([expect.objectContaining({ type: "response", status: "complete", blocks: [{ type: "text", text: "ABC" }] })]);
  });

  it("projects tool output and terminal error state without dropping the call", () => {
    const projection = new SessionProjection("s1", "/workspace", "Session");
    projection.applyEvent({ type: "tool_execution_start", toolCallId: "t1", toolName: "bash", args: { command: "npm test" } });
    projection.applyEvent({ type: "tool_execution_update", toolCallId: "t1", partialResult: { content: [{ type: "text", text: "running" }] } });
    projection.applyEvent({ type: "tool_execution_end", toolCallId: "t1", isError: true, result: { content: [{ type: "text", text: "failed" }] } });
    const activity = projection.snapshot().turns[0]?.activities[0];
    expect(activity?.type).toBe("tool");
    if (activity?.type === "tool") {
      expect(activity.tool).toMatchObject({ id: "t1", label: "npm test", status: "error", isError: true, output: "failed" });
    }
  });
  it("does not mutate timestamps when a view is only read", () => {
    const projection = new SessionProjection("s1", "/workspace", "Session");
    const before = projection.read().updatedAt;
    expect(projection.read().updatedAt).toBe(before);
    expect(projection.snapshot().updatedAt).toBe(before);
  });

});
