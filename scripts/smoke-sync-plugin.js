#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'sync', 'frontend', 'src', 'SyncSettings.svelte');
const source = fs.readFileSync(sourcePath, 'utf8');
const statusSource = fs.readFileSync(path.join(root, 'plugins', 'sync', 'frontend', 'src', 'SyncStatusBar.svelte'), 'utf8');
const entrySource = fs.readFileSync(path.join(root, 'plugins', 'sync', 'frontend', 'src', 'index.js'), 'utf8');

if (!source.includes('settings.lastError')) {
  throw new Error('SyncSettings must render persisted settings.lastError');
}
if (!source.includes('function reportError')) {
  throw new Error('SyncSettings must map technical failures to localized action-specific errors');
}
if (/sanitizeError\(/.test(source) || /\{ error: sanitizeError/.test(source)) {
  throw new Error('SyncSettings must not interpolate raw technical errors into user-facing messages');
}
if (!source.includes("tr('ui.lastSyncError'")) {
  throw new Error('SyncSettings must label the persisted sync error');
}
if (!source.includes("tr('ui.syncConflictItem'")) {
  throw new Error('SyncSettings must hide technical conflict identifiers behind a user-facing summary');
}
if (!source.includes('conflictDetails')) {
  throw new Error('SyncSettings must store sync conflict details after Sync Now');
}
if (!source.includes('Sync conflicts')) {
  throw new Error('SyncSettings must label the conflict details section');
}
if (!source.includes('syncAPI().configure(serverUrl, username, password, vaultId)')) {
  throw new Error('SyncSettings must pass the optional remote vault ID during pairing');
}
if (!source.includes('settings.lastWarning')) {
  throw new Error('SyncSettings must render unresolved scanner warnings');
}
if (!source.includes("tr('ui.remoteVaultHint'")) {
  throw new Error('SyncSettings must explain remote vault restoration');
}

if (!statusSource.includes('createSyncController')) {
  throw new Error('SyncStatusBar must own the automatic synchronization controller');
}
if (!statusSource.includes('formatRelativeSyncTime') || !statusSource.includes('formatExactSyncTime')) {
  throw new Error('SyncStatusBar must show relative and exact last-success times');
}
if (!entrySource.includes('$destroy')) {
  throw new Error('Sync plugin wrapper must destroy Svelte components and their timers on unmount');
}

class FakeClock {
  constructor(now) {
    this.now = now;
    this.nextId = 1;
    this.timers = new Map();
  }
  setTimeout = (callback, delay) => {
    const id = this.nextId++;
    this.timers.set(id, { at: this.now + Math.max(0, Number(delay) || 0), callback });
    return id;
  };
  clearTimeout = (id) => this.timers.delete(id);
  async advance(milliseconds) {
    const target = this.now + milliseconds;
    while (true) {
      const due = [...this.timers.entries()]
        .filter(([, timer]) => timer.at <= target)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!due) break;
      this.timers.delete(due[0]);
      this.now = due[1].at;
      await due[1].callback();
    }
    this.now = target;
  }
}

function assertKind(deriveSyncState, dto, expected) {
  const actual = deriveSyncState(dto).kind;
  if (actual !== expected) throw new Error(`sync state ${JSON.stringify(dto)} => ${actual}, expected ${expected}`);
}

(async () => {
  const stateModulePath = path.join(root, 'plugins', 'sync', 'frontend', 'src', 'syncState.js');
  const { createSyncController, deriveSyncState } = await import(pathToFileURL(stateModulePath).href);

  assertKind(deriveSyncState, { configured: true, revoked: true }, 'revoked');
  assertKind(deriveSyncState, { configured: true, syncing: true }, 'syncing');
  assertKind(deriveSyncState, { configured: true, lastError: 'boom' }, 'error');
  assertKind(deriveSyncState, { configured: false }, 'disabled');
  assertKind(deriveSyncState, { configured: true, connected: true, lastSyncAt: '' }, 'pendingFirst');
  assertKind(deriveSyncState, { configured: true, connected: true, lastSyncAt: '2026-07-20T10:00:00Z', unpushedOps: 3 }, 'pending');
  assertKind(deriveSyncState, { configured: true, connected: false, lastSyncAt: '2026-07-20T10:00:00Z' }, 'disconnected');
  assertKind(deriveSyncState, { configured: true, connected: true, lastSyncAt: '2026-07-20T10:00:00Z' }, 'success');

  const start = Date.parse('2026-07-20T10:00:00Z');
  const clock = new FakeClock(start);
  let status = { configured: true, connected: true, syncing: false, syncInterval: 5, lastSyncAt: '' };
  let syncCalls = 0;
  const controller = createSyncController({
    api: {
      sync: {
        status: async () => ({ ...status }),
        now: async () => {
          syncCalls += 1;
          status = { ...status, lastSyncAt: new Date(clock.now).toISOString() };
        },
      },
      settings: { read: async () => ({ syncStatus: 'disabled' }) },
    },
    now: () => clock.now,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    pollIntervalMs: 60_000,
  });
  await controller.start();
  await clock.advance(0);
  if (syncCalls !== 1) throw new Error('configured first synchronization must run immediately');

  await clock.advance(4 * 60_000);
  if (syncCalls !== 1) throw new Error('automatic synchronization ran before its due time');
  await clock.advance(60_000);
  if (syncCalls !== 2) throw new Error('automatic synchronization did not run at its due time');
  controller.destroy();
  if (clock.timers.size !== 0) throw new Error('destroy did not clear Sync plugin timers');

  const disabledClock = new FakeClock(start);
  let disabledCalls = 0;
  const disabled = createSyncController({
    api: { sync: { status: async () => ({ configured: true, connected: true, syncing: false, syncInterval: 0 }), now: async () => { disabledCalls += 1; } } },
    now: () => disabledClock.now,
    setTimeout: disabledClock.setTimeout,
    clearTimeout: disabledClock.clearTimeout,
  });
  await disabled.start();
  await disabledClock.advance(60 * 60_000);
  disabled.destroy();
  if (disabledCalls !== 0) throw new Error('disabled automatic synchronization created a run');

  const failureClock = new FakeClock(start);
  let failureCalls = 0;
  const failureStatus = { configured: true, connected: true, syncing: false, syncInterval: 5, lastSyncAt: '' };
  const failing = createSyncController({
    api: {
      sync: {
        status: async () => ({ ...failureStatus, lastError: failureCalls ? 'failed' : '' }),
        now: async () => { failureCalls += 1; throw new Error('network down'); },
      },
    },
    now: () => failureClock.now,
    setTimeout: failureClock.setTimeout,
    clearTimeout: failureClock.clearTimeout,
    pollIntervalMs: 60_000,
  });
  await failing.start();
  await failureClock.advance(0);
  if (failureCalls !== 1) throw new Error('overdue automatic synchronization did not run');
  await failureClock.advance(4 * 60_000);
  if (failureCalls !== 1) throw new Error('failed automatic synchronization retried immediately');
  await failureClock.advance(60_000);
  if (failureCalls !== 2) throw new Error('failed automatic synchronization did not retry at the next interval');
  failing.destroy();

  console.log('sync plugin smoke passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
