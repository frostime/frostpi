---
title: Testing Strategy
description: Required protocol, projection, Webview, integration, and packaging evidence.
scope:
  - /apps/vscode/test/**
  - /packages/pi-rpc/test/**
  - /scripts/**
updated: 2026-07-16
---

# Testing Strategy

Tests target observable contracts:

- `pi-rpc`: strict LF/UTF-8 framing, correlation, timeout/exit, executable resolution, environment merge, and serialization.
- Extension unit tests: turn ordering, tool updates, model thinking maps, image limits, bridge schemas/deltas, extension UI, proxy environment, file ranking, prompt syntax, completion activation, Webview-safe ID generation, and scroll-follow reducer.
- Extension-host integration: fake Pi handshake plus a session command path.
- Visual release review: dark/light/high-contrast; 280/320/430px and normal widths; long titles; streaming; failed tools; hover usage; model collapse/expand; model/thinking typography; `@` and `/` completion; bounded Composer height; hidden CodeMirror live-region; paused scrolling; proxy wizard/status.
- Packaging verification: runtime assets present, no source maps/tests/node_modules, identity/version consistency, and bundle budgets.

Release gate: `pnpm check`, bundle-size check, VSIX package/verification, then clean-host smoke testing with a real Pi installation. Environment-blocked E2E is reported, never counted as passing.
