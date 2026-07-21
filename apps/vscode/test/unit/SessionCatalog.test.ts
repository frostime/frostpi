import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, normalize, resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  window: {},
  ProgressLocation: { Window: 10 },
  QuickPickItemKind: { Separator: -1 },
  Uri: { file: (fsPath: string) => ({ fsPath }) },
  commands: { executeCommand: vi.fn() },
}));

import { buildSessionQuickPickItems, discoverPiSessions, readPiSessionMetadata, resolveSessionRoots } from "../../src/extension/sessions/SessionCatalog.js";
import type { SessionWorkingDirectory } from "../../src/extension/sessions/SessionWorkingDirectories.js";

describe("Pi session metadata", () => {
  it("reads cwd, session name, and latest user preview from JSONL", async () => {
    const dir = await mkdtemp(join(tmpdir(), "frostpi-session-"));
    const path = join(dir, "sample.jsonl");
    await writeFile(path, [
      JSON.stringify({ type: "session", version: 3, id: "session-id", cwd: dir }),
      JSON.stringify({ type: "message", message: { role: "user", content: [{ type: "text", text: "Inspect the authentication flow" }] } }),
      JSON.stringify({ type: "session_info", name: "Auth audit" }),
    ].join("\n"));

    const entry = await readPiSessionMetadata(path);
    expect(entry).toMatchObject({ path, cwd: dir, title: "Auth audit", sessionId: "session-id", preview: "Inspect the authentication flow" });
  });

  it("rejects arbitrary JSONL files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "frostpi-session-"));
    const path = join(dir, "not-session.jsonl");
    await writeFile(path, JSON.stringify({ type: "event", cwd: dir }));
    expect(await readPiSessionMetadata(path)).toBeUndefined();
  });

  it("keeps an early auto-name when later transcript pushes it out of the tail window", async () => {
    const dir = await mkdtemp(join(tmpdir(), "frostpi-session-"));
    const path = join(dir, "auto-named.jsonl");
    const pad = "x".repeat(8_000);
    const lines = [
      JSON.stringify({ type: "session", version: 3, id: "early-name", cwd: dir }),
      JSON.stringify({ type: "message", message: { role: "user", content: [{ type: "text", text: "first prompt" }] } }),
      JSON.stringify({ type: "session_info", name: "26-07-18T14:30_自动标题" }),
    ];
    // ~400 KiB of later turns so the name sits only in the head window.
    for (let i = 0; i < 55; i += 1) {
      lines.push(JSON.stringify({
        type: "message",
        message: { role: "user", content: [{ type: "text", text: `follow-up ${i} ${pad}` }] },
      }));
    }
    await writeFile(path, lines.join("\n"));

    const entry = await readPiSessionMetadata(path);
    expect(entry?.title).toBe("26-07-18T14:30_自动标题");
  });

  it("prefers a later rename over an earlier session_info", async () => {
    const dir = await mkdtemp(join(tmpdir(), "frostpi-session-"));
    const path = join(dir, "renamed.jsonl");
    await writeFile(path, [
      JSON.stringify({ type: "session", version: 3, id: "rename", cwd: dir }),
      JSON.stringify({ type: "session_info", name: "Old title" }),
      JSON.stringify({ type: "message", message: { role: "user", content: [{ type: "text", text: "continue" }] } }),
      JSON.stringify({ type: "session_info", name: "New title" }),
    ].join("\n"));

    expect((await readPiSessionMetadata(path))?.title).toBe("New title");
  });

  it("treats an empty latest session_info name as cleared", async () => {
    const dir = await mkdtemp(join(tmpdir(), "frostpi-session-"));
    const path = join(dir, "cleared.jsonl");
    await writeFile(path, [
      JSON.stringify({ type: "session", version: 3, id: "clear", cwd: dir }),
      JSON.stringify({ type: "message", message: { role: "user", content: [{ type: "text", text: "fallback preview" }] } }),
      JSON.stringify({ type: "session_info", name: "Named" }),
      JSON.stringify({ type: "session_info", name: "   " }),
    ].join("\n"));

    expect((await readPiSessionMetadata(path))?.title).toBe("fallback preview");
  });
});

describe("session discovery across worktrees", () => {
  it("resolves project session roots for every allowed working directory", async () => {
    const main = await mkdtemp(join(tmpdir(), "frostpi-main-worktree-"));
    const linked = await mkdtemp(join(tmpdir(), "frostpi-linked-worktree-"));
    for (const [cwd, title] of [[main, "Main session"], [linked, "Linked session"]] as const) {
      const sessionDir = join(cwd, ".pi", "sessions");
      await mkdir(sessionDir, { recursive: true });
      await writeFile(join(cwd, ".pi", "settings.json"), JSON.stringify({ sessionDir: ".pi/sessions" }));
      await writeFile(join(sessionDir, `${title}.jsonl`), [
        JSON.stringify({ type: "session", version: 3, id: title, cwd }),
        JSON.stringify({ type: "session_info", name: title }),
      ].join("\n"));
    }
    const directories: SessionWorkingDirectory[] = [
      { cwd: main, workspaceFolderCwd: main, worktreeRoot: main, directoryName: "main", branch: "main", isCurrent: true },
      { cwd: linked, workspaceFolderCwd: main, worktreeRoot: linked, directoryName: "linked", branch: "feature", isCurrent: false },
    ];

    const sessions = await discoverPiSessions(
      directories,
      [],
      (cwd) => Promise.resolve([join(cwd, ".pi", "sessions")]),
    );
    const quickPickItems = buildSessionQuickPickItems(sessions, directories);

    expect(new Set(sessions.map((session) => session.title))).toEqual(new Set(["Main session", "Linked session"]));
    expect(quickPickItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "main · main · Current workspace", kind: -1 }),
      expect.objectContaining({ label: "feature · linked", kind: -1 }),
    ]));
    expect(quickPickItems.find((item) => item.label === "$(comment-discussion) Main session")?.description)
      .toContain("main · main · Current workspace");
    expect(quickPickItems.find((item) => item.label === "$(comment-discussion) Linked session")?.description)
      .toContain("feature · linked");
  });
});

describe("session root resolution", () => {
  it("resolves project sessionDir relative to the workspace cwd, not the settings file directory", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "frostpi-roots-"));
    await mkdir(join(cwd, ".pi"), { recursive: true });
    await writeFile(join(cwd, ".pi", "settings.json"), JSON.stringify({ sessionDir: ".pi/sessions" }));

    const roots = await resolveSessionRoots(cwd, []);
    expect(roots).toContain(normalize(resolve(cwd, ".pi", "sessions")));
    expect(roots).not.toContain(normalize(resolve(cwd, ".pi", ".pi", "sessions")));
  });

  it("resolves a bare relative project sessionDir against the workspace cwd", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "frostpi-roots-"));
    await mkdir(join(cwd, ".pi"), { recursive: true });
    await writeFile(join(cwd, ".pi", "settings.json"), JSON.stringify({ sessionDir: "sessions" }));

    const roots = await resolveSessionRoots(cwd, []);
    expect(roots).toContain(normalize(resolve(cwd, "sessions")));
  });

  it("resolves --session-dir against the workspace cwd", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "frostpi-roots-"));
    const roots = await resolveSessionRoots(cwd, ["--session-dir", "custom-sessions"]);
    expect(roots).toContain(normalize(resolve(cwd, "custom-sessions")));
  });
});
