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
