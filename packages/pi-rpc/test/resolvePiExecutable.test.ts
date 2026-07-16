import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolvePiExecutable } from "../src/process/resolvePiExecutable.js";

const temporary: string[] = [];
afterEach(() => { for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true }); });

describe("Pi executable resolution", () => {
  it("uses the configured command without rewriting it", () => {
    expect(resolvePiExecutable({ command: "/opt/pi", commandArgs: ["--flag"] })).toEqual({ command: "/opt/pi", args: ["--flag"], source: "configured" });
  });

  it("launches a globally installed CLI with the user's Node runtime, not VS Code's embedded Node", () => {
    const prefix = mkdtempSync(join(tmpdir(), "frostpi-path-"));
    temporary.push(prefix);
    const cli = join(prefix, "..", "lib", "node_modules", "@earendil-works", "pi-coding-agent", "dist", "cli.js");
    mkdirSync(join(cli, ".."), { recursive: true });
    writeFileSync(cli, "");
    expect(resolvePiExecutable({ path: prefix, platform: "linux", currentScript: "/extension/host.js" })).toEqual({ command: "node", args: [cli], source: "path-module" });
  });
});
