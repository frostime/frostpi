import { randomBytes } from "node:crypto";
import { unlinkSync } from "node:fs";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import * as vscode from "vscode";

export interface ComposerEditorResult {
  sessionId: string;
  text: string;
}

/**
 * One-at-a-time temp markdown file for long-form Composer drafts (Pi external-editor shape).
 * Closing the tab reads the file from disk: Save keeps edits, Don't Save discards them.
 */
export class ComposerExternalEditor implements vscode.Disposable {
  #pending: { sessionId: string; fsPath: string } | null = null;
  readonly #onApply: (result: ComposerEditorResult) => void;
  readonly #onAlreadyOpen: () => void;
  readonly #closeSubscription: vscode.Disposable;

  constructor(onApply: (result: ComposerEditorResult) => void, onAlreadyOpen: () => void) {
    this.#onApply = onApply;
    this.#onAlreadyOpen = onAlreadyOpen;
    this.#closeSubscription = vscode.workspace.onDidCloseTextDocument((document) => {
      void this.#applyClosedDocument(document);
    });
  }

  async open(sessionId: string, text: string): Promise<void> {
    if (this.#pending) {
      const pendingPath = this.#pending.fsPath;
      const open = vscode.workspace.textDocuments.find((document) => samePath(document.uri.fsPath, pendingPath));
      if (open) {
        await vscode.window.showTextDocument(open, { preview: false, preserveFocus: false });
        this.#onAlreadyOpen();
        return;
      }
      await this.#deleteQuietly(pendingPath);
      this.#pending = null;
    }

    const fsPath = resolve(join(tmpdir(), `frostpi-composer-${Date.now()}-${randomBytes(4).toString("hex")}.md`));
    await fs.writeFile(fsPath, text, "utf8");
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fsPath));
    this.#pending = { sessionId, fsPath: resolve(document.uri.fsPath) };
    await vscode.window.showTextDocument(document, { preview: false });
  }

  dispose(): void {
    this.#closeSubscription.dispose();
    const pending = this.#pending;
    this.#pending = null;
    if (pending) {
      try {
        unlinkSync(pending.fsPath);
      } catch {
        // Best-effort cleanup when the extension host tears down.
      }
    }
  }

  async #applyClosedDocument(document: vscode.TextDocument): Promise<void> {
    const pending = this.#pending;
    if (!pending || !samePath(document.uri.fsPath, pending.fsPath)) return;
    this.#pending = null;
    try {
      const text = (await fs.readFile(pending.fsPath, "utf8")).replace(/\n$/, "");
      this.#onApply({ sessionId: pending.sessionId, text });
    } finally {
      await this.#deleteQuietly(pending.fsPath);
    }
  }

  async #deleteQuietly(fsPath: string): Promise<void> {
    await fs.unlink(fsPath).catch(() => undefined);
  }
}

function samePath(left: string, right: string): boolean {
  const normalizedLeft = resolve(left);
  const normalizedRight = resolve(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}
