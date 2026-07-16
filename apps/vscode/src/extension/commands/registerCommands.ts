import * as vscode from "vscode";

import { captureActiveFileReference } from "../editor-context/captureActiveFile.js";
import { captureActiveSelection } from "../editor-context/captureSelection.js";
import { exportDiagnostics } from "../diagnostics/exportDiagnostics.js";
import type { DiagnosticLogger } from "../diagnostics/DiagnosticLogger.js";
import type { SessionRegistry } from "../sessions/SessionRegistry.js";
import type { PiViewProvider } from "../webview-host/PiViewProvider.js";
import type { WebviewBridge } from "../webview-host/WebviewBridge.js";

export function registerCommands(
  context: vscode.ExtensionContext,
  registry: SessionRegistry,
  viewProvider: PiViewProvider,
  bridge: WebviewBridge,
  logger: DiagnosticLogger,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("frostpi.focus", () => viewProvider.reveal()),
    vscode.commands.registerCommand("frostpi.newSession", async () => {
      await registry.createSession();
      await viewProvider.reveal();
    }),
    vscode.commands.registerCommand("frostpi.sendSelection", async () => {
      const text = captureActiveSelection();
      if (!text) {
        void vscode.window.showWarningMessage("Select text in an editor first.");
        return;
      }
      await viewProvider.reveal();
      bridge.insertPromptText(text);
    }),
    vscode.commands.registerCommand("frostpi.sendFile", async () => {
      const text = captureActiveFileReference();
      if (!text) {
        void vscode.window.showWarningMessage("Open a workspace file first.");
        return;
      }
      await viewProvider.reveal();
      bridge.insertPromptText(text);
    }),
    vscode.commands.registerCommand("frostpi.stop", () => registry.abort()),
    vscode.commands.registerCommand("frostpi.exportDiagnostics", () => exportDiagnostics(logger, registry.diagnosticsSummary())),
    vscode.commands.registerCommand("frostpi.configureExecutable", async () => {
      const configuration = vscode.workspace.getConfiguration("frostpi");
      const current = configuration.get<string>("pi.executable", "");
      const value = await vscode.window.showInputBox({
        title: "Configure Pi executable",
        prompt: "Enter `pi`, an absolute executable path, or Pi's compiled cli.js path. Leave blank for PATH discovery.",
        value: current,
        ignoreFocusOut: true,
      });
      if (value === undefined) return;
      await configuration.update("pi.executable", value.trim(), vscode.ConfigurationTarget.Global);
      void vscode.window.showInformationMessage("FrostPi executable setting updated. Restart failed sessions to apply it.");
    }),
  );
}
