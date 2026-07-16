---
title: Interaction States
description: User-visible behavior for running, recovery, scrolling, proxy, and completion states.
scope:
  - /apps/vscode/src/webview/**
updated: 2026-07-16
---

# Interaction States

- **Starting:** disable submission/model mutation; preserve session actions and show actionable failure recovery.
- **Running:** composer remains editable; the primary action becomes Stop; queued prompts use configured Pi semantics.
- **Tool/reasoning:** collapsed by default, including errors. State updates never override a user's disclosure choice.
- **Scroll following:** initial load, session switch, new user turn, manual bottom reach, or jump button follows output. User scroll-away pauses without losing updates.
- **Pending extension UI:** stays visible until answered, timed out by Pi, or cancelled by stop/restart.
- **Proxy changed:** running sessions show restart-required. Saving settings never silently interrupts work.
- **File mention:** `@` opens bounded workspace path completion; selection inserts text only.
- **Model/thinking:** compact anchored menus stay within the Webview viewport and remain keyboard navigable.
- **Resume:** available through the session launcher, Command Palette, onboarding, and local `/resume`.
- **Narrow sidebar:** labels may truncate and secondary actions may move to menus, but no committed capability disappears or requires horizontal scrolling.
