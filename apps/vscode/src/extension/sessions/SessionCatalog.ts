import { open, readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, isAbsolute, join, normalize, resolve } from "node:path";

import * as vscode from "vscode";

import { workspaceUriForPath } from "../configuration/workspaceScope.js";
import {
  findSessionWorkingDirectory,
  type SessionWorkingDirectory,
} from "./SessionWorkingDirectories.js";

export interface PiSessionCatalogEntry {
  path: string;
  cwd: string;
  title: string;
  updatedAt: number;
  sessionId?: string;
  preview?: string;
}

const MAX_FILES = 2_000;
const HEADER_BYTES = 64 * 1024;
const TAIL_BYTES = 384 * 1024;

export async function pickPiSession(
  directories: readonly SessionWorkingDirectory[],
  piArguments: string[],
): Promise<PiSessionCatalogEntry | undefined> {
  const current = directories[0];
  if (!current) return undefined;
  const sessions = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Window, title: "Finding Pi sessions…" },
    () => discoverPiSessions(directories, piArguments),
  );

  const browse: vscode.QuickPickItem & { browse: true } = {
    label: "$(folder-opened) Browse for a session file…",
    description: "Open a Pi JSONL session directly",
    alwaysShow: true,
    browse: true,
  };
  const items: Array<(vscode.QuickPickItem & { entry?: PiSessionCatalogEntry; browse?: true })> = [];
  if (sessions.length) {
    for (const directory of directories) {
      const group = sessions.filter((entry) => samePath(entry.cwd, directory.cwd));
      if (!group.length) continue;
      const location = workingDirectoryLabel(directory);
      items.push({ label: location, kind: vscode.QuickPickItemKind.Separator });
      for (const entry of group) {
        items.push({
          label: `$(comment-discussion) ${entry.title}`,
          description: `${location} · ${relativeAge(entry.updatedAt)}`,
          detail: entry.preview ? `${entry.preview}  ·  ${entry.path}` : entry.path,
          entry,
        });
      }
    }
    items.push({ label: "Other", kind: vscode.QuickPickItemKind.Separator });
  }
  items.push(browse);

  const selected = await vscode.window.showQuickPick(items, {
    title: "Resume Pi session",
    placeHolder: sessions.length ? "Search sessions across this repository's worktrees" : "No sessions were discovered; browse for a JSONL file",
    matchOnDescription: true,
    matchOnDetail: true,
    ignoreFocusOut: true,
  });
  if (!selected) return undefined;
  if (selected.entry) return selected.entry;

  const files = await vscode.window.showOpenDialog({
    title: "Open Pi session",
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: { "Pi session": ["jsonl"] },
    defaultUri: workspaceUriForPath(current.cwd),
  });
  if (!files?.[0]) return undefined;
  const entry = await readPiSessionMetadata(files[0].fsPath);
  if (!entry) throw new Error("The selected file is not a readable Pi session.");
  if (!findSessionWorkingDirectory(directories, entry.cwd)) {
    const choice = await vscode.window.showWarningMessage(
      `This session belongs to ${entry.cwd}, which is not an available worktree for this workspace.`,
      "Open folder",
    );
    if (choice === "Open folder") await vscode.commands.executeCommand("vscode.openFolder", workspaceUriForPath(entry.cwd));
    return undefined;
  }
  return entry;
}

export async function discoverPiSessions(
  directories: readonly SessionWorkingDirectory[],
  piArguments: string[],
): Promise<PiSessionCatalogEntry[]> {
  const rootsByDirectory = await Promise.all(directories.map((directory) => resolveSessionRoots(directory.cwd, piArguments)));
  const roots = rootsByDirectory.flat().filter((root, index, all) => all.findIndex((candidate) => samePath(candidate, root)) === index);
  const paths = await findJsonlFiles(roots, MAX_FILES);
  const entries = await mapConcurrent(paths, 12, readPiSessionMetadata);
  return entries
    .filter((entry): entry is PiSessionCatalogEntry => Boolean(entry && findSessionWorkingDirectory(directories, entry.cwd)))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function readPiSessionMetadata(path: string): Promise<PiSessionCatalogEntry | undefined> {
  let fileStat;
  try {
    fileStat = await stat(path);
    if (!fileStat.isFile()) return undefined;
  } catch {
    return undefined;
  }

  const handle = await open(path, "r");
  try {
    const headLength = Math.min(HEADER_BYTES, fileStat.size);
    const head = Buffer.alloc(headLength);
    await handle.read(head, 0, headLength, 0);
    const headText = head.toString("utf8");
    const header = firstJsonLine(headText);
    if (!header || header.type !== "session" || typeof header.cwd !== "string") return undefined;

    const tailLength = Math.min(TAIL_BYTES, fileStat.size);
    const tailOffset = Math.max(0, fileStat.size - tailLength);
    const tail = Buffer.alloc(tailLength);
    await handle.read(tail, 0, tailLength, tailOffset);
    const tailText = tail.toString("utf8");

    // Prefer the session_info with the greatest file offset across head and tail
    // windows so early auto-names and late renames both resolve (Pi latest-wins).
    const name = latestSessionName([
      latestSessionInfoInText(headText, 0),
      latestSessionInfoInText(tailText, tailOffset),
    ]);

    let preview: string | undefined;
    for (const line of parseJsonLines(tailText)) {
      const text = userMessagePreview(line);
      if (text) preview = text;
    }

    return {
      path: resolve(path),
      cwd: resolve(expandHome(header.cwd)),
      title: name ?? preview ?? basename(path, ".jsonl"),
      updatedAt: fileStat.mtimeMs,
      ...(typeof header.id === "string" ? { sessionId: header.id } : {}),
      ...(preview ? { preview } : {}),
    };
  } finally {
    await handle.close();
  }
}

export async function resolveSessionRoots(cwd: string, piArguments: string[]): Promise<string[]> {
  const roots: string[] = [];
  const cli = sessionDirArgument(piArguments);
  if (cli) roots.push(resolveSessionDir(cli, cwd));
  if (process.env.PI_CODING_AGENT_SESSION_DIR) roots.push(resolveSessionDir(process.env.PI_CODING_AGENT_SESSION_DIR, cwd));

  // Relative sessionDir values follow Pi runtime semantics: normalize (~) then
  // resolve against the process cwd (the workspace folder FrostPi launches Pi in).
  // Do not anchor to the settings file directory — that rule applies to Pi resources, not sessionDir.
  const projectSettings = join(cwd, ".pi", "settings.json");
  const globalSettings = join(homedir(), ".pi", "agent", "settings.json");
  const projectDir = await readSessionDirSetting(projectSettings);
  const globalDir = await readSessionDirSetting(globalSettings);
  if (projectDir) roots.push(resolveSessionDir(projectDir, cwd));
  if (globalDir) roots.push(resolveSessionDir(globalDir, cwd));
  roots.push(join(homedir(), ".pi", "agent", "sessions"));

  return [...new Set(roots.map((root) => normalize(resolve(root))))];
}

async function findJsonlFiles(roots: string[], limit: number): Promise<string[]> {
  const files: string[] = [];
  const queue = [...roots];
  const seen = new Set<string>();
  while (queue.length && files.length < limit) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) queue.push(path);
      else if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(path);
      if (files.length >= limit) break;
    }
  }
  return files;
}

