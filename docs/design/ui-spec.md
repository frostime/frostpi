---
title: UI Design Specification
description: Visual language, density, theming, and interaction rules for FrostPi.
scope:
  - /apps/vscode/src/webview/**
updated: 2026-07-17
---

# UI Design Specification

FrostPi should feel like a first-party desktop coding surface: compact, low-noise, keyboard-usable, and native to the active VS Code theme.

## Sessions

- The Webview session bar is the sole in-view location for new, resume, switch, and close actions; do not duplicate those actions in VS Code's View title menu.
- The bar is a compact single row and may be hidden. The conversation uses the released height while the composer remains bottom-anchored; a floating restore control consumes no layout height and signals background input requests.
- The session list distinguishes the selected session, background execution, queued startup, failure, and required user input. Closing a running session requires confirmation; closing a temporary unused session does not.
- At 280px width, secondary status text may disappear but switching, creation, closing, and restoring the bar remain available.

## Conversation

- A user prompt and subsequent Pi activity form one visual turn.
- Assistant identity is expressed by the session header; do not repeat an avatar/icon for every fragment.
- Responses are flat Markdown. User prompts use a restrained bubble.
- Reasoning and tools are dense one-line activities, default collapsed. Failure exposes an inline summary but does not force expansion.
- Disclosure state is user-owned; live updates must not reopen a manually collapsed activity.
- A successful compaction inserts a distinct, collapsed boundary showing the pre-compaction token count. Expanding it reveals Pi's Markdown summary; prior visible turns remain scrollable.
- User scrolling away pauses follow mode. New activity preserves the viewport and exposes a floating jump-to-latest control.

## Composer and pickers

- CodeMirror remains a plain-text editor: Enter newline, Ctrl/Cmd+Enter send, native IME/undo/selection. It starts near three lines and is height-bounded with internal scrolling.
- Known `/command` and `@file` tokens receive subtle semantic decoration; unknown commands receive a warning underline. Completion rows use normal VS Code UI font sizing and never open a layout-shifting description panel.
- Model and thinking selectors are anchored popovers, not full-width dialogs. Only the current provider opens by default; search expands matching groups. Provider state is user-controlled, supports expand/collapse all, and model rows never change height on hover.
- Thinking options are derived from the active Pi model metadata and use the same typography scale as model controls.
- Context usage exposes a compact percentage and an accessible hover/focus detail card.

Use semantic FrostPi CSS variables mapped from VS Code variables. Avoid large shadows, gradients, pill-heavy layouts, and fixed widths that cause horizontal scrolling at 280–430px.
