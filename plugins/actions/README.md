# Actions 2.0 (`verstak.actions`)

Requires a host exposing `verstak/core/processes/v1` and atomic settings record
updates, optional process confirmation and device-local JSON storage. Hosts without the capability cannot load the plugin; hosts with an older
API surface show an update-required message. Existing definitions stay valid.

Open **Actions** in the sidebar for global actions, or the **Actions** tab in any
Deal for that Deal's actions plus global ones. Command Palette → **Actions: open
global actions** opens the same global view. Add/edit/delete and move up/down are
available on the cards. Scope uses the stable Deal UUID, so renaming or moving a
Deal does not move its definitions to another scope.

Supported actions:

- Application: executable name on PATH or absolute path, literal argv, optional
  absolute working directory, wait for a result or launch a background GUI app.
- Script: explicit interpreter, absolute script path, followed by literal argv.
- URL: HTTP(S), opened with the system handler.

Enter arguments as a line, e.g. `connect my-alias` or `--name "two words"`.
Single and double quotes group words; `""` passes an empty argument. Backslashes
remain literal except directly before a double quote, where pairs represent a
backslash and an odd final backslash escapes the quote. No shell expansion or
implicit interpreter is applied. Stored argv arrays remain unchanged.
The shared searchable Lucide picker selects icons. Compact cards launch with
one click; edit, delete and move controls appear on hover or keyboard
focus (always on touch screens). Descriptions appear as card tooltips.
Light/dark theme tokens and RU/EN labels are used. Output is plain text, held
only in the currently mounted view.

Saving through the Actions form trusts that definition on this device. First
launch and later form edits run immediately. New synced/imported records and
external changes to execution fields need one confirmation showing program,
arguments and working directory. Cosmetic changes preserve trust. The optional
**Ask for confirmation before every launch** checkbox defaults off and always
asks when enabled, including for local actions. There is no revoke/shield UI.
Delete retains an ID/timestamp tombstone for sync.

Trust is a device-local SHA-256 hash per record in `storage.local`, outside the
vault. It includes the authored request and confirmation option; it excludes
name/icon/description/rank/scope. Only form saves or an accepted launch
confirmation write it. Public save commands/import/storage writes never claim
UI authorship. Imported `approved: true` and similar fields have no effect.
A second device starts without trust, even for identical commands. Old Actions
2.0 definitions remain valid; when no local hash exists they ask once rather
than assuming that old synced data was authored here.

Definitions are settings records under `actions`, synchronized by the existing
plugin-record mechanism. Global scope is `workspaceId: ""`; local scope is the
Deal UUID. Numeric ranks preserve user order when storage/sync reorder arrays.
Deleted definitions become tombstones. Loading, activation, enable, incoming
sync and restoration never launch anything or request native permission.
Executables, script bytes, results and approvals are not synchronized. Paths
can be edited per device, but those edits themselves sync; per-device path
mapping is not implemented. Missing programs produce an instruction to install
the program or edit its path. Action trust lives outside the vault and is
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
trusted plugins and review the host's executable/argv/cwd confirmation. Trust in a script path covers the referenced file, including later edits to its bytes. Never
put secrets into synced definitions.

Checks: `node scripts/smoke-actions-plugin.js`, `scripts/check.sh` in the plugins
repository; desktop `frontend/e2e/actions.spec.js`, process and API Go tests,
and `scripts/verstak-check.sh`. See desktop `docs/PROCESSES_API.md` for the host
contract and platform guarantees.
