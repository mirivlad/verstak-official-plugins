# Beta Official Plugin UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make official settings/toolbars consistent, make Browser Inbox use semantic nested Deals and open links, and make the Sync plugin schedule and display truthful synchronization state.

**Architecture:** Keep behavior inside the owning plugins. Consume the desktop's generic Deal-list and sync APIs, use plugin-container responsive styles, and extend existing Node smoke scripts with deterministic fake timers and API fixtures.

**Tech Stack:** Plain JavaScript plugin bundles, Svelte Sync frontend, CSS container queries/flexbox, Node smoke scripts, npm/Vite, shell packaging scripts.

## Global Constraints

- The Sync plugin owns scheduling and all Sync-specific labels and UI.
- Settings roots fill the desktop host's centered 90% surface and add no arbitrary root maximum width.
- When a toolbar does not fit, its entire filter group moves to row two; individual filters do not stack vertically.
- Browser Inbox lists all and only workspace nodes, including nested Deals.
- Build local Linux and Windows plugin packages without publishing them.

---

### Task 1: Official settings and toolbar layout contract

**Files:**
- Modify: `plugins/sync/frontend/src/SyncSettings.svelte`
- Modify: `plugins/browser-inbox/frontend/src/index.js`
- Modify: `plugins/secrets/frontend/src/index.js`
- Modify: `plugins/platform-test/frontend/src/index.js`
- Modify compound-toolbar files under `plugins/{activity,browser-inbox,files,journal,notes,search,todo,trash}/frontend/src/index.js` only where a filter group exists.
- Create or modify: `scripts/check-responsive-plugin-layout.js`
- Modify: `scripts/check.sh`

**Interfaces:**
- Produces: settings roots that use `width:100%; max-width:none; box-sizing:border-box` inside the host surface.
- Produces: semantic filter groups marked by `.plugin-filter-group` or plugin-specific equivalent with identical behavior.

- [ ] **Step 1: Add a failing static layout contract check**

Read official settings/toolbar sources and fail if a settings root uses a narrow `max-width`, or if a compound filter toolbar lacks a single non-wrapping filter group and a container-width rule that moves the whole group to row two.

- [ ] **Step 2: Run the check and confirm failure**

Run: `node scripts/check-responsive-plugin-layout.js`

Expected: FAIL for Sync `max-width:500px`, Browser Inbox `max-width:560px`, Secrets card width, and independently wrapping filter groups.

- [ ] **Step 3: Normalize settings roots**

Remove root maximum widths and redundant outer padding. Retain section padding, input width, and accessible focus styles.

- [ ] **Step 4: Normalize compound toolbar groups**

Make each relevant plugin root an inline-size container. Keep identity/count and status/actions on row one; at the chosen container breakpoint give the complete filter group `flex-basis:100%` and keep the group's children on one line with `min-width:0` and flexible search input.

- [ ] **Step 5: Run all plugin checks**

Run: `./scripts/check.sh`

Expected: every manifest, error-message, select-style, frontend smoke, and responsive-layout check passes.

- [ ] **Step 6: Commit and push**

```bash
git add plugins scripts/check-responsive-plugin-layout.js scripts/check.sh
git commit -m "fix(ui): standardize plugin settings and filter rows"
git push origin fix/beta-readiness-2026-07-20
```

### Task 2: Browser Inbox semantic Deal assignment

**Files:**
- Modify: `plugins/browser-inbox/frontend/src/index.js`
- Modify: `scripts/smoke-browser-inbox-plugin.js`

**Interfaces:**
- Consumes: `api.workspaces.list(): Promise<Array<{id,name,rootPath}>>`.
- Produces: assignment/filter options keyed by `rootPath`, displaying full nested paths.

- [ ] **Step 1: Add failing smoke fixtures**

Provide `api.workspaces.list()` with top-level and nested workspace entries plus a plain folder fixture that must never appear. Assert assignment options contain `ddd/333/kkk` and `sdfsdfsdfsdfsdfsdf/111`, exclude `ddd/333`, and persist the selected full path.

