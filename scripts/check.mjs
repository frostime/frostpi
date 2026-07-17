import { runQuality } from "./quality.mjs";
import { run } from "./lib.mjs";

console.log("[check] version policy");
run(process.execPath, ["scripts/version.mjs", "check"]);
for (const target of ["lint", "typecheck", "test"]) {
  console.log(`[check] ${target}`);
  runQuality(target);
}
console.log("[check] build");
run(process.execPath, ["scripts/build.mjs"]);
console.log("[check] bundle size");
run(process.execPath, ["scripts/check-bundle-size.mjs"]);
console.log("[check] complete");
