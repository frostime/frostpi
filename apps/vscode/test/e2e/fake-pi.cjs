#!/usr/bin/env node

let buffer = "";
let sessionName = "E2E session";
const sessionFile = `${process.cwd().replaceAll("\\", "/")}/.frostpi-e2e-session.jsonl`;

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  while (true) {
    const index = buffer.indexOf("\n");
    if (index < 0) break;
    const line = buffer.slice(0, index).replace(/\r$/, "");
    buffer = buffer.slice(index + 1);
    if (!line.trim()) continue;
    handle(JSON.parse(line));
  }
});

function handle(command) {
  if (command.type === "extension_ui_response") return;
  const id = command.id;
  switch (command.type) {
    case "get_state":
      respond(id, {
        model: { provider: "e2e", id: "model", name: "E2E Model", supportsImages: true, reasoning: true },
        thinkingLevel: "medium",
        isStreaming: false,
        isCompacting: false,
        sessionFile,
        sessionId: "e2e-session",
        sessionName,
      });
      break;
    case "get_messages": respond(id, { messages: [] }); break;
    case "get_available_models":
      respond(id, { models: [{ provider: "e2e", id: "model", name: "E2E Model", supportsImages: true, reasoning: true }] });
      break;
    case "get_commands":
      respond(id, { commands: [{ name: "echo", description: "E2E extension command", source: "extension" }] });
      break;
    case "get_session_stats":
      respond(id, {
        sessionFile,
        sessionId: "e2e-session",
        userMessages: 0,
        assistantMessages: 0,
        toolCalls: 0,
        toolResults: 0,
        totalMessages: 0,
        tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        cost: 0,
      });
      break;
    case "set_session_name": sessionName = command.name; respond(id); break;
    case "set_model":
      respond(id, { provider: command.provider, id: command.modelId, name: "E2E Model", supportsImages: true, reasoning: true });
      break;
    case "set_thinking_level": respond(id); break;
    case "abort": respond(id); event({ type: "agent_settled" }); break;
    case "compact":
      event({ type: "compaction_start", reason: "manual" });
      event({
        type: "compaction_end",
        reason: "manual",
        result: {
          summary: `Compacted context${command.customInstructions ? `: ${command.customInstructions}` : ""}`,
          firstKeptEntryId: "kept-entry",
          tokensBefore: 42_000,
          estimatedTokensAfter: 8_000,
          details: {},
        },
        aborted: false,
        willRetry: false,
      });
      respond(id, { summary: "Compacted context", tokensBefore: 42_000 });
      break;
    case "prompt":
      respond(id);
      event({ type: "agent_start" });
      event({ type: "message_start", message: { role: "assistant", timestamp: Date.now(), content: [{ type: "text", text: "E2E response" }] } });
      event({ type: "message_end", message: { role: "assistant", timestamp: Date.now(), stopReason: "stop", content: [{ type: "text", text: "E2E response" }] } });
      event({ type: "agent_settled" });
      break;
    default: respond(id);
  }
}

function respond(id, data) {
  process.stdout.write(`${JSON.stringify({ type: "response", id, success: true, ...(data === undefined ? {} : { data }) })}\n`);
}

function event(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

process.on("SIGTERM", () => process.exit(0));
