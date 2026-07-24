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
  it("keeps prior turns around a compaction boundary and appends later turns", () => {
    const projection = new SessionProjection("s1", "/workspace", "Session");
    projection.hydrateMessages([
      { role: "user", id: "before", timestamp: 1, content: "Before compaction" },
      { role: "assistant", id: "answer", timestamp: 2, stopReason: "stop", content: [{ type: "text", text: "Earlier answer" }] },
    ]);

    projection.applyEvent({ type: "compaction_start", reason: "manual" });
    projection.applyEvent({
      type: "compaction_end",
      reason: "manual",
      result: { summary: "Earlier work summary", tokensBefore: 42_000 },
      aborted: false,
      willRetry: false,
    });
    projection.applyEvent({ type: "agent_start" });
    projection.applyEvent({ type: "message_end", message: { id: "later", role: "assistant", timestamp: 4, stopReason: "stop", content: [{ type: "text", text: "Later answer" }] } });
    projection.applyEvent({ type: "agent_settled" });

    const view = projection.snapshot();
    expect(view.turns[0]?.userMessage?.blocks).toEqual([{ type: "text", text: "Before compaction" }]);
    expect(view.compactions).toEqual([
      expect.objectContaining({ summary: "Earlier work summary", tokensBefore: 42_000 }),
    ]);
    expect(view.turns.at(-1)?.activities).toEqual([
      expect.objectContaining({ type: "response", blocks: [{ type: "text", text: "Later answer" }] }),
    ]);
  });

  it("restores compaction summaries returned by Pi history", () => {
    const projection = new SessionProjection("s1", "/workspace", "Session");
    projection.hydrateMessages([
      { role: "compactionSummary", summary: "Restored summary", tokensBefore: 80_000, timestamp: 2 },
      { role: "user", id: "kept", content: "Kept message", timestamp: 3 },
    ]);

    projection.applyEvent({
      type: "compaction_end",
      reason: "manual",
      result: { summary: "Restored summary", tokensBefore: 80_000 },
      aborted: false,
      willRetry: false,
    });

    expect(projection.snapshot().compactions).toEqual([
      expect.objectContaining({ summary: "Restored summary", tokensBefore: 80_000, timestamp: 2 }),
    ]);
  });

  it("projects compact session-tree capability and controls", () => {
    const projection = new SessionProjection("s1", "/workspace", "Session");
    projection.setSessionTreeState(true, [{
      branchPointId: "branch",
      anchorEntryId: "user",
      anchorPosition: "before",
      pathCount: 3,
    }]);
    projection.setNavigatingTree(true);

    expect(projection.snapshot()).toMatchObject({
      sessionTreeAvailable: true,
      isNavigatingTree: true,
      branchControls: [{ branchPointId: "branch", anchorEntryId: "user", pathCount: 3 }],
    });
  });

  it("projects multiline session notices with their severity", () => {
    const projection = new SessionProjection("s1", "/workspace", "Session");
    projection.appendNotice("line 1\nline 2", "warning");

    expect(projection.snapshot().notices).toEqual([
      expect.objectContaining({ text: "line 1\nline 2", level: "warning" }),
    ]);
  });

  it("does not mutate timestamps when a view is only read", () => {
    const projection = new SessionProjection("s1", "/workspace", "Session");
    const before = projection.read().updatedAt;
    expect(projection.read().updatedAt).toBe(before);
    expect(projection.snapshot().updatedAt).toBe(before);
  });

});
