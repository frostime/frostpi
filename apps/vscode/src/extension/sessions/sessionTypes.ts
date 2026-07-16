export interface PersistedSessionRecord {
  id: string;
  title: string;
  cwd: string;
  sessionFile?: string;
  updatedAt: number;
}

export interface PersistedSessionRegistry {
  version: 1;
  activeSessionId: string | null;
  sessions: PersistedSessionRecord[];
}
