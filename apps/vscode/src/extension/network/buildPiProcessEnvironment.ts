import type { ProxyConfiguration, ProxyMode } from "../configuration/configurationTypes.js";
import type { ProxyCredentials } from "./ProxySecretStore.js";

const PROXY_KEYS = [
  "HTTP_PROXY", "http_proxy",
  "HTTPS_PROXY", "https_proxy",
  "ALL_PROXY", "all_proxy",
  "NO_PROXY", "no_proxy",
] as const;

export interface ProxyEnvironmentResult {
  env: NodeJS.ProcessEnv;
  label: string;
}

export function buildPiProcessEnvironment(
  proxy: ProxyConfiguration,
  credentials?: ProxyCredentials,
  vscodeProxy?: string,
): ProxyEnvironmentResult {
  if (proxy.mode === "inherit") return { env: {}, label: "Inherited" };
  if (proxy.mode === "direct") return { env: clearProxyEnvironment(), label: "Direct" };

  const env: NodeJS.ProcessEnv = {};
  if (proxy.mode === "vscode") {
    const url = withCredentials(vscodeProxy?.trim(), credentials);
    if (url) setPair(env, "HTTP_PROXY", "http_proxy", url);
    if (url) setPair(env, "HTTPS_PROXY", "https_proxy", url);
    if (proxy.noProxy) setPair(env, "NO_PROXY", "no_proxy", proxy.noProxy);
    return { env, label: url ? "VS Code proxy" : "VS Code proxy (unset)" };
  }

  const http = withCredentials(proxy.http, credentials);
  const https = withCredentials(proxy.https, credentials);
  const all = withCredentials(proxy.all, credentials);
  if (http) setPair(env, "HTTP_PROXY", "http_proxy", http);
  if (https) setPair(env, "HTTPS_PROXY", "https_proxy", https);
  if (all) setPair(env, "ALL_PROXY", "all_proxy", all);
  if (proxy.noProxy) setPair(env, "NO_PROXY", "no_proxy", proxy.noProxy);
  return { env, label: "Custom proxy" };
}

export function proxyFingerprint(proxy: ProxyConfiguration, vscodeProxy?: string): string {
  return JSON.stringify({ ...proxy, vscodeProxy: proxy.mode === "vscode" ? vscodeProxy ?? "" : "" });
}

export function proxyModeLabel(mode: ProxyMode): string {
  switch (mode) {
    case "custom": return "Custom proxy";
    case "vscode": return "VS Code proxy";
    case "direct": return "Direct";
    default: return "Inherited";
  }
}

function clearProxyEnvironment(): NodeJS.ProcessEnv {
  return Object.fromEntries(PROXY_KEYS.map((key) => [key, undefined]));
}

function setPair(env: NodeJS.ProcessEnv, upper: string, lower: string, value: string): void {
  env[upper] = value;
  env[lower] = value;
}

function withCredentials(value: string | undefined, credentials: ProxyCredentials | undefined): string | undefined {
  if (!value) return undefined;
  if (!credentials || !credentials.username) return value;
  try {
    const url = new URL(value);
    if (!url.username) url.username = credentials.username;
    if (!url.password) url.password = credentials.password;
    return url.toString();
  } catch {
    return value;
  }
}
