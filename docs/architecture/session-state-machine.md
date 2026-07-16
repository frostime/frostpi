---
title: Session State Machine
description: State transitions, turn completion, restart, and concurrent-session behavior.
scope:
  - /apps/vscode/src/extension/sessions/**
  - /apps/vscode/src/extension/conversation/**
updated: 2026-07-16
---

# Session State Machine

```text
stopped ── start ──> starting ── get_state/hydrate ──> ready
   ▲                     │                               │
   │                     └── failure ──> failed          ├── agent_start ──> running
   │                                      │              │                    │
   └──────── stop <── stopping <──────────┴──────────────┴── agent_settled ───┘
```

A Prompt RPC success acknowledges acceptance, not completion. A turn remains active until `agent_settled`; `agent_end` is insufficient because retries, compaction, or queued continuations may still occur.

`abort` stops the current Pi run but not the subprocess. `stop` closes pending extension dialogs, terminates the process, and leaves session metadata restartable. A transport/protocol/process failure marks the current runtime failed; retry creates a new subprocess against the recorded Pi session file.

Concurrent sessions do not share process or event state. They may share a working directory and therefore can race on files. FrostPi does not serialize, sandbox, or merge those edits.
