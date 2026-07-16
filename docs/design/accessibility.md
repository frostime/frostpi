---
title: Accessibility Requirements
description: Keyboard, focus, semantics, contrast, and motion requirements for Webview UI.
scope:
  - /apps/vscode/src/webview/**
updated: 2026-07-16
---

# Accessibility Requirements

Every action must be keyboard reachable with a visible `:focus-visible` outline. Enter inserts a newline in the composer; `Ctrl+Enter` and `Cmd+Enter` submit. Popovers, selects, collapsibles, and dialogs use Bits UI where its focus/ARIA behavior is materially safer than custom code.

Icon-only controls require accessible names and tooltips. Status must not depend on color alone. Toasts use an `aria-live` region; blocking extension requests remain in document order. Images use meaningful file-name alt text and removal controls include the image name.

Respect VS Code high-contrast themes through semantic variables and `prefers-reduced-motion` through `motion.css`. Do not hard-code minimum font sizes that override user/editor zoom.
