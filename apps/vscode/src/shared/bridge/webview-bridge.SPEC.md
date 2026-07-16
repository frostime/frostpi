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

## Authority and bootstrap

The Extension Host is authoritative. Every newly mounted Webview sends `ready`; the host returns a complete `snapshot`. The Webview must be reconstructable from that message without browser-local persisted state.

Changing the active session sends a new complete snapshot. Ordinary changes to the same active session use `workspaceDelta`.

## Collection deltas

Messages and tool calls are ordered collections with stable ids.

- `upsert` is valid only while the existing id order is an unchanged prefix of the new order.
- `upsert.items` contains every appended item and every existing item whose object reference changed.
- removal or reordering requires `replace` with the complete collection.
- reducers replace existing objects by id and append new ids in transport order.

Projection code must replace a changed object, not mutate it in place. The bridge deliberately relies on reference identity to avoid repeatedly scanning or copying large Markdown, terminal output, and Base64 image payloads.

## Command validation

Every Webview-to-host message is validated as a complete discriminated union before dispatch. Invalid, oversized, unknown, or partially valid messages cause no host action. A prompt result is correlated by the Webview-generated request id so the composer clears only after the matching host acceptance.

## Failure and compatibility

Unknown host messages are ignored by older Webviews rather than guessed. Any incompatible change to required fields or delta semantics must increment `BRIDGE_VERSION` and provide an explicit compatibility path or force a full snapshot reload.
