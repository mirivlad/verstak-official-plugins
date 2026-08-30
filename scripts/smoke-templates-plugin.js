#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const manifest = require(path.join(__dirname, '..', 'plugins', 'templates', 'plugin.json'));
const source = fs.readFileSync(path.join(__dirname, '..', 'plugins', 'templates', 'frontend', 'src', 'index.js'), 'utf8');

function assertIncludes(value, expected, message) {
  if (!value.includes(expected)) throw new Error(message + ': missing ' + expected);
}

function assertExcludes(value, expected, message) {
  if (value.includes(expected)) throw new Error(message + ': found ' + expected);
}

if (!(manifest.contributes.settingsPanels || []).some((panel) => panel.id === 'verstak.templates.settings')) {
  throw new Error('Templates settings panel was not declared');
}
if (manifest.contributes.sidebarItems !== undefined) {
  throw new Error('Templates must not contribute a sidebar item');
}
assertIncludes(source, 'data-template-tool', 'Template editor exposes a selectable tool catalog');
assertExcludes(source, 'Workspace plugin IDs (one per line)', 'Template editor must not ask for raw plugin IDs');

let bundle;
global.window = { VerstakPluginRegister(id, definition) { bundle = { id, definition }; } };
new Function(source)();
if (!bundle || bundle.id !== 'verstak.templates') throw new Error('Templates plugin did not register');

let records = [];
const commands = {};
const created = [];
const api = {
  commands: { register(id, handler) { commands[id] = handler; return Promise.resolve(); } },
  storage: { data: {
    readNDJSON() { return Promise.resolve(records); },
    writeNDJSON(_name, rows) { records = rows; return Promise.resolve(); }
  } },
  contributions: { list() { return Promise.resolve([{ pluginId: 'verstak.notes' }, { pluginId: 'verstak.files' }]); } },
  workspaces: { create(parentFolderId, name, recipe) { created.push({ parentFolderId, name, recipe }); return Promise.resolve({ workspaceId: '11111111-1111-4111-8111-111111111111', name }); } }
};

(async () => {
  await bundle.definition.activate(api);
  if (Object.keys(commands).length !== 6) throw new Error('Templates commands were not registered');
  const seeds = await commands['verstak.templates.list']({});
  if (seeds.length !== 5 || !seeds.some((row) => row.name === 'Project')) throw new Error('Seed templates were not persisted');
  const custom = await commands['verstak.templates.create']({ id: 'custom', name: 'Custom', workspaceTools: ['verstak.notes', 'verstak.files'], initialFolders: ['Notes'], initialFiles: [{ path: 'README.md', content: '# Custom' }], toolConfig: { notes: { layout: 'compact' } } });
  const updated = await commands['verstak.templates.update']({ ...custom, name: 'Custom updated', version: 2 });
  if (updated.name !== 'Custom updated') throw new Error('Template update failed');
  const duplicate = await commands['verstak.templates.duplicate']({ id: 'custom' });
  if (duplicate.id === custom.id || duplicate.name !== 'Custom updated (copy)' || duplicate.version !== 1) throw new Error('Template duplicate did not create a new copy');
  if (JSON.stringify(duplicate.workspaceTools) !== JSON.stringify(updated.workspaceTools) || JSON.stringify(duplicate.initialFiles) !== JSON.stringify(updated.initialFiles) || JSON.stringify(duplicate.toolConfig) !== JSON.stringify(updated.toolConfig)) throw new Error('Template duplicate did not copy its recipe');
  await commands['verstak.templates.createDeal']({ templateId: 'custom', name: 'My Deal' });
  if (created.length !== 1 || created[0].recipe.provenance.templateId !== 'custom' || created[0].recipe.workspaceTools.length !== 2) throw new Error('Deal recipe snapshot was not passed through');
  await commands['verstak.templates.update']({ ...updated, workspaceTools: ['verstak.notes'], initialFiles: [], toolConfig: { notes: { layout: 'full' } }, version: 3 });
  const copied = (await commands['verstak.templates.list']({})).find((row) => row.id === duplicate.id);
  if (JSON.stringify(copied.workspaceTools) !== JSON.stringify(['verstak.notes', 'verstak.files']) || copied.initialFiles.length !== 1 || copied.toolConfig.notes.layout !== 'compact') throw new Error('Template copy was coupled to later original changes');
  await commands['verstak.templates.delete']({ id: 'custom' });
  if ((await commands['verstak.templates.list']({})).some((row) => row.id === 'custom')) throw new Error('Template delete failed');
  console.log('templates plugin smoke passed');
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
