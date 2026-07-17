import { resolve } from "node:path";

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
