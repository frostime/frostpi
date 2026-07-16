# FrostPi

FrostPi is a VS Code workspace extension that provides a polished graphical client for [Pi](https://github.com/earendil-works/pi) RPC mode. It keeps Pi's execution semantics intact: one independent `pi --mode rpc` process per FrostPi session, direct workspace access, and no file-tool proxy or pre-apply patch layer.

## Current feature baseline

- Independent concurrent Pi sessions with restore from Pi session files.
- Streaming assistant messages, thinking blocks, tool calls, command output, stop, retry, and session metrics.
- Image paste for PNG, JPEG, and WebP prompts.
- Provider/model and thinking-level switching from Pi's advertised capabilities.
- Dynamic `/command` completion for extension commands, prompt templates, and skills.
- Pi extension UI support for `confirm`, `select`, `input`, `editor`, notifications, status, widgets, title, and editor text.
- Native VS Code file navigation and Git-base diff views.
- Theme-aware Svelte 5 interface designed for narrow sidebars.
- Strict LF-delimited JSONL transport, process diagnostics, schema-checked Webview messages, and bounded streaming payloads.

## Requirements

- VS Code 1.99 or newer.
- A trusted file-system workspace.
- Pi installed and configured in the same environment as the VS Code Extension Host.
- Pi must be available as `pi` on `PATH`, or configured through `frostpi.pi.executable`.

Remote SSH, WSL, and Dev Container workspaces run FrostPi and Pi in the remote workspace extension host. FrostPi does not bridge a local Pi process into a remote file system.

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

MIT. FrostPi is an independent client and is not an official Pi distribution. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for bundled dependency notices.
