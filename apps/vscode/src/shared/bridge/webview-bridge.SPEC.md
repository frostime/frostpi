---
title: Webview Bridge Compatibility Contract
description: Stable synchronization, validation, and recovery semantics between the Extension Host and Svelte Webview.
scope:
  - /apps/vscode/src/shared/bridge/**
  - /apps/vscode/src/extension/webview-host/**
  - /apps/vscode/src/webview/bridge/**
updated: 2026-07-20
---

# Webview Bridge Compatibility Contract

The Extension Host is authoritative. A newly mounted Webview sends `ready` and receives a complete `snapshot`. Active-session changes also force a full snapshot; ordinary updates use `workspaceDelta`.

Turns and notices are ordered collections with stable ids. `upsert` is valid only while existing order is an unchanged prefix; removal/reordering requires `replace`. Projection code replaces changed objects instead of mutating them so the bridge can avoid repeatedly copying large Markdown, output, and image payloads.

Every Webview command is validated as a complete discriminated union. Message Copy sends raw text to the Extension Host, which writes it through VS Code's clipboard API without logging or persisting it. Prompt acceptance is correlated by request id. File-suggestion and message-fork requests and responses are also correlated; stale or unknown responses have no effect. A successful fork changes the active logical session id; the original draft therefore stays under the original id. The host snapshot carries a non-persisted Composer seed for the fork, identified so each Webview mount applies it once. Cancel Fork is addressed to either the source id or the new fork id while replacement is active. `openComposerEditor` opens a host-owned temp markdown file for one session; closing that tab reads the file and sends `setComposerText` for the same session id so the Webview replaces draft text without touching attachments.

`BRIDGE_VERSION` is an opaque string compared for exact equality in both directions. Dotted values such as `"2.1"` are identifiers, not semantic versions: the bridge performs no ordering, range, or backward-compatibility inference. Required-field or delta-semantic changes assign a new value. Unknown values are rejected rather than guessed, and recovery is a fresh snapshot.
