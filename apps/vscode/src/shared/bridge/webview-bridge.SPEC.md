---
title: Webview Bridge Compatibility Contract
description: Stable synchronization, validation, and recovery semantics between the Extension Host and Svelte Webview.
scope:
  - /apps/vscode/src/shared/bridge/**
  - /apps/vscode/src/extension/webview-host/**
  - /apps/vscode/src/webview/bridge/**
updated: 2026-07-16
---

# Webview Bridge Compatibility Contract

The Extension Host is authoritative. A newly mounted Webview sends `ready` and receives a complete `snapshot`. Active-session changes also force a full snapshot; ordinary updates use `workspaceDelta`.

Turns and notices are ordered collections with stable ids. `upsert` is valid only while existing order is an unchanged prefix; removal/reordering requires `replace`. Projection code replaces changed objects instead of mutating them so the bridge can avoid repeatedly copying large Markdown, output, and image payloads.

Every Webview command is validated as a complete discriminated union. Prompt acceptance is correlated by request id. File-suggestion requests and responses are also correlated; stale or unknown responses have no effect.

Required-field or delta-semantic changes increment `BRIDGE_VERSION`. Unknown versions are rejected rather than guessed, and recovery is a fresh snapshot.
