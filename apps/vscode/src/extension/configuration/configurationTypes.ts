import type { StreamingBehavior } from "@frostime/pi-rpc";

export interface FrostPiConfiguration {
  piExecutable?: string;
  piArguments: string[];
  startSessionOnOpen: boolean;
  streamingBehavior: StreamingBehavior;
  maxImageBytes: number;
  diagnosticsLevel: "error" | "info" | "debug";
}
