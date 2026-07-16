import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { root, run } from "./lib.mjs";

const rpc = resolve(root, "packages/pi-rpc");
const app = resolve(root, "apps/vscode");
const tsc = resolve(root, "node_modules/typescript/bin/tsc");
const vite = resolve(app, "node_modules/vite/bin/vite.js");

run(process.execPath, [resolve(root, "scripts/clean-dir.mjs"), "dist"], { cwd: rpc });
run(process.execPath, [tsc, "-p", "tsconfig.build.json"], { cwd: rpc });
run(process.execPath, ["esbuild.config.mjs"], { cwd: app });
run(process.execPath, [vite, "build"], { cwd: app });

for (const relative of [
  "apps/vscode/dist/extension/extension.cjs",
  "apps/vscode/dist/webview/webview.js",
  "apps/vscode/dist/webview/webview.css",
]) {
  const path = resolve(root, relative);
  if (!existsSync(path) || statSync(path).size === 0) throw new Error(`Missing build output: ${relative}`);
}
