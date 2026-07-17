import { stat } from "node:fs/promises";

import {
  PiRpcApi,
  PiRpcConnection,
  isExtensionUiRequest,
  type RpcEvent,
  type RpcExtensionUiResponse,
  type RpcModel,
  type ThinkingLevel,
} from "@frostime/pi-rpc";
import * as vscode from "vscode";

import type { WebviewImageInput } from "../../shared/bridge/webviewToHost.js";
import type { SessionViewModel } from "../../shared/model/sessionViewModel.js";
import { normalizeImageAttachments } from "../attachments/normalizeImageAttachment.js";
import type { FrostPiConfiguration } from "../configuration/configurationTypes.js";
import { workspaceUriForPath } from "../configuration/workspaceScope.js";
import { SessionProjection } from "../conversation/SessionProjection.js";
import { redactDiagnosticText, type DiagnosticLogger } from "../diagnostics/DiagnosticLogger.js";
import { ExtensionUiCoordinator } from "../extension-ui/ExtensionUiCoordinator.js";
import { configuredPiInvocation } from "../pi-runtime/resolvePiExecutable.js";
import { buildPiProcessEnvironment, proxyFingerprint, proxyModeLabel } from "../network/buildPiProcessEnvironment.js";
import type { ProxySecretStore } from "../network/ProxySecretStore.js";

export interface SessionRuntimeHooks {
  onChange(runtime: SessionRuntime): void;
  onEditorText(runtime: SessionRuntime, text: string): void;
}

export class SessionRuntime {
  readonly #projection: SessionProjection;
  readonly #configurationProvider: () => FrostPiConfiguration;
  readonly #proxySecrets: ProxySecretStore;
  readonly #logger: DiagnosticLogger;
  readonly #hooks: SessionRuntimeHooks;

  #connection: PiRpcConnection | null = null;
  #api: PiRpcApi | null = null;
  #extensionUi: ExtensionUiCoordinator | null = null;
  #starting: Promise<void> | null = null;
  #historyLoading: Promise<void> | null = null;
  #historyEventBuffer: RpcEvent[] | null = null;
  #disposed = false;
  #lifecycleVersion = 0;
  #appliedProxyFingerprint: string | null = null;
  #proxyRestartForced = false;

