---
title: Interaction States
description: User-visible behavior for empty, running, error, blocked, and recovery states.
scope:
  - /apps/vscode/src/webview/**
updated: 2026-07-16
---

# Interaction States

- **No workspace:** explain trusted file-system requirement and expose Open Folder.
- **No session:** expose New Session without rendering an inert composer.
- **Starting:** preserve session controls, disable submission/model changes, show progress and actionable executable configuration on failure.
- **Running:** keep composer editable; `Ctrl/Cmd+Enter` submits using configured steer/follow-up semantics; the primary action becomes Stop.
- **Pending extension UI:** keep the request visible until answered, timed out by Pi, or session closure explicitly cancels it.
- **Failed runtime:** preserve history already projected, show error/retry/configure/diagnostic actions, and do not create an implicit replacement session.
- **Background activity:** switching sessions does not stop work. Session list/status indicators identify background running or blocked sessions.
- **Unsupported image model:** retain pasted images but warn before submission; Pi/provider remains the final capability authority.
