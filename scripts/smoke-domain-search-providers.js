#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');

function fakeDocument() {
  return {
    head: { appendChild() {} },
    getElementById() { return null; },
    createElement() { return { style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }; },
    createTextNode() { return {}; },
  };
}

function loadBundle(name) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'plugins', name, 'plugin.json'), 'utf8'));
  const source = fs.readFileSync(path.join(root, 'plugins', name, manifest.frontend.entry), 'utf8');
  let bundle = null;
  vm.runInNewContext(source, {
    console,
    Date,
    URL,
    document: fakeDocument(),
    window: { VerstakPluginRegister(_id, value) { bundle = value; } },
  }, { filename: `${name}/index.js` });
  if (!bundle || typeof bundle.activate !== 'function') throw new Error(`${name}: background activate() missing`);
  return { manifest, bundle };
}

async function activate(name, api) {
  const { manifest, bundle } = loadBundle(name);
  const handlers = new Map();
  const commandApi = {
    ...api,
    commands: {
      ...(api.commands || {}),
      register: async (id, handler) => {
        handlers.set(id, handler);
        return () => handlers.delete(id);
      },
    },
  };
  await bundle.activate(commandApi);
  for (const provider of (manifest.contributes.searchProviders || [])) {
    if (!handlers.has(provider.handler)) throw new Error(`${name}: provider handler ${provider.handler} was not registered`);
  }
  return { manifest, handlers };
}

function fallbackI18n() {
  return { t(_key, _params, fallback) { return fallback || ''; } };
}

(async () => {
  // Journal: canonical Markdown must beat a stale legacy settings copy.
  const month = [
    '---', 'verstak: worklog', 'version: 1', 'deal: "Project"', 'month: 2026-08', '---', '',
    '# Journal — Project — 2026-08', '', '## 2026-08-16', '', '### Canonical journal entry', '',
    '45 min · non-billable', '', 'Fresh canonical body', '',
    '<!-- verstak-entry {"entryId":"journal:shared","minutes":45,"billable":false} -->', ''
  ].join('\n');
  const journalApi = {
    i18n: fallbackI18n(),
    settings: { read: async () => ({
      'worklog:workspace:Project': [{
        entryId: 'journal:shared', workspaceRootPath: 'Project', date: '2026-08-16',
        title: 'STALE legacy title', summary: 'stale settings body', minutes: 5,
      }],
    }) },
    workspaces: { list: async () => [{ id: 'deal-project', rootPath: 'Project', name: 'Project' }] },
    files: {
      list: async (dir) => dir === 'Project/Журнал'
        ? [{ type: 'file', name: '2026-08.md', relativePath: 'Project/Журнал/2026-08.md' }]
        : [],
      readText: async (file) => file === 'Project/Журнал/2026-08.md' ? month : '',
    },
  };
  const journal = await activate('journal', journalApi);
  const overview = await journal.handlers.get('verstak.journal.provideOverview')({ workspaceRootPath: 'Project' });
  if (!overview.resume || !overview.resume.some((item) => String(item.title).includes('Canonical journal entry'))) {
    throw new Error(`Journal Overview did not read canonical Markdown: ${JSON.stringify(overview)}`);
  }
  if (JSON.stringify(overview).includes('STALE legacy title')) throw new Error('Journal Overview preferred stale settings over canonical Markdown');
  const journalSearch = await journal.handlers.get('verstak.journal.search')({ query: 'canonical body', workspaceRootPath: 'Project', limit: 10 });
  if (!journalSearch.results.some((item) => item.title === 'Canonical journal entry' && item.action?.workspaceItemId === 'verstak.journal.workspace')) {
    throw new Error(`Journal Search did not read canonical Markdown: ${JSON.stringify(journalSearch)}`);
  }

  // Browser: archived is absent; assigned and global captures route differently.
  const browserApi = {
    i18n: fallbackI18n(),
    settings: { read: async () => ({
      'captures:global': [
        { captureId: 'assigned', kind: 'page', title: 'Research Project', url: 'https://example.test/research', workspaceRootPath: 'Project', globalState: 'inbox' },
        { captureId: 'loose', kind: 'selection', title: 'Loose Research', text: 'unassigned material', globalState: 'inbox' },
        { captureId: 'archived', kind: 'page', title: 'Archived Research', globalState: 'archived' },
      ],
    }) },
  };
  const browser = await activate('browser-inbox', browserApi);
  const browserSearch = await browser.handlers.get('verstak.browser-inbox.search')({ query: 'research', limit: 20 });
  if (browserSearch.results.some((item) => item.id === 'archived')) throw new Error('Browser Search exposed archived capture');
  const assigned = browserSearch.results.find((item) => item.id === 'assigned');
  const loose = browserSearch.results.find((item) => item.id === 'loose');
  if (!assigned || assigned.action?.kind !== 'workspace-item' || assigned.action.workspaceRootPath !== 'Project') throw new Error('Browser assigned capture does not route to its Deal');
  if (!loose || loose.action?.kind !== 'view' || loose.action.viewId !== 'verstak.browser-inbox.view') throw new Error('Browser unassigned capture does not route to global Browser view');

  // Activity: canonical raw NDJSON wins; Deal and global activity route correctly.
  const activityApi = {
    i18n: fallbackI18n(),
    settings: { read: async () => ({ 'events:global': [{ activityId: 'stale', title: 'STALE activity' }] }) },
    storage: { data: { readNDJSON: async () => [
      { activityId: 'deal-event', type: 'note.saved', title: 'Research note saved', summary: 'Canonical activity summary', occurredAt: '2026-08-16T10:00:00Z', workspaceRootPath: 'Project', sourcePluginId: 'verstak.notes', payload: {} },
      { activityId: 'global-event', type: 'browser.capture.received', title: 'Research capture received', summary: 'Loose activity', occurredAt: '2026-08-16T09:00:00Z', sourcePluginId: 'verstak.browser-inbox', payload: {} },
    ] } },
  };
  const activity = await activate('activity', activityApi);
  const activitySearch = await activity.handlers.get('verstak.activity.search')({ query: 'research', limit: 20 });
  if (activitySearch.results.some((item) => item.id === 'stale')) throw new Error('Activity Search ignored canonical raw NDJSON');
  const dealEvent = activitySearch.results.find((item) => item.id === 'deal-event');
  const globalEvent = activitySearch.results.find((item) => item.id === 'global-event');
  if (!dealEvent || dealEvent.action?.kind !== 'workspace-item' || dealEvent.action.workspaceItemId !== 'verstak.activity.workspace') throw new Error('Deal Activity result action is wrong');
  if (!globalEvent || globalEvent.action?.kind !== 'view' || globalEvent.action.viewId !== 'verstak.activity.view') throw new Error('Global Activity result action is wrong');

  console.log('domain search providers smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
