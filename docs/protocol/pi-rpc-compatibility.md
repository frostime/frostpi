---
title: Pi RPC Compatibility
description: Supported Pi RPC commands/events, executable resolution, and compatibility policy.
scope:
  - /packages/pi-rpc/**
  - /apps/vscode/src/extension/pi-runtime/**
updated: 2026-07-16
---

# Pi RPC Compatibility

FrostPi targets the documented RPC mode of the current `@earendil-works/pi-coding-agent` line. It launches Pi with `--mode rpc`; configured extra arguments follow that pair, and restored sessions add `--session <path>`.

## Required surface

Startup requires `get_state`. The product additionally uses prompt/abort, messages, commands, available models, model selection, thinking level, session naming, session stats, and extension UI responses. Unknown asynchronous events are ignored unless their absence violates an existing projection invariant.

The client accepts documented additive fields. It treats malformed JSONL, invalid response envelopes, stdout termination, stdin errors, startup timeout, and unexpected process exit as connection failures.

## Executable resolution

A configured `.js`, `.mjs`, or `.cjs` entry point is launched with `node` from the environment, not `process.execPath`; VS Code's embedded Node may be older than Pi's requirement. A native executable is launched directly. Without configuration, FrostPi resolves `pi` from `PATH` and common global package locations.

## Version policy

FrostPi does not pin or bundle Pi. Compatibility breaks must produce a visible startup/protocol error with bounded stderr, never silently fall back to a new empty session. When adopting a new Pi RPC behavior, add a captured fixture or fake-process test and update `packages/pi-rpc/SPEC.md`.
