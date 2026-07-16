import { relative, resolve } from "node:path";

import { minimatch } from "minimatch";
import * as vscode from "vscode";

import type { WorkspaceFileCandidateView } from "../../shared/model/workspaceFileModel.js";
import { workspaceUriForPath } from "../configuration/workspaceScope.js";
import { rankFileCandidate } from "./rankFileCandidate.js";

interface CatalogEntry {
  paths: string[];
  loadedAt: number;
  loading?: Promise<string[]>;
}

export interface WorkspaceFileCatalogOptions {
  maxFiles: number;
  respectSearchExclude?: boolean;
  ttlMs?: number;
}

export class WorkspaceFileCatalog implements vscode.Disposable {
  readonly #entries = new Map<string, CatalogEntry>();
  readonly #disposables: vscode.Disposable[];
  #options: WorkspaceFileCatalogOptions;

  constructor(options: WorkspaceFileCatalogOptions) {
    this.#options = options;
    this.#disposables = [
      vscode.workspace.onDidCreateFiles(() => this.invalidate()),
      vscode.workspace.onDidDeleteFiles(() => this.invalidate()),
      vscode.workspace.onDidRenameFiles(() => this.invalidate()),
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.invalidate()),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("files.exclude") || event.affectsConfiguration("search.exclude")) this.invalidate();
      }),
    ];
  }

  async search(cwd: string, query: string, limit: number, boosts: ReadonlySet<string> = new Set()): Promise<WorkspaceFileCandidateView[]> {
    const paths = await this.#paths(cwd);
    return paths
      .map((path) => rankFileCandidate(path, query, boosts))
      .filter((candidate): candidate is WorkspaceFileCandidateView => Boolean(candidate))
      .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
      .slice(0, limit);
  }

  configure(options: Pick<WorkspaceFileCatalogOptions, "maxFiles" | "respectSearchExclude">): void {
    if (this.#options.maxFiles === options.maxFiles && this.#options.respectSearchExclude === options.respectSearchExclude) return;
    this.#options = { ...this.#options, ...options };
    this.invalidate();
  }

  invalidate(cwd?: string): void {
    if (cwd) this.#entries.delete(resolve(cwd));
    else this.#entries.clear();
  }

  dispose(): void {
    for (const disposable of this.#disposables) disposable.dispose();
    this.#entries.clear();
  }

  async #paths(cwd: string): Promise<string[]> {
    const key = resolve(cwd);
    const entry = this.#entries.get(key);
    const ttl = this.#options.ttlMs ?? 30_000;
    if (entry && Date.now() - entry.loadedAt < ttl) return entry.paths;
    if (entry?.loading) return entry.loading;

    const loading = this.#load(key);
    this.#entries.set(key, { paths: entry?.paths ?? [], loadedAt: entry?.loadedAt ?? 0, loading });
    try {
      const paths = await loading;
      this.#entries.set(key, { paths, loadedAt: Date.now() });
      return paths;
    } catch (error) {
      this.#entries.delete(key);
      throw error;
    }
  }

  async #load(cwd: string): Promise<string[]> {
    const rootUri = workspaceUriForPath(cwd);
    const include = new vscode.RelativePattern(rootUri, "**/*");
    // An undefined exclude lets VS Code apply files.exclude and workspace search providers.
    const uris = await vscode.workspace.findFiles(include, undefined, this.#options.maxFiles);
    const searchExcludes = this.#options.respectSearchExclude === false ? [] : configuredSearchExcludes(rootUri);
    return uris
      .map((uri) => relative(cwd, uri.fsPath).replaceAll("\\", "/"))
      .filter((path) => path && !path.startsWith("../"))
      .filter((path) => !isAlwaysExcluded(path) && !matchesAny(path, searchExcludes));
  }
}

function configuredSearchExcludes(scope: vscode.Uri): string[] {
  const configured = vscode.workspace.getConfiguration("search", scope).get<Record<string, boolean | { when?: string }>>("exclude", {});
  return Object.entries(configured)
    .filter(([, enabled]) => enabled === true || (typeof enabled === "object" && enabled !== null))
    .map(([pattern]) => normalizeGlob(pattern));
}

function normalizeGlob(pattern: string): string {
  const normalized = pattern.replaceAll("\\", "/");
  return normalized.startsWith("/") ? normalized.slice(1) : normalized;
}

function isAlwaysExcluded(path: string): boolean {
  return path === ".git" || path.startsWith(".git/") || path === "node_modules" || path.includes("/node_modules/");
}

function matchesAny(path: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => {
    const options = { dot: true, nocase: process.platform === "win32", matchBase: !pattern.includes("/") };
    return minimatch(path, pattern, options) || minimatch(path, `${pattern.replace(/\/$/, "")}/**`, options);
  });
}
