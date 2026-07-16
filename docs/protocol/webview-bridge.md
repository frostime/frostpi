---
title: Host–Webview Synchronization
description: Versioning, validation, turn deltas, and recovery for the Webview bridge.
scope:
  - /apps/vscode/src/shared/bridge/**
  - /apps/vscode/src/extension/webview-host/**
  - /apps/vscode/src/webview/bridge/**
updated: 2026-07-16
---

# Host–Webview Synchronization

The host sends a complete snapshot after `ready` and whenever the active session changes. Stable-session updates replace scalar fields and transport ordered `turns` and `notices` through collection deltas.

`upsert` requires unchanged prefix order and carries appended or reference-changed objects. `replace` carries the full collection after removal/reordering. Projection writers must replace changed objects, not mutate them.

Webview commands are Zod-validated and versioned. Prompt and file-search replies are request-correlated. Invalid, oversized, stale, unknown, or incompatible messages perform no host action. Recovery after Webview reload is always a fresh snapshot; browser persistence is not authoritative.
