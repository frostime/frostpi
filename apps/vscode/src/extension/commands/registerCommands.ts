import * as vscode from "vscode";

import { captureActiveFileReference } from "../editor-context/captureActiveFile.js";
import { captureActiveSelection } from "../editor-context/captureSelection.js";
import { exportDiagnostics } from "../diagnostics/exportDiagnostics.js";
import type { DiagnosticLogger } from "../diagnostics/DiagnosticLogger.js";
import type { ProxyMode } from "../configuration/configurationTypes.js";
import type { SessionRegistry } from "../sessions/SessionRegistry.js";
import { normalizeProxyEndpoint } from "../network/buildPiProcessEnvironment.js";
import { ProxySecretStore } from "../network/ProxySecretStore.js";
import type { PiViewProvider } from "../webview-host/PiViewProvider.js";
import type { WebviewBridge } from "../webview-host/WebviewBridge.js";

export function registerCommands(
  context: vscode.ExtensionContext,
  registry: SessionRegistry,
  viewProvider: PiViewProvider,
  bridge: WebviewBridge,
  logger: DiagnosticLogger,
): void {
  const proxySecrets = new ProxySecretStore(context.secrets);
  context.subscriptions.push(
    vscode.commands.registerCommand("frostpi.focus", () => viewProvider.reveal()),
    vscode.commands.registerCommand("frostpi.newSession", async () => {
      const sessionId = await registry.createSession();
      if (sessionId) await viewProvider.reveal();
    }),
    vscode.commands.registerCommand("frostpi.resumeSession", async () => {
      const sessionId = await registry.resumeSession();
      if (sessionId) await viewProvider.reveal();
    }),
    vscode.commands.registerCommand("frostpi.sendSelection", async () => {
      const text = captureActiveSelection();
      if (!text) {
        void vscode.window.showWarningMessage("Open a workspace file first.");
        return;
      }
      await viewProvider.reveal();
      bridge.insertPromptText(`${text} `);
    }),
    vscode.commands.registerCommand("frostpi.sendFile", async () => {
      const text = captureActiveFileReference();
      if (!text) {
        void vscode.window.showWarningMessage("Open a workspace file first.");
        return;
      }
      await viewProvider.reveal();
      bridge.insertPromptText(`${text} `);
    }),
    vscode.commands.registerCommand("frostpi.stop", () => registry.abort()),
    vscode.commands.registerCommand("frostpi.restartSession", () => registry.retrySession()),
    vscode.commands.registerCommand("frostpi.restartAllSessions", () => registry.restartAllSessions()),
    vscode.commands.registerCommand("frostpi.configureProxy", () => configureProxy(registry, proxySecrets)),
    vscode.commands.registerCommand("frostpi.configureProxyCredentials", () => configureProxyCredentials(registry, proxySecrets)),
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

interface ProxyModeItem extends vscode.QuickPickItem {
  mode: ProxyMode;
}

async function configureProxy(registry: SessionRegistry, secrets: ProxySecretStore): Promise<void> {
  const scope = await chooseProxyScope();
  if (!scope) return;
  const configuration = vscode.workspace.getConfiguration("frostpi", scope.uri);
  const modes: ProxyModeItem[] = [
    { mode: "inherit", label: "$(terminal) Inherit environment", description: "Use proxy variables from the Extension Host" },
    { mode: "vscode", label: "$(settings-gear) Use VS Code proxy", description: "Use the VS Code http.proxy setting" },
    { mode: "custom", label: "$(globe) Custom proxy", description: "Set one proxy endpoint for Pi sessions" },
    { mode: "direct", label: "$(circle-slash) Direct connection", description: "Remove inherited proxy variables for Pi" },
  ];
  const selected = await vscode.window.showQuickPick(modes, {
    title: `FrostPi network proxy · ${scope.label}`,
    placeHolder: "Choose how new or restarted Pi sessions connect to the network",
    ignoreFocusOut: true,
  });
  if (!selected) return;

  const target = scope.target;
  if (selected.mode === "custom") {
    const endpoint = await collectCustomProxyEndpoint(configuration);
    if (endpoint === undefined) return;
    await configuration.update("network.proxy.endpoint", endpoint, target);
    // Clear pre-simplification keys so stale split values cannot shadow endpoint on older reads.
    await configuration.update("network.proxy.http", undefined, target);
    await configuration.update("network.proxy.https", undefined, target);
    await configuration.update("network.proxy.all", undefined, target);
  } else if (selected.mode === "vscode") {
    const vscodeProxy = vscode.workspace.getConfiguration("http", scope.uri).get<string>("proxy", "").trim();
    if (!vscodeProxy) {
      const action = await vscode.window.showWarningMessage(
        "VS Code http.proxy is empty. FrostPi will not inject a proxy until that setting is configured.",
        "Open VS Code Proxy Settings",
        "Continue",
      );
      if (action === "Open VS Code Proxy Settings") {
        await vscode.commands.executeCommand("workbench.action.openSettings", "http.proxy");
        return;
      }
      if (action !== "Continue") return;
    }
  }

  await configuration.update("network.proxy.mode", selected.mode, target);

  if (selected.mode === "custom") {
    const credentialAction = await vscode.window.showQuickPick(
      [
        { label: "Keep current credentials", value: "keep" as const },
        { label: "Configure credentials", description: "Stored in VS Code SecretStorage", value: "configure" as const },
        { label: "Clear credentials", value: "clear" as const },
      ],
      { title: "Proxy authentication", ignoreFocusOut: true },
    );
    if (credentialAction?.value === "configure") await configureProxyCredentials(registry, secrets, false);
    if (credentialAction?.value === "clear") await secrets.clear();
  }

  registry.refreshConfigurationState(true);
  const action = await vscode.window.showInformationMessage(
    `FrostPi proxy mode set to ${proxyModeTitle(selected.mode)}. Running Pi sessions must restart before it takes effect.`,
    "Restart current",
    "Restart all",
    "Later",
  );
  if (action === "Restart current") await registry.retrySession();
  if (action === "Restart all") await registry.restartAllSessions();
}

async function chooseProxyScope(): Promise<{ label: string; target: vscode.ConfigurationTarget; uri?: vscode.Uri } | undefined> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return { label: "User settings", target: vscode.ConfigurationTarget.Global };
  const selected = await vscode.window.showQuickPick(
    [
      { label: "Workspace", description: folder.name, target: vscode.ConfigurationTarget.Workspace, uri: folder.uri },
      { label: "User", description: "Apply to all workspaces on this machine", target: vscode.ConfigurationTarget.Global },
    ],
    { title: "Where should FrostPi store this proxy configuration?", ignoreFocusOut: true },
  );
  return selected;
}

async function collectCustomProxyEndpoint(configuration: vscode.WorkspaceConfiguration): Promise<string | undefined> {
  const current = firstNonEmpty(
    configuration.get<string>("network.proxy.endpoint", ""),
    configuration.get<string>("network.proxy.http", ""),
    configuration.get<string>("network.proxy.https", ""),
    configuration.get<string>("network.proxy.all", ""),
  );
  const endpoint = await vscode.window.showInputBox({
    title: "Proxy endpoint",
    prompt: "One address is enough. host:port or http(s)://… sets HTTP_PROXY and HTTPS_PROXY; socks5://… sets ALL_PROXY. NO_PROXY defaults to loopback.",
    value: current,
    ignoreFocusOut: true,
    validateInput: (candidate) => validateProxyEndpoint(candidate),
  });
  if (endpoint === undefined) return undefined;
  return endpoint.trim();
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function validateProxyEndpoint(value: string): string | undefined {
  const candidate = value.trim();
  if (!candidate) return "Enter a proxy endpoint, for example 127.0.0.1:7890.";
  const normalized = normalizeProxyEndpoint(candidate);
  if (!normalized) return "Enter a proxy endpoint, for example 127.0.0.1:7890.";
  try {
    const url = new URL(normalized);
    if (!["http:", "https:", "socks:", "socks5:", "socks5h:"].includes(url.protocol)) {
      return "Use host:port, or an HTTP(S)/SOCKS URL.";
    }
    return undefined;
  } catch {
    return "Enter host:port or a proxy URL, for example 127.0.0.1:7890.";
  }
}

async function configureProxyCredentials(registry: SessionRegistry, proxySecrets: ProxySecretStore, notify = true): Promise<void> {
  const username = await vscode.window.showInputBox({
    title: "Proxy username",
    prompt: "Stored in VS Code SecretStorage. Leave blank to clear saved credentials.",
    ignoreFocusOut: true,
  });
  if (username === undefined) return;
  if (!username) {
    await proxySecrets.clear();
    registry.refreshConfigurationState(true);
    if (notify) void vscode.window.showInformationMessage("FrostPi proxy credentials cleared. Restart running sessions to apply.");
    return;
  }
  const password = await vscode.window.showInputBox({
    title: "Proxy password",
    password: true,
    ignoreFocusOut: true,
  });
  if (password === undefined) return;
  await proxySecrets.set({ username, password });
  registry.refreshConfigurationState(true);
  if (notify) void vscode.window.showInformationMessage("FrostPi proxy credentials updated. Restart running sessions to apply.");
}

function proxyModeTitle(mode: ProxyMode): string {
  switch (mode) {
    case "custom": return "Custom";
    case "vscode": return "VS Code";
    case "direct": return "Direct";
    default: return "Inherit";
  }
}
