export type ToolCallStatus = "queued" | "running" | "complete" | "error" | "cancelled";

export interface ToolCallView {
  id: string;
  name: string;
  label: string;
  status: ToolCallStatus;
  args: Record<string, unknown>;
  output?: string;
  isError: boolean;
  startedAt: number;
  endedAt?: number;
  filePath?: string;
  line?: number;
}
