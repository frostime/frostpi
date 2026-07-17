# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Show an ephemeral "Compacting context" status in the conversation while `/compact` runs.

### Changed

- Tighten the context usage hover card: narrower layout, compact large token counts, and shorter message labels.
- Keep a single root `CHANGELOG.md`; VSIX packaging copies it into the extension package.

### Fixed

- Execute Pi extension slash commands with arguments (for example `/toggle-web-proxy on`), trim surrounding whitespace before RPC, and close the local turn when the command finishes without an agent run.
- Keep `/` and `@` completion keyboard selection in view by scrolling the option list instead of clipping selected options.

## [0.3.0] - 2026-07-17

### Added

- Add a compact, hideable session bar with session switching, closing, background activity, and required-input indicators.
- Add explicit loading for large or previously failed conversation histories.
- Add Pi-compatible `/compact [instructions]` handling with expandable compaction records in the conversation timeline.

### Changed

- Keep running sessions active in the background when creating, resuming, or selecting another session.
- Serialize Pi process startup and conversation-history loading to limit Extension Host resource spikes, and defer automatic loading for histories larger than 8 MiB.
- Treat unused new sessions as temporary until they accept a prompt or are renamed.
- Consolidate session actions in the Webview instead of duplicating them in the VS Code View title menu.

### Fixed

- Preserve Pi events received while prior conversation history is being loaded and replaced.
- Preserve the selected Pi session file while a resumed session waits to start.
- Keep the composer anchored to the bottom when the session bar is hidden.
- Correct code-block horizontal banding by preventing double translucent background stacking in `pre > code`.
- Correct composer text flush against the edge by reclaiming padding control from the VS Code Webview default reset.
- Correct CI failure in the `Verify VSIX` job by adding the missing `pnpm build` step.

## [0.2.2] - 2026-07-17

### Changed

- Display Pi extension notifications as severity-aware, multiline notices in the owning session conversation instead of transient Webview toasts.
- Present tool input arguments as compact inline values or readable blocks, and increase composer spacing.

### Fixed

- Preserve the first-observed order of notices within active turns so retries and extension messages appear between the surrounding thinking, tool, and response activity.
- Restore the context-usage detail card on hover by preventing metrics-row clipping and removing conflicting click toggling.

## [0.2.1] - 2026-07-17

### Added

- Add turn-based streaming conversation projection, pause-aware output following, and compact reasoning, tool, and response activity views.
- Add a CodeMirror composer with slash-command highlighting, text-only `@file` completion, and workspace file indexing.
- Add compact model and thinking-level pickers, detailed context usage, and process-start proxy modes with guided configuration.

### Changed

- Use incremental Webview bridge updates with explicit compatibility validation.
- Remove hover-driven model-row reflow and normalize model, thinking-level, and command typography.

### Fixed

- Correct `@file` completion activation and expose no-result and search-error states.
- Add a Webview-safe ID fallback for environments without `crypto.randomUUID`.
- Correct CodeMirror height, scrolling, focus-border, and hidden live-region behavior.
- Correct provider collapse and expansion state, including global expand and collapse controls.

## [0.1.1] - 2026-07-16

### Added

- Add model-aware thinking-level options and a dedicated selector.
- Add existing-session discovery, resume selection, `/resume` completion, and direct JSONL browsing.

### Changed

- Rework the header, conversation, composer, menus, and popovers for narrow sidebars.
- Consolidate editor selection and current-file actions into the Add Context menu.

### Fixed

- Correct Codicon font asset resolution inside VS Code Webviews.
- Strip ANSI terminal escape sequences from extension status, widget, title, and notification text.
- Avoid using generated Pi session filenames as FrostPi titles unless Pi or the user supplies a name.

## [0.1.0] - 2026-07-16

### Added

- Add the Pi RPC subprocess client with strict JSONL framing and failure recovery.
- Add the multi-session VS Code interface with restoration, streaming conversation, tool activity, images, models, thinking levels, commands, and extension UI.
- Add editor context capture, file navigation, Git-base diffs, diagnostics export, CSP, and trusted-workspace constraints.
- Add production builds, tests, VSIX verification, release scripts, and maintenance documentation.

[Unreleased]: https://github.com/frostime/frostpi/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/frostime/frostpi/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/frostime/frostpi/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/frostime/frostpi/compare/v0.1.1...v0.2.1
[0.1.1]: https://github.com/frostime/frostpi/compare/10ca43a728ae697fe5b6fbfbf1bb40b607e5edcb...v0.1.1
[0.1.0]: https://github.com/frostime/frostpi/commit/10ca43a728ae697fe5b6fbfbf1bb40b607e5edcb
