# Turn projection

FrostPi presents one user prompt and all subsequent Pi activity as a turn. Pi RPC events remain unchanged; this module only produces a stable UI projection.

- A user message opens a turn.
- Historical assistant text, reasoning, and tool calls remain in protocol order inside that turn.
- Live activities remain where first observed: message updates replace existing activities in place and append newly observed activities.
- Notices emitted during an active turn participate in that activity order; notices emitted while idle remain session-level timeline items.
- Tool result events update the existing tool activity by tool-call ID.
- `agent_settled` closes the active turn.
- Historical messages and live events use the same activity model.
- View objects are replaced, not mutated, so incremental bridge updates remain observable.
- Disclosure state is Webview-only and never stored in the Pi session.
