# Composer contract

The composer is a plain-text CodeMirror 6 editor. FrostPi sends exactly the visible document text plus explicit image attachments.

- `Enter` inserts a newline; `Ctrl+Enter` and `Cmd+Enter` submit.
- The editor starts at roughly three lines, grows with content, and scrolls internally after its maximum height.
- CodeMirror focus must not create a second nested focus border; screen-reader live regions remain off-screen.
- `/command` completion comes from Pi `get_commands` plus FrostPi-local `/resume`; descriptions must not open a layout-shifting info panel.
- Only a command in the first non-whitespace token of a line is decorated as a command.
- Typing `@` must immediately start workspace-file completion. Empty, error, and timeout results must be observable rather than silent.
- `@file` completion inserts a workspace-relative path. Paths containing whitespace use `@"path with spaces"`.
- File mentions are presentation and completion aids only: FrostPi does not read or inject file content.
- Request identifiers must not depend exclusively on `crypto.randomUUID`.
- Pasted PNG/JPEG/WebP files remain explicit image attachments and obey configured limits.
- IME composition, selection, undo/redo, clipboard text, and multi-line editing must remain native editor behavior.
