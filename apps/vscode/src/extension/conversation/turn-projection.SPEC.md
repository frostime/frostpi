# Turn projection

FrostPi presents one user prompt and all subsequent Pi activity as a turn. Pi RPC events remain unchanged; this module only produces a stable UI projection.

- A user message opens a turn.
- While an agent run is active and the host queues a follow-up (`streamingBehavior: followUp`), the message is stored as a non-timeline queued follow-up and is not an active turn. The next `agent_start` after the current run settles promotes the oldest queued follow-up into a normal turn. Host submission keeps parking while any queued follow-up remains, so an idle-gap prompt cannot steal that `agent_start`. Abort, process stop, and process failure clear the local queue.
- Historical assistant text, reasoning, and tool calls remain in protocol order inside that turn.
- Live activities remain where first observed: message updates replace existing activities in place and append newly observed activities.
- Notices emitted during an active turn participate in that activity order; notices emitted while idle remain session-level timeline items.
- Tool result events update the existing tool activity by tool-call ID.
- `agent_settled` closes the active turn.
- A host-side completion path may close a specific still-running local turn by id when that turn never received agent events (Pi extension slash commands).
- Historical messages and live events use the same activity model.
- View objects are replaced, not mutated, so incremental bridge updates remain observable.
- Disclosure state is Webview-only and never stored in the Pi session.
