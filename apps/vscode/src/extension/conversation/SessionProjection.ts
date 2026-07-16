import type { RpcEvent, RpcSessionState } from "@frostime/pi-rpc";

import type { WebviewImageInput } from "../../shared/bridge/webviewToHost.js";
import type { ConversationMessageView } from "../../shared/model/conversationModel.js";
import type { AttachmentLimitsView, SessionRuntimeStatus, SessionViewModel } from "../../shared/model/sessionViewModel.js";
import type { ToolCallView } from "../../shared/model/toolCallModel.js";
import { contentToBlocks, createToolView, extractText, hydrateConversation, isRecord, recordValue, stringValue } from "./messageAssembler.js";

export class SessionProjection {
  readonly #view: SessionViewModel;
  #streamingMessageId: string | null = null;
  #sequence = 0;

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
      model: null,
      thinkingLevel: "off",
      availableModels: [],
      commands: [],
      attachmentLimits,
      messages: [],
      toolCalls: [],
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
    const hydrated = hydrateConversation(rawMessages);
    this.#view.messages = hydrated.messages;
    this.#view.toolCalls = hydrated.toolCalls;
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

  appendUserPrompt(text: string, images: WebviewImageInput[]): void {
    const blocks: ConversationMessageView["blocks"] = [];
    if (text) blocks.push({ type: "text", text });
    if (images.length) {
      blocks.push({
        type: "images",
        images: images.map((image) => ({
          id: image.id,
          name: image.name,
          mimeType: image.mimeType,
          dataUrl: `data:${image.mimeType};base64,${image.data}`,
          size: image.size,
        })),
      });
    }
    this.#view.messages.push({
      id: `local-user-${Date.now()}-${++this.#sequence}`,
      role: "user",
      blocks,
      status: "complete",
      timestamp: Date.now(),
    });
    this.#touch();
  }

  appendSystemMessage(text: string, status: "complete" | "error" = "complete"): void {
    this.#view.messages.push({
      id: `system-${Date.now()}-${++this.#sequence}`,
      role: "system",
      blocks: [{ type: status === "error" ? "error" : "text", text }],
      status,
      timestamp: Date.now(),
    });
    this.#touch();
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
        this.#streamingMessageId = null;
        break;
      case "compaction_start":
        this.#view.isCompacting = true;
        break;
      case "compaction_end":
        this.#view.isCompacting = false;
        if (typeof event.errorMessage === "string") this.appendSystemMessage(event.errorMessage, "error");
        break;
      case "message_start":
      case "message_update":
      case "message_end":
        this.#applyMessageEvent(event);
        break;
      case "tool_execution_start":
        this.#applyToolStart(event);
        break;
      case "tool_execution_update":
        this.#applyToolUpdate(event);
        break;
      case "tool_execution_end":
        this.#applyToolEnd(event);
        break;
      case "extension_error":
        this.appendSystemMessage(`Extension error: ${stringValue(event.error, "Unknown extension error")}`, "error");
        break;
      case "auto_retry_start":
        this.appendSystemMessage(`Retrying after a transient provider error (attempt ${typeof event.attempt === "number" || typeof event.attempt === "string" ? event.attempt : "?"}).`);
        break;
      case "auto_retry_end":
        if (event.success === false) this.appendSystemMessage(`Automatic retry failed: ${stringValue(event.finalError, "Unknown error")}`, "error");
        break;
      default:
        break;
    }
    this.#touch();
  }

  #applyMessageEvent(event: RpcEvent): void {
    const raw = event.message;
    if (!isRecord(raw) || raw.role !== "assistant") return;
    const eventKind = event.type;
    if (!this.#streamingMessageId) this.#streamingMessageId = `assistant-${Date.now()}-${++this.#sequence}`;
    const existingIndex = this.#view.messages.findIndex((message) => message.id === this.#streamingMessageId);
    const delta = isRecord(event.assistantMessageEvent) ? event.assistantMessageEvent : {};
    const status = eventKind === "message_end"
      ? raw.stopReason === "aborted" ? "aborted" : raw.stopReason === "error" ? "error" : "complete"
      : delta.type === "error" ? delta.reason === "aborted" ? "aborted" : "error"
      : "streaming";
    const next: ConversationMessageView = {
      id: this.#streamingMessageId,
      role: "assistant",
      blocks: contentToBlocks(raw.content),
      status,
      timestamp: typeof raw.timestamp === "number" ? raw.timestamp : Date.now(),
    };
    if (existingIndex === -1) this.#view.messages.push(next);
    else this.#view.messages[existingIndex] = next;
    if (eventKind === "message_end") this.#streamingMessageId = null;
  }

  #applyToolStart(event: RpcEvent): void {
    if (typeof event.toolCallId !== "string") return;
    const tool = createToolView(
      event.toolCallId,
      stringValue(event.toolName, "tool"),
      recordValue(event.args),
    );
    this.#upsertTool(tool);
  }

  #applyToolUpdate(event: RpcEvent): void {
    if (typeof event.toolCallId !== "string") return;
    const tool = this.#tool(event.toolCallId, event);
    tool.status = "running";
    tool.output = extractText(event.partialResult).slice(-80_000);
    this.#upsertTool(tool);
  }

  #applyToolEnd(event: RpcEvent): void {
    if (typeof event.toolCallId !== "string") return;
    const tool = this.#tool(event.toolCallId, event);
    tool.isError = event.isError === true;
    tool.status = tool.isError ? "error" : "complete";
    tool.output = extractText(event.result).slice(-160_000);
    tool.endedAt = Date.now();
    this.#upsertTool(tool);
  }

  #tool(id: string, event: RpcEvent): ToolCallView {
    const existing = this.#view.toolCalls.find((tool) => tool.id === id);
    return existing
      ? { ...existing, args: { ...existing.args } }
      : createToolView(id, stringValue(event.toolName, "tool"), recordValue(event.args));
  }

  #upsertTool(tool: ToolCallView): void {
    const index = this.#view.toolCalls.findIndex((item) => item.id === tool.id);
    if (index === -1) this.#view.toolCalls.push(tool);
    else this.#view.toolCalls[index] = tool;
  }

  #touch(): void {
    this.#view.updatedAt = Date.now();
  }
}
