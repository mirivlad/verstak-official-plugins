# Actions 2.0 (`verstak.actions`)

Requires a host exposing `verstak/core/processes/v1` and atomic settings record
updates. Older hosts mark the plugin incompatible/missing a required capability;
existing plugins keep their original contracts.

Open **Actions** in the sidebar for global actions, or the **Actions** tab in any
Deal for that Deal's actions plus global ones. Command Palette → **Actions: open
global actions** opens the same global view. Add/edit/delete and move up/down are
available on the cards. Scope uses the stable Deal UUID, so renaming or moving a
Deal does not move its definitions to another scope.

Supported actions:

- Application: executable name on PATH or absolute path, literal argv, optional
  absolute working directory, wait for a result or launch a background GUI app.
- Script: explicit interpreter, absolute script path, followed by literal argv.
- URL: HTTP(S), opened with the system handler after device review.

Arguments use a JSON string array, e.g. `["connect", "my-alias"]` or
`["--name", "two words"]`. They are not parsed as a shell command. No variable
expansion or implicit interpreter is applied. Ten existing built-in Lucide
icons can be selected. Light/dark theme tokens, RU/EN labels and a wrapping card
layout are used. Output is plain text, held only in the currently mounted view.

The first launch asks for host-native device permission. Subsequent launches of
the exact same request need one click. Changes to program/argv/cwd/mode require
review again. **Forget permission** revokes it. The Delete confirmation removes
the executable definition and retains only an ID/timestamp tombstone for sync;
a matching device grant can also be revoked before deleting.

Definitions are settings records under `actions`, synchronized by the existing
plugin-record mechanism. Global scope is `workspaceId: ""`; local scope is the
Deal UUID. Numeric ranks preserve user order when storage/sync reorder arrays.
Deleted definitions become tombstones. Loading, activation, enable, incoming
sync and restoration never launch anything or request native permission.
Executables, script bytes, results and approvals are not synchronized. Paths
can be edited per device, but those edits themselves sync; per-device path
mapping is not implemented. Missing programs produce an instruction to install
the program or edit its path. Device approvals live outside the vault and are
not restored from it. Disable preserves definitions and cancels waited jobs.

The host defaults to 30 seconds and 1 MiB combined output. The Stop button
cancels waited execution; timeout/output overflow also terminate it. Detached
GUI apps intentionally keep running after navigation/disable. An already
launched external application cannot be recalled by deleting its button.

Local-file associations are not offered because executable/shortcut handlers
can run code. Open a file by explicitly selecting its application and passing
its absolute path as an argument. HTTP(S) only is intentional. The palette
opens a global launcher; it does not register a separate palette entry per
saved action. No SSHKeeper plugin or SSH management is included.

Security: frontend plugins share a process/context and are not a sandbox. Use
trusted plugins and review the host's executable/argv/cwd confirmation. Script
approval trusts the referenced file, including later edits to its bytes. Never
put secrets into synced definitions.

Checks: `node scripts/smoke-actions-plugin.js`, `scripts/check.sh` in the plugins
repository; desktop `frontend/e2e/actions.spec.js`, process and API Go tests,
and `scripts/verstak-check.sh`. See desktop `docs/PROCESSES_API.md` for the host
contract and platform guarantees.
