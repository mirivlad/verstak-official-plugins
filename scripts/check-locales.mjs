import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginsRoot = path.join(root, 'plugins');
const contributionFields = {
  views: 'title',
  commands: 'title',
  settingsPanels: 'title',
  sidebarItems: 'title',
  fileActions: 'label',
  noteActions: 'label',
  contextMenuEntries: 'label',
  searchProviders: 'label',
  statusBarItems: 'label',
  openProviders: 'title',
  workspaceItems: 'title',
};
const problems = [];

for (const entry of fs.readdirSync(pluginsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const pluginRoot = path.join(pluginsRoot, entry.name);
  const manifestPath = path.join(pluginRoot, 'plugin.json');
  if (!fs.existsSync(manifestPath)) continue;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const localization = manifest.localization;
  if (!localization || localization.defaultLocale !== 'en') {
    problems.push(`${manifest.id}: localization.defaultLocale must be en`);
    continue;
  }
  if (!localization.locales || !localization.locales.en || !localization.locales.ru) {
    problems.push(`${manifest.id}: en and ru catalogs must be declared`);
    continue;
  }

  const catalogs = {};
  for (const locale of ['en', 'ru']) {
    const relative = localization.locales[locale];
    const catalogPath = path.resolve(pluginRoot, relative);
    if (!catalogPath.startsWith(pluginRoot + path.sep) || !fs.existsSync(catalogPath)) {
      problems.push(`${manifest.id}: missing safe ${locale} catalog at ${relative}`);
      continue;
    }
    try {
      catalogs[locale] = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    } catch (error) {
      problems.push(`${manifest.id}: invalid ${locale} catalog: ${error.message}`);
      continue;
    }
    for (const [key, value] of Object.entries(catalogs[locale])) {
      if (typeof value !== 'string') problems.push(`${manifest.id}: ${locale}.${key} must be a string`);
    }
  }
  if (!catalogs.en || !catalogs.ru) continue;

  const enKeys = Object.keys(catalogs.en).sort();
  const ruKeys = Object.keys(catalogs.ru).sort();
  if (JSON.stringify(enKeys) !== JSON.stringify(ruKeys)) {
    problems.push(`${manifest.id}: en/ru catalog keys differ`);
  }

  const required = ['manifest.name'];
  if (manifest.description) required.push('manifest.description');
  for (const [point, field] of Object.entries(contributionFields)) {
    for (const item of manifest.contributes?.[point] || []) {
      required.push(`contributions.${point}.${item.id}.${field}`);
    }
  }
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(catalogs.en, key)) problems.push(`${manifest.id}: en catalog missing ${key}`);
    if (!Object.prototype.hasOwnProperty.call(catalogs.ru, key)) problems.push(`${manifest.id}: ru catalog missing ${key}`);
  }
}

if (problems.length > 0) {
  problems.forEach((problem) => console.error(`  FAIL ${problem}`));
  process.exit(1);
}
console.log('  OK official plugin locale catalogs are complete and aligned');
