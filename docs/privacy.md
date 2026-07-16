---
title: Data and Privacy Model
description: Engineering-level inventory of stored, transported, and diagnostic data.
scope:
  - /apps/vscode/src/extension/**
  - /apps/vscode/src/webview/**
updated: 2026-07-16
---

# Data and Privacy Model

| Data | Location | Lifetime |
|---|---|---|
| Session id/title/cwd/Pi session path | VS Code workspace state | Until session closure or workspace-state removal |
| Conversation/history | Pi process and Pi session file | Controlled by Pi |
| Composer text/images | Webview memory | Until sent/cleared/Webview loss |
| Project files/tool output | Workspace/Pi memory/Webview projection | Controlled by tools and current process |
| Provider credentials | Pi/provider configuration | Never intentionally read by FrostPi |
| Diagnostics | Output channel or user-selected export file | Current VS Code session / user-controlled |

No telemetry endpoint exists. A future telemetry feature would require a new explicit product decision, opt-in UX, privacy update, and separate data-flow review.
