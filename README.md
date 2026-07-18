# FrostPi

FrostPi is a VS Code workspace extension that provides a polished graphical client for [Pi](https://github.com/earendil-works/pi) RPC mode. It keeps Pi's execution semantics intact: one independent `pi --mode rpc` process per FrostPi session, direct workspace access, and no file-tool proxy or pre-apply patch layer.

## Current feature baseline

- Independent concurrent Pi sessions, workspace-aware resume picker, `/resume` completion, and direct Pi JSONL selection.
- Streaming assistant messages, thinking blocks, tool calls, command output, stop, retry, and session metrics.
- Image paste for PNG, JPEG, and WebP prompts.
- Provider/model switching and model-aware thinking levels derived from Pi's `thinkingLevelMap`.
- Compact `/command` completion for extension commands, prompt templates, and skills, plus workspace-backed text-only `@file` completion.
- Pi extension UI support for `confirm`, `select`, `input`, `editor`, notifications, status, widgets, title, and editor text.
- Native VS Code file navigation and Git-base diff views.
- Theme-aware Svelte 5 interface with turn-based activity, bounded CodeMirror input, compact model/thinking pickers, and pause-aware scrolling.
- Guided network-proxy configuration for Pi subprocesses, detailed context usage, strict LF-delimited JSONL transport, diagnostics, and schema-checked Webview messages.

## Requirements

- VS Code 1.99 or newer.
- A trusted file-system workspace.
- Pi installed and configured in the same environment as the VS Code Extension Host.
- Pi must be available as `pi` on `PATH`, or configured through `frostpi.pi.executable`.

Remote SSH, WSL, and Dev Container workspaces run FrostPi and Pi in the remote workspace extension host. FrostPi does not bridge a local Pi process into a remote file system.

## Proxy configuration

Run **FrostPi: Configure Network Proxy** or choose **Network & proxy** from the session menu. Select User or Workspace scope, then choose Inherit, VS Code, Custom, or Direct. Custom mode needs one endpoint (`host:port`, `http(s)://…`, or `socks5://…`). Credentials are stored in VS Code SecretStorage. Proxy changes affect only newly started or explicitly restarted Pi sessions.

## Development

```bash
pnpm install
pnpm check
pnpm package:vsix
pnpm verify:vsix
pnpm package:zip
```

The workspace contains:

- `packages/pi-rpc`: Pi subprocess transport and typed RPC API.
- `apps/vscode`: extension host, stable Host–Webview contracts, and Svelte UI.
- `docs`: architecture, protocol, UI, testing, privacy, and release documentation.

Start with [`docs/index.md`](docs/index.md). Behavioral compatibility contracts live next to their modules as `*.SPEC.md` or `SPEC.md`.

## Product boundaries

FrostPi does not intercept Pi file writes, approve patches before application, emulate arbitrary custom TUI components, manage provider credentials, or persist conversation content outside Pi's own session storage. Multiple sessions can modify the same workspace concurrently; FrostPi displays their state but does not serialize or merge their changes.

## License

AGPL-3.0-only. FrostPi is an independent client and is not an official Pi distribution. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for bundled dependency notices.
