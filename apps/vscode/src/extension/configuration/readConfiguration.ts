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
    proxy: {
      mode: config.get<"inherit" | "vscode" | "custom" | "direct">("network.proxy.mode", "inherit"),
      ...optional("http", config.get<string>("network.proxy.http", "")),
      ...optional("https", config.get<string>("network.proxy.https", "")),
      ...optional("all", config.get<string>("network.proxy.all", "")),
      ...optional("noProxy", config.get<string>("network.proxy.noProxy", "")),
    },
    fileMentionMaxFiles: config.get<number>("composer.fileMentions.maxFiles", 50_000),
    fileMentionRespectSearchExclude: config.get<boolean>("composer.fileMentions.respectSearchExclude", true),
  };
}

function optional<Key extends string>(key: Key, value: string): Record<Key, string> | Record<string, never> {
  const normalized = value.trim();
  return normalized ? { [key]: normalized } as Record<Key, string> : {};
}
