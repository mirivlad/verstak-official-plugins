#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function frontendSources(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) return frontendSources(target);
    return /\.(?:js|svelte)$/.test(entry.name) ? [target] : [];
  });
}

const files = fs.readdirSync(path.join(root, 'plugins'))
  .flatMap((plugin) => frontendSources(path.join(root, 'plugins', plugin, 'frontend', 'src')));

const renderPatterns = [
  /statusText\s*=/,
  /state\.error\s*=/,
  /errorMsg\s*=/,
  /setStatus\(/,
  /setCreateError\(/,
  /setRenameError\(/,
  /renderEmpty\(/,
  /output\.errors\.push\(/,
  /window\.alert\(/,
  /showExternalFallback\(/,
  /de-error-msg/,
  /files-error-msg/,
  /body\.textContent\s*=/
];

const violations = [];
for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (!/(?:err(?:or)?\.message|String\(err(?:or)?\b)/.test(line)) return;
    if (!renderPatterns.some((pattern) => pattern.test(line))) return;
    violations.push(`${path.relative(root, file)}:${index + 1}: technical error text reaches a user-facing UI sink`);
  });
}

if (violations.length) {
  console.error('User-facing UI must not render raw backend/plugin errors:');
  violations.forEach((violation) => console.error(`  ${violation}`));
  process.exit(1);
}

console.log('user-facing error messages do not expose raw backend details');
