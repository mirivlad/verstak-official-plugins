#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const checks = [
  ['plugins/todo/frontend/src/index.js', '.todo-select'],
  ['plugins/files/frontend/src/index.js', '.files-sort'],
  ['plugins/notes/frontend/src/index.js', '.notes-sort'],
  ['plugins/browser-inbox/frontend/src/index.js', '.browser-inbox-select'],
  ['plugins/journal/frontend/src/index.js', '.journal-input.journal-select'],
  ['plugins/trash/frontend/src/index.js', '.trash-select'],
  ['plugins/secrets/frontend/src/index.js', '.secrets-select'],
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let failed = false;
for (const [relativePath, selector] of checks) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const escaped = escapeRegExp(selector);
  if (!new RegExp(`${escaped}\\{[^}]*appearance:none`).test(source)) {
    console.error(`${relativePath}: ${selector} must hide the native select arrow`);
    failed = true;
  }
  if (!new RegExp(`${escaped} option\\{[^}]*background`).test(source)) {
    console.error(`${relativePath}: ${selector} options must use the application surface`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('official plugin select styles are complete');
