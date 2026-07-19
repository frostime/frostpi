---
title: Session State Machine
description: Session, turn, restart, and concurrent-session behavior.
scope:
  - /apps/vscode/src/extension/sessions/**
  - /apps/vscode/src/extension/conversation/**
updated: 2026-07-19
---

# Session State Machine

```text
stopped ─ request start ─> queued ─> starting ─ handshake ─> ready ─ agent_start ─> running
   ▲                                  │                     ▲                    │
   └──────── stop <──────────── stopping       failed <─────┴──── agent_settled ─┘
```

Prompt RPC success means accepted, not completed. A turn settles at `agent_settled`; message and tool events remain ordered activities inside that turn. Assistant protocol errors remain errors even when a later settled event closes the run. Tool failures stay visible but do not by themselves imply that the whole turn failed.

`abort` stops the current run but keeps the subprocess. Restart closes pending extension UI, stops the process, then starts `pi --mode rpc --session <recorded-file>`. Persisted history survives; active network streams, tools, and pending requests do not. A disruptive explicit restart requires confirmation.

One selected session supplies the Webview conversation. Other processes remain independent background sessions. Process starts and conversation-history loads use separate serialized queues; agent execution is not serialized. Large histories require explicit loading and do not prevent Pi from reaching `ready`.

A new local session is temporary until its first accepted prompt or explicit rename. Replacing a selected temporary session closes it and excludes it from workspace persistence. A message fork follows the same temporary rule: the live runtime becomes the fork, while the original session is retained as a stopped record before replacement.

Proxy, executable, and process-environment changes take effect only on a new/restarted process. Multiple sessions are isolated processes but can race while modifying the same workspace; FrostPi does not serialize edits.
