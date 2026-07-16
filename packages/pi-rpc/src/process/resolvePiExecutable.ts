import { accessSync, constants, existsSync } from "node:fs";
import { basename, delimiter, join } from "node:path";

export interface PiInvocation {
  command: string;
  args: string[];
  source: "configured" | "current-process" | "path-module" | "path-command";
}

export interface ResolvePiExecutableOptions {
  command?: string;
  commandArgs?: readonly string[];
  path?: string;
  currentScript?: string;
  platform?: NodeJS.Platform;
}

export function resolvePiExecutable(options: ResolvePiExecutableOptions = {}): PiInvocation {
  if (options.command) {
    return {
      command: options.command,
      args: [...(options.commandArgs ?? [])],
      source: "configured",
    };
  }

  const currentScript = options.currentScript ?? process.argv[1];
  if (isPiCliScript(currentScript)) {
    return { command: process.execPath, args: [currentScript], source: "current-process" };
  }

  const installedCli = findInstalledPiCli(options.path ?? process.env.PATH ?? "");
  if (installedCli) {
    return { command: options.platform === "win32" || process.platform === "win32" ? "node.exe" : "node", args: [installedCli], source: "path-module" };
  }

  return {
    command: options.platform === "win32" || process.platform === "win32" ? "pi.cmd" : "pi",
    args: [],
    source: "path-command",
  };
}

export function invocationExists(invocation: PiInvocation): boolean {
  if (invocation.source === "path-command") return true;
  try {
    accessSync(invocation.command, constants.X_OK);
    return true;
  } catch {
    return existsSync(invocation.command);
  }
}

function isPiCliScript(filePath: string | undefined): filePath is string {
  return Boolean(filePath && basename(filePath) === "cli.js" && filePath.includes("pi-coding-agent") && existsSync(filePath));
}

function findInstalledPiCli(pathValue: string): string | undefined {
  for (const pathEntry of pathValue.split(delimiter)) {
    if (!pathEntry) continue;
    const direct = join(pathEntry, "node_modules", "@earendil-works", "pi-coding-agent", "dist", "cli.js");
    if (existsSync(direct)) return direct;
    const sibling = join(pathEntry, "..", "lib", "node_modules", "@earendil-works", "pi-coding-agent", "dist", "cli.js");
    if (existsSync(sibling)) return sibling;
  }
  return undefined;
}
