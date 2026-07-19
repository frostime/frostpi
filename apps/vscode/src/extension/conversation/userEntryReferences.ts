import type { RpcSessionEntry } from "@frostime/pi-rpc";

export interface UserEntryReference {
  entryId: string;
  timestamp?: number;
}

/** Return user-message entries on the active root-to-leaf path. */
export function activeUserEntryReferences(
  entries: readonly RpcSessionEntry[],
  leafId: string | null,
): UserEntryReference[] {
  if (!leafId) return [];
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const path: RpcSessionEntry[] = [];
  const seen = new Set<string>();
  let current = byId.get(leafId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.push(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  path.reverse();
  return userEntryReferences(path);
}

/** Return user-message entries in the supplied append order. */
export function userEntryReferences(entries: readonly RpcSessionEntry[]): UserEntryReference[] {
  const references: UserEntryReference[] = [];
  for (const entry of entries) {
    if (entry.type !== "message" || !isRecord(entry.message) || entry.message.role !== "user") continue;
    references.push({
      entryId: entry.id,
      ...(typeof entry.message.timestamp === "number" ? { timestamp: entry.message.timestamp } : {}),
    });
  }
  return references;
}

/** Whether an incremental entry batch connects the previous active leaf to the reported leaf. */
export function activeLeafContinues(
  previousLeafId: string | null,
  entries: readonly RpcSessionEntry[],
  leafId: string | null,
): boolean {
  if (leafId === previousLeafId) return true;
  if (!previousLeafId) return true;
  if (!leafId) return false;

  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const seen = new Set<string>();
  let current = byId.get(leafId);
  while (current && !seen.has(current.id)) {
    if (current.parentId === previousLeafId) return true;
    seen.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
