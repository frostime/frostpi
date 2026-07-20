# Composer contract

The composer is a plain-text CodeMirror 6 editor. FrostPi sends exactly the visible document text plus explicit image attachments.

- `Enter` inserts a newline; `Ctrl+Enter` and `Cmd+Enter` submit.
- The editor starts at roughly three lines, grows with content, and scrolls internally after its maximum height.
- CodeMirror focus must not create a second nested focus border; screen-reader live regions remain off-screen.
- `/command` completion comes from Pi `get_commands` plus FrostPi-local `/resume`, `/compact`, and `/editor`; descriptions must not open a layout-shifting info panel.
- `/` and `@` share one completion surface. Lists that exceed the available height scroll inside the CodeMirror option list (`ul`). Keyboard selection must keep the highlighted option in view. Tooltips mount on `document.body` so composer/editor geometry cannot clip long file lists; the outer shell may clip only for rounded corners while the inner list remains the scroll container.
- A text-only `/compact` or `/compact <instructions>` submission is translated to Pi's `compact` RPC request and is never appended as a user prompt. Pi's built-in command takes precedence over a same-named extension command, matching interactive Pi.
- `/editor` or `/editor <text>` writes one temp markdown file (Pi external-editor shape) and opens it in the current VS Code window with that text as the buffer (command token stripped). Closing the tab reads the file from disk and replaces that session's composer text while preserving image attachments—Save keeps edits, Don't Save discards them. A second `/editor` while the tab is open reveals it instead of creating another buffer. This is host-local and never becomes a Pi prompt.
- Submitted composer text is trimmed before host handling so `/command args` with surrounding whitespace still matches Pi extension commands. The host also rewrites any Unicode whitespace between `/command` and its args to a single ASCII space before RPC, because Pi splits the command name only on ASCII space. Args after the first token remain part of the prompt string and are parsed by Pi, not FrostPi.
- Only a command in the first non-whitespace token of a line is decorated as a command.
- Typing `@` must immediately start mention completion. With an empty (or matching) query, `@Selection` and `@CurrentFile` appear above workspace file results. Empty, error, and timeout file results must be observable rather than silent.
- `@Selection` inserts `@path:start-end` (current line when nothing is selected). `@CurrentFile` and file rows insert a workspace-relative path. Paths containing whitespace use `@"path with spaces"`.
- File mentions are presentation and completion aids only: FrostPi does not read or inject file content. The composer has no separate Add Context (+) menu; mentions cover path/line references.
- Request identifiers must not depend exclusively on `crypto.randomUUID`.
- Pasted PNG/JPEG/WebP files remain explicit image attachments and obey configured limits.
- Message Fork preserves the current draft under the original stable session id. The newly active fork receives the selected text and projected PNG/JPEG/WebP attachments from a host Composer seed. The host applies prompt-equivalent attachment validation before mutating Pi. During Fork the primary action becomes Cancel Fork, which restores the original session.
- IME composition, selection, undo/redo, clipboard text, and multi-line editing must remain native editor behavior.
