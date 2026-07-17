import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  Uri: { file: (fsPath: string) => ({ fsPath }) },
  workspace: {
    workspaceFolders: [],
    getConfiguration: () => ({ get: (_key: string, fallback: unknown) => fallback }),
  },
}));

const { ProxySecretStore } = await import("../../src/extension/network/ProxySecretStore.js");
const { SessionRuntime } = await import("../../src/extension/sessions/SessionRuntime.js");

describe("Pi session startup and conversation history", () => {
  const runtimes: InstanceType<typeof SessionRuntime>[] = [];

  afterEach(async () => {
    await Promise.all(runtimes.splice(0).map((runtime) => runtime.dispose()));
  });

  it("makes a resumed session ready before explicitly loading a large history", async () => {
    const dir = await mkdtemp(join(tmpdir(), "frostpi-runtime-"));
    const sessionFile = join(dir, "large.jsonl");
    await writeFile(sessionFile, Buffer.alloc(8 * 1024 * 1024 + 1));
    const fakePi = join(dir, "fake-pi.cjs");
    await writeFile(fakePi, String.raw`#!/usr/bin/env node
const sessionIndex = process.argv.indexOf("--session");
const sessionFile = sessionIndex >= 0 ? process.argv[sessionIndex + 1] : undefined;
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  input += chunk;
  while (input.includes("\n")) {
    const index = input.indexOf("\n");
    const command = JSON.parse(input.slice(0, index));
    input = input.slice(index + 1);
    const base = { type: "response", id: command.id, success: true };
    if (command.type === "get_state") base.data = { model: null, thinkingLevel: "off", isStreaming: false, isCompacting: false, sessionFile, sessionId: "history-test" };
    else if (command.type === "get_messages") {
      process.stdout.write(JSON.stringify({ type: "extension_ui_request", id: "notice-during-history", method: "notify", message: "Notice during history load" }) + "\n");
      process.stdout.write(JSON.stringify({ type: "message_start", message: { id: "live-assistant", role: "assistant", timestamp: 2, content: [{ type: "text", text: "Live response" }] } }) + "\n");
      process.stdout.write(JSON.stringify({ type: "message_end", message: { id: "live-assistant", role: "assistant", timestamp: 2, stopReason: "stop", content: [{ type: "text", text: "Live response" }] } }) + "\n");
      setTimeout(() => {
        base.data = { messages: [{ role: "user", content: "Earlier request", timestamp: 1 }] };
        process.stdout.write(JSON.stringify(base) + "\n");
      }, 25);
      continue;
    }
    else if (command.type === "prompt") {
      process.stdout.write(JSON.stringify(base) + "\n");
      process.stdout.write(JSON.stringify({ type: "agent_start" }) + "\n");
      continue;
    }
    else if (command.type === "get_available_models") base.data = { models: [] };
    else if (command.type === "get_commands") base.data = { commands: [] };
    else if (command.type === "get_session_stats") base.data = { sessionFile, sessionId: "history-test", userMessages: 1, assistantMessages: 0, toolCalls: 0, toolResults: 0, totalMessages: 1, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, cost: 0 };
    process.stdout.write(JSON.stringify(base) + "\n");
  }
});
process.on("SIGTERM", () => process.exit(0));
`);

    const configuration = {
      piExecutable: fakePi,
      piArguments: [],
      startSessionOnOpen: true,
      streamingBehavior: "followUp" as const,
      maxImageBytes: 10 * 1024 * 1024,
      diagnosticsLevel: "info" as const,
      proxy: { mode: "inherit" as const },
      fileMentionMaxFiles: 50_000,
      fileMentionRespectSearchExclude: true,
    };
    const secrets = new ProxySecretStore({ get: () => Promise.resolve(undefined) } as never);
    const logger = { error: vi.fn(), info: vi.fn() };
    const runtime = new SessionRuntime("session", dir, "History", Date.now(), () => configuration, secrets, logger as never, {
      onChange: vi.fn(),
      onEditorText: vi.fn(),
    });
    runtimes.push(runtime);

    await runtime.start(sessionFile);
    expect(runtime.view.status).toBe("ready");
    expect(runtime.view.historyStatus).toBe("queued");
    expect(runtime.view.turns).toHaveLength(0);

    await runtime.loadHistory(false);
    expect(runtime.view.historyStatus).toBe("deferred");
    expect(runtime.view.turns).toHaveLength(0);

    const repeatedAutomaticLoad = runtime.loadHistory(false);
    const explicitLoad = runtime.loadHistory(true);
    await Promise.all([repeatedAutomaticLoad, explicitLoad]);
    expect(runtime.view.historyStatus).toBe("loaded");
    expect(runtime.view.turns).toHaveLength(2);
    expect(runtime.view.turns.flatMap((turn) => turn.activities)).toContainEqual(
      expect.objectContaining({ type: "response", blocks: [{ type: "text", text: "Live response" }] }),
    );
    expect(runtime.view.notices).toEqual([
      expect.objectContaining({ text: "Notice during history load" }),
    ]);

    await runtime.sendPrompt("New request", []);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(runtime.view.isStreaming).toBe(true);
    runtime.markHistoryWaiting();
    await expect(runtime.loadHistory(true)).rejects.toThrow("Stop the running session");
    expect(runtime.view.historyStatus).toBe("deferred");
  });
});
