import { isAbsolute, relative } from "node:path";

import * as vscode from "vscode";

import { BRIDGE_VERSION } from "../../shared/bridge/bridgeVersion.js";
import type { HostToWebviewPayload, WorkspaceDeltaView } from "../../shared/bridge/hostToWebview.js";
import type { AgentTurnView, SessionNoticeView } from "../../shared/model/agentTurnModel.js";
import type { SessionViewModel } from "../../shared/model/sessionViewModel.js";
import { collectionDelta } from "../../shared/bridge/collectionDelta.js";
import { webviewToHostSchema, type WebviewToHostMessage } from "../../shared/bridge/webviewToHost.js";
import { captureActiveFileReference } from "../editor-context/captureActiveFile.js";
import { listEditorMentionSpecials } from "../editor-context/editorMentionSpecials.js";
import { readConfiguration } from "../configuration/readConfiguration.js";
import { workspaceUriForPath } from "../configuration/workspaceScope.js";
import { captureActiveSelection } from "../editor-context/captureSelection.js";
import { openReferencedLocation } from "../editor-context/openReferencedLocation.js";
import { exportDiagnostics } from "../diagnostics/exportDiagnostics.js";
import type { DiagnosticLogger } from "../diagnostics/DiagnosticLogger.js";
import { openFileDiff } from "../file-changes/GitBaseContentProvider.js";
import type { SessionRegistry } from "../sessions/SessionRegistry.js";
import { WorkspaceFileCatalog } from "../workspace-files/WorkspaceFileCatalog.js";

interface Identified {
  id: string;
}


export class WebviewBridge implements vscode.Disposable {
  readonly #disposables: vscode.Disposable[] = [];
  readonly #registry: SessionRegistry;
  readonly #logger: DiagnosticLogger;
  readonly #fileCatalog: WorkspaceFileCatalog;

  #webview: vscode.Webview | null = null;
  #webviewMessageDisposable: vscode.Disposable | null = null;
  #cachedActiveSessionId: string | null = null;
  #turnOrder: string[] = [];
  #turnRefs = new Map<string, AgentTurnView>();
  #noticeOrder: string[] = [];
  #noticeRefs = new Map<string, SessionNoticeView>();

  constructor(registry: SessionRegistry, logger: DiagnosticLogger) {
    this.#registry = registry;
    this.#logger = logger;
    this.#fileCatalog = new WorkspaceFileCatalog({ maxFiles: 50_000 });
    this.#disposables.push(
      registry.onDidChange(() => this.#postWorkspaceUpdate()),
      registry.onDidToast((toast) => this.post({ type: "toast", ...toast })),
      registry.onDidInsertPromptText((text) => this.post({ type: "insertPromptText", text })),
    );
  }

