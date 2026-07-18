# File mentions

`@file` is a text-only Pi-compatible reference. FrostPi never reads or injects the referenced file into the prompt.

- Typing `@` with an empty or matching query lists built-in specials first: `@Selection` (`@path:start-end`, current line when the selection is empty) and `@CurrentFile` (`@path`). Both insert path/line references only.
- The Extension Host searches only the active session working directory through `workspace.findFiles`; no external CLI is required.
- An undefined VS Code exclude argument preserves `files.exclude`. FrostPi additionally filters `search.exclude` unless disabled by configuration.
- Catalog construction is lazy, bounded, cached for 30 seconds, and invalidated by workspace file/folder/exclude changes.
- Ranking favors exact file names, prefixes, path segments, fuzzy subsequences, active/visible editors, and files touched in the current session.
- Only the top bounded candidates cross the Host–Webview bridge. Aborted CodeMirror completion requests ignore late responses.
- Paths are inserted relative to the Pi session CWD. Whitespace uses `@"path with spaces"`.
