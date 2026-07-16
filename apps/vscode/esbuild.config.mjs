import { rmSync } from "node:fs";

import esbuild from "esbuild";

rmSync("dist", { recursive: true, force: true });

await esbuild.build({
  entryPoints: ["src/extension/activate.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  outfile: "dist/extension/extension.cjs",
  external: ["vscode"],
  sourcemap: process.env.FROSTPI_SOURCEMAP === "1",
  sourcesContent: process.env.FROSTPI_SOURCEMAP === "1",
  logLevel: "info",
});
