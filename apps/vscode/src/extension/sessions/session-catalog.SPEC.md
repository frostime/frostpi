# Existing-session discovery and resume

## Scope

FrostPi implements the user-visible equivalent of Pi's `/resume` for the active VS Code workspace. It does not invoke Pi's terminal selector and does not edit session files.

## Discovery

Candidate session roots are discovered from:

1. `--session-dir` in `frostpi.pi.arguments`
2. `PI_CODING_AGENT_SESSION_DIR`
3. project `.pi/settings.json` `sessionDir`
4. user `~/.pi/agent/settings.json` `sessionDir`
5. Pi's default `~/.pi/agent/sessions`

Relative `sessionDir` values follow Pi runtime semantics: expand `~`, then resolve against the active workspace folder (the cwd FrostPi uses when launching Pi). They are **not** resolved relative to the settings file directory; that rule applies to Pi resource paths (extensions, skills, …), not `sessionDir`.

All candidate roots are scanned so older sessions remain discoverable after a configuration change. Results are filtered by the session header's `cwd`, matching the active workspace folder.

Scanning is bounded to 2,000 JSONL files. Metadata reads use bounded head and tail windows rather than loading the whole conversation. Invalid, truncated, inaccessible, and non-session files are skipped.

Extension hooks that rewrite the session directory at runtime are not visible to discovery; use **Browse for a session file…** for non-standard storage.

## Display name

Pi stores the session display name in append-only `session_info` entries; the latest entry in file order wins, and an empty name clears the title (`getSessionName`).

FrostPi recovers the name from the head window (64 KiB) and the tail window (384 KiB), keeping the `session_info` with the greatest file offset. That covers early auto-naming (name written after the first turn, then more transcript) and late renames near EOF. A name that lies only in the unscanned middle of a very large file falls back to the latest user-message preview in the tail window, then the file basename.

## Resume lifecycle

Selecting a session creates a normal FrostPi `SessionRuntime` with the session header's `cwd` and starts Pi using `--session <absolute-jsonl-path>`. The Pi process remains authoritative for migration, history reconstruction, active tree position, model state, and extension loading.

Opening a session already present in FrostPi activates the existing runtime instead of spawning a duplicate process.

A manually browsed session whose `cwd` differs from the active workspace is not started. FrostPi offers to open the owning folder first, preventing an agent attached to one VS Code workspace from silently operating in another project.

## Non-goals

- Reimplement Pi's tree navigator, delete, fork, clone, or import flows.
- Parse the entire session graph in FrostPi.
- Modify Pi session JSONL files.
