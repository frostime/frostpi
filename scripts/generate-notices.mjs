import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { root, run } from "./lib.mjs";

const raw = run("pnpm", ["licenses", "list", "--prod", "--json"], { capture: true });
const groups = JSON.parse(raw);
const packages = [];
for (const [license, entries] of Object.entries(groups)) {
  for (const entry of entries) {
    packages.push({
      name: entry.name,
      versions: [...entry.versions].sort().join(", "),
      license,
      homepage: typeof entry.homepage === "string" ? entry.homepage : "",
    });
  }
}
packages.sort((a, b) => a.name.localeCompare(b.name) || a.versions.localeCompare(b.versions));
const rows = packages.map((item) => `| ${escapeCell(item.name)} | ${escapeCell(item.versions)} | ${escapeCell(item.license)} | ${item.homepage ? `<${item.homepage}>` : "—"} |`).join("\n");
const text = `# Third-party notices\n\nFrostPi bundles the following production dependencies. Copyright remains with their respective authors. License identifiers are taken from installed package metadata; consult each linked project for complete license text and notices.\n\n| Package | Version | License | Project |\n|---|---:|---|---|\n${rows}\n`;
writeFileSync(resolve(root, "THIRD_PARTY_NOTICES.md"), text);
writeFileSync(resolve(root, "apps/vscode/THIRD_PARTY_NOTICES.md"), text);

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|");
}
