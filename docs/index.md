---
title: FrostPi Engineering Guide
description: Entry point for architecture, protocol, UI, testing, release, privacy, and maintenance documentation.
scope:
  - /**
updated: 2026-07-16
---

# FrostPi Engineering Guide

FrostPi is a VS Code workspace extension and a direct Pi RPC client. Its durable design constraint is that UI concerns, VS Code integration, and Pi protocol semantics remain separate even though they ship in one VSIX.

## Reading order

1. [`architecture/overview.md`](architecture/overview.md) — process topology and module ownership.
2. [`architecture/runtime-boundaries.md`](architecture/runtime-boundaries.md) — trust, execution, persistence, and remote-workspace boundaries.
3. [`architecture/session-state-machine.md`](architecture/session-state-machine.md) — session and turn lifecycle.
4. [`protocol/pi-rpc-compatibility.md`](protocol/pi-rpc-compatibility.md) — supported Pi RPC surface and version policy.
5. [`protocol/webview-bridge.md`](protocol/webview-bridge.md) — snapshot/delta synchronization.
6. [`design/ui-spec.md`](design/ui-spec.md) — visual and interaction rules.
7. [`development.md`](development.md), [`testing.md`](testing.md), and [`release.md`](release.md).

Behavioral contracts that must survive refactors live adjacent to code:

- `packages/pi-rpc/SPEC.md`
- `apps/vscode/src/extension/sessions/session-lifecycle.SPEC.md`
- `apps/vscode/src/extension/extension-ui/extension-ui.SPEC.md`
- `apps/vscode/src/shared/bridge/webview-bridge.SPEC.md`
