import { access, readFile, writeFile } from "node:fs/promises";

import { beforeEach, describe, expect, it, vi } from "vitest";

const vscodeMock = vi.hoisted(() => {
  class EventEmitter<T> {
    readonly listeners = new Set<(value: T) => void>();
    readonly event = (listener: (value: T) => void) => {
      this.listeners.add(listener);
      return { dispose: () => this.listeners.delete(listener) };
    };
    fire(value: T): void {
      for (const listener of this.listeners) listener(value);
    }
    dispose(): void {
      this.listeners.clear();
    }
  }

  type MockDocument = { uri: { fsPath: string }; getText(): string };
  const closeEmitter = new EventEmitter<MockDocument>();
  const documents: MockDocument[] = [];

  return {
    closeEmitter,
    documents,
    reset() {
      documents.length = 0;
      closeEmitter.dispose();
    },
    Uri: {
      file: (fsPath: string) => ({ fsPath, scheme: "file", toString: () => `file:${fsPath}` }),
    },
    workspace: {
      onDidCloseTextDocument: closeEmitter.event.bind(closeEmitter),
      get textDocuments() {
        return documents;
      },
      openTextDocument: vi.fn(async (uri: { fsPath: string }) => {
        const body = await readFile(uri.fsPath, "utf8");
        const document: MockDocument = {
          uri: { fsPath: uri.fsPath },
          getText: () => body,
        };
        documents.push(document);
        return document;
      }),
    },
    window: {
      showTextDocument: vi.fn(async () => undefined),
    },
  };
});

vi.mock("vscode", () => ({
  Uri: vscodeMock.Uri,
  workspace: vscodeMock.workspace,
  window: vscodeMock.window,
}));

const { ComposerExternalEditor } = await import("../../src/extension/editor-context/ComposerExternalEditor.js");

describe("ComposerExternalEditor", () => {
  beforeEach(() => {
    vscodeMock.reset();
    vscodeMock.workspace.openTextDocument.mockClear();
    vscodeMock.window.showTextDocument.mockClear();
  });

  it("writes a temp markdown file and applies disk contents when the tab closes", async () => {
    const applied: Array<{ sessionId: string; text: string }> = [];
    const editor = new ComposerExternalEditor((result) => applied.push(result), vi.fn());

    await editor.open("session-1", "draft body");
    expect(vscodeMock.workspace.openTextDocument).toHaveBeenCalledOnce();
    expect(vscodeMock.window.showTextDocument).toHaveBeenCalledOnce();

    const document = vscodeMock.documents[0]!;
    await writeFile(document.uri.fsPath, "edited body\n", "utf8");
    vscodeMock.closeEmitter.fire(document);
    await vi.waitFor(() => expect(applied).toEqual([{ sessionId: "session-1", text: "edited body" }]));

    await expect(access(document.uri.fsPath)).rejects.toThrow();
    editor.dispose();
  });

  it("reveals the pending tab instead of opening a second buffer", async () => {
    const alreadyOpen = vi.fn();
    const editor = new ComposerExternalEditor(vi.fn(), alreadyOpen);

    await editor.open("session-1", "first");
    const firstPath = vscodeMock.documents[0]!.uri.fsPath;
    await editor.open("session-2", "second");

    expect(vscodeMock.workspace.openTextDocument).toHaveBeenCalledOnce();
    expect(vscodeMock.window.showTextDocument).toHaveBeenCalledTimes(2);
    expect(alreadyOpen).toHaveBeenCalledOnce();

    editor.dispose();
    await expect(access(firstPath)).rejects.toThrow();
  });
});
