import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const testEnvironment = vi.hoisted(() => ({ cwd: "", piExecutable: "" }));

vi.mock("vscode", () => {
  class EventEmitter<T> {
    readonly listeners = new Set<(value: T) => void>();
    readonly event = (listener: (value: T) => void) => {
      this.listeners.add(listener);
      return { dispose: () => this.listeners.delete(listener) };
    };
    fire(value: T): void { for (const listener of this.listeners) listener(value); }
    dispose(): void { this.listeners.clear(); }
  }

  return {
    EventEmitter,
    ProgressLocation: { Window: 10 },
    QuickPickItemKind: { Separator: -1 },
    Uri: { file: (fsPath: string) => ({ fsPath }) },
    commands: { executeCommand: vi.fn().mockResolvedValue(undefined) },
    window: {
      activeTextEditor: undefined,
      showWarningMessage: vi.fn().mockResolvedValue("Close session"),
    },
    workspace: {
      get workspaceFolders() { return testEnvironment.cwd ? [{ name: "test", uri: { fsPath: testEnvironment.cwd } }] : []; },
      getConfiguration: (section: string) => ({
        get: (key: string, fallback: unknown) => section === "frostpi" && key === "pi.executable" ? testEnvironment.piExecutable : fallback,
      }),
      getWorkspaceFolder: () => undefined,
    },
  };
});

const { SessionRegistry } = await import("../../src/extension/sessions/SessionRegistry.js");

describe("FrostPi session collection", () => {
  const registries: InstanceType<typeof SessionRegistry>[] = [];

  afterEach(async () => {
    await Promise.all(registries.splice(0).map((registry) => registry.dispose()));
  });

  it("rejects prompts while a resumed conversation history is loading", async () => {
    const dir = await mkdtemp(join(tmpdir(), "frostpi-registry-"));
    const sessionFile = join(dir, "session.jsonl");
    await writeFile(sessionFile, `${JSON.stringify({ type: "session", version: 3, id: "resume", cwd: dir })}\n`);
    const fakePi = join(dir, "fake-pi.cjs");
    await writeFile(fakePi, String.raw`#!/usr/bin/env node
const sessionIndex = process.argv.indexOf("--session");
const sessionFile = process.argv[sessionIndex + 1];
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  input += chunk;
  while (input.includes("\n")) {
    const index = input.indexOf("\n");
    const command = JSON.parse(input.slice(0, index));
    input = input.slice(index + 1);
    const response = { type: "response", id: command.id, success: true };
    if (command.type === "get_state") response.data = { model: null, thinkingLevel: "off", isStreaming: false, isCompacting: false, sessionFile, sessionId: "resume" };
    else if (command.type === "get_messages") {
      setTimeout(() => {
        response.data = { messages: [] };
        process.stdout.write(JSON.stringify(response) + "\n");
      }, 1_000);
      continue;
    }
    else if (command.type === "get_available_models") response.data = { models: [] };
    else if (command.type === "get_commands") response.data = { commands: [] };
    else if (command.type === "get_session_stats") response.data = { sessionFile, sessionId: "resume", userMessages: 0, assistantMessages: 0, toolCalls: 0, toolResults: 0, totalMessages: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, cost: 0 };
    process.stdout.write(JSON.stringify(response) + "\n");
  }
});
process.on("SIGTERM", () => process.exit(0));
`);
    testEnvironment.cwd = dir;
    testEnvironment.piExecutable = fakePi;
    const registry = new SessionRegistry(createContext() as never, { error: vi.fn(), info: vi.fn() } as never);
    registries.push(registry);

    const sessionId = await registry.openSession({ path: sessionFile, cwd: dir, title: "Resume", updatedAt: Date.now() });
    expect(registry.snapshot().activeSession?.sessionFile).toBe(sessionFile);
    expect(["queued", "loading"]).toContain(registry.snapshot().activeSession?.historyStatus);
    await expect(registry.sendPrompt(sessionId, "Too early", [])).rejects.toThrow("Wait for conversation history");
  });

  it("replaces an unused new session but retains one after Pi accepts a prompt", async () => {
    testEnvironment.cwd = resolve("test/e2e/fixtures/workspace");
    testEnvironment.piExecutable = resolve("test/e2e/fake-pi.cjs");
    let persisted: unknown;
    const context = {
      workspaceState: {
        get: () => persisted,
        update: (_key: string, value: unknown) => {
          persisted = structuredClone(value);
          return Promise.resolve();
        },
      },
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
    };
    const logger = { error: vi.fn(), info: vi.fn() };
    const registry = new SessionRegistry(context as never, logger as never);
    registries.push(registry);

    const first = await registry.createSession(testEnvironment.cwd);
    expect(registry.snapshot().sessions.map((session) => session.id)).toEqual([first]);
    expect((persisted as { sessions: unknown[] }).sessions).toHaveLength(0);

    const second = await registry.createSession(testEnvironment.cwd);
    expect(registry.snapshot().sessions.map((session) => session.id)).toEqual([second]);

    await registry.sendPrompt(second, "Keep this session", []);
    expect((persisted as { sessions: Array<{ id: string }> }).sessions.map((session) => session.id)).toEqual([second]);

    const third = await registry.createSession(testEnvironment.cwd);
    expect(new Set(registry.snapshot().sessions.map((session) => session.id))).toEqual(new Set([second, third]));
    expect((persisted as { sessions: Array<{ id: string }> }).sessions.map((session) => session.id)).toEqual([second]);
  });
});

function createContext(): {
  workspaceState: { get(): unknown; update(key: string, value: unknown): Promise<void> };
  secrets: { get(): Promise<undefined>; store(): Promise<void>; delete(): Promise<void> };
} {
  let persisted: unknown;
  return {
    workspaceState: {
      get: () => persisted,
      update: (_key, value) => {
        persisted = structuredClone(value);
        return Promise.resolve();
      },
    },
    secrets: {
      get: () => Promise.resolve(undefined),
      store: () => Promise.resolve(),
      delete: () => Promise.resolve(),
    },
  };
}
