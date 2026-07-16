import type { HostToWebviewMessage } from "$shared/bridge/hostToWebview";
import { BRIDGE_VERSION } from "$shared/bridge/bridgeVersion";
import type { WebviewToHostPayload } from "$shared/bridge/webviewToHost";

interface VsCodeApi<State = unknown> {
  postMessage(message: unknown): void;
  getState(): State | undefined;
  setState(state: State): void;
}

declare global {
  interface Window {
    acquireVsCodeApi?: <State = unknown>() => VsCodeApi<State>;
  }
}

const api = window.acquireVsCodeApi?.() ?? {
  postMessage(message: unknown) {
    console.info("FrostPi Webview message", message);
  },
  getState() {
    return undefined;
  },
  setState() {},
};

export function postToHost(message: WebviewToHostPayload): void {
  api.postMessage({ ...message, bridgeVersion: BRIDGE_VERSION });
}

export function onHostMessage(listener: (message: HostToWebviewMessage) => void): () => void {
  const handler = (event: MessageEvent<HostToWebviewMessage>) => listener(event.data);
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}
