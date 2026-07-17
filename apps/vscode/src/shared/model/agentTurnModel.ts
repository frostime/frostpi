import type { ConversationMessageView, MessageBlockView, MessageStatus } from "./conversationModel.js";
import type { ToolCallView } from "./toolCallModel.js";

export type AgentTurnStatus = "running" | "completed" | "aborted" | "error";

export interface ReasoningActivityView {
  id: string;
  type: "reasoning";
  text: string;
  status: MessageStatus;
  timestamp: number;
}

export interface ResponseActivityView {
  id: string;
  type: "response";
  blocks: MessageBlockView[];
  status: MessageStatus;
  timestamp: number;
}

export interface ToolActivityView {
  id: string;
  type: "tool";
  tool: ToolCallView;
  timestamp: number;
}

export type SessionNoticeLevel = "info" | "warning" | "error";

export interface SessionNoticeView {
  id: string;
  text: string;
  level: SessionNoticeLevel;
  timestamp: number;
}

export interface NoticeActivityView extends SessionNoticeView {
  type: "notice";
}

export type AgentActivityView = ReasoningActivityView | ResponseActivityView | ToolActivityView | NoticeActivityView;

export interface AgentTurnView {
  id: string;
  userMessage?: ConversationMessageView;
  activities: AgentActivityView[];
  status: AgentTurnStatus;
  startedAt: number;
  endedAt?: number;
}
