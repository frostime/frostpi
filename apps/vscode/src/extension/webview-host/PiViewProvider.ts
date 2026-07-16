import * as vscode from "vscode";

import type { WebviewBridge } from "./WebviewBridge.js";
import { createWebviewHtml } from "./createWebviewHtml.js";

export class PiViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "frostpi.chat";
  #view: vscode.WebviewView | null = null;

  readonly #extensionUri: vscode.Uri;
  readonly #bridge: WebviewBridge;

  constructor(extensionUri: vscode.Uri, bridge: WebviewBridge) {
    this.#extensionUri = extensionUri;
    this.#bridge = bridge;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.#view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.#extensionUri, "dist", "webview")],
    };
    webviewView.webview.html = createWebviewHtml(webviewView.webview, this.#extensionUri);
    this.#bridge.attach(webviewView.webview);
    webviewView.onDidDispose(() => {
      this.#bridge.detach(webviewView.webview);
      if (this.#view === webviewView) this.#view = null;
    });
  }

  async reveal(): Promise<void> {
    await vscode.commands.executeCommand(`${PiViewProvider.viewType}.focus`);
    this.#bridge.focusComposer();
  }
}
