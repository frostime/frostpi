import { execFile } from "node:child_process";
import { relative } from "node:path";
import { promisify } from "node:util";

import * as vscode from "vscode";

const execFileAsync = promisify(execFile);
export const GIT_BASE_SCHEME = "frostpi-git-base";

export class GitBaseContentProvider implements vscode.TextDocumentContentProvider {
  readonly #changeEmitter = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this.#changeEmitter.event;

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const params = new URLSearchParams(uri.query);
    const root = params.get("root");
    const path = params.get("path");
    if (!root || !path) throw new Error("Invalid FrostPi Git base URI");
    try {
      const { stdout } = await execFileAsync("git", ["show", `HEAD:${path}`], {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `FrostPi could not read the Git HEAD version of this file.\n\n${message}`;
    }
  }

  dispose(): void {
    this.#changeEmitter.dispose();
  }
}

export async function openFileDiff(filePath: string): Promise<void> {
  const fileUri = vscode.Uri.file(filePath);
  const folder = vscode.workspace.getWorkspaceFolder(fileUri) ?? vscode.workspace.workspaceFolders?.[0];
  if (!folder) throw new Error("The file is not inside an open workspace.");
  const relativePath = relative(folder.uri.fsPath, fileUri.fsPath).replaceAll("\\", "/");
  const baseUri = vscode.Uri.from({
    scheme: GIT_BASE_SCHEME,
    path: fileUri.path,
    query: new URLSearchParams({ root: folder.uri.fsPath, path: relativePath }).toString(),
  });
  await vscode.commands.executeCommand("vscode.diff", baseUri, fileUri, `${relativePath} (HEAD ↔ Working Tree)`);
}
