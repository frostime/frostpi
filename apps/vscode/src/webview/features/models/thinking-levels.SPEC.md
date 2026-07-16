# Thinking-level compatibility

FrostPi does not invent provider-specific reasoning controls. It derives the selector from the active `RpcModel` returned by Pi.

- `reasoning !== true`: only `off` is displayed and the selector is disabled.
- Reasoning model without `thinkingLevelMap`: `off`, `minimal`, `low`, `medium`, and `high` are displayed.
- A key mapped to `null` is hidden.
- `xhigh` and `max` are opt-in and are displayed only when explicitly present with a non-null mapping.
- If Pi clamps a requested level during model switching, the next `get_state` result is authoritative.

This module is a compatibility projection, not a replacement for Pi's model policy.
