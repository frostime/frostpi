import type { ConversationMessageView } from "../model/conversationModel.js";
import type { SessionSummaryView, SessionViewModel, WorkspaceViewModel } from "../model/sessionViewModel.js";
import type { ToolCallView } from "../model/toolCallModel.js";

export type SessionBaseView = Omit<SessionViewModel, "messages" | "toolCalls">;

export interface CollectionDelta<T> {
  mode: "replace" | "upsert";
  items: T[];
}

export interface WorkspaceDeltaView {
  workspaceName: string;
  workspacePath: string;
  sessions: SessionSummaryView[];
  activeSessionId: string | null;
  piAvailable: boolean;
  piError?: string;
  activeSession: {
    base: SessionBaseView;
    messages: CollectionDelta<ConversationMessageView>;
    toolCalls: CollectionDelta<ToolCallView>;
  } | null;
}

export type HostToWebviewPayload =
  | { type: "snapshot"; workspace: WorkspaceViewModel }
  | { type: "workspaceDelta"; workspace: WorkspaceDeltaView }
  | { type: "insertPromptText"; text: string }
  | { type: "focusComposer" }
  | { type: "promptResult"; requestId: string; ok: boolean; error?: string }
  | { type: "toast"; level: "info" | "warning" | "error"; message: string };

export type HostToWebviewMessage = HostToWebviewPayload & { bridgeVersion: number };