  attach(webview: vscode.Webview): void {
    this.#webviewMessageDisposable?.dispose();
    this.#webview = webview;
    this.#resetCache(null);
    this.#webviewMessageDisposable = webview.onDidReceiveMessage((raw: unknown) => {
      void this.#receive(raw);
    });
  }

  detach(webview: vscode.Webview): void {
    if (this.#webview !== webview) return;
    this.#webviewMessageDisposable?.dispose();
    this.#webviewMessageDisposable = null;
    this.#webview = null;
    this.#resetCache(null);
  }

  focusComposer(): void {
    this.post({ type: "focusComposer" });
  }

  insertPromptText(text: string): void {
    this.post({ type: "insertPromptText", text });
  }

  post(message: HostToWebviewPayload): void {
    if (!this.#webview) return;
    void this.#webview.postMessage({ ...message, bridgeVersion: BRIDGE_VERSION });
  }

  dispose(): void {
    this.#webviewMessageDisposable?.dispose();
    for (const disposable of this.#disposables) disposable.dispose();
    this.#fileCatalog.dispose();
  }

  #postSnapshot(): void {
    const workspace = this.#registry.snapshot();
    this.#resetCache(workspace.activeSession);
    this.post({ type: "snapshot", workspace });
  }

  #postWorkspaceUpdate(): void {
    if (!this.#webview) return;
    const workspace = this.#registry.snapshot();
    if (workspace.activeSessionId !== this.#cachedActiveSessionId) {
      this.#postSnapshot();
      return;
    }

    const active = workspace.activeSession;
    const delta: WorkspaceDeltaView = {
      workspaceName: workspace.workspaceName,
      workspacePath: workspace.workspacePath,
      sessions: workspace.sessions,
      activeSessionId: workspace.activeSessionId,
      piAvailable: workspace.piAvailable,
      ...(workspace.piError ? { piError: workspace.piError } : {}),
      activeSession: active ? this.#sessionDelta(active) : null,
    };
    this.post({ type: "workspaceDelta", workspace: delta });
  }

  #sessionDelta(session: SessionViewModel): NonNullable<WorkspaceDeltaView["activeSession"]> {
    const { turns, notices, ...base } = session;
    const turnDelta = collectionDelta(this.#turnOrder, this.#turnRefs, turns);
    const noticeDelta = collectionDelta(this.#noticeOrder, this.#noticeRefs, notices);
    this.#turnOrder = turns.map((turn) => turn.id);
    this.#turnRefs = referenceMap(turns);
    this.#noticeOrder = notices.map((notice) => notice.id);
    this.#noticeRefs = referenceMap(notices);
    return { base, turns: turnDelta, notices: noticeDelta };
  }

  #resetCache(session: SessionViewModel | null): void {
    this.#cachedActiveSessionId = session?.id ?? null;
    this.#turnOrder = session?.turns.map((turn) => turn.id) ?? [];
    this.#turnRefs = referenceMap(session?.turns ?? []);
    this.#noticeOrder = session?.notices.map((notice) => notice.id) ?? [];
    this.#noticeRefs = referenceMap(session?.notices ?? []);
  }

  async #receive(raw: unknown): Promise<void> {
    const parsed = webviewToHostSchema.safeParse(raw);
    if (!parsed.success) {
      this.#logger.error("Rejected invalid Webview message", parsed.error);
      return;
    }
    try {
      await this.#dispatch(parsed.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.#logger.error(`Webview action ${parsed.data.type} failed`, error);
      this.post({ type: "toast", level: "error", message });
    }
  }

  async #dispatch(message: WebviewToHostMessage): Promise<void> {
    switch (message.type) {
      case "ready":
        this.#postSnapshot();
        break;
      case "openFolder":
        await vscode.commands.executeCommand("vscode.openFolder");
        break;
      case "createSession":
        await this.#registry.createSession();
        break;
      case "resumeSession":
        await this.#registry.resumeSession();
        break;
      case "activateSession":
        await this.#registry.activateSession(message.sessionId);
        break;
      case "closeSession":
        await this.#registry.closeSession(message.sessionId);
        break;
      case "renameSession":
        await this.#registry.rename(message.sessionId, message.name);
        break;
      case "sendPrompt":
        try {
          await this.#registry.sendPrompt(message.sessionId, message.text, message.images);
          this.post({ type: "promptResult", requestId: message.requestId, ok: true });
        } catch (error) {
          const errorText = error instanceof Error ? error.message : String(error);
          this.post({ type: "promptResult", requestId: message.requestId, ok: false, error: errorText });
        }
        break;
      case "abort":
        await this.#registry.abort(message.sessionId);
        break;
      case "setModel":
        await this.#registry.setModel(message.sessionId, message.provider, message.modelId);
        break;
      case "setThinkingLevel":
        await this.#registry.setThinkingLevel(message.sessionId, message.level);
        break;
      case "respondExtensionUi":
        await this.#registry.respondExtensionUi(message.sessionId, message.requestId, message.response);
        break;
      case "addSelection": {
        const text = captureActiveSelection();
        if (!text) throw new Error("Open a workspace file first.");
        this.insertPromptText(`${text} `);
        break;
      }
      case "addCurrentFile": {
        const text = captureActiveFileReference();
        if (!text) throw new Error("Open a workspace file first.");
        this.insertPromptText(`${text} `);
        break;
      }
      case "openFile":
        await openReferencedLocation(message.path, message.line);
        break;
      case "openDiff":
        await openFileDiff(message.path);
        break;
      case "openExternal": {
        const uri = vscode.Uri.parse(message.url, true);
        if (uri.scheme !== "https" && uri.scheme !== "http") throw new Error("Only HTTP(S) links can be opened.");
        await vscode.env.openExternal(uri);
        break;
      }
      case "refreshCommands":
        await this.#registry.refreshCommands(message.sessionId);
        break;
      case "refreshModels":
        await this.#registry.refreshModels(message.sessionId);
        break;
      case "loadHistory":
        await this.#registry.loadHistory(message.sessionId);
        break;
      case "searchWorkspaceFiles": {
        try {
          const session = this.#registry.snapshot().activeSession;
          if (!session || session.id !== message.sessionId) throw new Error("The active session changed before file search completed.");
          const configuration = readConfiguration(workspaceUriForPath(session.cwd));
          this.#fileCatalog.configure({
            maxFiles: configuration.fileMentionMaxFiles,
            respectSearchExclude: configuration.fileMentionRespectSearchExclude,
          });
          const items = await this.#fileCatalog.search(session.cwd, message.query, message.limit, workspaceFileBoosts(session));
          const specials = listEditorMentionSpecials(message.query);
          this.post({
            type: "workspaceFileSuggestions",
            requestId: message.requestId,
            items,
            ...(specials.length ? { specials } : {}),
          });
        } catch (error) {
          const errorText = error instanceof Error ? error.message : String(error);
          this.#logger.error("Workspace file completion failed", error);
          this.post({ type: "workspaceFileSuggestions", requestId: message.requestId, items: [], error: errorText });
        }
        break;
      }
      case "openSettings":
        await vscode.commands.executeCommand("workbench.action.openSettings", "@ext:frostime.frostpi");
        break;
      case "openProxySettings":
        await vscode.commands.executeCommand("frostpi.configureProxy");
        break;
      case "restartSession":
        await this.#registry.retrySession(message.sessionId);
        break;
      case "configureExecutable":
        await configureExecutable();
        break;
      case "exportDiagnostics":
        await exportDiagnostics(this.#logger, this.#registry.diagnosticsSummary());
        break;
      case "retryStart":
        await this.#registry.retrySession(message.sessionId);
        break;
    }
  }
}

