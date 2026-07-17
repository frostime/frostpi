import type { RpcEvent, RpcSessionState } from "@frostime/pi-rpc";

import type { WebviewImageInput } from "../../shared/bridge/webviewToHost.js";
import type { AgentTurnStatus, SessionNoticeLevel } from "../../shared/model/agentTurnModel.js";
import type { AttachmentLimitsView, SessionRuntimeStatus, SessionViewModel } from "../../shared/model/sessionViewModel.js";
import { TurnProjection } from "./TurnProjection.js";

export class SessionProjection {
  readonly #view: SessionViewModel;
  readonly #conversation = new TurnProjection();

  constructor(
    id: string,
    cwd: string,
    title: string,
    attachmentLimits: AttachmentLimitsView = { maxImageBytes: 10 * 1024 * 1024, maxImages: 12 },
    initialUpdatedAt = Date.now(),
  ) {
    this.#view = {
      id,
      title,
      cwd,
      status: "stopped",
      isStreaming: false,
      isCompacting: false,
      historyStatus: "loaded",
      model: null,
      thinkingLevel: "off",
      availableModels: [],
      commands: [],
      attachmentLimits,
      networkProxy: { mode: "inherit", label: "Inherited", restartRequired: false },
      turns: [],
      notices: [],
      compactions: [],
      pendingExtensionUi: [],
      extensionStatuses: [],
      extensionWidgets: [],
      updatedAt: initialUpdatedAt,
    };
  }

  read(): Readonly<SessionViewModel> {
    return this.#view;
  }

  snapshot(): SessionViewModel {
    return structuredClone(this.#view);
  }

  setStatus(status: SessionRuntimeStatus, error?: string): void {
    this.#view.status = status;
    if (error) this.#view.error = error;
    else delete this.#view.error;
    this.#touch();
  }

  applyState(state: RpcSessionState): void {
    this.#view.model = state.model;
    this.#view.thinkingLevel = state.thinkingLevel;
    this.#view.isStreaming = state.isStreaming;
    this.#view.isCompacting = state.isCompacting;
    if (state.sessionFile) this.#view.sessionFile = state.sessionFile;
    if (state.sessionId) this.#view.sessionId = state.sessionId;
    if (state.sessionName) this.#view.title = state.sessionName;
    this.#view.status = state.isStreaming ? "running" : "ready";
    this.#touch();
  }

  hydrateMessages(rawMessages: unknown[]): void {
    this.#conversation.hydrate(rawMessages);
    this.#syncConversation();
    this.#view.historyStatus = "loaded";
    this.#touch();
  }

  setHistoryStatus(status: SessionViewModel["historyStatus"]): void {
    this.#view.historyStatus = status;
    this.#touch();
  }

  setModels(models: SessionViewModel["availableModels"]): void {
    this.#view.availableModels = models;
    this.#touch();
  }

  setCommands(commands: SessionViewModel["commands"]): void {
    this.#view.commands = commands;
    this.#touch();
  }

  setStats(stats: NonNullable<SessionViewModel["stats"]>): void {
    this.#view.stats = stats;
    this.#touch();
  }

  setTitle(title: string): void {
    this.#view.title = title || "Untitled session";
    this.#touch();
  }

  setNetworkProxy(networkProxy: SessionViewModel["networkProxy"]): void {
    this.#view.networkProxy = networkProxy;
    this.#touch();
  }

  setAttachmentLimits(attachmentLimits: AttachmentLimitsView): void {
    this.#view.attachmentLimits = attachmentLimits;
    this.#touch();
  }

  setExtensionUi(
    pending: SessionViewModel["pendingExtensionUi"],
    statuses: SessionViewModel["extensionStatuses"],
    widgets: SessionViewModel["extensionWidgets"],
  ): void {
    this.#view.pendingExtensionUi = pending;
    this.#view.extensionStatuses = statuses;
    this.#view.extensionWidgets = widgets;
    this.#touch();
  }

  appendUserPrompt(text: string, images: WebviewImageInput[]): string {
    const turnId = this.#conversation.appendUserPrompt(text, images);
    this.#syncConversation();
    this.#touch();
    return turnId;
  }

  appendNotice(text: string, level: SessionNoticeLevel = "info"): void {
    this.#conversation.appendNotice(text, level);
    this.#syncConversation();
    this.#touch();
  }

  completeTurn(turnId: string, status: AgentTurnStatus = "completed"): boolean {
    const completed = this.#conversation.completeTurn(turnId, status);
    if (completed) {
      this.#syncConversation();
      this.#touch();
    }
    return completed;
  }

  applyEvent(event: RpcEvent): void {
    switch (event.type) {
      case "agent_start":
        this.#view.status = "running";
        this.#view.isStreaming = true;
        break;
      case "agent_settled":
        this.#view.status = "ready";
        this.#view.isStreaming = false;
        break;
      case "compaction_start":
        this.#view.isCompacting = true;
        break;
      case "compaction_end":
        this.#view.isCompacting = false;
        if (typeof event.errorMessage === "string") this.#conversation.appendNotice(event.errorMessage, "error");
        break;
      default:
        break;
    }
    this.#conversation.applyEvent(event);
    this.#syncConversation();
    this.#touch();
  }

  #syncConversation(): void {
    const snapshot = this.#conversation.snapshot();
    this.#view.turns = snapshot.turns;
    this.#view.notices = snapshot.notices;
    this.#view.compactions = snapshot.compactions;
  }

  #touch(): void {
    this.#view.updatedAt = Date.now();
  }
}
