import { BRIDGE_VERSION } from "$shared/bridge/bridgeVersion";
import type { CollectionDelta, HostToWebviewMessage } from "$shared/bridge/hostToWebview";

import { insertDraftText } from "../state/composerDraftStore.svelte";
import { composerFocusTick, showToast, workspaceStore } from "../state/sessionViewStore.svelte";
import { promptSubmissionResult } from "../state/promptSubmissionStore.svelte";

export function applyHostMessage(message: HostToWebviewMessage): void {
  if (message.bridgeVersion !== BRIDGE_VERSION) {
    showToast("error", "FrostPi UI and extension host are incompatible. Reload the window.");
    return;
  }
  switch (message.type) {
    case "snapshot":
      workspaceStore.set(message.workspace);
      break;
    case "workspaceDelta":
      workspaceStore.update((current) => {
        const incoming = message.workspace.activeSession;
        const existing = current.activeSession?.id === incoming?.base.id ? current.activeSession : null;
        return {
          workspaceName: message.workspace.workspaceName,
          workspacePath: message.workspace.workspacePath,
          sessions: message.workspace.sessions,
          activeSessionId: message.workspace.activeSessionId,
          piAvailable: message.workspace.piAvailable,
          ...(message.workspace.piError ? { piError: message.workspace.piError } : {}),
          activeSession: incoming ? {
            ...incoming.base,
            messages: mergeCollection(existing?.messages ?? [], incoming.messages),
            toolCalls: mergeCollection(existing?.toolCalls ?? [], incoming.toolCalls),
          } : null,
        };
      });
      break;
    case "insertPromptText": {
      let activeId: string | null = null;
      workspaceStore.update((workspace) => {
        activeId = workspace.activeSessionId;
        return workspace;
      });
      if (activeId) insertDraftText(activeId, message.text);
      composerFocusTick.update((value) => value + 1);
      break;
    }
    case "focusComposer":
      composerFocusTick.update((value) => value + 1);
      break;
    case "promptResult":
      promptSubmissionResult.set(message);
      if (!message.ok && message.error) showToast("error", message.error);
      break;
    case "toast":
      showToast(message.level, message.message);
      break;
  }
}

export function mergeCollection<T extends { id: string }>(current: readonly T[], delta: CollectionDelta<T>): T[] {
  if (delta.mode === "replace") return [...delta.items];
  if (delta.items.length === 0) return [...current];
  const updates = new Map(delta.items.map((item) => [item.id, item]));
  const merged = current.map((item) => updates.get(item.id) ?? item);
  const known = new Set(current.map((item) => item.id));
  for (const item of delta.items) if (!known.has(item.id)) merged.push(item);
  return merged;
}
