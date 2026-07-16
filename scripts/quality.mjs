import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { root, run } from "./lib.mjs";

const rpc = resolve(root, "packages/pi-rpc");
const app = resolve(root, "apps/vscode");

const commands = {
  lint: [
    ["pnpm", ["exec", "eslint", "src", "test", "--max-warnings", "0"], rpc],
    ["pnpm", ["exec", "eslint", "src", "test", "--max-warnings", "0"], app],
  ],
  typecheck: [
    ["pnpm", ["exec", "tsc", "-p", "tsconfig.json", "--noEmit"], rpc],
    ["pnpm", ["exec", "tsc", "-p", "tsconfig.json", "--noEmit"], app],
    ["pnpm", ["exec", "svelte-check", "--tsconfig", "./tsconfig.json"], app],
  ],
  test: [
    ["pnpm", ["exec", "vitest", "run"], rpc],
    ["pnpm", ["exec", "vitest", "run"], app],
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
