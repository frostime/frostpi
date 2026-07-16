const path = require("node:path");
const { runTests } = require("@vscode/test-electron");

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, "../..");
  const extensionTestsPath = path.resolve(__dirname, "suite/index.cjs");
  const workspacePath = path.resolve(__dirname, "fixtures/workspace");
  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [workspacePath, "--disable-extensions", "--skip-welcome", "--skip-release-notes"],
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
