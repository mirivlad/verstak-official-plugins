#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const componentPath = path.join(root, 'plugins', 'import', 'frontend', 'src', 'ImportSettings.svelte');
const entryPath = path.join(root, 'plugins', 'import', 'frontend', 'src', 'index.js');
const stylePath = path.join(root, 'plugins', 'import', 'frontend', 'src', 'style.css');
const manifestPath = path.join(root, 'plugins', 'import', 'plugin.json');
const englishPath = path.join(root, 'plugins', 'import', 'locales', 'en.json');
const russianPath = path.join(root, 'plugins', 'import', 'locales', 'ru.json');

if (!fs.existsSync(componentPath)) throw new Error('ImportSettings.svelte is missing');
const component = fs.readFileSync(componentPath, 'utf8');
const entry = fs.readFileSync(entryPath, 'utf8');
const style = fs.readFileSync(stylePath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const english = JSON.parse(fs.readFileSync(englishPath, 'utf8'));
const russian = JSON.parse(fs.readFileSync(russianPath, 'utf8'));

if (!manifest.description || !english['manifest.description'] || !russian['manifest.description']) {
  throw new Error('Importer card description must have a manifest fallback and both translations');
}

for (const selector of [
  'data-import-step="source"', 'data-import-select-directory', 'data-import-select-archive',
  'data-import-analyze', 'data-import-candidate', 'data-import-step="analysis"',
  'data-import-step="structure"', 'data-import-tree', 'data-import-node-type',
  'data-import-node-name', 'data-import-sensitive-warning', 'data-import-step="apply"',
  'data-import-cancel', 'data-import-result',
]) {
  if (!component.includes(selector)) throw new Error(`Importer UI selector is missing: ${selector}`);
}

for (const call of ['selectDirectory()', 'selectArchive()', 'loadAllEntries(', 'applyPlan(', 'onProgress(', 'cancel(', 'closeSource(']) {
  if (!component.includes(call)) throw new Error(`Importer does not use required host API: ${call}`);
}
if (!component.includes('validateEditablePlan') || !component.includes('serializeApplyPlan')) {
  throw new Error('Importer must validate and serialize the reviewed plan');
}
if (!component.includes("write('last-import'") || /write\('last-import',[\s\S]*(?:text|filename|sourcePath)/.test(component)) {
  throw new Error('Importer must persist only a privacy-safe last-import summary');
}
if (!component.includes("tr('ui.sensitiveWarning'")) {
  throw new Error('Importer must always show the general sensitive-content warning');
}
if (!component.includes('window.confirm') || !component.includes('progress?.cancellable')) {
  throw new Error('Importer cancellation must be confirmed and respect cancellable progress');
}
if (!entry.includes('ImportSettings') || !entry.includes('$destroy')) {
  throw new Error('Importer entry must mount and destroy the Svelte settings component');
}
for (const variable of ['--verstak-plugin-surface', '--verstak-plugin-border', '--verstak-plugin-text', '--verstak-plugin-accent']) {
  if (!style.includes(variable)) throw new Error(`Importer style does not use host variable ${variable}`);
}
if (!style.includes('@media (max-width: 760px)')) throw new Error('Importer layout must stack below 760px');

console.log('import plugin smoke passed');
