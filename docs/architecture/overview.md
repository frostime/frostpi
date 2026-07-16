---
title: Architecture Overview
description: Runtime topology, ownership boundaries, and dependency direction for FrostPi.
scope:
  - /apps/vscode/**
  - /packages/pi-rpc/**
updated: 2026-07-16
---

# Architecture Overview

```text
Svelte Webview
  ├─ turn/activity presentation
  ├─ CodeMirror composer
  └─ local disclosure/scroll state
          ⇅ versioned application messages
VS Code workspace Extension Host
  ├─ SessionRegistry
  │    └─ SessionRuntime × N
  │         ├─ TurnProjection
  │         ├─ ExtensionUiCoordinator
  │         └─ PiRpcApi
  ├─ WorkspaceFileCatalog
  ├─ proxy/process environment policy
  └─ editor, diff, diagnostics integration
          ⇅ LF-delimited JSONL over stdio
     pi --mode rpc × N
```

One FrostPi session owns one Pi subprocess. Sessions may run concurrently; switching the rendered session never transfers ownership or stops background work.

Dependency direction is `Webview → shared contracts ← Extension Host → @frostime/pi-rpc → Pi`. Raw Pi events never reach Svelte. `TurnProjection` groups user prompts, reasoning, tool calls, and responses without altering Pi history. `WorkspaceFileCatalog` exposes paths only. Proxy policy is resolved at process start and remains outside the RPC protocol.

FrostPi intentionally keeps Pi-specific capabilities first-class. A future ACP backend must project into the same application model rather than forcing Pi through an ACP translation layer today.
