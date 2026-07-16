---
title: Runtime and Trust Boundaries
description: Defines execution location, workspace trust, persistence, secret handling, and failure isolation.
scope:
  - /apps/vscode/src/extension/**
updated: 2026-07-16
---

# Runtime and Trust Boundaries

## Execution location

FrostPi is a workspace extension. In local VS Code, Pi runs locally. Under Remote SSH, WSL, or Dev Containers, the Extension Host and Pi run in that remote environment. `cwd` is the selected workspace-folder path in the same file system visible to Pi.

No local-to-remote command bridge exists. An executable configured on the local machine is unavailable to a remote workspace unless separately installed or configured there.

## Trust

The manifest declares untrusted and virtual workspaces unsupported. Pi can execute commands and modify files; FrostPi must not activate a process in a workspace that VS Code has not trusted.

The Webview is untrusted input. It has scripts enabled but no Node integration, receives a restrictive CSP, can access only packaged Webview resources, and must pass Zod validation before any host action.

## Persistence

VS Code workspace state stores metadata only. Pi session JSONL remains Pi-owned. Composer drafts and pasted image bytes live in Webview memory and disappear when the Webview process is lost. This is intentional: restoring sensitive draft/image content would expand the privacy boundary.

## Secrets and diagnostics

FrostPi never reads provider credentials intentionally and never sends them to the Webview. Diagnostic logs exclude prompt/response/model content by design. Paths, error strings, and Pi stderr can still be sensitive and are called out before export.