function workspaceFileBoosts(session: SessionViewModel): Set<string> {
  const boosts = new Set<string>();
  const add = (path: string | undefined): void => {
    if (!path) return;
    const relativePath = (isAbsolute(path) ? relative(session.cwd, path) : path).replaceAll("\\", "/");
    if (relativePath && !relativePath.startsWith("../")) boosts.add(relativePath);
  };
  add(vscode.window.activeTextEditor?.document.uri.fsPath);
  for (const editor of vscode.window.visibleTextEditors) add(editor.document.uri.fsPath);
  for (const turn of session.turns) {
    for (const activity of turn.activities) {
      if (activity.type === "tool") add(activity.tool.filePath);
    }
  }
  return boosts;
}

function referenceMap<T extends Identified>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

async function configureExecutable(): Promise<void> {
  const configuration = vscode.workspace.getConfiguration("frostpi");
  const current = configuration.get<string>("pi.executable", "");
  const value = await vscode.window.showInputBox({
    title: "Configure Pi executable",
    prompt: "Enter `pi`, an absolute executable path, or Pi's compiled cli.js path. Leave blank for PATH discovery.",
    value: current,
    ignoreFocusOut: true,
  });
  if (value === undefined) return;
  await configuration.update("pi.executable", value.trim(), vscode.ConfigurationTarget.Global);
  void vscode.window.showInformationMessage("FrostPi executable setting updated. Restart failed sessions to apply it.");
}
