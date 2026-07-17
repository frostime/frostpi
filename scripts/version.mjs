import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { root } from "./lib.mjs";

const productManifestPath = resolve(root, "apps/vscode/package.json");
const privateManifestPaths = [resolve(root, "package.json"), resolve(root, "packages/pi-rpc/package.json")];
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function readManifest(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assertValidVersion(version) {
  if (typeof version !== "string" || !semverPattern.test(version)) {
    throw new Error(`Invalid product version: ${String(version)}`);
  }
}

function checkVersion(expectedVersion) {
  const productVersion = readManifest(productManifestPath).version;
  assertValidVersion(productVersion);

  for (const path of privateManifestPaths) {
    if ("version" in readManifest(path)) {
      throw new Error(`${path} must not define a duplicate product version`);
    }
  }

  if (expectedVersion !== undefined && productVersion !== expectedVersion) {
    throw new Error(`Product version ${productVersion} does not match expected version ${expectedVersion}`);
  }
  console.log(`Product version: ${productVersion}`);
}

const [command, value, ...extra] = process.argv.slice(2);
if (extra.length > 0 || (command !== "set" && command !== "check")) {
  throw new Error("Usage: node scripts/version.mjs <set <version>|check [expected-version]>");
}

if (command === "set") {
  if (!value) throw new Error("Usage: node scripts/version.mjs set <version>");
  assertValidVersion(value);
  const manifest = readManifest(productManifestPath);
  manifest.version = value;
  writeFileSync(productManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  checkVersion(value);
} else {
  if (value !== undefined) assertValidVersion(value);
  checkVersion(value);
}
