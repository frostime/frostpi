---
title: Pi Extension UI Contract
description: Supported structured UI methods, timeout behavior, session ownership, and unsupported custom UI.
scope:
  - /apps/vscode/src/extension/extension-ui/**
  - /apps/vscode/src/webview/features/extension-ui/**
updated: 2026-07-16
---

# Pi Extension UI Contract

## Blocking methods

`select`, `confirm`, `input`, and `editor` create a pending card owned by the emitting session. A user action produces exactly one `extension_ui_response`. Cards cannot migrate between sessions and cannot be answered after removal.

When Pi supplies a timeout, Pi owns the default resolution. FrostPi removes the card at expiry and sends no late cancellation or value. Stopping/closing a session is different: FrostPi explicitly sends `{ cancelled: true }` for each still-pending request before terminating the process.

FrostPi never auto-confirms a request.

## Fire-and-forget methods

- `notify` becomes a scoped VS Code/Webview notification.
- `setStatus` upserts/deletes keyed status text.
- `setWidget` upserts/deletes keyed line widgets above or below the composer.
- `setTitle` changes the owning session title.
- `set_editor_text` updates the active session composer; for an inactive session, the host retains the latest text until that session becomes active.

## Unsupported UI

Arbitrary custom TUI components, custom headers/footers/editors, raw terminal input listeners, and theme APIs are not emulated. Unknown structured methods are ignored rather than rendered from arbitrary JSON. This boundary prevents FrostPi from becoming a terminal UI runtime or executing extension-provided presentation code in the Webview.
