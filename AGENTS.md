# AGENTS.md

FrostPi is a VS Code workspace extension and direct Pi RPC client.

## Commands

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm package:vsix && pnpm verify:vsix
```

## Boundaries

- `packages/pi-rpc`: child process, JSONL framing, request/response mechanics. No VS Code dependency.
- `apps/vscode/src/extension`: VS Code APIs, session/process policy, Pi event projection.
- `apps/vscode/src/shared`: serializable contracts and pure helpers only.
- `apps/vscode/src/webview`: Svelte/browser code. No Node or `vscode` imports.
- Raw Pi events must not reach Webview components.
- One `SessionRuntime` owns one Pi process. Do not add a global concurrency lock.
- FrostPi never intercepts Pi file writes or injects `@file` contents.
- Proxy changes apply only after session process restart; never silently interrupt a running turn.

## Change discipline

Preserve adjacent `*.SPEC.md` contracts. Add tests for protocol/state behavior, not implementation call order. Keep UI usable at 280px width and under VS Code light/dark/high-contrast themes. Do not log prompts, responses, image bytes, credentials, or unredacted proxy URLs.
