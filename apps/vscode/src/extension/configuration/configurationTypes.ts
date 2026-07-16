import type { StreamingBehavior } from "@frostime/pi-rpc";

export type ProxyMode = "inherit" | "vscode" | "custom" | "direct";

export interface ProxyConfiguration {
  mode: ProxyMode;
  http?: string;
  https?: string;
  all?: string;
  noProxy?: string;
}

export interface FrostPiConfiguration {
  piExecutable?: string;
  piArguments: string[];
  startSessionOnOpen: boolean;
  streamingBehavior: StreamingBehavior;
  maxImageBytes: number;
  diagnosticsLevel: "error" | "info" | "debug";
  proxy: ProxyConfiguration;
  fileMentionMaxFiles: number;
  fileMentionRespectSearchExclude: boolean;
}
