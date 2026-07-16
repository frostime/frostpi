import * as vscode from "vscode";

export async function openReferencedLocation(path: string, line?: number): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.find((folder) => path.startsWith(folder.uri.fsPath));
  const uri = workspaceFolder ? vscode.Uri.file(path) : resolveWorkspacePath(path);
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document, { preview: true });
  if (line !== undefined) {
    const position = new vscode.Position(Math.max(0, line - 1), 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  }
}

function resolveWorkspacePath(path: string): vscode.Uri {
  const folder = vscode.workspace.workspaceFolders?.[0];
  return folder ? vscode.Uri.joinPath(folder.uri, path) : vscode.Uri.file(path);
}
