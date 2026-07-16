# Existing-session discovery and resume

## Scope

FrostPi implements the user-visible equivalent of Pi's `/resume` for the active VS Code workspace. It does not invoke Pi's terminal selector and does not edit session files.

## Discovery

Candidate session roots are discovered from:

1. `--session-dir` in `frostpi.pi.arguments`
2. `PI_CODING_AGENT_SESSION_DIR`
3. project `.pi/settings.json`
4. user `~/.pi/agent/settings.json`
5. Pi's default `~/.pi/agent/sessions`

All candidate roots are scanned so older sessions remain discoverable after a configuration change. Results are filtered by the session header's `cwd`, matching the active workspace folder.

Scanning is bounded to 2,000 JSONL files. Metadata reads use the file head and tail rather than loading the whole conversation. Invalid, truncated, inaccessible, and non-session files are skipped.

## Resume lifecycle

Selecting a session creates a normal FrostPi `SessionRuntime` with the session header's `cwd` and starts Pi using `--session <absolute-jsonl-path>`. The Pi process remains authoritative for migration, history reconstruction, active tree position, model state, and extension loading.

Opening a session already present in FrostPi activates the existing runtime instead of spawning a duplicate process.

A manually browsed session whose `cwd` differs from the active workspace is not started. FrostPi offers to open the owning folder first, preventing an agent attached to one VS Code workspace from silently operating in another project.

## Non-goals

- Reimplement Pi's tree navigator, delete, fork, clone, or import flows.
- Parse the entire session graph in FrostPi.
- Modify Pi session JSONL files.
