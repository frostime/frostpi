---
title: Interaction States
description: User-visible behavior for running, recovery, scrolling, proxy, and completion states.
scope:
  - /apps/vscode/src/webview/**
updated: 2026-07-17
---

# Interaction States

- **Queued/starting:** disable submission/model mutation; preserve session actions and show whether Pi is waiting to start or starting.
- **Running:** composer remains editable; the primary action becomes Stop; queued prompts use configured Pi semantics.
- **Tool/reasoning:** collapsed by default, including errors. State updates never override a user's disclosure choice.
- **Scroll following:** initial load, session switch, new user turn, manual bottom reach, or jump button follows output. User scroll-away pauses without losing updates.
- **Pending extension UI:** stays visible until answered, timed out by Pi, or cancelled by stop/restart. A background owner is marked as requiring input.
- **Conversation history:** a resumed session is usable before prior messages finish loading. Large histories are deferred and expose an explicit load action; failure is retryable without failing the Pi process.
- **Temporary new session:** replacing it closes it without confirmation until a prompt is accepted or the session is renamed.
- **Proxy changed:** running sessions show restart-required. Saving settings never silently interrupts work.
- **File mention:** `@` opens bounded workspace path completion; selection inserts text only.
- **Model/thinking:** compact anchored menus stay within the Webview viewport and remain keyboard navigable.
- **Resume:** available through the session launcher, Command Palette, onboarding, and local `/resume`.
- **Narrow sidebar:** labels may truncate and secondary status may disappear or move to menus, but no committed capability disappears or requires horizontal scrolling.
- **Hidden session bar:** the conversation uses the released vertical space; a floating restore control remains keyboard accessible and indicates required background input.
