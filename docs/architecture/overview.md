---
title: Architecture Overview
description: Runtime topology, ownership boundaries, and dependency direction for FrostPi.
scope:
  - /apps/vscode/**
  - /packages/pi-rpc/**
updated: 2026-07-16
---

# Architecture Overview

## Runtime topology

```text
VS Code renderer
  └─ Svelte Webview
       ⇅ versioned, schema-checked application messages
VS Code workspace extension host
  ├─ SessionRegistry
  │    └─ SessionRuntime × N
  │         ├─ SessionProjection
  │         ├─ ExtensionUiCoordinator
  │         └─ PiRpcApi
  └─ VS Code editor/diff/diagnostic integration
            ⇅ LF-delimited JSONL over stdio
       pi --mode rpc × N
```

Each session owns one Pi subprocess. Sessions may run concurrently. The active session is only the one currently rendered; activation does not transfer process ownership or stop background work.

## Dependency direction

```text
webview UI → shared application contracts ← extension host → @frostime/pi-rpc → Pi process
```

- Webview code cannot import `vscode`, Node APIs, or raw Pi protocol types except application-facing model types deliberately re-exported through shared contracts.
- `@frostime/pi-rpc` cannot import VS Code or product policy.
- `shared` contains serializable data only.
- Extension-host adapters translate Pi and VS Code behavior into stable application models.

## Deep modules

`PiRpcConnection` hides byte framing, request correlation, child-process failure, timeout, and shutdown semantics. `SessionRuntime` hides one session's process/API/coordinator composition. `SessionProjection` is the only writer of the conversation view model. `WebviewBridge` owns transport synchronization but no product decisions.

The architecture intentionally does not expose a generic “Agent” lowest-common-denominator API. Pi-specific capabilities remain first-class. A future ACP backend should project into the application model at the same boundary rather than forcing Pi RPC through ACP today.
