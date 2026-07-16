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

## Responsive sidebar behavior

The Webview must remain usable without horizontal scrolling at widths down to 280 CSS pixels. No root or feature component may impose a hard minimum viewport width. Header identity truncates before actions; the session switcher may collapse while session creation/resume remains available. Composer controls shrink semantically: model text ellipsizes, the Thinking prefix disappears before the selected level, and the send/stop position remains stable.

Editor selection and current-file insertion live under one Add Context menu. This reduces toolbar width without removing either capability. Model and Thinking panels use viewport-bounded surfaces rather than fixed offsets that can escape a narrow sidebar.

## Icons

Codicons are packaged with the Webview and referenced through relative Vite asset URLs. A production build is invalid if `webview.css` contains root-relative `/assets/...` font references because VS Code Webviews require their generated resource origin.
