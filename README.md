# FrostPi

A VS Code GUI adapter for your existing Pi setup.

FrostPi is designed for users who manage their own Pi configuration, extensions, models, and credentials, but want a graphical interface inside VS Code.

It runs your configured Pi through its native RPC mode. Pi remains responsible for execution, configuration, extensions, and session data; FrostPi provides the GUI and VS Code integration.

<p align="center">
  <img src="docs/assets/screenshots/preview.png" alt="FrostPi conversation view in VS Code" width="430">
</p>

## Why FrostPi

* **Use your existing Pi setup.** No bundled runtime or separate provider configuration.
* **Keep Pi workflows available.** Extension commands, model selection, thinking controls, resume, fork, and parallel sessions.
* **Work naturally in VS Code.** Reference selections, files, workspace paths, and images, and inspect changes in native editors.
* **Keep the boundary simple.** FrostPi manages the interface; Pi remains responsible for execution and session storage.

## How FrostPi compares

* **[vscode-pi-companion](https://github.com/ravshansbox/vscode-pi-companion)** adds live VS Code context to Pi rather than providing a graphical client.
* **[Pi Agent for VS Code](https://github.com/Zetaphor/pi-vscode-extension)** adds an IDE-managed GUI with checkpoints, rollback, and tool approval.
* **[Pendant](https://pendant.run)** provides an all-in-one proprietary client that can use a bundled runtime and includes features such as voice dictation.
* **[pi-vscode](https://github.com/pithings/pi-vscode)** keeps Pi’s native terminal UI and adds VS Code context and package management around it.

**FrostPi is for users who want a graphical VS Code client while continuing to manage Pi themselves.**


## See It In Action

<table>
  <tr>
    <td width="50%"><strong>Independent sessions</strong><br><img src="docs/assets/screenshots/multi-session.png" alt="FrostPi session switcher" width="100%"></td>
    <td width="50%"><strong>Model controls</strong><br><img src="docs/assets/screenshots/model-picker.png" alt="FrostPi model picker" width="100%"></td>
  </tr>
  <tr>
    <td><strong>Workspace-aware prompting</strong><br><img src="docs/assets/screenshots/at-file.png" alt="FrostPi workspace file mention completion" width="100%"></td>
    <td><strong>Slash commands</strong><br><img src="docs/assets/screenshots/slash-command.png" alt="FrostPi slash command completion" width="100%"></td>
  </tr>
  <tr>
    <td><strong>Compaction for long sessions</strong><br><img src="docs/assets/screenshots/compact.png" alt="FrostPi compaction record" width="100%"></td>
    <td><strong>Context and cost detail</strong><br><img src="docs/assets/screenshots/context-usage.png" alt="FrostPi context usage details" width="100%"></td>
  </tr>
</table>

## Requirements

- VS Code 1.99 or newer.
- A trusted file-system workspace.
- Pi installed and configured in the same environment as the VS Code Extension Host.
- Pi available as `pi` on `PATH`, or configured through `frostpi.pi.executable`.

Remote SSH, WSL, and Dev Container workspaces run FrostPi and Pi in the remote workspace extension host. FrostPi does not bridge a local Pi process into a remote file system.

## Getting Started

1. Install FrostPi in VS Code.
2. Open a trusted workspace.
3. Open **FrostPi** from the Activity Bar. The view can be moved to the Secondary Sidebar.
4. Start a new session, resume an existing Pi session, or paste a prompt into the composer.
5. If Pi is not on `PATH`, run **FrostPi: Configure Pi Executable**.

## Core Workflows

### Prompt and workspace context

Paste PNG, JPEG, or WebP images directly into the composer. Use `/` for Pi extension commands, prompt templates, skills, and FrostPi-local actions. Use `@Selection`, `@CurrentFile`, or `@path/to/file` for workspace references; FrostPi inserts path and line text, while Pi decides whether to read the file.

### Models and sessions

Run multiple independent Pi sessions, switch providers and models, resume existing sessions, and select only the thinking levels exposed by the active model's Pi metadata. Session state remains visible while work continues in the background.

### Network and diagnostics

Configure inherited, VS Code, custom, or direct proxy modes for Pi subprocesses. Custom mode accepts `host:port`, `http(s)://...`, or `socks5://...`; credentials are stored in VS Code SecretStorage. FrostPi also provides context metrics, diagnostics export, strict LF-delimited JSONL transport, and schema-checked Webview messages.

### Typography

When supported by the installed VS Code version, FrostPi follows these Chat settings immediately after they change:

- `chat.fontFamily` and `chat.fontSize` for rendered Markdown messages; code blocks also follow `chat.fontSize`.
- `chat.editor.fontFamily` for the composer and Markdown code blocks.
- `chat.editor.fontSize` for the composer.

Unsupported settings fall back to VS Code's normal interface and editor fonts.

## Privacy and Product Boundaries

FrostPi contains no telemetry or remote service of its own. Prompts and images are passed to the locally launched Pi process.

Pi edits the workspace directly, as it does in RPC mode. FrostPi does not provide pre-apply patch approval, checkpoint-based workspace rollback, or arbitrary custom TUI emulation. Multiple sessions may modify the same workspace concurrently.


See [`docs/privacy.md`](docs/privacy.md) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for details.

## Development

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm package:vsix
pnpm verify:vsix
pnpm package:zip
```

The workspace contains:

- `packages/pi-rpc`: Pi subprocess transport and typed RPC API.
- `apps/vscode`: extension host, stable Host-Webview contracts, and Svelte UI.
- `docs`: architecture, protocol, UI, testing, privacy, and release documentation.

Start with [`docs/index.md`](docs/index.md). Behavioral compatibility contracts live next to their modules as `*.SPEC.md` or `SPEC.md`.

## License

AGPL-3.0-only. FrostPi is an independent client and is not an official Pi distribution.
