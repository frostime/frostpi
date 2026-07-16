import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { root, run } from "./lib.mjs";

run("pnpm", ["--filter", "@frostime/pi-rpc", "build"]);
run("pnpm", ["--filter", "frostpi", "build"]);

for (const relative of [
  "apps/vscode/dist/extension/extension.cjs",
  "apps/vscode/dist/webview/webview.js",
  "apps/vscode/dist/webview/webview.css",
]) {
  const path = resolve(root, relative);
  if (!existsSync(path) || statSync(path).size === 0) throw new Error(`Missing build output: ${relative}`);
}
