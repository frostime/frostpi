# FrostPi — Visual UI for Pi Coding Agent

FrostPi is a polished VS Code client for Pi's RPC mode. It runs one independent `pi --mode rpc` process per FrostPi session and keeps Pi's execution semantics intact: no file-tool proxy, no patch staging layer, and no hidden prompt-content injection.

## Features

- Create, resume, switch, rename, and concurrently run independent Pi sessions.
- Compact turn-based conversation view with ordered reasoning, tool activity, and final responses.
- Tool and reasoning details default collapsed; manual disclosure state is not overridden by streaming updates.
- Pause-aware output following with unseen-update counts and a jump-to-latest control.
- Paste PNG, JPEG, or WebP images directly into prompts.
- Use dynamic `/command` completion and highlighting for Pi extension commands, prompt templates, skills, and FrostPi's local `/resume` action.
- Use `@` mentions for `@Selection`, `@CurrentFile`, and workspace paths. FrostPi inserts path/line text only; Pi decides whether to read the file.
- Switch provider/model and select only thinking levels supported by the active model's Pi metadata.
- Review command output and tool details; open files and Git-base diffs in native VS Code editors.
- Answer Pi extension `confirm`, `select`, `input`, and `editor` requests.
- Inspect current context, cumulative token categories, tool/message counts, and estimated session cost.
- Configure inherited, VS Code, custom, or direct proxy modes for Pi subprocesses.

## Requirements and setup

1. Install and configure Pi in the same local or remote environment where VS Code runs workspace extensions.
2. Open a trusted file-system workspace.
3. Open **FrostPi** from the Activity Bar. The view may be dragged to VS Code's Secondary Sidebar.
4. If `pi` is not on `PATH`, run **FrostPi: Configure Pi Executable**.

The executable may be the `pi` command, an absolute native executable, or Pi's compiled `cli.js` path. Remote SSH, WSL, and Dev Container workspaces run Pi in the remote Extension Host.

## Important behavior

Pi edits the workspace immediately, as it does in RPC mode. FrostPi's Diff action compares the current file with its Git `HEAD` version; it is review, not pre-apply authorization.

Multiple sessions can modify the same workspace concurrently. FrostPi isolates their processes and UI state but does not serialize or reconcile conflicting changes.

Proxy configuration is resolved when a Pi process starts. Changing proxy settings does **not** update an already-running session. Restart the affected session to apply the new environment. Proxy environment variables are also inherited by commands launched by Pi.

## Settings

- `frostpi.pi.executable`
- `frostpi.pi.arguments`
- `frostpi.session.startOnOpen`
- `frostpi.composer.streamingBehavior`
- `frostpi.composer.fileMentions.maxFiles`
- `frostpi.composer.fileMentions.respectSearchExclude`
- `frostpi.attachments.maxImageBytes`
- `frostpi.network.proxy.mode`
- `frostpi.network.proxy.http`
- `frostpi.network.proxy.https`
- `frostpi.network.proxy.all`
- `frostpi.network.proxy.noProxy`
- `frostpi.diagnostics.level`

Use **FrostPi: Configure Network Proxy** or the session menu to choose User/Workspace scope and configure the active mode. Proxy usernames and passwords are stored in VS Code SecretStorage rather than in `settings.json`. Running sessions show `restart required` until explicitly restarted.

## Privacy

FrostPi contains no telemetry or remote service of its own. Prompts and images are sent to the locally launched Pi process. See `PRIVACY.md` in the extension package for details.

## License

AGPL-3.0-only. FrostPi is an independent client and is not an official Pi distribution.
