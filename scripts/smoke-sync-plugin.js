#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'sync', 'frontend', 'src', 'SyncSettings.svelte');
const source = fs.readFileSync(sourcePath, 'utf8');

if (!source.includes('settings.lastError')) {
  throw new Error('SyncSettings must render persisted settings.lastError');
}
if (!source.includes('sanitizeError(settings.lastError)')) {
  throw new Error('SyncSettings must sanitize persisted sync errors before rendering');
}
if (!source.includes('Last sync error')) {
  throw new Error('SyncSettings must label the persisted sync error');
}
if (!source.includes('function formatSyncConflict')) {
  throw new Error('SyncSettings must format individual sync conflicts');
}
if (!source.includes('conflictDetails')) {
  throw new Error('SyncSettings must store sync conflict details after Sync Now');
}
if (!source.includes('Sync conflicts')) {
  throw new Error('SyncSettings must label the conflict details section');
}

console.log('sync plugin smoke passed');
