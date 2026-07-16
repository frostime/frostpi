---
title: UI Design Specification
description: Visual language, layout, density, theming, and component behavior for the FrostPi Webview.
scope:
  - /apps/vscode/src/webview/**
updated: 2026-07-16
---

# UI Design Specification

FrostPi should read as a first-party desktop coding surface, not a generic chat website embedded in VS Code. The visual reference is the restraint and information hierarchy of modern Codex/Claude Code clients, adapted to VS Code theme variables rather than copied branding.

## Composition

- The header keeps session identity, status, switching, and overflow actions compact.
- Assistant content is flat, without a chat bubble. User content uses a subtle surface to preserve turn boundaries.
- Tool calls are dense one-line summaries with expandable details. Success, running, aborted, and failure states use icon/label as well as color.
- The composer is bottom-anchored, supports multiline input, image thumbnails, `/command` suggestions, model/thinking controls, and a stable send/stop position.
- Extension dialogs render in the conversation context so their owning session remains unambiguous.

## Styling

Application semantic tokens map once from `--vscode-*` variables in `vscode-theme.css`; feature components use `--frost-*` tokens. Avoid gradients, large shadows, inflated radii, and card borders around every object. Motion is limited to state feedback and 120–180 ms transitions, disabled under reduced-motion preference.

The primary target is a 300–520 px sidebar. Components must also remain coherent when widened or moved to the Secondary Sidebar. Horizontal overflow is permitted only for code/terminal content.
