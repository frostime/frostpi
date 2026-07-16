---
title: Pi Session Lifecycle
description: Observable lifecycle, persistence, concurrency, and recovery rules for VS Code-managed Pi RPC sessions.
scope:
  - /apps/vscode/src/extension/sessions/**
  - /apps/vscode/src/extension/conversation/**
  - /apps/vscode/src/extension/extension-ui/**
updated: 2026-07-16
---

# Pi Session Lifecycle

## Ownership

One `SessionRuntime` owns exactly one live `pi --mode rpc` child process. `SessionRegistry` owns the collection, active selection, persistence metadata, and Webview-facing workspace snapshot. Pi owns conversation persistence and session JSONL content.

## Concurrency

Multiple sessions may run concurrently, including sessions sharing a workspace. FrostPi does not add a global execution lock, command gate, file-write proxy, or conflict resolver. Each session's process, event stream, dialogs, and stop operation remain isolated. Workspace conflicts are visible consequences of concurrent agents and remain the user's responsibility.

## Persistence

FrostPi persists only:

- local UI session id;
- display title;
- working directory;
- Pi session file path;
- last-updated timestamp;
- active session id.

It does not persist message bodies, reasoning, tool output, images, provider credentials, or API keys. On restoration, the process starts with `--session <path>` and conversation state is rebuilt from Pi's `get_messages` response.

## State semantics

`starting → ready/running → stopping → stopped` is the normal lifecycle. `failed` is terminal for the current child process but the session metadata remains retryable.

- `ready`: process is alive and Pi is idle.
- `running`: Pi reports an active session-level run.
- `stopped`: no live child process; a persisted session may be started again.
- `failed`: startup, protocol, stdin, or unexpected process failure occurred.

`agent_end` is not considered completion. Only `agent_settled` changes a running session back to ready because retries, compaction retries, or queued continuations may follow `agent_end`.

## Extension UI

Dialog requests are owned by the session that emitted them. They remain pending until the user responds, Pi's own timeout resolves them, or the session closes. Closing a session explicitly sends cancellation responses for every pending dialog. FrostPi never auto-confirms a dialog.

Fire-and-forget UI requests affect only their session. `set_editor_text` is routed to the composer only when the session is active; inactive-session text is retained by the host until that session is activated.

## Failure recovery

A failed runtime may be restarted using its stored session file. A missing or invalid session file causes Pi startup to fail visibly; FrostPi does not silently create a replacement session under the same UI identity.
