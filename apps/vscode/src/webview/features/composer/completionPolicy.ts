export function shouldStartPromptCompletion(document: string, cursor: number): boolean {
  const boundedCursor = Math.max(0, Math.min(cursor, document.length));
  const lineStart = document.lastIndexOf("\n", boundedCursor - 1) + 1;
  const before = document.slice(lineStart, boundedCursor);
  return /^\s*\/[\w:#.-]*$/.test(before) || /(?:^|\s)@(?:"[^"\n]*|[^\s@]*)$/.test(before);
}
