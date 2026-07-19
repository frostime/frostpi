import type { AgentTurnView, SessionNoticeView } from "../model/agentTurnModel.js";
import type { SessionSummaryView, SessionViewModel, WorkspaceViewModel } from "../model/sessionViewModel.js";
import type { EditorMentionSpecialView, WorkspaceFileCandidateView } from "../model/workspaceFileModel.js";

export type SessionBaseView = Omit<SessionViewModel, "turns" | "notices">;

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
    turns: CollectionDelta<AgentTurnView>;
    notices: CollectionDelta<SessionNoticeView>;
  } | null;
}

export type HostToWebviewPayload =
  | { type: "snapshot"; workspace: WorkspaceViewModel }
  | { type: "workspaceDelta"; workspace: WorkspaceDeltaView }
  | { type: "insertPromptText"; text: string }
  | { type: "focusComposer" }
  | { type: "promptResult"; requestId: string; ok: boolean; error?: string }
  | {
      type: "forkResult";
      requestId: string;
      ok: boolean;
      cancelled?: boolean;
      text?: string;
      forkSessionId?: string;
      originalSessionId?: string;
      error?: string;
    }
  | { type: "workspaceFileSuggestions"; requestId: string; items: WorkspaceFileCandidateView[]; specials?: EditorMentionSpecialView[]; error?: string }
  | { type: "toast"; level: "info" | "warning" | "error"; message: string };

export type HostToWebviewMessage = HostToWebviewPayload & { bridgeVersion: string };
