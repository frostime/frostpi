# FrostPi

<p align="center">
  <strong>A focused VS Code interface for Pi's coding agent</strong><br>
  Live sessions, tool activity, model controls, and workspace-aware prompting in the editor you already use.
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/frostime/frostpi/main/docs/assets/screenshots/preview.png" alt="FrostPi conversation view in VS Code" width="430">
</p>

FrostPi is a graphical client for Pi's RPC mode. It runs one independent `pi --mode rpc` process per FrostPi session and keeps Pi's execution semantics intact: no file-tool proxy, no patch staging layer, and no hidden prompt-content injection.

## Highlights

- Create, resume, switch, rename, and concurrently run independent Pi sessions.
- Stream ordered reasoning, tool activity, command output, errors, and final responses.
- Paste PNG, JPEG, or WebP images directly into prompts.
- Use `/` completion for Pi extension commands, prompt templates, skills, and FrostPi-local actions.
- Use `@Selection`, `@CurrentFile`, and workspace paths as explicit prompt references.
- Switch provider/model and select only thinking levels supported by the active model's Pi metadata.
- Review command output and tool details; open files and Git-base diffs in native VS Code editors.
- Inspect context, token categories, tool/message counts, and estimated session cost.
- Configure inherited, VS Code, custom, or direct proxy modes for Pi subprocesses.

## Screenshots

<table>
  <tr>
    <td width="50%"><strong>Independent sessions</strong><br><img src="https://raw.githubusercontent.com/frostime/frostpi/main/docs/assets/screenshots/multi-session.png" alt="FrostPi session switcher" width="100%"></td>
    <td width="50%"><strong>Model controls</strong><br><img src="https://raw.githubusercontent.com/frostime/frostpi/main/docs/assets/screenshots/model-picker.png" alt="FrostPi model picker" width="100%"></td>
  </tr>
  <tr>
    <td><strong>Workspace-aware prompting</strong><br><img src="https://raw.githubusercontent.com/frostime/frostpi/main/docs/assets/screenshots/at-file.png" alt="FrostPi workspace file mention completion" width="100%"></td>
    <td><strong>Slash commands</strong><br><img src="https://raw.githubusercontent.com/frostime/frostpi/main/docs/assets/screenshots/slash-command.png" alt="FrostPi slash command completion" width="100%"></td>
  </tr>
  <tr>
    <td><strong>Compaction for long sessions</strong><br><img src="https://raw.githubusercontent.com/frostime/frostpi/main/docs/assets/screenshots/compact.png" alt="FrostPi compaction record" width="100%"></td>
    <td><strong>Context and cost detail</strong><br><img src="https://raw.githubusercontent.com/frostime/frostpi/main/docs/assets/screenshots/context-usage.png" alt="FrostPi context usage details" width="100%"></td>
  </tr>
</table>

## Requirements and Setup

1. Install and configure Pi in the same local or remote environment where VS Code runs workspace extensions.
2. Open a trusted file-system workspace.
3. Open **FrostPi** from the Activity Bar. The view may be dragged to VS Code's Secondary Sidebar.
4. Start a new session, resume an existing Pi session, or paste a prompt into the composer.
5. If `pi` is not on `PATH`, run **FrostPi: Configure Pi Executable**.

The executable may be the `pi` command, an absolute native executable, or Pi's compiled `cli.js` path. Remote SSH, WSL, and Dev Container workspaces run Pi in the remote Extension Host.

## Important Behavior

Pi edits the workspace immediately, as it does in RPC mode. FrostPi's Diff action compares the current file with its Git `HEAD` version; it is review, not pre-apply authorization.

Multiple sessions can modify the same workspace concurrently. FrostPi isolates their processes and UI state but does not serialize or reconcile conflicting changes.

Proxy configuration is resolved when a Pi process starts. Changing proxy settings does not update an already-running session. Restart the affected session to apply the new environment. Proxy environment variables are also inherited by commands launched by Pi.

## Settings

- `frostpi.pi.executable`
- `frostpi.pi.arguments`
- `frostpi.session.startOnOpen`
- `frostpi.composer.streamingBehavior`
- `frostpi.composer.fileMentions.maxFiles`
- `frostpi.composer.fileMentions.respectSearchExclude`
- `frostpi.attachments.maxImageBytes`
- `frostpi.network.proxy.mode`
- `frostpi.network.proxy.endpoint`
- `frostpi.network.proxy.noProxy`
- `frostpi.diagnostics.level`

Use **FrostPi: Configure Network Proxy** or the session menu to choose User/Workspace scope and configure the active mode. Proxy usernames and passwords are stored in VS Code SecretStorage rather than in `settings.json`. Running sessions show `restart required` until explicitly restarted.

## Privacy

FrostPi contains no telemetry or remote service of its own. Prompts and images are sent to the locally launched Pi process. See [`PRIVACY.md`](PRIVACY.md) in the extension package for details.

## Repository

See the [FrostPi repository](https://github.com/frostime/frostpi) for development commands, architecture, protocol contracts, testing, and release procedures.

## License

AGPL-3.0-only. FrostPi is an independent client and is not an official Pi distribution.