async function readSessionDirSetting(path: string): Promise<string | undefined> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as { sessionDir?: unknown };
    return typeof parsed.sessionDir === "string" && parsed.sessionDir.trim() ? parsed.sessionDir.trim() : undefined;
  } catch {
    return undefined;
  }
}

function sessionDirArgument(args: string[]): string | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--session-dir") return args[index + 1];
    if (value?.startsWith("--session-dir=")) return value.slice("--session-dir=".length);
  }
  return undefined;
}

function resolveSessionDir(value: string, relativeTo: string): string {
  const expanded = expandHome(value);
  return isAbsolute(expanded) ? expanded : resolve(relativeTo, expanded);
}

function expandHome(value: string): string {
  if (value === "~") return homedir();
  if (value.startsWith("~/") || value.startsWith("~\\")) return join(homedir(), value.slice(2));
  return value;
}

function firstJsonLine(text: string): Record<string, unknown> | undefined {
  return parseJsonLines(text).find((line) => line.type === "session");
}

function parseJsonLines(text: string): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line.startsWith("{")) continue;
    try {
      const value = JSON.parse(line) as unknown;
      if (typeof value === "object" && value !== null && !Array.isArray(value)) result.push(value as Record<string, unknown>);
    } catch {
      // A tail read may start in the middle of a JSONL record.
    }
  }
  return result;
}

/** Latest session_info in a file window; empty/missing name clears the title (Pi getSessionName). */
function latestSessionInfoInText(
  text: string,
  baseOffset: number,
): { fileOffset: number; name: string | undefined } | undefined {
  let latest: { fileOffset: number; name: string | undefined } | undefined;
  // Walk complete lines; track UTF-8 byte offsets so head/tail candidates compare in file order.
  let bytePos = 0;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("{")) {
      try {
        const value = JSON.parse(line) as unknown;
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          const entry = value as Record<string, unknown>;
          if (entry.type === "session_info") {
            const rawName = entry.name;
            const name = typeof rawName === "string" && rawName.trim() ? rawName.trim() : undefined;
            latest = { fileOffset: baseOffset + bytePos, name };
          }
        }
      } catch {
        // Partial line at a window boundary.
      }
    }
    bytePos += Buffer.byteLength(raw, "utf8") + 1; // +1 for the split '\n' (final segment's extra 1 is harmless)
  }
  return latest;
}

function latestSessionName(
  candidates: Array<{ fileOffset: number; name: string | undefined } | undefined>,
): string | undefined {
  let best: { fileOffset: number; name: string | undefined } | undefined;
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (!best || candidate.fileOffset >= best.fileOffset) best = candidate;
  }
  return best?.name;
}

function userMessagePreview(entry: Record<string, unknown>): string | undefined {
  if (entry.type !== "message") return undefined;
  const message = record(entry.message);
  if (message?.role !== "user") return undefined;
  const content = message.content;
  const text = typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((block) => record(block)?.type === "text" ? record(block)?.text : undefined).find((item) => typeof item === "string")
      : undefined;
  return typeof text === "string" && text.trim() ? compact(text) : undefined;
}

function compact(value: string): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > 100 ? `${text.slice(0, 97)}…` : text;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function samePath(left: string, right: string): boolean {
  const a = normalize(resolve(left));
  const b = normalize(resolve(right));
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function workingDirectoryLabel(directory: SessionWorkingDirectory): string {
  const source = directory.branch ?? (directory.detached ? "Detached HEAD" : undefined);
  const label = source ? `${source} · ${directory.directoryName}` : directory.directoryName;
  return directory.isCurrent ? `${label} · Current workspace` : label;
}

function relativeAge(timestamp: number): string {
  const elapsed = Math.max(0, Date.now() - timestamp);
  const minutes = Math.round(elapsed / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, map: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await map(items[index]!);
    }
  }));
  return results;
}
