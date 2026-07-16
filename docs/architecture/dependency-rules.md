---
title: Dependency Rules
description: Import and ownership constraints that prevent protocol, UI, and VS Code concerns from collapsing together.
scope:
  - /apps/vscode/src/**
  - /packages/pi-rpc/src/**
updated: 2026-07-16
---

# Dependency Rules

- `apps/vscode/src/webview/**` may import Svelte, browser libraries, and `src/shared/**`; it must not import `vscode`, Node built-ins, or extension-host modules.
- `apps/vscode/src/extension/**` may import `vscode`, `@frostime/pi-rpc`, and `src/shared/**`; it must not import Svelte components.
- `apps/vscode/src/shared/**` contains JSON-serializable contracts and pure helpers only.
- `packages/pi-rpc/**` owns Pi process/protocol mechanics and has no VS Code dependency.
- Raw `RpcEvent` interpretation belongs in `SessionProjection` and `ExtensionUiCoordinator`, not Svelte components.
- Only `SessionProjection` mutates a `SessionViewModel`; consumers receive read-only references or snapshots.
- Only `WebviewBridge` decides snapshot versus delta transport. UI reducers apply transport messages but do not infer missing Pi events.

Add an explicit adapter instead of crossing these boundaries for convenience. A repeated import-rule exception is evidence that the boundary, not the lint rule, needs review.
