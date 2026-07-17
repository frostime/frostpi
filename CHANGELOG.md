# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/frostime/frostpi/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/frostime/frostpi/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/frostime/frostpi/compare/v0.1.1...v0.2.1
[0.1.1]: https://github.com/frostime/frostpi/compare/10ca43a728ae697fe5b6fbfbf1bb40b607e5edcb...v0.1.1
[0.1.0]: https://github.com/frostime/frostpi/commit/10ca43a728ae697fe5b6fbfbf1bb40b607e5edcb