  constructor(
    readonly id: string,
    readonly cwd: string,
    title: string,
    updatedAt: number,
    configurationProvider: () => FrostPiConfiguration,
    proxySecrets: ProxySecretStore,
    logger: DiagnosticLogger,
    hooks: SessionRuntimeHooks,
  ) {
    const initialConfiguration = configurationProvider();
    this.#projection = new SessionProjection(id, cwd, title, {
      maxImageBytes: initialConfiguration.maxImageBytes,
      maxImages: 12,
    }, updatedAt);
    this.#configurationProvider = configurationProvider;
    this.#proxySecrets = proxySecrets;
    this.#logger = logger;
    this.#hooks = hooks;
  }

  get view(): Readonly<SessionViewModel> {
    return this.#projection.read();
  }

  get snapshot(): SessionViewModel {
    return structuredClone(this.view);
  }

  get sessionFile(): string | undefined {
    return this.view.sessionFile;
  }

  markWaitingToStart(): void {
    if (this.#disposed || this.#connection?.started || this.#starting) return;
    this.#projection.setStatus("queued");
    this.#notifyChange();
  }

  async start(sessionFile?: string): Promise<void> {
    if (this.#disposed) throw new Error("Session runtime is disposed");
    if (this.#starting) return this.#starting;
    if (this.#connection?.started) return;

    const lifecycleVersion = ++this.#lifecycleVersion;
    this.#projection.setHistoryStatus(sessionFile ? "queued" : "loaded");
    this.#starting = this.#startInternal(sessionFile, lifecycleVersion).finally(() => {
      this.#starting = null;
    });
    return this.#starting;
  }

  async stop(): Promise<void> {
    this.#lifecycleVersion += 1;
    this.#projection.setStatus("stopping");
    this.#notifyChange();
    await this.#extensionUi?.cancelAll();
    await this.#connection?.stop();
    this.#connection = null;
    this.#api = null;
    this.#extensionUi = null;
    this.#historyEventBuffer = null;
    this.#appliedProxyFingerprint = null;
    this.#proxyRestartForced = false;
    this.#projection.setStatus("stopped");
    this.refreshConfigurationState(false);
  }

  async dispose(): Promise<void> {
    this.#disposed = true;
    await this.stop();
  }

  async sendPrompt(text: string, images: WebviewImageInput[]): Promise<void> {
    const api = this.#requireApi();
    const configuration = this.#configurationProvider();
    const normalizedImages = normalizeImageAttachments(images, configuration.maxImageBytes);
    if (!text.trim() && normalizedImages.length === 0) return;

    this.#projection.appendUserPrompt(text, images);
    this.#notifyChange();
    const view = this.view;
    const extensionCommand = commandName(text);
    const isImmediateExtensionCommand = extensionCommand
      ? view.commands.some((command) => command.source === "extension" && command.name === extensionCommand)
      : false;

    try {
      await api.prompt(text, {
        ...(normalizedImages.length ? { images: normalizedImages } : {}),
        ...(view.isStreaming && !isImmediateExtensionCommand
          ? { streamingBehavior: configuration.streamingBehavior }
          : {}),
      });
    } catch (error) {
      const message = errorMessage(error);
      this.#projection.appendNotice(message, "error");
      this.#notifyChange();
      throw error;
    }
  }

  async compact(customInstructions?: string): Promise<void> {
    await this.#requireApi().compact(customInstructions);
  }

  async abort(): Promise<void> {
    await this.#requireApi().abort();
  }

  setDisplayTitle(title: string): void {
    this.#projection.setTitle(title);
    this.#notifyChange();
  }

  async rename(name: string): Promise<void> {
    const normalized = name.trim();
    await this.#requireApi().setSessionName(normalized);
    this.#projection.setTitle(normalized || "Untitled session");
    this.#notifyChange();
  }

  async setModel(provider: string, modelId: string): Promise<void> {
    const model = await this.#requireApi().setModel(provider, modelId);
    const state = await this.#requireApi().getState();
    this.#projection.applyState({ ...state, model });
    this.#notifyChange();
  }

  async setThinkingLevel(level: ThinkingLevel): Promise<void> {
    await this.#requireApi().setThinkingLevel(level);
    const state = await this.#requireApi().getState();
    this.#projection.applyState(state);
    this.#notifyChange();
  }

  async refreshModels(): Promise<RpcModel[]> {
    const models = await this.#requireApi().getAvailableModels();
    this.#projection.setModels(models);
    this.#notifyChange();
    return models;
  }

  async refreshCommands(): Promise<void> {
    const commands = await this.#requireApi().getCommands();
    this.#projection.setCommands(commands);
    this.#notifyChange();
  }

  markHistoryWaiting(): void {
    this.#projection.setHistoryStatus("queued");
    this.#notifyChange();
  }

  async loadHistory(force = false): Promise<void> {
    const activeLoad = this.#historyLoading;
    if (activeLoad) {
      try {
        await activeLoad;
      } catch (error) {
        if (!force) throw error;
      }
      if (!force || this.view.historyStatus === "loaded") return;
      return this.loadHistory(true);
    }
    const api = this.#requireApi();
    const sessionFile = this.view.sessionFile;
    if (!sessionFile) {
      this.#projection.setHistoryStatus("loaded");
      this.#notifyChange();
      return;
    }

    this.#historyLoading = this.#loadHistoryInternal(api, sessionFile, force).finally(() => {
      this.#historyLoading = null;
    });
    return this.#historyLoading;
  }

  async respondExtensionUi(requestId: string, response: RpcExtensionUiResponse): Promise<void> {
    await this.#extensionUi?.respond(requestId, response);
  }

  refreshConfigurationState(forceRestartRequired = false): void {
    const configuration = this.#configurationProvider();
    const vscodeProxy = readVsCodeProxy(this.cwd);
    const fingerprint = proxyFingerprint(configuration.proxy, vscodeProxy);
    const running = Boolean(this.#connection?.started);
    if (running && forceRestartRequired) this.#proxyRestartForced = true;
    const restartRequired = running && (this.#proxyRestartForced || (this.#appliedProxyFingerprint !== null && fingerprint !== this.#appliedProxyFingerprint));
    const configuredLabel = proxyModeLabel(configuration.proxy.mode);
    const appliedLabel = running ? this.view.networkProxy.label : configuredLabel;
    this.#projection.setAttachmentLimits({ maxImageBytes: configuration.maxImageBytes, maxImages: 12 });
    this.#projection.setNetworkProxy({
      mode: configuration.proxy.mode,
      label: appliedLabel,
      ...(restartRequired ? { pendingLabel: configuredLabel } : {}),
      restartRequired,
    });
    this.#notifyChange();
  }

  diagnosticsSummary(): string {
    const view = this.view;
    return [
      `Session ${view.id}`,
      `Title: ${view.title}`,
      `CWD: ${view.cwd}`,
      `Status: ${view.status}`,
      `Streaming: ${view.isStreaming}`,
      `Session file: ${view.sessionFile ?? "<none>"}`,
      `Model: ${view.model ? `${view.model.provider}/${view.model.id}` : "<none>"}`,
      `Thinking: ${view.thinkingLevel}`,
      `Proxy: ${view.networkProxy.label}${view.networkProxy.restartRequired ? ` → ${view.networkProxy.pendingLabel ?? proxyModeLabel(view.networkProxy.mode)} after restart` : ""}`,
      `Turns: ${view.turns.length}`,
      `Tool calls: ${view.turns.reduce((count, turn) => count + turn.activities.filter((activity) => activity.type === "tool").length, 0)}`,
      `Pending extension UI: ${view.pendingExtensionUi.length}`,
      `Last error: ${view.error ?? "<none>"}`,
      `Pi stderr tail: ${redactDiagnosticText(this.#connection?.getStderr() || "<empty>")}`,
    ].join("\n");
  }

  async #startInternal(sessionFile: string | undefined, lifecycleVersion: number): Promise<void> {
    this.#projection.setStatus("starting");
    this.#notifyChange();

    const configuration = this.#configurationProvider();
    const invocation = configuredPiInvocation(configuration.piExecutable);
    const args = [
      ...configuration.piArguments,
      ...(sessionFile ? ["--session", sessionFile] : []),
    ];
    const vscodeProxy = readVsCodeProxy(this.cwd);
    const credentials = await this.#proxySecrets.get();
    if (this.#disposed || lifecycleVersion !== this.#lifecycleVersion) return;
    const proxyEnvironment = buildPiProcessEnvironment(configuration.proxy, credentials, vscodeProxy);
    const connection = new PiRpcConnection({
      cwd: this.cwd,
      args,
      env: proxyEnvironment.env,
      ...invocation,
      requestTimeoutMs: 30_000,
      startupTimeoutMs: 45_000,
      stopTimeoutMs: 1_500,
    });
    const api = new PiRpcApi(connection);
    this.#connection = connection;
    this.#api = api;
    this.#extensionUi = new ExtensionUiCoordinator(api, {
      onChange: () => {
        this.#syncExtensionUiSnapshot();
        this.#notifyChange();
      },
      onNotify: (level, message) => this.#projection.appendNotice(message, level),
      onTitle: (title) => {
        this.#projection.setTitle(title);
        this.#notifyChange();
      },
      onEditorText: (text) => this.#hooks.onEditorText(this, text),
    });

    connection.onEvent((event) => {
      if (this.#historyEventBuffer && shouldBufferDuringHistoryLoad(event)) {
        this.#historyEventBuffer.push(event);
        return;
      }
      this.#applyConnectionEvent(event);
      this.#notifyChange();
    });
    connection.onFailure((error) => {
      this.#logger.error(`Session ${this.id} failed`, error);
      this.#projection.setStatus("failed", errorMessage(error));
      this.#notifyChange();
    });
    connection.onExit(({ code, signal }) => {
      this.#logger.info(`Session ${this.id} Pi process exited (code=${code} signal=${signal})`);
    });

    try {
      const state = await connection.start();
      if (this.#disposed || lifecycleVersion !== this.#lifecycleVersion) {
        await connection.stop();
        return;
      }
      this.#appliedProxyFingerprint = proxyFingerprint(configuration.proxy, vscodeProxy);
      this.#proxyRestartForced = false;
      this.#projection.setNetworkProxy({ mode: configuration.proxy.mode, label: proxyEnvironment.label, restartRequired: false });
      this.#projection.applyState(state);
      this.#logger.info(`Started Pi session ${this.id} in ${this.cwd}`);
      this.#notifyChange();
      void this.#loadSessionInformation(api);
    } catch (error) {
      if (this.#disposed || lifecycleVersion !== this.#lifecycleVersion) return;
      const message = errorMessage(error);
      this.#projection.setStatus("failed", message);
      this.#logger.error(`Failed to start Pi session ${this.id}`, error);
      this.#notifyChange();
      throw error;
    }
  }

  async #loadSessionInformation(api: PiRpcApi): Promise<void> {
    const [models, commands, stats] = await Promise.all([
      api.getAvailableModels().catch((error) => {
        this.#logger.error("Failed to load Pi models", error);
        return [];
      }),
      api.getCommands().catch((error) => {
        this.#logger.error("Failed to load Pi commands", error);
        return [];
      }),
      api.getSessionStats().catch(() => undefined),
    ]);
    if (this.#disposed || api !== this.#api) return;
    this.#projection.setModels(models);
    this.#projection.setCommands(commands);
    if (stats) this.#projection.setStats(stats);
    this.#notifyChange();
  }

  async #loadHistoryInternal(api: PiRpcApi, sessionFile: string, force: boolean): Promise<void> {
    if (this.view.isStreaming) {
      this.#projection.setHistoryStatus("deferred");
      this.#notifyChange();
      throw new Error("Stop the running session before loading its conversation history.");
    }

    try {
      if (!force && (await stat(sessionFile)).size > MAX_AUTO_HISTORY_LOAD_BYTES) {
        this.#projection.setHistoryStatus("deferred");
        this.#projection.appendNotice("Conversation history is large and was not loaded automatically.", "info");
        this.#notifyChange();
        return;
      }
      this.#projection.setHistoryStatus("loading");
      this.#historyEventBuffer = [];
      this.#notifyChange();
      const messages = await api.getMessages();
      const bufferedEvents = this.#takeHistoryEvents();
      if (this.#disposed || api !== this.#api) return;
      this.#projection.hydrateMessages(messages);
      for (const event of bufferedEvents) this.#applyConnectionEvent(event);
      this.#notifyChange();
    } catch (error) {
      const bufferedEvents = this.#takeHistoryEvents();
      if (this.#disposed || api !== this.#api) return;
      for (const event of bufferedEvents) this.#applyConnectionEvent(event);
      this.#logger.error("Failed to load Pi messages", error);
      this.#projection.setHistoryStatus("failed");
      this.#projection.appendNotice(`Unable to load conversation history: ${errorMessage(error)}`, "error");
      this.#notifyChange();
      throw error;
    }
  }

  #takeHistoryEvents(): RpcEvent[] {
    const events = this.#historyEventBuffer ?? [];
    this.#historyEventBuffer = null;
    return events;
  }

  #applyConnectionEvent(event: RpcEvent): void {
    if (isExtensionUiRequest(event)) this.#extensionUi?.handle(event);
    else this.#projection.applyEvent(event);
    if (event.type === "agent_settled") void this.#refreshAfterSettled();
    if (event.type === "compaction_end") void this.#refreshAfterCompaction();
  }

  async #refreshAfterCompaction(): Promise<void> {
    const api = this.#api;
    if (!api) return;
    const stats = await api.getSessionStats().catch(() => undefined);
    if (this.#disposed || api !== this.#api) return;
    if (stats) this.#projection.setStats(stats);
    this.#notifyChange();
  }

  async #refreshAfterSettled(): Promise<void> {
    const api = this.#api;
    if (!api) return;
    const [state, stats, commands] = await Promise.all([
      api.getState().catch(() => undefined),
      api.getSessionStats().catch(() => undefined),
      api.getCommands().catch(() => undefined),
    ]);
    if (state) this.#projection.applyState(state);
    if (stats) this.#projection.setStats(stats);
    if (commands) this.#projection.setCommands(commands);
    this.#notifyChange();
  }

  #requireApi(): PiRpcApi {
    if (!this.#api || !this.#connection?.started) throw new Error("Pi session is not running");
    return this.#api;
  }

  #syncExtensionUiSnapshot(): void {
    const snapshot = this.#extensionUi?.snapshot();
    if (!snapshot) return;
    this.#projection.setExtensionUi(snapshot.pending, snapshot.statuses, snapshot.widgets);
  }

  #notifyChange(): void {
    this.#hooks.onChange(this);
  }
}

const MAX_AUTO_HISTORY_LOAD_BYTES = 8 * 1024 * 1024;
const IMMEDIATE_EXTENSION_UI_METHODS = new Set(["select", "confirm", "input", "editor"]);

function shouldBufferDuringHistoryLoad(event: RpcEvent): boolean {
  return !isExtensionUiRequest(event) || !IMMEDIATE_EXTENSION_UI_METHODS.has(event.method);
}

function commandName(text: string): string | undefined {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("/")) return undefined;
  return trimmed.slice(1).split(/\s/, 1)[0] || undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readVsCodeProxy(cwd: string): string | undefined {
  const value = vscode.workspace.getConfiguration("http", workspaceUriForPath(cwd)).get<string>("proxy", "").trim();
  return value || undefined;
}
