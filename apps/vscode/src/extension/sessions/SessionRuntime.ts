import {
  PiRpcApi,
  PiRpcConnection,
  isExtensionUiRequest,
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
  #disposed = false;
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

  async start(sessionFile?: string): Promise<void> {
    if (this.#disposed) throw new Error("Session runtime is disposed");
    if (this.#starting) return this.#starting;
    if (this.#connection?.started) return;

    this.#starting = this.#startInternal(sessionFile).finally(() => {
      this.#starting = null;
    });
    return this.#starting;
  }

  async stop(): Promise<void> {
    this.#projection.setStatus("stopping");
    this.#notifyChange();
    await this.#extensionUi?.cancelAll();
    await this.#connection?.stop();
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

  async #startInternal(sessionFile?: string): Promise<void> {
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
      if (isExtensionUiRequest(event)) this.#extensionUi?.handle(event);
      else this.#projection.applyEvent(event);
      this.#notifyChange();
      if (event.type === "agent_settled") void this.#refreshAfterSettled();
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
      this.#appliedProxyFingerprint = proxyFingerprint(configuration.proxy, vscodeProxy);
      this.#proxyRestartForced = false;
      this.#projection.setNetworkProxy({ mode: configuration.proxy.mode, label: proxyEnvironment.label, restartRequired: false });
      this.#projection.applyState(state);
      await this.#hydrate(api);
      this.#logger.info(`Started Pi session ${this.id} in ${this.cwd}`);
      this.#notifyChange();
    } catch (error) {
      const message = errorMessage(error);
      this.#projection.setStatus("failed", message);
      this.#logger.error(`Failed to start Pi session ${this.id}`, error);
      this.#notifyChange();
      throw error;
    }
  }

  async #hydrate(api: PiRpcApi): Promise<void> {
    const [messages, models, commands, stats] = await Promise.all([
      api.getMessages().catch((error) => {
        this.#logger.error("Failed to load Pi messages", error);
        return [];
      }),
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
    this.#projection.hydrateMessages(messages);
    this.#projection.setModels(models);
    this.#projection.setCommands(commands);
    if (stats) this.#projection.setStats(stats);
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
