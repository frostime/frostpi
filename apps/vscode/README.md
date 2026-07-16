# FrostPi — Visual UI for Pi Coding Agent

FrostPi is a polished VS Code client for Pi's RPC mode. It runs Pi in the workspace extension host and presents streaming messages, tool activity, image prompts, dynamic commands, model controls, and common Pi extension UI interactions without changing Pi's execution semantics.

## Features

- Create, restore, switch, rename, and concurrently run independent Pi sessions.
- Paste PNG, JPEG, or WebP images directly into the composer.
- Switch provider/model and thinking level from Pi's available-model response.
- Discover and run extension commands, prompt templates, and skills through `/` completion.
- Review tool calls and command output; open files and Git-base diffs in native VS Code editors.
- Answer Pi extension `confirm`, `select`, `input`, and `editor` requests in the conversation UI.
- See extension notifications, status text, widgets, session metrics, process failures, and retry actions.

## Requirements and setup

1. Install and configure Pi in the same local or remote environment where VS Code runs workspace extensions.
2. Open a trusted file-system workspace.
3. Open **FrostPi** from the Activity Bar. You may drag the view to VS Code's Secondary Sidebar.
4. If `pi` is not on `PATH`, run **FrostPi: Configure Pi Executable**.

The executable setting may be the `pi` command, an absolute native executable, or Pi's compiled `cli.js` path. JavaScript entry points are launched with the environment's `node` executable rather than VS Code's embedded runtime.

## Important execution model

FrostPi does not intercept Pi's file tools or hold changes for approval. Pi edits the workspace immediately, as it does in RPC mode. The Diff action compares the current file with its Git `HEAD` version; it is review, not pre-apply authorization.

Multiple sessions may run concurrently, including against the same workspace. FrostPi isolates their processes and UI state but does not prevent or reconcile conflicting file changes.

Arbitrary Pi custom TUI components are not emulated. Structured extension UI methods are supported; unsupported custom UI remains the responsibility of the extension that requested it.

## Settings

- `frostpi.pi.executable`
- `frostpi.pi.arguments`
- `frostpi.session.startOnOpen`
- `frostpi.composer.streamingBehavior`
- `frostpi.attachments.maxImageBytes`
- `frostpi.diagnostics.level`

## Privacy

FrostPi has no telemetry and does not persist conversation content or images. Prompts and model data flow through Pi and the configured provider. See `PRIVACY.md` in the project repository for the complete boundary.

## Troubleshooting

Run **FrostPi: Export Diagnostics** and inspect the **FrostPi** Output channel. Common causes are an unavailable Pi executable, an incompatible Pi version, a missing Node runtime for a configured `cli.js`, or an invalid restored session file.

FrostPi is an independent client and is not an official Pi distribution.
