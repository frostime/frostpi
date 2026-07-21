export interface WorkspaceMentionEdit {
  text: string;
  cursorOffset: number;
}

export function workspaceMentionReplaceTo(matchText: string, to: number, nextCharacter: string): number {
  return matchText.startsWith('@"') && nextCharacter === '"' ? to + 1 : to;
}

export function workspaceMentionEdit(path: string, isDirectory: boolean): WorkspaceMentionEdit {
  const completionPath = isDirectory && !path.endsWith("/") ? `${path}/` : path;
  const text = /\s/.test(completionPath)
    ? `@"${completionPath.replaceAll('"', '\\"')}"`
    : `@${completionPath}`;
  const suffix = isDirectory ? "" : " ";
  return {
    text: `${text}${suffix}`,
    cursorOffset: isDirectory && text.endsWith('"') ? text.length - 1 : text.length + suffix.length,
  };
}
