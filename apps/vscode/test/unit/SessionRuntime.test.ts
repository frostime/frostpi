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
    else if (command.type === "get_entries") base.data = {
      entries: [{ type: "message", id: "history-user-entry", parentId: null, message: { role: "user", content: "Earlier request", timestamp: 1 } }],
      leafId: "history-user-entry",
    };
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

  it("trims slash text, executes extension commands with args, and closes the local turn without agent events", async () => {
    const dir = await mkdtemp(join(tmpdir(), "frostpi-runtime-ext-"));
    const fakePi = join(dir, "fake-pi.cjs");
    await writeFile(fakePi, String.raw`#!/usr/bin/env node
let input = "";
let promptCount = 0;
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  input += chunk;
  while (input.includes("\n")) {
    const index = input.indexOf("\n");
    const command = JSON.parse(input.slice(0, index));
    input = input.slice(index + 1);
    const base = { type: "response", id: command.id, success: true };
    if (command.type === "get_state") {
      base.data = {
        model: null,
        thinkingLevel: "off",
        isStreaming: false,
        isCompacting: false,
        pendingMessageCount: 0,
        sessionFile: undefined,
        sessionId: "extension-cmd",
      };
    } else if (command.type === "get_commands") {
      base.data = {
        commands: [
          { name: "toggle-web-proxy", description: "Toggle proxy", source: "extension" },
          { name: "inspect", description: "Inspect", source: "prompt" },
        ],
      };
    } else if (command.type === "get_available_models") base.data = { models: [] };
    else if (command.type === "get_session_stats") {
      base.data = {
        sessionId: "extension-cmd",
        userMessages: 0,
        assistantMessages: 0,
        toolCalls: 0,
        toolResults: 0,
        totalMessages: 0,
        tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        cost: 0,
      };
    } else if (command.type === "prompt") {
      promptCount += 1;
      process.stdout.write(JSON.stringify({
        type: "extension_ui_request",
        id: "proxy-notify-" + promptCount,
        method: "notify",
        notifyType: "info",
        message: "Proxy enabled\nHTTP_PROXY=http://127.0.0.1:10808\nargs=" + String(command.message),
      }) + "\n");
      process.stdout.write(JSON.stringify(base) + "\n");
      continue;
    }
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
    const runtime = new SessionRuntime("session", dir, "Extension command", Date.now(), () => configuration, secrets, logger as never, {
      onChange: vi.fn(),
      onEditorText: vi.fn(),
    });
    runtimes.push(runtime);

    await runtime.start();
    await waitFor(() => runtime.view.commands.some((command) => command.name === "toggle-web-proxy"));

    await runtime.sendPrompt("  /toggle-web-proxy on  ", []);

    expect(runtime.view.isStreaming).toBe(false);
    expect(runtime.view.status).toBe("ready");
    expect(runtime.view.turns).toHaveLength(1);
    expect(runtime.view.turns[0]?.userMessage?.blocks).toEqual([
      { type: "text", text: "/toggle-web-proxy on" },
    ]);
    expect(runtime.view.turns[0]?.status).toBe("completed");
    const notice = runtime.view.turns[0]?.activities.find((activity) => activity.type === "notice");
    expect(notice?.type).toBe("notice");
    if (notice?.type === "notice") {
      expect(notice.text).toContain("args=/toggle-web-proxy on");
    }
  });

  it("does not force-complete a known non-extension slash that starts an agent run", async () => {
    const dir = await mkdtemp(join(tmpdir(), "frostpi-runtime-prompt-"));
    const fakePi = join(dir, "fake-pi.cjs");
    await writeFile(fakePi, String.raw`#!/usr/bin/env node
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  input += chunk;
  while (input.includes("\n")) {
    const index = input.indexOf("\n");
    const command = JSON.parse(input.slice(0, index));
    input = input.slice(index + 1);
    const base = { type: "response", id: command.id, success: true };
    if (command.type === "get_state") {
      base.data = { model: null, thinkingLevel: "off", isStreaming: false, isCompacting: false, pendingMessageCount: 0, sessionId: "prompt-cmd" };
    } else if (command.type === "get_commands") {
      base.data = { commands: [{ name: "inspect", description: "Inspect", source: "prompt" }] };
    } else if (command.type === "get_available_models") base.data = { models: [] };
    else if (command.type === "get_session_stats") {
      base.data = { sessionId: "prompt-cmd", userMessages: 0, assistantMessages: 0, toolCalls: 0, toolResults: 0, totalMessages: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, cost: 0 };
    } else if (command.type === "prompt") {
      process.stdout.write(JSON.stringify(base) + "\n");
      process.stdout.write(JSON.stringify({ type: "agent_start" }) + "\n");
      continue;
    }
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
    const runtime = new SessionRuntime("session", dir, "Prompt command", Date.now(), () => configuration, secrets, logger as never, {
      onChange: vi.fn(),
      onEditorText: vi.fn(),
    });
    runtimes.push(runtime);

    await runtime.start();
    await waitFor(() => runtime.view.commands.some((command) => command.name === "inspect"));

    await runtime.sendPrompt("/inspect src", []);
    await waitFor(() => runtime.view.isStreaming);

    // Misclassifying as extension would force-complete after idle checks.
    expect(runtime.view.turns[0]?.status).toBe("running");
    expect(runtime.view.turns[0]?.userMessage?.blocks).toEqual([{ type: "text", text: "/inspect src" }]);
  });

  it("parks follow-up prompts while streaming and clears them on abort", async () => {
    const dir = await mkdtemp(join(tmpdir(), "frostpi-runtime-followup-"));
    const fakePi = join(dir, "fake-pi.cjs");
    await writeFile(fakePi, String.raw`#!/usr/bin/env node
let input = "";
let streaming = false;
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  input += chunk;
  while (input.includes("\n")) {
    const index = input.indexOf("\n");
    const command = JSON.parse(input.slice(0, index));
    input = input.slice(index + 1);
    const base = { type: "response", id: command.id, success: true };
    if (command.type === "get_state") {
      base.data = { model: null, thinkingLevel: "off", isStreaming: streaming, isCompacting: false, pendingMessageCount: 0, sessionId: "followup" };
    } else if (command.type === "get_commands") base.data = { commands: [] };
    else if (command.type === "get_available_models") base.data = { models: [] };
    else if (command.type === "get_session_stats") {
      base.data = { sessionId: "followup", userMessages: 0, assistantMessages: 0, toolCalls: 0, toolResults: 0, totalMessages: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, cost: 0 };
    } else if (command.type === "prompt") {
      process.stdout.write(JSON.stringify(base) + "\n");
      if (!streaming) {
        streaming = true;
        process.stdout.write(JSON.stringify({ type: "agent_start" }) + "\n");
      }
      continue;
    } else if (command.type === "abort") {
      streaming = false;
      process.stdout.write(JSON.stringify(base) + "\n");
      process.stdout.write(JSON.stringify({ type: "agent_settled" }) + "\n");
      continue;
    }
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
    const runtime = new SessionRuntime("session", dir, "Follow-up", Date.now(), () => configuration, secrets, logger as never, {
      onChange: vi.fn(),
      onEditorText: vi.fn(),
    });
    runtimes.push(runtime);

    await runtime.start();
    await runtime.sendPrompt("first", []);
    await waitFor(() => runtime.view.isStreaming);
    expect(runtime.view.turns).toHaveLength(1);

    await runtime.sendPrompt("queued later", []);
    expect(runtime.view.turns).toHaveLength(1);
    expect(runtime.view.queuedFollowUps.map((item) => item.text)).toEqual(["queued later"]);

    await runtime.abort();
    expect(runtime.view.queuedFollowUps).toEqual([]);
  });
});

async function waitFor(predicate: () => boolean, timeoutMs = 1_000): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error("Timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
