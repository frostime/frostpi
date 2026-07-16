import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { ensureArtifacts, projectVersion, root, run } from "./lib.mjs";

run("node", ["scripts/build.mjs"]);
const artifacts = ensureArtifacts();
const output = resolve(artifacts, `FrostPi-${projectVersion()}.vsix`);
run("pnpm", ["exec", "vsce", "package", "--no-dependencies", "--out", output], {
  cwd: resolve(root, "apps/vscode"),
});
if (!existsSync(output)) throw new Error(`VSIX was not created: ${output}`);
console.log(`Created ${output}`);
