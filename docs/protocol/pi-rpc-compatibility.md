---
title: Pi RPC Compatibility
description: Supported Pi RPC commands/events, executable resolution, and compatibility policy.
scope:
  - /packages/pi-rpc/**
  - /apps/vscode/src/extension/pi-runtime/**
updated: 2026-07-18
---

# Pi RPC Compatibility

FrostPi targets the documented RPC mode of the current `@earendil-works/pi-coding-agent` line. It launches Pi with `--mode rpc`; configured extra arguments follow that pair, and restored sessions add `--session <path>`.

## Required surface

Startup requires `get_state`. The product additionally uses prompt/abort, manual compact, messages, commands, available models, model selection, thinking level, session naming, session stats, and extension UI responses. Unknown asynchronous events are ignored unless their absence violates an existing projection invariant.

Pi built-in interactive commands are not returned by `get_commands` and do not execute through RPC `prompt`. FrostPi therefore translates text-only `/compact` and `/compact <instructions>` submissions to the documented `compact` request. Successful `compaction_end` events append a visible compaction boundary without removing already projected turns; resumed `compactionSummary` messages restore the same boundary.

Pi extension commands do execute through RPC `prompt` (with args after the command name). They may complete without `agent_start` / `agent_settled`; FrostPi classifies them via `get_commands` (`source: "extension"`, refresh only on name miss) and closes the turn opened for that prompt after short idle checks.

The client accepts documented additive fields. It treats malformed JSONL, invalid response envelopes, stdout termination, stdin errors, startup timeout, and unexpected process exit as connection failures.

## Executable resolution

A configured `.js`, `.mjs`, or `.cjs` entry point is launched with `node` from the environment, not `process.execPath`; VS Code's embedded Node may be older than Pi's requirement. A native executable is launched directly. Without configuration, FrostPi resolves `pi` from `PATH` and common global package locations.

## Version policy

FrostPi does not pin or bundle Pi. Compatibility breaks must produce a visible startup/protocol error with bounded stderr, never silently fall back to a new empty session. When adopting a new Pi RPC behavior, add a captured fixture or fake-process test and update `packages/pi-rpc/SPEC.md`.

## Model thinking metadata

The Webview treats the active model object returned by Pi as authoritative. Reasoning models expose standard levels through `high` by default. `thinkingLevelMap` entries mapped to `null` are hidden; extended `xhigh` and `max` levels are shown only when Pi explicitly advertises them. After model or level changes, `get_state` remains authoritative if Pi clamps the selection.

## Existing sessions

FrostPi discovers existing Pi JSONL files for the active workspace, then starts a normal independent RPC process with `--session <absolute-path>`. Pi remains responsible for file migration, tree position, history, model state, and extension lifecycle. FrostPi requests `get_messages` separately after startup; files larger than 8 MiB require an explicit user request to avoid parsing a very large RPC record during startup. See `apps/vscode/src/extension/sessions/session-catalog.SPEC.md`.
