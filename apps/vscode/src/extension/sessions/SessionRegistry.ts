import { randomUUID } from "node:crypto";
import { normalize, resolve } from "node:path";

import type { RpcExtensionUiResponse, ThinkingLevel } from "@frostime/pi-rpc";
import * as vscode from "vscode";

import type { WebviewImageInput } from "../../shared/bridge/webviewToHost.js";
import type { SessionRuntimeStatus, SessionSummaryView, WorkspaceViewModel } from "../../shared/model/sessionViewModel.js";
import { readConfiguration } from "../configuration/readConfiguration.js";
import { workspaceUriForPath } from "../configuration/workspaceScope.js";
import type { DiagnosticLogger } from "../diagnostics/DiagnosticLogger.js";
import { ProxySecretStore } from "../network/ProxySecretStore.js";
import { pickPiSession, readPiSessionMetadata, type PiSessionCatalogEntry } from "./SessionCatalog.js";
import { SessionPersistence } from "./SessionPersistence.js";
import { SessionRuntime } from "./SessionRuntime.js";
import type { PersistedSessionRecord } from "./sessionTypes.js";

export interface RegistryToast {
  level: "info" | "warning" | "error";
  message: string;
}

export class SessionRegistry implements vscode.Disposable {
  readonly #runtimes = new Map<string, SessionRuntime>();
  readonly #records = new Map<string, PersistedSessionRecord>();
  readonly #persistence: SessionPersistence;
  readonly #logger: DiagnosticLogger;
  readonly #proxySecrets: ProxySecretStore;
  readonly #changeEmitter = new vscode.EventEmitter<void>();
  readonly #toastEmitter = new vscode.EventEmitter<RegistryToast>();
  readonly #insertTextEmitter = new vscode.EventEmitter<string>();
  readonly #pendingEditorText = new Map<string, string>();
  readonly #lastStatuses = new Map<string, SessionRuntimeStatus>();

  #activeSessionId: string | null = null;
  #emitTimer: ReturnType<typeof setTimeout> | null = null;
  #disposed = false;

  readonly onDidChange = this.#changeEmitter.event;
  readonly onDidToast = this.#toastEmitter.event;
  readonly onDidInsertPromptText = this.#insertTextEmitter.event;

  constructor(context: vscode.ExtensionContext, logger: DiagnosticLogger) {
    this.#persistence = new SessionPersistence(context.workspaceState);
    this.#logger = logger;
    this.#proxySecrets = new ProxySecretStore(context.secrets);
    const stored = this.#persistence.load();
    for (const record of stored.sessions) this.#restoreRecord(record);
    this.#activeSessionId = stored.activeSessionId && this.#runtimes.has(stored.activeSessionId)
      ? stored.activeSessionId
      : stored.sessions[0]?.id ?? null;
  }

  get activeSessionId(): string | null {
    return this.#activeSessionId;
  }

