import { writable } from "svelte/store";

import type { WorkspaceViewModel } from "$shared/model/sessionViewModel";

export const EMPTY_WORKSPACE: WorkspaceViewModel = {
  workspaceName: "",
  workspacePath: "",
  sessions: [],
  activeSessionId: null,
  activeSession: null,
  piAvailable: true,
};

export const workspaceStore = writable<WorkspaceViewModel>(EMPTY_WORKSPACE);
export const composerFocusTick = writable(0);

export interface ToastItem {
  id: number;
  level: "info" | "warning" | "error";
  message: string;
}

export const toastStore = writable<ToastItem[]>([]);
let toastId = 0;

export function showToast(level: ToastItem["level"], message: string): void {
  const id = ++toastId;
  toastStore.update((items) => [...items, { id, level, message }].slice(-4));
  window.setTimeout(() => toastStore.update((items) => items.filter((item) => item.id !== id)), 5_000);
}
