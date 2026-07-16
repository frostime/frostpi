import type { RpcCommandDescriptor, RpcModel, RpcSessionStats, ThinkingLevel } from "@frostime/pi-rpc";

import type { ConversationMessageView } from "./conversationModel.js";
import type { ExtensionStatusView, ExtensionWidgetView, PendingExtensionUiView } from "./extensionUiModel.js";
import type { ToolCallView } from "./toolCallModel.js";

export type SessionRuntimeStatus = "starting" | "ready" | "running" | "stopping" | "stopped" | "failed";

export interface SessionSummaryView {
  id: string;
  title: string;
  cwd: string;
  status: SessionRuntimeStatus;
  isActive: boolean;
  modelLabel?: string;
  thinkingLevel?: ThinkingLevel;
  updatedAt: number;
}

export interface AttachmentLimitsView {
  maxImageBytes: number;
  maxImages: number;
}

export interface SessionViewModel {
  id: string;
  title: string;
  cwd: string;
  status: SessionRuntimeStatus;
  isStreaming: boolean;
  isCompacting: boolean;
  sessionFile?: string;
  sessionId?: string;
  model: RpcModel | null;
  thinkingLevel: ThinkingLevel;
  availableModels: RpcModel[];
  commands: RpcCommandDescriptor[];
  attachmentLimits: AttachmentLimitsView;
  messages: ConversationMessageView[];
  toolCalls: ToolCallView[];
  pendingExtensionUi: PendingExtensionUiView[];
  extensionStatuses: ExtensionStatusView[];
  extensionWidgets: ExtensionWidgetView[];
  stats?: RpcSessionStats;
  error?: string;
  updatedAt: number;
}

export interface WorkspaceViewModel {
  workspaceName: string;
  workspacePath: string;
  sessions: SessionSummaryView[];
  activeSessionId: string | null;
  activeSession: SessionViewModel | null;
  piAvailable: boolean;
  piError?: string;
}
