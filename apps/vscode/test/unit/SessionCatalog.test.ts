import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  window: {},
  ProgressLocation: { Window: 10 },
  QuickPickItemKind: { Separator: -1 },
  Uri: { file: (fsPath: string) => ({ fsPath }) },
  commands: { executeCommand: vi.fn() },
}));

import { readPiSessionMetadata } from "../../src/extension/sessions/SessionCatalog.js";

describe("Pi session metadata", () => {
  const paths: string[] = [];
  afterEach(() => { paths.length = 0; });

  it("reads cwd, session name, and latest user preview from JSONL", async () => {
    const dir = await mkdtemp(join(tmpdir(), "frostpi-session-"));
    const path = join(dir, "sample.jsonl");
    paths.push(path);
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
});
