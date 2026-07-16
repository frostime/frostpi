import * as vscode from "vscode";

export function captureActiveSelection(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) return undefined;
  const text = editor.document.getText(editor.selection);
  const relative = vscode.workspace.asRelativePath(editor.document.uri, false);
  const start = editor.selection.start.line + 1;
  const end = editor.selection.end.line + 1;
  const language = editor.document.languageId;
  return `@${relative}:${start}-${end}\n\n\`\`\`${language}\n${text}\n\`\`\``;
}
