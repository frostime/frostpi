---
title: Testing Strategy
description: Required unit, protocol, integration, Webview, and packaging evidence.
scope:
  - /apps/vscode/test/**
  - /packages/pi-rpc/test/**
  - /scripts/**
updated: 2026-07-16
---

# Testing Strategy

Tests target observable contracts rather than implementation call order.

- `packages/pi-rpc/test`: chunked UTF-8/LF framing, correlation, timeout, malformed output, process exit, executable resolution, and command serialization.
- `apps/vscode/test/unit`: message/tool projection, image boundaries, bridge validation/deltas, and extension UI lifecycle.
- Extension-host integration uses a fake Pi executable speaking the real JSONL shape; it must cover activation and at least one session handshake before release.
- Visual review covers empty, ready, streaming, tool-error, image, command-picker, extension-dialog, and failed-runtime states in dark/light/high-contrast themes.
- Packaging verification opens the VSIX and rejects missing runtime assets, sources/tests, source maps, node_modules, identity drift, or an excessive archive.

The release gate is `pnpm check && pnpm package:vsix && pnpm verify:vsix`. A test skipped because of environment limitations must be stated in release notes; it is not equivalent to passing.
