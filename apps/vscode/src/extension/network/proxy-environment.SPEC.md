# Proxy environment lifecycle

FrostPi proxy settings are process-start configuration.

- The guided command stores configuration at User or Workspace scope.
- A running Pi process never receives modified proxy settings.
- New sessions and restarted sessions resolve current settings and SecretStorage credentials.
- Changed settings mark running sessions `restart required`; the view distinguishes the currently applied label from the pending label.
- The session menu must display the active/pending proxy state and open the guided configuration flow.
- Credential changes remain restart-required until restart even if unrelated settings later change.
- Saving configuration never silently interrupts an active turn. The user explicitly chooses current-session restart, all-session restart, or later.
- `inherit` leaves the Extension Host environment unchanged.
- `vscode` maps VS Code `http.proxy` to HTTP/HTTPS variables and warns when that setting is empty.
- `custom` writes configured HTTP, HTTPS, ALL, and NO_PROXY values.
- `direct` removes upper- and lower-case proxy variables.
- Proxy variables apply to Pi and commands spawned by Pi. Third-party extensions that ignore those variables are outside FrostPi's guarantee.
- Diagnostics and exported stderr must redact credentials.
