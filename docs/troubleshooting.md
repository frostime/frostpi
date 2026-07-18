---
title: Troubleshooting
description: Diagnosis and recovery for executable, protocol, session, Webview, and diff failures.
scope:
  - /apps/vscode/**
updated: 2026-07-16
---

# Troubleshooting

## Pi does not start

Open the FrostPi Output channel and export diagnostics. Verify `pi --mode rpc` works in a terminal in the same local/remote workspace environment. For a configured JavaScript CLI, verify `node` on `PATH` satisfies Pi's runtime requirement. Update `frostpi.pi.executable`, then retry the failed session.

## A restored session fails

FrostPi deliberately does not replace a missing/corrupt Pi session with an empty one. Close that UI session and create a new one, or repair the stored Pi path outside FrostPi.

## Commands or models are stale

Use the refresh action in the relevant picker. They are also refreshed after startup and settled turns because Pi extensions may register commands dynamically.

## Diff cannot open

The Diff action compares against Git `HEAD`; the file must belong to an open Git worktree and exist in `HEAD`. Untracked files have no Git-base document and should be opened directly.

## Extension UI disappears

Pi can assign a timeout to blocking UI requests. FrostPi removes the card when that timeout elapses and does not send a late response. Closing/stopping a session explicitly cancels its pending requests.

## Existing sessions do not appear

FrostPi filters discovered sessions to the active workspace using the JSONL header `cwd`. It checks `--session-dir`, `PI_CODING_AGENT_SESSION_DIR`, project and user `sessionDir` settings, and Pi's default session directory. Relative `sessionDir` values are resolved against the workspace folder (same as Pi's process cwd), not against the settings file directory. Use **Resume session → Browse for a session file…** when storage is non-standard or rewritten by a Pi extension. A session owned by another project must be opened from that folder.

## Icons render as empty squares

Install a current VSIX built with Vite's relative asset base. The packaged `dist/webview/assets/codicon.ttf` and `webview.css` must both be present. Reload the VS Code window after upgrading from 0.1.0.

## Proxy changes do not affect a running session

This is expected. Use **FrostPi: Configure Network Proxy** or **Network & proxy** in the session menu. Settings are resolved only when the Pi process starts. The menu shows `restart required` until you restart the current or all sessions. The original Pi session file is reused, but active tools, streams, and pending extension UI cannot survive restart.

## `@file` completion does not appear

Typing `@` should immediately open workspace-file suggestions. If no path appears, check the FrostPi Output channel and `files.exclude`, `search.exclude`, and `frostpi.composer.fileMentions.respectSearchExclude`. FrostPi displays no-result/search-error rows instead of failing silently. Completion inserts a workspace-relative textual reference only; Pi decides whether to read it.