- [ ] **Step 2: Run smoke and confirm failure**

Run: `node scripts/smoke-browser-inbox-plugin.js`

Expected: FAIL because the plugin calls `api.files.list('')` and cannot distinguish folders or nested workspaces.

- [ ] **Step 3: Replace directory inference with Deal API**

Load workspace DTOs, normalize/deduplicate by `rootPath`, sort by full path, and use the full path as stored assignment value and visible label. On failure show localized `Deal assignment unavailable` and do not fall back to folders.

- [ ] **Step 4: Refresh on workspace lifecycle events**

Use the existing plugin event subscription facility for create, rename, move, trash, and restore events. Reload options and retain a capture's current legacy assignment if it is absent from the latest active list.

- [ ] **Step 5: Run smoke, commit, and push**

Run: `node scripts/smoke-browser-inbox-plugin.js`

Expected: PASS.

```bash
git add plugins/browser-inbox/frontend/src/index.js scripts/smoke-browser-inbox-plugin.js
git commit -m "fix(browser-inbox): list semantic nested Deals"
git push origin fix/beta-readiness-2026-07-20
```

### Task 3: Browser Inbox link opening permission

**Files:**
- Modify: `plugins/browser-inbox/plugin.json`
- Modify: `scripts/smoke-browser-inbox-plugin.js`

**Interfaces:**
- Consumes: existing `api.files.openURL(url)` and host HTTP/HTTPS validation.
- Produces: manifest declaration `files.openExternal`.

- [ ] **Step 1: Add a failing manifest/action test**

Assert the manifest declares `files.openExternal`. Trigger a valid `https://example.test/path` capture action and assert exactly one `openURL` call; reject a simulated host error and assert localized error status.

- [ ] **Step 2: Run smoke and confirm failure**

Run: `node scripts/smoke-browser-inbox-plugin.js`

Expected: FAIL because the permission is absent.

- [ ] **Step 3: Add the permission and retain safe error handling**

Add only `files.openExternal`; do not add network or process permissions. Keep the current user-facing localized error and console diagnostic.

- [ ] **Step 4: Run checks, commit, and push**

Run: `./scripts/check.sh`

Expected: PASS.

```bash
git add plugins/browser-inbox/plugin.json scripts/smoke-browser-inbox-plugin.js
git commit -m "fix(browser-inbox): allow captured links to open"
git push origin fix/beta-readiness-2026-07-20
```

### Task 4: Truthful Sync status component

**Files:**
- Modify: `plugins/sync/frontend/src/SyncStatusBar.svelte`
- Modify: `plugins/sync/frontend/src/SyncSettings.svelte`
- Modify: `plugins/sync/locales/en.json`
- Modify: `plugins/sync/locales/ru.json`
- Modify: `scripts/smoke-sync-plugin.js`

**Interfaces:**
- Consumes: `api.sync.status()` fields `configured`, `syncing`, `connected`, `revoked`, `unpushedOps`, `lastSyncAt`, `lastError`, `lastWarning`, `serverUrl`, `syncInterval`, and `statusLabel`.
- Produces: status label/tooltip and settings summary derived from fresh backend state.

- [ ] **Step 1: Add failing status-source/smoke assertions**

Assert `api.sync.status()` is queried before plugin settings and that saved `syncStatus` cannot short-circuit it. Exercise disabled, first-sync pending, syncing, unpushed, recent success, disconnected, error, and revoked DTOs. Assert relative label and exact localized tooltip data.

- [ ] **Step 2: Run smoke and confirm failure**

Run: `node scripts/smoke-sync-plugin.js`

Expected: FAIL because status stores only a string, prefers stale settings, and lacks time/pending/running presentation.

- [ ] **Step 3: Store the full authoritative DTO**

Use backend status as primary state and settings only as a fallback after an API failure. Implement deterministic status precedence: revoked, syncing, error, not configured, pending first success, unpushed changes, disconnected, successful.

