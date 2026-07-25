#!/usr/bin/env node
// Keyboard shortcuts must go through the host helper, not hand-rolled
// comparisons.
//
// `event.key` holds the character the active layout produces, so
// `(event.ctrlKey) && event.key === 's'` is simply false on a Russian
// keyboard. The bug is invisible to anyone testing on a Latin layout, which is
// why it needs a gate rather than a code review habit.
//
// The check is structural, not a grep for `event.key`: reading event.key is
// fine on its own (Escape, Enter, Tab are layout-independent names). What is
// flagged is a modifier test combined with a character comparison.

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pluginsDir = path.join(root, 'plugins');

// A Ctrl/Cmd test on the same line as a single-character key comparison.
const HAND_ROLLED = /(ctrlKey|metaKey)[\s\S]{0,120}?\.key\s*(?:\.toLowerCase\(\))?\s*===\s*['"].['"]/;
const REVERSED = /\.key\s*(?:\.toLowerCase\(\))?\s*===\s*['"].['"][\s\S]{0,120}?(ctrlKey|metaKey)/;

const violations = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.name.endsWith('.js')) continue;
    const source = fs.readFileSync(full, 'utf8');
    source.split('\n').forEach((line, index) => {
      if (HAND_ROLLED.test(line) || REVERSED.test(line)) {
        violations.push(`${path.relative(root, full)}:${index + 1}: ${line.trim()}`);
      }
    });
  }
}

walk(pluginsDir);

if (violations.length) {
  console.error('❌ hand-rolled keyboard shortcuts found.');
  console.error('   Use api.keys.matches(event, { code: "KeyS", ctrlOrMeta: true }).');
  console.error('   event.key follows the keyboard layout; event.code does not.');
  for (const item of violations) console.error(`   ${item}`);
  process.exit(1);
}

console.log('keyboard shortcuts go through the host helper');
