---
title: Pi Session Lifecycle
description: Observable lifecycle, persistence, concurrency, and recovery rules for VS Code-managed Pi RPC sessions.
scope:
  - /apps/vscode/src/extension/sessions/**
  - /apps/vscode/src/extension/conversation/**
  - /apps/vscode/src/extension/extension-ui/**
updated: 2026-07-17
---

# Pi Session Lifecycle

## Ownership

One `SessionRuntime` owns exactly one live `pi --mode rpc` child process. `SessionRegistry` owns the collection, active selection, persistence metadata, and Webview-facing workspace snapshot. Pi owns conversation persistence and session JSONL content.

## Concurrency

Multiple sessions may run concurrently, including sessions sharing a workspace. Exactly one session is selected for Webview presentation; selecting another session does not stop background work or invoke Pi's `switch_session` command.

Pi process starts are serialized to avoid concurrent startup spikes. Conversation-history loads are serialized separately, so a slow history load does not prevent an already started Pi process from becoming usable. FrostPi does not add a global execution lock, command gate, file-write proxy, or conflict resolver. Workspace conflicts are visible consequences of concurrent agents and remain the user's responsibility.

## Temporary new sessions

A locally created session remains temporary until Pi accepts its first non-empty prompt or the user renames it. Temporary sessions appear in the live session list but are excluded from workspace persistence. Selecting, creating, or resuming another session closes the currently selected temporary session without confirmation.

Resumed sessions are never temporary. Closing a temporary session stops its Pi process but does not delete any file Pi may have created.

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

`queued → starting → ready/running → stopping → stopped` is the normal lifecycle. `failed` is terminal for the current child process but the session metadata remains retryable.

- `queued`: the session is waiting for the serialized process-start slot.
- `ready`: process is alive and Pi is idle.
- `running`: Pi reports an active session-level run.
- `stopped`: no live child process; a persisted session may be started again.
- `failed`: startup, protocol, stdin, or unexpected process failure occurred.

`agent_end` is not considered completion. Only `agent_settled` changes a running session back to ready because retries, compaction retries, or queued continuations may follow `agent_end`.

## Conversation history

A resumed Pi process becomes ready after startup state is available; loading prior messages is separate. The Webview disables and the host rejects prompt submission during an automatic history load. Pi events received while `get_messages` is pending are retained and applied in order after the displayed history is replaced. History loads are serialized. Session files larger than 8 MiB are not loaded automatically because Pi returns `get_messages` as one potentially large JSONL record; these sessions remain usable and the user may explicitly request history loading from the session menu.

A history-load failure does not fail the live Pi process. The session remains usable and exposes the failed history state for retry.

## Extension UI

Dialog requests are owned by the session that emitted them. They remain pending until the user responds, Pi's own timeout resolves them, or the session closes. Closing a session explicitly sends cancellation responses for every pending dialog. FrostPi never auto-confirms a dialog. A background session with a newly pending dialog is marked as requiring user input.

Fire-and-forget UI requests affect only their session. `set_editor_text` is routed to the composer only when the session is active; inactive-session text is retained by the host until that session is activated.

## Failure recovery

A failed runtime may be restarted using its stored session file. A missing or invalid session file causes Pi startup to fail visibly; FrostPi does not silently create a replacement session under the same UI identity.
