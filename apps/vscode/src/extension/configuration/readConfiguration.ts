import * as vscode from "vscode";

import type { FrostPiConfiguration } from "./configurationTypes.js";

export function readConfiguration(scope?: vscode.Uri): FrostPiConfiguration {
  const config = vscode.workspace.getConfiguration("frostpi", scope);
  const executable = config.get<string>("pi.executable", "").trim();
  return {
    ...(executable ? { piExecutable: executable } : {}),
    piArguments: config.get<string[]>("pi.arguments", []),
    startSessionOnOpen: config.get<boolean>("session.startOnOpen", true),
    streamingBehavior: config.get<"steer" | "followUp">("composer.streamingBehavior", "followUp"),
    maxImageBytes: config.get<number>("attachments.maxImageBytes", 10 * 1024 * 1024),
    diagnosticsLevel: config.get<"error" | "info" | "debug">("diagnostics.level", "info"),
  };
}
