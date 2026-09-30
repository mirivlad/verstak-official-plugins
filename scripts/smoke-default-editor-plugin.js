#!/usr/bin/env node
// The shipped editor uses CodeMirror and the browser's selection/input APIs.
// Fake textarea nodes cannot exercise its keyboard or focus behavior.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const cwd = path.resolve(__dirname, '../plugins/default-editor/frontend');
for (const [command, args] of [['npm', ['run', 'build']], ['npm', ['test']], [process.execPath, ['--test', 'test/editor.browser.js']]]) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('default editor model and browser smoke passed');
