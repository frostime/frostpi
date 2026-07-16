# Changelog

## 0.1.1 — 2026-07-16

- Fixed Codicon font asset resolution inside VS Code Webviews.
- Reworked narrow-sidebar layout for the header, conversation, composer, menus, and popovers.
- Consolidated editor selection and current-file actions into an Add Context menu.
- Added model-aware thinking-level options based on Pi `thinkingLevelMap`, with a dedicated selector UI.
- Added existing-session discovery, a Resume Session picker, `/resume` completion, and direct JSONL browsing.
- Removed ANSI terminal escape sequences from extension status, widget, title, and notification text.
- Kept generated Pi session filenames out of the FrostPi title unless Pi or the user supplies a name.

## 0.1.0 — 2026-07-16

Initial publishable baseline:

- Pi RPC subprocess client with strict JSONL framing and failure recovery.
- Multi-session VS Code interface with restoration, streaming conversation, tool activity, images, models, thinking levels, commands, and extension UI.
- Native editor context, file navigation, Git-base diffs, diagnostics export, CSP, and trusted-workspace constraints.
- Production build, tests, VSIX verification, release scripts, and maintenance documentation.
