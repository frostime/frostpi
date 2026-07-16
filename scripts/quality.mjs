import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { root, run } from "./lib.mjs";

const rpc = resolve(root, "packages/pi-rpc");
const app = resolve(root, "apps/vscode");
const node = process.execPath;
const eslint = resolve(root, "node_modules/eslint/bin/eslint.js");
const tsc = resolve(root, "node_modules/typescript/bin/tsc");
const svelteCheck = resolve(app, "node_modules/svelte-check/bin/svelte-check");
const rpcVitest = resolve(rpc, "node_modules/vitest/vitest.mjs");
const appVitest = resolve(app, "node_modules/vitest/vitest.mjs");

const commands = {
  lint: [
    [node, [eslint, "src/**/*.ts", "test/**/*.ts", "--max-warnings", "0"], rpc],
    [node, [eslint, "src/**/*.ts", "test/**/*.ts", "--max-warnings", "0"], app],
    [node, [eslint, "src/**/*.svelte", "--max-warnings", "0"], app],
  ],
  typecheck: [
    [node, [tsc, "-p", "tsconfig.json", "--noEmit"], rpc],
    [node, [tsc, "-p", "tsconfig.json", "--noEmit"], app],
    [node, [svelteCheck, "--tsconfig", "./tsconfig.json"], app],
  ],
  test: [
    [node, [rpcVitest, "run"], rpc],
    [node, [appVitest, "run"], app],
  ],
};

export function runQuality(target) {
  if (!(target in commands)) {
    throw new Error(`Unknown quality target: ${target}`);
  }
  for (const [command, args, cwd] of commands[target]) {
    run(command, args, { cwd });
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const target = process.argv[2];
  if (!(target in commands)) {
    throw new Error(`Usage: node scripts/quality.mjs <${Object.keys(commands).join("|")}>`);
  }
  runQuality(target);
}
