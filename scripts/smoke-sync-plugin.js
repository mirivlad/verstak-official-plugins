#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'sync', 'frontend', 'src', 'SyncSettings.svelte');
const source = fs.readFileSync(sourcePath, 'utf8');

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

console.log('sync plugin smoke passed');
