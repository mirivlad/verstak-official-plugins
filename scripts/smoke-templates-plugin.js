#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'plugins', 'templates', 'frontend', 'src', 'index.js'), 'utf8');
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
  if (Object.keys(commands).length !== 5) throw new Error('Templates commands were not registered');
  const seeds = await commands['verstak.templates.list']({});
  if (seeds.length !== 5 || !seeds.some((row) => row.name === 'Project')) throw new Error('Seed templates were not persisted');
  const custom = await commands['verstak.templates.create']({ id: 'custom', name: 'Custom', workspaceTools: ['verstak.notes', 'verstak.files'], initialFolders: ['Notes'] });
  const updated = await commands['verstak.templates.update']({ ...custom, name: 'Custom updated', version: 2 });
  if (updated.name !== 'Custom updated') throw new Error('Template update failed');
  await commands['verstak.templates.createDeal']({ templateId: 'custom', name: 'My Deal' });
  if (created.length !== 1 || created[0].recipe.provenance.templateId !== 'custom' || created[0].recipe.workspaceTools.length !== 2) throw new Error('Deal recipe snapshot was not passed through');
  await commands['verstak.templates.delete']({ id: 'custom' });
  if ((await commands['verstak.templates.list']({})).some((row) => row.id === 'custom')) throw new Error('Template delete failed');
  console.log('templates plugin smoke passed');
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