- [ ] **Step 4: Add relative/exact time formatting and localized copy**

Use `Intl.RelativeTimeFormat` for the compact label and `Intl.DateTimeFormat` for tooltip/settings exact time. Include server, pending count, warning, and error only when present.

- [ ] **Step 5: Keep settings in sync with the same DTO**

After connect, manual sync, interval save, reset, or disconnect, reload backend status and update the summary without closing the modal.

- [ ] **Step 6: Build and run smoke**

Run: `cd plugins/sync/frontend && npm run build`

Run: `node scripts/smoke-sync-plugin.js`

Expected: PASS.

- [ ] **Step 7: Commit and push**

```bash
git add plugins/sync/frontend/src/SyncStatusBar.svelte plugins/sync/frontend/src/SyncSettings.svelte plugins/sync/locales/en.json plugins/sync/locales/ru.json scripts/smoke-sync-plugin.js
git commit -m "fix(sync): show authoritative synchronization state"
git push origin fix/beta-readiness-2026-07-20
```

### Task 5: Plugin-owned automatic synchronization

**Files:**
- Modify: `plugins/sync/frontend/src/SyncStatusBar.svelte`
- Modify: `scripts/smoke-sync-plugin.js`

**Interfaces:**
- Consumes: authoritative DTO and `api.sync.now()`.
- Produces: one cancellable due-time timer owned by the mounted status component.

- [ ] **Step 1: Add failing fake-timer tests**

Cover positive interval with no previous success (immediate run), a future due time (delayed run), disabled interval (no timer), active backend sync (no duplicate), failure (status refresh and retry at next interval), and unmount (timer cleared).

- [ ] **Step 2: Run smoke and confirm failure**

Run: `node scripts/smoke-sync-plugin.js`

Expected: FAIL because no automatic timer exists.

- [ ] **Step 3: Implement due-time scheduling**

After every status refresh, cancel the previous timeout and schedule only when configured, interval is positive, and the component is mounted. Calculate `dueAt = lastSyncAt + interval`; use immediate execution when overdue. Set local running state before calling `api.sync.now()`, await completion, refresh authoritative status, then schedule the next attempt.

- [ ] **Step 4: Prevent overlap and clean up**

Skip execution while local or backend `syncing` is true. Clear polling, due timers, and locale subscriptions on destroy.

- [ ] **Step 5: Run tests, commit, and push**

Run: `node scripts/smoke-sync-plugin.js`

Expected: PASS.

```bash
git add plugins/sync/frontend/src/SyncStatusBar.svelte scripts/smoke-sync-plugin.js
git commit -m "fix(sync): run configured schedule in plugin"
git push origin fix/beta-readiness-2026-07-20
```

### Task 6: Official plugin release verification

**Files:**
- Generated only: `dist/`, `dist-windows/`, `release/`

**Interfaces:**
- Produces: Linux and Windows portable official-plugin packages plus SHA256 manifest; publishes nothing.

- [ ] **Step 1: Run final checks and builds**

Run: `./scripts/check.sh && ./scripts/build.sh && ./scripts/build-windows.sh`

Expected: PASS and populated `dist/` plus `dist-windows/`.

- [ ] **Step 2: Build local release packages**

Run: `./scripts/release.sh 0.1.0-beta.20260720`

Expected non-empty artifacts:

- `release/verstak-official-plugins-linux-amd64-0.1.0-beta.20260720.tar.gz`;
- `release/verstak-official-plugins-windows-amd64-0.1.0-beta.20260720.zip`;
- `release/SHA256SUMS`.

- [ ] **Step 3: Verify archives**

Run: `cd release && sha256sum -c SHA256SUMS`

Run: `tar -tzf verstak-official-plugins-linux-amd64-0.1.0-beta.20260720.tar.gz >/dev/null`

Run: `unzip -t verstak-official-plugins-windows-amd64-0.1.0-beta.20260720.zip`

Expected: all checks pass. Do not run `scripts/publish-github-release.sh`.
