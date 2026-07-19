---
title: Pi Session Lifecycle
description: Observable lifecycle, persistence, concurrency, and recovery rules for VS Code-managed Pi RPC sessions.
scope:
  - /apps/vscode/src/extension/sessions/**
  - /apps/vscode/src/extension/conversation/**
  - /apps/vscode/src/extension/extension-ui/**
updated: 2026-07-19
---

# Pi Session Lifecycle

## Ownership

One `SessionRuntime` owns exactly one live `pi --mode rpc` child process. `SessionRegistry` owns the collection, active selection, persistence metadata, and Webview-facing workspace snapshot. Pi owns conversation persistence and session JSONL content.

## Concurrency

Multiple sessions may run concurrently, including sessions sharing a workspace. Exactly one session is selected for Webview presentation; selecting another session does not stop background work or invoke Pi's `switch_session` command.

Pi process starts are serialized to avoid concurrent startup spikes. Conversation-history loads are serialized separately, so a slow history load does not prevent an already started Pi process from becoming usable. FrostPi does not add a global execution lock, command gate, file-write proxy, or conflict resolver. Workspace conflicts are visible consequences of concurrent agents and remain the user's responsibility.

## Initial open

Extension activation restores persisted session metadata only. It does not create a new session when none exist; the Webview shows the onboarding home until the user creates or resumes one. `frostpi.session.startOnOpen` may start the already-selected restored session's Pi process, but never invents a session identity.

## Temporary new sessions

A locally created session remains temporary until Pi accepts its first non-empty prompt or the user renames it. Temporary sessions appear in the live session list but are excluded from workspace persistence. Selecting, creating, or resuming another session closes the currently selected temporary session without confirmation.

Resumed sessions are never temporary. Closing a temporary session stops its Pi process but does not delete any file Pi may have created.

## Message Fork

A completed, projected user message may be forked only while its session is selected, idle, fully loaded, and free of pending extension UI. Pi entry ids—not message text—identify the target. Fork keeps the existing process attached to the new Pi session, retains the original session as a stopped FrostPi session, and selects the fork. Old extension statuses/widgets are cleared before replacement; a cancelled fork restores them, while the new extension instance may publish its own decorations during rebind.

The selected user message is excluded from the copied Pi path. Its text and projected images become the new session's Composer draft; the previous Composer draft moves to the retained original session. FrostPi validates that every projected image still satisfies current attachment limits before asking Pi to fork. A cancelled or preflight-failed fork changes neither session collection nor drafts.

Forks are named `Fork: <source title>` (`Fork session` when no title exists) and remain temporary until their first accepted prompt or an explicit user rename. The automatic fork name does not commit the temporary session. The retained original record is persisted before Pi replaces the runtime, preventing runtime metadata notifications from overwriting its only durable identity.

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

## Follow-up prompts while streaming

When `frostpi.composer.streamingBehavior` is `followUp` (default), a normal prompt accepted while Pi is streaming is projected as a session-level queued follow-up, not as a durable turn. The host also parks subsequent normal prompts while that local queue is non-empty. Pi typically drains follow-ups before `agent_end` and emits `message_start` (`role: user`) without a new `agent_start`; promotion keys off that user message event (text match, else FIFO). `agent_start` is only a fallback after settle. Extension slash commands are not parked. Abort, process stop, and process failure clear the local queue.

## Slash commands

Composer text is trimmed before RPC submission so leading/trailing whitespace cannot bypass Pi's leading-`/` extension-command match. After trim, a leading `/command` also normalizes any Unicode whitespace between the command token and its args to a single ASCII space, matching Pi's `indexOf(" ")` command split. FrostPi-local `/compact` and `/resume` remain host-handled; every other slash is sent as a normal `prompt`.

Pi extension commands (from `get_commands` with `source: "extension"`) execute inside the `prompt` request and often never emit `agent_start` / `agent_settled`. After such a prompt returns, FrostPi closes the turn opened for that prompt once short idle checks (`get_state`) report no agent work, or falls back to local non-streaming completion if every `get_state` fails. Command classification uses the cached list by exact name: a known non-extension slash is not re-fetched; a name missing from the cache triggers one `get_commands` refresh, then classification. Prompt templates and skills still expand into ordinary agent turns and close only on `agent_settled`.

## Conversation history

A resumed Pi process becomes ready after startup state is available; loading prior messages is separate. The Webview disables and the host rejects prompt submission during an automatic history load. Pi events received while `get_messages` is pending are retained and applied in order after the displayed history is replaced. History loads are serialized. Session files larger than 8 MiB are not loaded automatically because Pi returns `get_messages` as one potentially large JSONL record; these sessions remain usable and the user may explicitly request history loading from the session menu.

A history-load failure does not fail the live Pi process. The session remains usable and exposes the failed history state for retry.

## Extension UI

Dialog requests are owned by the session that emitted them. They remain pending until the user responds, Pi's own timeout resolves them, or the session closes. Closing a session explicitly sends cancellation responses for every pending dialog. FrostPi never auto-confirms a dialog. A background session with a newly pending dialog is marked as requiring user input.

Fire-and-forget UI requests affect only their session. `set_editor_text` is routed to the composer only when the session is active; inactive-session text is retained by the host until that session is activated.

## Failure recovery

A failed runtime may be restarted using its stored session file. A missing or invalid session file causes Pi startup to fail visibly; FrostPi does not silently create a replacement session under the same UI identity.
