import {
  PiRpcApi,
  PiRpcConnection,
  isExtensionUiRequest,
  type RpcExtensionUiResponse,
  type RpcModel,
  type ThinkingLevel,
} from "@frostime/pi-rpc";

import type { WebviewImageInput } from "../../shared/bridge/webviewToHost.js";
import type { SessionViewModel } from "../../shared/model/sessionViewModel.js";
import { normalizeImageAttachments } from "../attachments/normalizeImageAttachment.js";
import type { FrostPiConfiguration } from "../configuration/configurationTypes.js";
import { SessionProjection } from "../conversation/SessionProjection.js";
import type { DiagnosticLogger } from "../diagnostics/DiagnosticLogger.js";
import { ExtensionUiCoordinator } from "../extension-ui/ExtensionUiCoordinator.js";
import { configuredPiInvocation } from "../pi-runtime/resolvePiExecutable.js";

export interface SessionRuntimeHooks {
  onChange(runtime: SessionRuntime): void;
  onToast(level: "info" | "warning" | "error", message: string): void;
  onEditorText(runtime: SessionRuntime, text: string): void;
}

export class SessionRuntime {
  readonly #projection: SessionProjection;
  readonly #configuration: FrostPiConfiguration;
  readonly #logger: DiagnosticLogger;
  readonly #hooks: SessionRuntimeHooks;

  #connection: PiRpcConnection | null = null;
  #api: PiRpcApi | null = null;
  #extensionUi: ExtensionUiCoordinator | null = null;
  #starting: Promise<void> | null = null;
  #disposed = false;

  constructor(
    readonly id: string,
    readonly cwd: string,
    title: string,
    updatedAt: number,
    configuration: FrostPiConfiguration,
    logger: DiagnosticLogger,
    hooks: SessionRuntimeHooks,
  ) {
    this.#projection = new SessionProjection(id, cwd, title, {
      maxImageBytes: configuration.maxImageBytes,
      maxImages: 12,
    }, updatedAt);
    this.#configuration = configuration;
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
    this.#projection.setStatus("stopped");
    this.#notifyChange();
  }

  async dispose(): Promise<void> {
    this.#disposed = true;
    await this.stop();
  }

  async sendPrompt(text: string, images: WebviewImageInput[]): Promise<void> {
    const api = this.#requireApi();
    const normalizedImages = normalizeImageAttachments(images, this.#configuration.maxImageBytes);
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
          ? { streamingBehavior: this.#configuration.streamingBehavior }
          : {}),
      });
    } catch (error) {
      const message = errorMessage(error);
      this.#projection.appendSystemMessage(message, "error");
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
      `Messages: ${view.messages.length}`,
      `Tool calls: ${view.toolCalls.length}`,
      `Pending extension UI: ${view.pendingExtensionUi.length}`,
      `Last error: ${view.error ?? "<none>"}`,
      `Pi stderr tail: ${this.#connection?.getStderr() || "<empty>"}`,
    ].join("\n");
  }

  async #startInternal(sessionFile?: string): Promise<void> {
    this.#projection.setStatus("starting");
    this.#notifyChange();

    const invocation = configuredPiInvocation(this.#configuration.piExecutable);
    const args = [
      ...this.#configuration.piArguments,
      ...(sessionFile ? ["--session", sessionFile] : []),
    ];
    const connection = new PiRpcConnection({
      cwd: this.cwd,
      args,
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
      onNotify: (level, message) => this.#hooks.onToast(level, message),
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
