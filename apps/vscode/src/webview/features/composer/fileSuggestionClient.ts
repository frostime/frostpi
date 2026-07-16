import type { WorkspaceFileCandidateView } from "$shared/model/workspaceFileModel";

import { postToHost } from "../../bridge/vscodeBridge";
import { createId } from "../../utils/createId";

export interface WorkspaceFileSuggestionResult {
  items: WorkspaceFileCandidateView[];
  error?: string;
}

interface PendingRequest {
  resolve(result: WorkspaceFileSuggestionResult): void;
  timer: ReturnType<typeof setTimeout>;
}

const pending = new Map<string, PendingRequest>();

export function requestWorkspaceFileSuggestions(
  sessionId: string,
  query: string,
  limit = 20,
): { requestId: string; promise: Promise<WorkspaceFileSuggestionResult>; cancel(): void } {
  const requestId = createId("file-search");
  const promise = new Promise<WorkspaceFileSuggestionResult>((resolve) => {
    const timer = setTimeout(
      () => finish(requestId, { items: [], error: "Workspace file search timed out." }),
      7_500,
    );
    pending.set(requestId, { resolve, timer });
    postToHost({ type: "searchWorkspaceFiles", requestId, sessionId, query, limit });
  });
  return { requestId, promise, cancel: () => finish(requestId, { items: [] }) };
}

export function deliverWorkspaceFileSuggestions(
  requestId: string,
  items: WorkspaceFileCandidateView[],
  error?: string,
): void {
  finish(requestId, { items, ...(error ? { error } : {}) });
}

function finish(requestId: string, result: WorkspaceFileSuggestionResult): void {
  const request = pending.get(requestId);
  if (!request) return;
  pending.delete(requestId);
  clearTimeout(request.timer);
  request.resolve(result);
}
