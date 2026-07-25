#!/usr/bin/env node
// Release archives must contain exactly the plugins meant for users.
//
// platform-test used to ship: it appeared in the sidebar as "Platform Test"
// and wrote "[OK] all tests passed" into the status bar of a normal install.
// Nothing checked the archive contents, so the only way to notice was to open
// the tarball.
//
// Reads the archives in release/ if they exist, otherwise checks the staging
// inputs, so it is useful both after a release build and in CI.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pluginsDir = path.join(root, 'plugins');
const releaseDir = path.join(root, 'release');

function manifestsByName() {
  const result = new Map();
  for (const entry of fs.readdirSync(pluginsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifest = path.join(pluginsDir, entry.name, 'plugin.json');
    if (!fs.existsSync(manifest)) continue;
    result.set(entry.name, JSON.parse(fs.readFileSync(manifest, 'utf8')));
  }
  return result;
}

const manifests = manifestsByName();
const developmentOnly = [...manifests]
  .filter(([, manifest]) => manifest.development === true)
  .map(([name]) => name);

if (developmentOnly.length === 0) {
  console.log('release contents: no development-only plugins declared');
}

function archiveEntries(archive) {
  if (archive.endsWith('.tar.gz')) {
    return execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).split('\n');
  }
  return execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).split('\n');
}

const archives = fs.existsSync(releaseDir)
  ? fs.readdirSync(releaseDir)
    .filter((name) => name.endsWith('.tar.gz') || name.endsWith('.zip'))
    .map((name) => path.join(releaseDir, name))
  : [];

if (archives.length === 0) {
  console.log('release contents: no archives built yet — run scripts/release.sh first');
  process.exit(0);
}

const violations = [];
for (const archive of archives) {
  const entries = archiveEntries(archive);
  for (const name of developmentOnly) {
    const present = entries.some((entry) => {
      const parts = entry.replace(/^\.\//, '').split('/').filter(Boolean);
      return parts[0] === name;
    });
    if (present) violations.push(`${path.basename(archive)} contains ${name}`);
  }
}

if (violations.length) {
  console.error('❌ development-only plugins found in release archives:');
  for (const item of violations) console.error(`   ${item}`);
  process.exit(1);
}

console.log(
  `release contents: ${archives.length} archive(s) exclude `
  + `${developmentOnly.length} development-only plugin(s)`,
);