  async ensureInitialSession(): Promise<void> {
    if (!vscode.workspace.workspaceFolders?.length) return;
    await this.#repairGeneratedTitles();
    if (!this.#activeSessionId) await this.createSession();
    const active = this.#activeSessionId ? this.#runtimes.get(this.#activeSessionId) : undefined;
    if (active && readConfiguration(workspaceUriForPath(active.cwd)).startSessionOnOpen) {
      await this.#startRuntime(active).catch(() => undefined);
    }
  }

  snapshot(): WorkspaceViewModel {
    const folder = activeWorkspaceFolder();
    const active = this.#activeSessionId ? this.#runtimes.get(this.#activeSessionId) : undefined;
    const activeView = active?.view ?? null;
    const sessions: SessionSummaryView[] = [...this.#runtimes.values()]
      .map((runtime) => {
        const view = runtime.view;
        return {
          id: view.id,
          title: view.title,
          cwd: view.cwd,
          status: view.status,
          isActive: view.id === this.#activeSessionId,
          ...(view.model ? { modelLabel: view.model.name ?? `${view.model.provider}/${view.model.id}` } : {}),
          thinkingLevel: view.thinkingLevel,
          updatedAt: view.updatedAt,
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const piError = activeView?.status === "failed" ? activeView.error : undefined;
    return {
      workspaceName: folder?.name ?? "No workspace",
      workspacePath: folder?.uri.fsPath ?? "",
      sessions,
      activeSessionId: this.#activeSessionId,
      activeSession: activeView,
      piAvailable: !piError,
      ...(piError ? { piError } : {}),
    };
  }

  async createSession(cwd = activeWorkspaceFolder()?.uri.fsPath): Promise<string> {
    if (!cwd) throw new Error("Open a workspace folder before creating a Pi session.");
    const id = randomUUID();
    const record: PersistedSessionRecord = {
      id,
      title: "New session",
      cwd,
      updatedAt: Date.now(),
    };
    this.#records.set(id, record);
    const runtime = this.#createRuntime(record);
    this.#runtimes.set(id, runtime);
    this.#activeSessionId = id;
    await this.#persist();
    this.#emitChange();
    await this.#startRuntime(runtime);
    return id;
  }


  async resumeSession(): Promise<string | undefined> {
    const cwd = activeWorkspaceFolder()?.uri.fsPath;
    if (!cwd) throw new Error("Open a workspace folder before resuming a Pi session.");
    const configuration = readConfiguration(workspaceUriForPath(cwd));
    const entry = await pickPiSession(cwd, configuration.piArguments);
    if (!entry) return undefined;
    return this.openSession(entry);
  }

  async openSession(entry: PiSessionCatalogEntry): Promise<string> {
    const existing = [...this.#records.values()].find((record) => record.sessionFile && samePath(record.sessionFile, entry.path));
    if (existing) {
      await this.activateSession(existing.id);
      return existing.id;
    }

    const id = randomUUID();
    const record: PersistedSessionRecord = {
      id,
      title: entry.title,
      cwd: entry.cwd,
      sessionFile: entry.path,
      updatedAt: entry.updatedAt,
    };
    this.#records.set(id, record);
    const runtime = this.#createRuntime(record);
    this.#runtimes.set(id, runtime);
    this.#activeSessionId = id;
    await this.#persist();
    this.#emitChange();
    await this.#startRuntime(runtime);
    return id;
  }

  async activateSession(sessionId: string): Promise<void> {
    const runtime = this.#requireRuntime(sessionId);
    this.#activeSessionId = sessionId;
    await this.#persist();
    const pendingText = this.#pendingEditorText.get(sessionId);
    if (pendingText !== undefined) {
      this.#pendingEditorText.delete(sessionId);
      this.#lastStatuses.delete(sessionId);
      this.#insertTextEmitter.fire(pendingText);
    }
    this.#emitChange();
    if (runtime.view.status === "stopped") await this.#startRuntime(runtime);
  }

  async closeSession(sessionId: string): Promise<void> {
    const runtime = this.#requireRuntime(sessionId);
    await runtime.dispose();
    this.#runtimes.delete(sessionId);
    this.#records.delete(sessionId);
    this.#pendingEditorText.delete(sessionId);
    this.#lastStatuses.delete(sessionId);
    if (this.#activeSessionId === sessionId) {
      this.#activeSessionId = [...this.#runtimes.keys()][0] ?? null;
    }
    await this.#persist();
    this.#emitChange();
  }

  async retrySession(sessionId?: string): Promise<void> {
    const runtime = this.#requireRuntime(sessionId ?? this.#requireActiveId());
    if (!await confirmRestart([runtime])) return;
    await this.#restartRuntime(runtime);
  }

  async restartAllSessions(): Promise<void> {
    const runtimes = [...this.#runtimes.values()];
    if (!await confirmRestart(runtimes)) return;
    for (const runtime of runtimes) await this.#restartRuntime(runtime);
  }

  refreshConfigurationState(forceRestartRequired = false): void {
    for (const runtime of this.#runtimes.values()) runtime.refreshConfigurationState(forceRestartRequired);
  }

  async sendPrompt(sessionId: string, text: string, images: WebviewImageInput[]): Promise<void> {
    const runtime = this.#requireRuntime(sessionId);
    await this.#ensureRunning(runtime);
    await runtime.sendPrompt(text, images);
  }

  async abort(sessionId = this.#requireActiveId()): Promise<void> {
    await this.#requireRuntime(sessionId).abort();
  }

  async rename(sessionId: string, name: string): Promise<void> {
    const runtime = this.#requireRuntime(sessionId);
    await this.#ensureRunning(runtime);
    await runtime.rename(name);
  }

  async setModel(sessionId: string, provider: string, modelId: string): Promise<void> {
    const runtime = this.#requireRuntime(sessionId);
    await this.#ensureRunning(runtime);
    await runtime.setModel(provider, modelId);
  }

  async setThinkingLevel(sessionId: string, level: ThinkingLevel): Promise<void> {
    const runtime = this.#requireRuntime(sessionId);
    await this.#ensureRunning(runtime);
    await runtime.setThinkingLevel(level);
  }

  async refreshModels(sessionId: string): Promise<void> {
    const runtime = this.#requireRuntime(sessionId);
    await this.#ensureRunning(runtime);
    await runtime.refreshModels();
  }

  async refreshCommands(sessionId: string): Promise<void> {
    const runtime = this.#requireRuntime(sessionId);
    await this.#ensureRunning(runtime);
    await runtime.refreshCommands();
  }

  async respondExtensionUi(sessionId: string, requestId: string, response: RpcExtensionUiResponse): Promise<void> {
    await this.#requireRuntime(sessionId).respondExtensionUi(requestId, response);
  }

  diagnosticsSummary(): string {
    const sessions = [...this.#runtimes.values()];
    return [
      `Registry active session: ${this.#activeSessionId ?? "<none>"}`,
      `Registry session count: ${sessions.length}`,
      "",
      ...sessions.flatMap((runtime) => [runtime.diagnosticsSummary(), ""]),
    ].join("\n");
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    if (this.#emitTimer) clearTimeout(this.#emitTimer);
    await Promise.allSettled([...this.#runtimes.values()].map((runtime) => runtime.dispose()));
    this.#changeEmitter.dispose();
    this.#toastEmitter.dispose();
    this.#insertTextEmitter.dispose();
  }

  #restoreRecord(record: PersistedSessionRecord): void {
    this.#records.set(record.id, record);
    this.#runtimes.set(record.id, this.#createRuntime(record));
  }

  async #repairGeneratedTitles(): Promise<void> {
    let changed = false;
    for (const record of this.#records.values()) {
      if (!record.sessionFile || !looksLikeGeneratedSessionName(record.title)) continue;
      const metadata = await readPiSessionMetadata(record.sessionFile);
      const title = metadata?.title && !looksLikeGeneratedSessionName(metadata.title) ? metadata.title : "New session";
      record.title = title;
      this.#runtimes.get(record.id)?.setDisplayTitle(title);
      changed = true;
    }
    if (changed) await this.#persist();
  }

  #createRuntime(record: PersistedSessionRecord): SessionRuntime {
    return new SessionRuntime(
      record.id,
      record.cwd,
      record.title,
      record.updatedAt,
      () => readConfiguration(workspaceUriForPath(record.cwd)),
      this.#proxySecrets,
      this.#logger,
      {
        onChange: (runtime) => this.#handleRuntimeChange(runtime),
        onEditorText: (runtime, text) => {
          if (runtime.id === this.#activeSessionId) this.#insertTextEmitter.fire(text);
          else this.#pendingEditorText.set(runtime.id, text);
        },
      },
    );
  }

  async #startRuntime(runtime: SessionRuntime): Promise<void> {
    const record = this.#records.get(runtime.id);
    try {
      await runtime.start(record?.sessionFile);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.#toastEmitter.fire({ level: "error", message: `Unable to start Pi: ${message}` });
      throw error;
    }
  }

  async #restartRuntime(runtime: SessionRuntime): Promise<void> {
    await runtime.stop().catch(() => undefined);
    await this.#startRuntime(runtime);
  }

  async #ensureRunning(runtime: SessionRuntime): Promise<void> {
    const status = runtime.view.status;
    if (status === "stopped" || status === "failed") await this.#startRuntime(runtime);
  }

  #handleRuntimeChange(runtime: SessionRuntime): void {
    const view = runtime.view;
    const previous = this.#records.get(runtime.id);
    const previousStatus = this.#lastStatuses.get(runtime.id);
    this.#lastStatuses.set(runtime.id, view.status);
    const metadataChanged = Boolean(previous && (
      previous.title !== view.title ||
      previous.sessionFile !== view.sessionFile ||
      previous.cwd !== view.cwd
    ));
    const runSettled = Boolean(
      previousStatus && ["starting", "running", "stopping"].includes(previousStatus)
      && ["ready", "failed", "stopped"].includes(view.status),
    );
    if (previous && (metadataChanged || runSettled)) {
      this.#records.set(runtime.id, {
        id: runtime.id,
        title: view.title,
        cwd: view.cwd,
        ...(view.sessionFile ? { sessionFile: view.sessionFile } : {}),
        updatedAt: view.updatedAt,
      });
      void this.#persist();
    }
    if (runtime.id === this.#activeSessionId) {
      void vscode.commands.executeCommand("setContext", "frostpi.sessionRunning", view.isStreaming);
    }
    this.#scheduleChange();
  }

  #scheduleChange(): void {
    if (this.#emitTimer) return;
    this.#emitTimer = setTimeout(() => {
      this.#emitTimer = null;
      this.#emitChange();
    }, 24);
  }

  #emitChange(): void {
    this.#changeEmitter.fire();
  }

  #persist(): Thenable<void> {
    return this.#persistence.save(this.#activeSessionId, [...this.#records.values()]);
  }

