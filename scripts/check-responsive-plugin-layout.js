#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const settingsContracts = [
  ['plugins/sync/frontend/src/SyncSettings.svelte', 'sync-settings-surface'],
  ['plugins/browser-inbox/frontend/src/index.js', '.browser-inbox-settings{width:100%;max-width:none;box-sizing:border-box'],
  ['plugins/secrets/frontend/src/index.js', '.secrets-card{width:100%;max-width:none'],
  ['plugins/platform-test/frontend/style.css', '.pt-settings-root'],
];

for (const [relativePath, marker] of settingsContracts) {
  const source = read(relativePath);
  if (!source.includes(marker)) {
    throw new Error(`${relativePath} does not fill the shared settings surface (${marker})`);
  }
}

const toolbarContracts = [
  ['plugins/browser-inbox/frontend/src/index.js', 'browser-inbox-filters'],
  ['plugins/files/frontend/src/index.js', 'files-filter-group'],
  ['plugins/notes/frontend/src/index.js', 'notes-filter-group'],
  ['plugins/search/frontend/src/index.js', 'search-filter-group'],
  ['plugins/todo/frontend/src/index.js', 'todo-filters'],
  ['plugins/trash/frontend/src/index.js', 'trash-filter-group'],
];

for (const [relativePath, group] of toolbarContracts) {
  const source = read(relativePath);
  if (!source.includes('container-type:inline-size')) {
    throw new Error(`${relativePath} does not define a container-width responsive boundary`);
  }
  if (!source.includes(group) || !source.includes('@container')) {
    throw new Error(`${relativePath} does not move its complete filter group at a container breakpoint`);
  }
  const groupRule = new RegExp(`\\.${group.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\{[^}]*flex-wrap:nowrap`);
  if (!groupRule.test(source)) {
    throw new Error(`${relativePath} allows individual filters to wrap instead of keeping the group atomic`);
  }
}

const secrets = read('plugins/secrets/frontend/src/index.js');
if (!/\.secrets-filters\{[^}]*display:flex[^}]*flex-wrap:nowrap/.test(secrets)) {
  throw new Error('Secrets filter row must remain a single horizontal group');
}

console.log('responsive plugin layout contract passed');
