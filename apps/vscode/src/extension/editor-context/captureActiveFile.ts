import * as vscode from "vscode";

export function captureActiveFileReference(): string | undefined {
  const document = vscode.window.activeTextEditor?.document;
  if (!document || document.uri.scheme !== "file") return undefined;
  return `@${vscode.workspace.asRelativePath(document.uri, false)}`;
}