  #requireRuntime(sessionId: string): SessionRuntime {
    const runtime = this.#runtimes.get(sessionId);
    if (!runtime) throw new Error(`Unknown FrostPi session: ${sessionId}`);
    return runtime;
  }

  #requireActiveId(): string {
    if (!this.#activeSessionId) throw new Error("No active FrostPi session");
    return this.#activeSessionId;
  }
}

async function confirmRestart(runtimes: readonly SessionRuntime[]): Promise<boolean> {
  const disruptive = runtimes.some((runtime) => runtime.view.isStreaming || runtime.view.pendingExtensionUi.length > 0);
  if (!disruptive) return true;
  const choice = await vscode.window.showWarningMessage(
    runtimes.length > 1
      ? "Restarting all FrostPi sessions will stop active responses, tools, and pending extension UI requests. Persisted Pi history is retained."
      : "Restarting this FrostPi session will stop its active response, tools, and pending extension UI requests. Persisted Pi history is retained.",
    { modal: true },
    runtimes.length > 1 ? "Restart all sessions" : "Restart session",
  );
  return Boolean(choice);
}

function activeWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  const editorUri = vscode.window.activeTextEditor?.document.uri;
  return (editorUri ? vscode.workspace.getWorkspaceFolder(editorUri) : undefined) ?? vscode.workspace.workspaceFolders?.[0];
}

function samePath(left: string, right: string): boolean {
  const a = normalize(resolve(left));
  const b = normalize(resolve(right));
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function looksLikeGeneratedSessionName(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(?:-\d+)?Z?_[0-9a-f-]{8,}$/i.test(value);
}
