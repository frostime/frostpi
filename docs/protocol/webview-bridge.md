---
title: Host–Webview Synchronization
description: Versioning, validation, snapshot/delta semantics, and recovery for the Webview bridge.
scope:
  - /apps/vscode/src/shared/bridge/**
  - /apps/vscode/src/extension/webview-host/**
  - /apps/vscode/src/webview/bridge/**
updated: 2026-07-16
---

# Host–Webview Synchronization

The Extension Host is authoritative. The Webview posts `ready` after mounting; the host responds with a complete workspace snapshot. A complete snapshot is also sent whenever the active session changes.

While the active session remains stable, the bridge sends `workspaceDelta`. Session scalar fields are replaced. Messages and tool calls use ordered collection deltas:

- `upsert`: order is append-only; transmit only objects whose reference changed or that were appended.
- `replace`: an item was removed or reordered; transmit the complete collection.

Projection writers must replace changed message/tool objects rather than mutate them in place. This reference invariant avoids hashing large Markdown, output, or image payloads. It is covered by `collectionDelta.test.ts` and the adjacent bridge SPEC.

All Webview-to-host commands are Zod-validated. Unknown versions or invalid payloads are rejected and logged; they are not partially executed. Webview reconstruction after hide/reload never depends on browser persistence because the next `ready` produces a fresh snapshot.
