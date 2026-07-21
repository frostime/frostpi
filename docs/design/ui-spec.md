---
title: UI Design Specification
description: Visual language, density, theming, and interaction rules for FrostPi.
scope:
  - /apps/vscode/src/webview/**
updated: 2026-07-21
---

# UI Design Specification

FrostPi should feel like a first-party desktop coding surface: compact, low-noise, keyboard-usable, and native to the active VS Code theme.

## Sessions

- The Webview session bar is the sole in-view location for new, resume, switch, and close actions; do not duplicate those actions in VS Code's View title menu.
- The bar is a compact single row and may be hidden. The conversation uses the released height while the composer remains bottom-anchored; a floating restore control consumes no layout height and signals background input requests.
- The session list distinguishes the selected session, background execution, queued startup, failure, and required user input. Sessions running outside the open workspace folders show the worktree directory name as a compact capsule on the secondary status line (header inline status and list) and expose the complete `cwd` as a tooltip; titles stay aligned across local and external sessions. Closing a running session requires confirmation; closing a temporary unused session does not.
- New uses a native VS Code directory picker only when linked worktrees are available. Resume remains one native searchable picker, grouped by worktree; it does not introduce a nested Webview tree or mandatory two-stage selection.
- At 280px width, secondary status text may disappear but switching, creation, closing, and restoring the bar remain available.

## Conversation

- A user prompt and subsequent Pi activity form one visual turn.
- Assistant identity is expressed by the session header; do not repeat an avatar/icon for every fragment.
- Responses are Markdown with KaTeX math (`$…$`, `$$…$$`, `\(…\)`, `\[…\]`) and complete `mermaid` fences. Incomplete mermaid fences stay source text while streaming. User prompts use a restrained bubble.
- Reasoning and tools are dense one-line activities, default collapsed. Failure exposes an inline summary but does not force expansion. When `frostpi.conversation.collapseTurnTrace` is enabled (default), a completed turn further collapses tools, reasoning, and interim replies into one summary row above the final response; the running turn stays expanded step-by-step.
- Disclosure state is user-owned; live updates must not reopen a manually collapsed activity.
- While context is compacting, the conversation shows a non-timeline status row. A successful compaction inserts a distinct, collapsed boundary showing the pre-compaction token count. Expanding it reveals Pi's Markdown summary; prior visible turns remain scrollable.
- User scrolling away pauses follow mode. New activity preserves the viewport and exposes a floating jump-to-latest control.
- User messages and individual assistant responses expose a compact action row on hover or keyboard focus. Copy writes only the original text blocks in protocol order, preserving raw Markdown and excluding images, reasoning, tools, notices, and rendered formatting. Fork remains user-message-only: it targets that exact Pi entry, preserves the original session, and restores the selected text and images into the fork's Composer; unavailable actions remain disabled rather than guessing by message text.

## Composer and pickers

- CodeMirror remains a plain-text editor: Enter newline, Ctrl/Cmd+Enter send, native IME/undo/selection. It starts near three lines and is height-bounded with internal scrolling. A toolbar control may expand it to fill the FrostPi panel (conversation collapses) without leaving the Webview.
- Known `/command` and `@file` tokens receive subtle semantic decoration; unknown commands receive a warning underline. `@` completion lists built-in selection/current-file mentions above workspace paths. Completion rows use normal VS Code UI font sizing and never open a layout-shifting description panel.
- Model and thinking selectors are anchored popovers, not full-width dialogs. Only the current provider opens by default; search expands matching groups. Provider state is user-controlled, supports expand/collapse all, and model rows never change height on hover.
- Thinking options are derived from the active Pi model metadata and use the same typography scale as model controls.
- Context usage exposes a compact percentage and an accessible hover/focus detail card. The card stays narrow (about 230px), uses compact token counts, and short message labels (`18u · 114a`).

Use semantic FrostPi CSS variables mapped from VS Code variables. Avoid large shadows, gradients, pill-heavy layouts, and fixed widths that cause horizontal scrolling at 280–430px.
