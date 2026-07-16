import { normalize, resolve } from "node:path";

import * as vscode from "vscode";

/** Returns the original workspace URI when the path belongs to an open root.
 * This preserves remote and virtual URI schemes instead of rebuilding a file URI.
 */
export function workspaceUriForPath(path: string): vscode.Uri {
  const root = vscode.workspace.workspaceFolders?.find((folder) => samePath(folder.uri.fsPath, path));
  return root?.uri ?? vscode.Uri.file(path);
}

function samePath(left: string, right: string): boolean {
  const a = normalize(resolve(left));
  const b = normalize(resolve(right));
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}
