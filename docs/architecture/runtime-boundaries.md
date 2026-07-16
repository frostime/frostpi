---
title: Runtime and Trust Boundaries
description: Execution location, trust, persistence, proxy, secret handling, and failure isolation.
scope:
  - /apps/vscode/src/extension/**
updated: 2026-07-16
---

# Runtime and Trust Boundaries

FrostPi is a workspace extension. Local workspaces launch Pi locally; Remote SSH, WSL, and Dev Containers launch Pi in the remote Extension Host. No local-to-remote command bridge exists.

Untrusted and virtual workspaces are unsupported because Pi can execute commands and modify files. The Webview has no Node access, uses a restrictive CSP, and all commands are schema-validated by the host.

VS Code workspace state stores session metadata only. Pi owns conversation JSONL. Draft text and pasted images stay in Webview memory. Provider credentials remain Pi-owned. Optional proxy credentials are stored in VS Code SecretStorage and are injected only into a newly started Pi process.

Proxy settings apply to Pi and child commands inheriting its environment. Changing them cannot modify an existing process; FrostPi marks the session restart-required and does not interrupt an active turn automatically.

Diagnostic exports omit prompts/responses and redact common token, password, bearer, and URL credential forms. Paths and third-party stderr may still be sensitive and should be reviewed before sharing.
