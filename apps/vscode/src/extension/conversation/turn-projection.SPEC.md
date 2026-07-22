# Turn projection

FrostPi presents one user prompt and all subsequent Pi activity as a turn. Pi RPC events remain unchanged; this module only produces a stable UI projection.

- A user message opens a turn.
- While an agent run is active and the host queues a follow-up (`streamingBehavior: followUp`), the message is stored as a non-timeline queued follow-up and is not an active turn. Pi drains follow-ups inside the same agent run and emits `message_start` with `role: "user"` without a fresh `agent_start`; FrostPi promotes queued follow-ups in protocol FIFO order and closes the prior turn. `agent_start` remains a fallback promote path after settle. Host submission keeps parking while any queued follow-up remains. Abort, process stop, and process failure clear the local queue.
- Historical assistant text, reasoning, and tool calls remain in protocol order inside that turn.
- Live activities remain where first observed: message updates replace existing activities in place and append newly observed activities.
- Notices emitted during an active turn participate in that activity order; notices emitted while idle remain session-level timeline items.
- Tool result events update the existing tool activity by tool-call ID.
- `agent_settled` closes the active turn.
- A host-side completion path may close a specific still-running local turn by id when that turn never received agent events (Pi extension slash commands).
- Historical messages and live events use the same activity model. Assistant `errorMessage` values remain visible even when the failed message has no content.
- View objects are replaced, not mutated, so incremental bridge updates remain observable.
- Hydrated and settled user turns may carry the stable Pi session entry id required for message-level operations. Pi's user `message_start` timestamp and protocol order correlate live turns with `get_entries`; rejected optimistic turns receive no entry id. Duplicate prompt text is never used as identity. Active-leaf movement outside the incremental descendant path triggers full active-path hydration.
- Disclosure state is Webview-only and never stored in the Pi session.
