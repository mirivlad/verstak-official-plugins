# Beta Official Plugin UX Design

Date: 2026-07-20

## Goal

Make official plugin interfaces responsive and trustworthy before beta, with focused changes to Sync and Browser Inbox and a consistent toolbar/settings contract across official plugins.

## Settings Panels

Settings component roots fill the desktop host's centered 90% surface. Root-level `max-width` declarations and redundant outer padding are removed from Sync, Browser Inbox, Secrets, and Platform Test settings. Sections retain comfortable internal padding and compact controls retain intentional widths.

## Responsive Toolbars

Toolbars with filters are divided into semantic groups: identity/count, filters, and status/actions. At wide widths they share one row. When the complete row no longer fits, the entire filter group moves to the second row. Individual filters do not wrap into separate vertical rows.

The breakpoint is based on the plugin container width rather than the application viewport. Filter controls may shrink within accessible limits; the toolbar must not create page-level horizontal overflow. This behavior is applied consistently to official plugins with compound filter toolbars and verified at representative 1200 px and 1920 px windows plus a narrow content container.

## Browser Inbox

### Deal assignment

The current implementation calls `api.files.list('')`, so every root directory can appear as a Deal and nested Deals are omitted. Browser Inbox instead calls the host's read-only Deal-list API. Options contain only workspace nodes, include nested workspaces, display their full paths, and refresh after workspace lifecycle changes.

Assignments continue to store the full workspace root path so existing captures and domain bindings remain compatible.

### Opening captured links

The plugin declares `files.openExternal`, which is required by `api.files.openURL`. The existing HTTP/HTTPS validation remains in the host. A rejected scheme or platform-open failure produces the localized error; a valid link invokes the OS default browser.

## Sync Plugin

### Ownership

The Sync plugin owns automatic scheduling and all user-facing synchronization state. No scheduling or Sync-specific UI moves into desktop core.

### Authoritative state

`SyncStatusBar` queries `api.sync.status()` first. Persisted plugin settings are configuration or fallback only and never override a fresh backend state. The component displays:

- not configured;
- waiting for the first successful sync;
- synchronizing;
- pending local changes;
- last successful sync as relative time;
- disconnected;
- error;
- revoked device.

Its tooltip includes the exact last-success time, server, pending operation count, and latest error or warning. Clicking it opens Sync settings.

### Automatic scheduling

When the backend reports a positive interval and configured credentials, the mounted status component schedules `api.sync.now()`. It calculates the next due time from the last successful completion, runs immediately when overdue, and schedules the next attempt after completion. It never starts another run while one is active. A disabled interval cancels the timer.

The status refreshes promptly after a run and periodically while idle. Manual runs from settings or the command palette remain supported and are reflected through the backend running state.

### Settings

Sync settings fill the 90% host surface. They show the same authoritative last success, pending operations, warning, and error information as the status item. Saving an interval affects the scheduler without requiring an application restart.

## Error Handling

- Failure to load Deals does not fall back to arbitrary folders; it reports that Deal assignment is unavailable.
- Link-open errors retain localized user feedback and diagnostic console detail without exposing credentials.
- A scheduled sync failure is visible, retained for retry, and never advances the successful timestamp.
- Timer cleanup occurs on component unmount or plugin disable.

## Verification

Plugin-focused tests will cover:

- settings root width contract;
- whole-group toolbar wrapping;
- nested Deal options and exclusion of plain folders;
- assignment persistence after choosing a nested Deal;
- required open-external permission and valid/invalid URL behavior;
- backend-authoritative status precedence;
- relative and exact last-success formatting;
- pending, running, disconnected, error, and revoked states;
- interval scheduling, overdue immediate run, disabled timer, retry, and unmount cleanup.

Desktop Playwright tests use the real built plugin bundles rather than divergent handwritten mock components wherever feasible. Official plugin build and smoke scripts run before release packaging.

## Success Criteria

- Filter controls move as one group to a second row and never scatter vertically.
- Browser Inbox lists all and only Deals, including nested Deals.
- Valid captured web links open through the operating system.
- Sync scheduling works while the plugin is active and the user can always tell whether data is pending, syncing, failed, or successfully confirmed by the server.
