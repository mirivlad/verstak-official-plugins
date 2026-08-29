#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'plugins', 'journal', 'plugin.json');
const sourcePath = path.join(root, 'plugins', 'journal', 'frontend', 'src', 'index.js');
const russianLocalePath = path.join(root, 'plugins', 'journal', 'locales', 'ru.json');

if (!fs.existsSync(manifestPath)) throw new Error('journal plugin manifest missing');
if (!fs.existsSync(sourcePath)) throw new Error('journal frontend entry missing');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const source = fs.readFileSync(sourcePath, 'utf8');
const russianLocale = JSON.parse(fs.readFileSync(russianLocalePath, 'utf8'));

class FakeNode {
  constructor(tagName) {
    this.tagName = String(tagName || '').toUpperCase();
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.className = '';
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.parentNode = null;
    this._textContent = '';
    this._innerHTML = '';
  }

  appendChild(node) {
    this.children.push(node);
    node.parentNode = this;
    return node;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'value') this.value = String(value);
    if (name === 'checked') this.checked = true;
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  addEventListener(type, handler) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(handler);
  }

  dispatchEvent(type, event = {}) {
    (this.listeners[type] || []).forEach((handler) => handler({ target: this, preventDefault() {}, stopPropagation() {}, ...event }));
  }

  click() {
    this.dispatchEvent('click');
  }

  set innerHTML(value) {
    this._innerHTML = String(value || '');
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML + this.children.map((child) => child.innerHTML).join('');
  }

  set textContent(value) {
    this._textContent = String(value || '');
    this.children = [];
  }

  get textContent() {
    if (this.tagName === '#TEXT') return this._textContent;
    return this._textContent + this.children.map((child) => child.textContent).join('');
  }
}

function walk(node, fn) {
  if (fn(node)) return node;
  for (const child of node.children) {
    const found = walk(child, fn);
    if (found) return found;
  }
  return null;
}

function walkAll(node, fn, matches = []) {
  if (fn(node)) matches.push(node);
  for (const child of node.children) walkAll(child, fn, matches);
  return matches;
}

function makeDocument() {
  return {
    body: new FakeNode('body'),
    head: new FakeNode('head'),
    createElement(tagName) {
      return new FakeNode(tagName);
    },
    createTextNode(text) {
      const node = new FakeNode('#text');
      node.textContent = text;
      return node;
    },
    getElementById() {
      return null;
    },
  };
}

function loadComponent(document) {
  const registry = {};
  vm.runInNewContext(source, {
    console,
    Date,
    document,
    window: {
      VerstakPluginRegister(pluginId, bundle) {
        registry[pluginId] = bundle.components || {};
      },
    },
  }, { filename: sourcePath });
  const component = registry['verstak.journal'] && registry['verstak.journal'].JournalView;
  if (!component) throw new Error('JournalView was not registered');
  return component;
}

const ENTRY_MARK = '<!-- verstak-entry ';
const ENTRY_MARK_END = ' -->';

// An outside reader of the file, written on purpose without reusing the
// plugin's own parser: what this recovers is what a person or another program
// can recover from the vault.
function readVaultMonth(content, dealRoot) {
  const found = [];
  let date = '';
  let current = null;
  const finish = () => {
    if (!current) return;
    const body = current.body.slice();
    while (body.length && !body[0].trim()) body.shift();
    if (body.length && /^\d+\s*(?:мин|min)/i.test(body[0].trim())) {
      current.metaLine = body.shift().trim();
    }
    while (body.length && !body[0].trim()) body.shift();
    while (body.length && !body[body.length - 1].trim()) body.pop();
    current.summary = body.join('\n');
    delete current.body;
    found.push(current);
    current = null;
  };
  for (const line of String(content).split('\n')) {
    const title = /^###\s+(.+?)\s*$/.exec(line);
    if (title) {
      finish();
      current = {
        workspaceRootPath: dealRoot,
        date,
        title: title[1],
        minutes: 0,
        billable: false,
        activityIds: [],
        sourceCandidateId: '',
        sourceTodoId: '',
        metaLine: '',
        body: [],
      };
      continue;
    }
    const day = /^##\s+(\d{4}-\d{2}-\d{2})\s*$/.exec(line);
    if (day) {
      finish();
      date = day[1];
      continue;
    }
    if (!current) continue;
    if (line.startsWith(ENTRY_MARK) && line.endsWith(ENTRY_MARK_END)) {
      Object.assign(current, JSON.parse(line.slice(ENTRY_MARK.length, line.length - ENTRY_MARK_END.length)));
      continue;
    }
    current.body.push(line);
  }
  finish();
  return found;
}

// The vault root is a folder that always exists, so a top-level name has no
// parent to look for.
function parentOf(relativePath) {
  const cut = relativePath.lastIndexOf('/');
  return cut === -1 ? '' : relativePath.slice(0, cut);
}

function makeApi(initialSettings = {}, locale = null, proposals = [], initialVault = {}) {
  const settings = { ...initialSettings };
  const vault = { ...initialVault };
  const folders = new Set(['Project', 'Client', 'Archive', 'Clients', 'Clients/2026', 'Clients/2026/Sigma']);
  Object.keys(vault).forEach((path) => folders.add(parentOf(path)));
  // A Deal that has a worklog is a Deal that exists.
  Object.keys(settings)
    .filter((key) => key.startsWith('worklog:workspace:'))
    .forEach((key) => folders.add(decodeURIComponent(key.slice('worklog:workspace:'.length))));
  const writes = [];
  const opened = [];
  const publishedEvents = [];
  const providerCalls = [];
  return {
    publishedEvents,
    providerCalls,
    vault,
    writes,
    opened,
    contributions: {
      list: async (point) => (point === 'worklogProviders' ? [{
        pluginId: 'verstak.activity',
        id: 'verstak.activity.worklog',
        label: 'Activity',
        handler: 'verstak.activity.suggestWorklog',
      }] : []),
    },
    commands: {
      executeFor: async (pluginId, handler, args) => {
        providerCalls.push({ pluginId, handler, args });
        if (handler === 'verstak.activity.assignBrowserActivity') return { status: 'handled', result: { assigned: (args.activityIds || []).length } };
        if (handler === 'verstak.activity.setBrowserActivityRule') return { status: 'handled', result: { saved: true } };
        const workspaceId = args?.scope?.kind === 'deal' ? args.scope.workspaceId : '';
        return {
          status: 'handled',
          result: {
            candidates: proposals.filter((item) => !workspaceId || item.workspaceId === workspaceId),
          },
        };
      },
    },
    settings: {
      read: async (key) => (key ? settings[key] : { ...settings }),
      write: async (key, value) => {
        settings[key] = value;
        return { ...settings };
      },
    },
    events: {
      publish: async (name, payload) => {
        publishedEvents.push({ name, payload });
      },
    },
    files: {
      list: async (relativeDir) => {
        const dir = String(relativeDir || '').replace(/^\/+|\/+$/g, '');
        if (!dir) {
          return [
            { type: 'folder', relativePath: 'Project', name: 'Project' },
            { type: 'folder', relativePath: 'Client', name: 'Client' },
            // A plain folder that is not a Deal, and must never be offered as one.
            { type: 'folder', relativePath: 'Archive', name: 'Archive' },
          ];
        }
        if (!folders.has(dir)) throw new Error(`not-found: ${dir}`);
        return Object.keys(vault)
          .filter((path) => path.startsWith(`${dir}/`) && !path.slice(dir.length + 1).includes('/'))
          .sort()
          .map((path) => ({ type: 'file', relativePath: path, name: path.slice(dir.length + 1) }));
      },
      readText: async (relativePath) => {
        if (!(relativePath in vault)) throw new Error(`not-found: ${relativePath}`);
        return vault[relativePath];
      },
      writeText: async (relativePath, content, options = {}) => {
        const parent = parentOf(relativePath);
        if (parent && !folders.has(parent)) throw new Error(`parent-not-found: ${parent}`);
        if (relativePath in vault && !options.overwrite) throw new Error(`conflict: ${relativePath}`);
        if (!(relativePath in vault) && !options.createIfMissing) throw new Error(`not-found: ${relativePath}`);
        writes.push({ relativePath, options });
        vault[relativePath] = String(content);
      },
      createFolder: async (relativePath) => {
        if (folders.has(relativePath)) throw new Error(`conflict: ${relativePath}`);
        const parent = parentOf(relativePath);
        if (parent && !folders.has(parent)) throw new Error(`parent-not-found: ${parent}`);
        folders.add(relativePath);
      },
    },
    workbench: {
      openResource: async (request) => {
        opened.push(request);
        return { status: 'opened' };
      },
    },
    workspaces: {
      list: async () => [
        { id: 'deal-project', name: 'Project', rootPath: 'Project' },
        { id: 'deal-client', name: 'Client', rootPath: 'Client' },
        // Most Deals live inside a folder, and those were the ones missing.
        { id: 'deal-nested', name: 'Sigma', rootPath: 'Clients/2026/Sigma' },
      ],
    },
    i18n: locale ? {
      getLocale: () => 'ru',
      t(key, params, fallback) {
        return String(locale[key] || fallback || key).replace(/\{(\w+)\}/g, (_match, name) => String((params || {})[name] ?? ''));
      },
    } : null,
    // What the Deal's own files say, read the way anything outside Verstak
    // would read them.
    storedEntries(dealRoot) {
      const prefix = `${dealRoot}/Журнал/`;
      return Object.keys(vault)
        .filter((path) => path.startsWith(prefix))
        .sort()
        .reduce((all, path) => all.concat(readVaultMonth(vault[path], dealRoot)), []);
    },
    settingsSnapshot() {
      return { ...settings };
    },
  };
}

async function flush() {
  for (let i = 0; i < 400; i += 1) await Promise.resolve();
}

async function mountWithApi(api, props = { workspaceId: 'deal-project', workspaceNode: { workspaceId: 'deal-project', name: 'Project' }, workspaceRootPath: 'Project' }, document = makeDocument()) {
  const component = loadComponent(document);
  const container = new FakeNode('div');
  component.mount(container, props, api);
  await flush();
  return { component, container, document };
}

function byData(container, attr, value) {
  const node = walk(container, (candidate) => candidate.getAttribute && candidate.getAttribute(attr) === value);
  if (!node) throw new Error(`${attr}=${value} not found`);
  return node;
}

(async () => {
  if (manifest.id !== 'verstak.journal') throw new Error('journal manifest id mismatch');
  for (const capability of ['worklog', 'journal', 'report.worklog']) {
    if (!manifest.provides.includes(capability)) throw new Error(`journal manifest missing capability ${capability}`);
  }
  if ((manifest.optionalRequires || []).includes('activity.reconstruction')) throw new Error('Journal must remain available without Activity');
  if (!manifest.permissions.includes('storage.namespace')) throw new Error('journal manifest must request storage.namespace');
  if (!manifest.permissions.includes('events.publish')) throw new Error('journal manifest must request events.publish');
  if (!manifest.permissions.includes('ui.register')) throw new Error('journal manifest must request ui.register');
  if (!(manifest.contributes.workspaceItems || []).some((item) => item.component === 'JournalView')) throw new Error('journal workspace item missing');
  if (!(manifest.contributes.sidebarItems || []).some((item) => item.view === 'verstak.journal.view')) throw new Error('journal sidebar item missing');

  const api = makeApi();
  const { component, container } = await mountWithApi(api);
  const projectDeal = 'Project';

  if (walk(container, (node) => node.getAttribute && node.getAttribute('data-journal-action') === 'import-activity')) {
    throw new Error('Journal must not provide direct Activity import');
  }

  byData(container, 'data-journal-action', 'add').click();
  await flush();
  byData(container, 'data-journal-input', 'date').value = '2026-06-27';
  byData(container, 'data-journal-input', 'title').value = 'Draft brief';
  byData(container, 'data-journal-input', 'summary').value = 'Reviewed docs';
  byData(container, 'data-journal-input', 'minutes').value = '45';
  byData(container, 'data-journal-action', 'save-entry').click();
  await flush();

  if (api.storedEntries(projectDeal).length !== 1) throw new Error('manual journal entry was not stored');
  if (api.storedEntries(projectDeal)[0].activityIds.length !== 0) throw new Error('manual journal entry must not require activity links');

  // ── The worklog is a document ─────────────────────────────────────────
  // It lands in the Deal it belongs to, as a month of ordinary Markdown that
  // an editor opens and sync carries, and not in a settings blob under
  // `.verstak`, where it was and where neither could reach it.
  const monthPath = 'Project/Журнал/2026-06.md';
  if (!(monthPath in api.vault)) {
    throw new Error(`the worklog was not written into the Deal: ${JSON.stringify(Object.keys(api.vault))}`);
  }
  if (api.settingsSnapshot()['worklog:workspace:Project']) {
    throw new Error('the worklog must no longer be written into plugin settings');
  }
  const monthText = api.vault[monthPath];
  for (const expected of ['## 2026-06-27', '### Draft brief', '45 min · non-billable', 'Reviewed docs']) {
    if (!monthText.includes(expected)) throw new Error(`the worklog file is not readable prose: ${JSON.stringify(monthText)}`);
  }
  // Saving the journal is the plugin keeping its own records. Unmarked, every
  // save becomes activity, and activity proposes a journal entry about it.
  const journalWrite = api.writes.find((write) => write.relativePath === monthPath);
  if (!journalWrite || journalWrite.options.service !== true) {
    throw new Error(`writing the journal must declare itself bookkeeping: ${JSON.stringify(journalWrite)}`);
  }
  if (!container.textContent.includes('Draft brief')) throw new Error('manual journal entry was not rendered');
  if (!container.textContent.includes('45 min')) throw new Error('manual journal entry minutes were not rendered');

  byData(container, 'data-journal-action', 'edit').click();
  await flush();
  byData(container, 'data-journal-input', 'title').value = 'Draft brief updated';
  byData(container, 'data-journal-input', 'summary').value = 'Reviewed docs and drafted notes';
  byData(container, 'data-journal-input', 'minutes').value = '60';
  byData(container, 'data-journal-action', 'save-entry').click();
  await flush();

  if (api.storedEntries(projectDeal).length !== 1) throw new Error('editing journal entry created a duplicate');
  if (api.storedEntries(projectDeal)[0].title !== 'Draft brief updated') throw new Error('journal entry title was not updated');
  if (!container.textContent.includes('60 min')) throw new Error('edited journal entry minutes were not rendered');

  const candidate = {
    candidateId: 'work-session:Project:capture-1:note-1',
    sessionId: 'session-journal-1',
    handledThrough: '2026-06-27T11:03:00.000Z',
    workspaceRootPath: 'Project',
    workspaceId: 'deal-project',
    startedAt: '2026-06-27T10:12:00.000Z',
    endedAt: '2026-06-27T11:03:00.000Z',
    estimatedMinutes: 51,
    activityCount: 2,
    activityIds: ['capture-1', 'note-1'],
    breakdown: [
      { kind: 'note', count: 1, minutes: 41, sites: [] },
      { kind: 'capture', count: 1, minutes: 10, sites: [] },
    ],
    activities: [
      { activityId: 'capture-1', type: 'browser.capture.selection', occurredAt: '2026-06-27T10:12:00.000Z', sourcePluginId: 'verstak.browser-inbox' },
      { activityId: 'note-1', type: 'note.saved', occurredAt: '2026-06-27T11:03:00.000Z', sourcePluginId: 'verstak.notes' },
    ],
  };
  const candidateView = await mountWithApi(api, {
    workspaceId: 'deal-project', workspaceNode: { workspaceId: 'deal-project', name: 'Project' },
    workspaceRootPath: 'Project',
    toolRequest: { type: 'work-session-candidate', candidate },
  });
  if (!candidateView.container.textContent.includes('Review possible journal entry')) throw new Error('candidate review modal was not opened');
  if (!candidateView.container.textContent.includes('Deal: Project')) throw new Error('candidate Deal was not shown for review');
  if (!candidateView.container.textContent.includes('Estimated duration: 51 min')) throw new Error('candidate duration was not shown for review');
  if (candidateView.container.textContent.includes('browser.capture.selection') || candidateView.container.textContent.includes('verstak.browser-inbox') || candidateView.container.textContent.includes('capture-1')) {
    throw new Error('candidate review exposed technical Activity identifiers');
  }
  // Only the user knows what the work was for, so the title stays theirs to
  // write. The body arrives with what the time actually went on.
  if (byData(candidateView.container, 'data-journal-input', 'title').value !== '') throw new Error('candidate review must start with an empty title');
  const proposedBody = byData(candidateView.container, 'data-journal-input', 'summary').value;
  if (!proposedBody.includes('notes (1) \u2014 41 min') || !proposedBody.includes('saved from the browser (1) \u2014 10 min')) {
    throw new Error(`the proposal did not say what the time went on: ${proposedBody}`);
  }
  if (!proposedBody.includes('51 min in total')) {
    throw new Error(`the proposal did not add its work up: ${proposedBody}`);
  }
  if (byData(candidateView.container, 'data-journal-input', 'minutes').value !== '51') throw new Error('candidate review must prefill the factual duration');
  // Browser time is named by the page it was spent on.
  const pageCandidate = Object.assign({}, candidate, {
    candidateId: 'work-session:page:1',
    activityIds: ['page-1', 'page-2'],
    activities: [
      { activityId: 'page-1', type: 'browser.activity.domain', occurredAt: '2026-06-27T10:12:00.000Z', url: 'https://dash.example.com/projects/42', durationSeconds: 900 },
      // Time recorded before addresses were kept knows only the site.
      { activityId: 'page-2', type: 'browser.activity.domain', occurredAt: '2026-06-27T10:40:00.000Z', hostname: 'fantlab.ru', durationSeconds: 300 },
    ],
  });
  const pageView = await mountWithApi(makeApi(), {
    workspaceId: 'deal-project', workspaceNode: { workspaceId: 'deal-project', name: 'Project' },
    workspaceRootPath: 'Project',
    toolRequest: { type: 'work-session-candidate', candidate: pageCandidate },
  });
  if (!pageView.container.textContent.includes('https://dash.example.com/projects/42')) {
    throw new Error('a proposal must name the page the time was spent on, not just "Activity"');
  }
  if (!pageView.container.textContent.includes('fantlab.ru')) {
    throw new Error('where only the site was recorded, the site still says more than "Activity"');
  }
  // A row that says only the time leaves the user ticking boxes blind.
  if (!pageView.container.textContent.includes('15 min')) {
    throw new Error('each linked activity must say how long it took');
  }
  component.unmount && component.unmount(pageView.container);

  const linkedActivityInputs = walkAll(candidateView.container, (node) => node.getAttribute && node.getAttribute('data-journal-candidate-activity'));
  if (linkedActivityInputs.length !== 2 || linkedActivityInputs.some((node) => node.checked !== true)) throw new Error('candidate activities were not available for review');
  byData(candidateView.container, 'data-journal-input', 'title').value = 'Review research capture';
  byData(candidateView.container, 'data-journal-input', 'summary').value = 'Read the capture and updated the project note.';
  linkedActivityInputs[1].checked = false;
  byData(candidateView.container, 'data-journal-action', 'save-entry').click();
  await flush();

  if (api.storedEntries(projectDeal).length !== 2) throw new Error('reviewed candidate was not saved as a journal entry');
  const linkedEntry = api.storedEntries(projectDeal).find((entry) => entry.sourceCandidateId === candidate.candidateId);
  if (!linkedEntry) throw new Error('candidate reference was not stored on the journal entry');
  if (linkedEntry.title !== 'Review research capture' || linkedEntry.summary !== 'Read the capture and updated the project note.') {
    throw new Error('candidate review did not keep the user-authored entry fields');
  }
  if (linkedEntry.activityIds.join(',') !== 'capture-1') throw new Error('candidate review did not persist selected activity ids');
  const handledEvent = api.publishedEvents.find((event) => event.name === 'activity.session.handled');
  if (!handledEvent || handledEvent.payload.sessionId !== 'session-journal-1' || handledEvent.payload.handledThrough !== '2026-06-27T11:03:00.000Z' || handledEvent.payload.status !== 'accepted') {
    throw new Error('accepted Journal candidate did not persist a session watermark');
  }
  if (walk(candidateView.container, (node) => node.getAttribute && node.getAttribute('data-journal-action') === 'view-activity')) {
    throw new Error('journal rows must not navigate to Activity by default');
  }

  const russianCandidateView = await mountWithApi(makeApi({}, russianLocale), {
    workspaceId: 'deal-project', workspaceNode: { workspaceId: 'deal-project', name: 'Project' },
    workspaceRootPath: 'Project',
    toolRequest: { type: 'work-session-candidate', candidate },
  });
  if (!russianCandidateView.container.textContent.includes('Дело: Project') || !russianCandidateView.container.textContent.includes('Захвачено выделение')) {
    throw new Error('candidate review was not localized');
  }

  byData(candidateView.container, 'data-journal-action', 'delete').click();
  await flush();
  if (api.storedEntries(projectDeal).length !== 1) throw new Error('journal entry was not deleted');

  const completedTodo = {
    id: 'todo:Project:project-review',
    title: 'Prepare project review',
    description: 'Collect factual review notes.',
    workspaceRootPath: 'Project',
    completedAt: '2026-06-27T11:15:00.000Z',
  };
  const todoView = await mountWithApi(api, {
    workspaceNode: { name: 'Project' },
    workspaceRootPath: 'Project',
    toolRequest: { type: 'completed-todo', todo: completedTodo },
  });
  if (!todoView.container.textContent.includes('Create journal entry from completed todo')) {
    throw new Error('completed Todo did not open the Journal conversion form');
  }
  if (!byData(todoView.container, 'data-journal-todo', completedTodo.id)) {
    throw new Error('completed Todo context was not shown in the Journal form');
  }
  if (byData(todoView.container, 'data-journal-input', 'title').value !== completedTodo.title) {
    throw new Error('completed Todo Journal form did not prefill the exact title');
  }
  if (byData(todoView.container, 'data-journal-input', 'summary').value !== completedTodo.description) {
    throw new Error('completed Todo Journal form did not prefill the exact description');
  }
  if (byData(todoView.container, 'data-journal-input', 'minutes').value !== '0') {
    throw new Error('completed Todo Journal form must not invent a duration');
  }
  byData(todoView.container, 'data-journal-input', 'title').value = 'Prepare project review for handoff';
  byData(todoView.container, 'data-journal-input', 'summary').value = 'Reviewed factual project notes before handoff.';
  byData(todoView.container, 'data-journal-action', 'save-entry').click();
  await flush();

  if (api.storedEntries(projectDeal).length !== 2) throw new Error('completed Todo Journal entry was not saved');
  const todoEntry = api.storedEntries(projectDeal).find((entry) => entry.sourceTodoId === completedTodo.id);
  if (!todoEntry) throw new Error('completed Todo reference was not stored on the Journal entry');
  if (todoEntry.title !== 'Prepare project review for handoff' || todoEntry.summary !== 'Reviewed factual project notes before handoff.') {
    throw new Error('completed Todo Journal form did not preserve the user-edited fields');
  }

  const duplicateTodoView = await mountWithApi(api, {
    workspaceNode: { name: 'Project' },
    workspaceRootPath: 'Project',
    toolRequest: { type: 'completed-todo', todo: completedTodo },
  });
  byData(duplicateTodoView.container, 'data-journal-action', 'save-entry').click();
  await flush();
  if (api.storedEntries(projectDeal).filter((entry) => entry.sourceTodoId === completedTodo.id).length !== 1) {
    throw new Error('completed Todo Journal conversion created a duplicate entry');
  }

  const globalView = await mountWithApi(api, {});
  if (!globalView.container.textContent.includes('Review research capture') && !globalView.container.textContent.includes('Draft brief updated')) {
    throw new Error('global journal did not aggregate remaining entries');
  }
  const globalAdd = byData(globalView.container, 'data-journal-action', 'add');
  if (globalAdd.disabled) throw new Error('global Journal Add must be available');
  globalAdd.click();
  await flush();
  const globalWorkspace = byData(globalView.container, 'data-journal-input', 'workspaceRootPath');
  if (!globalWorkspace || globalWorkspace.tagName !== 'SELECT') throw new Error('global Journal form did not render the Deal selector');
  // Deals, not folders, and at whatever depth they live.
  const offeredDeals = globalWorkspace.children.map((option) => option.getAttribute('value'));
  if (offeredDeals.indexOf('Clients/2026/Sigma') === -1) {
    throw new Error(`a Deal inside a folder must be offered: ${JSON.stringify(offeredDeals)}`);
  }
  if (offeredDeals.indexOf('Archive') !== -1) {
    throw new Error('a folder that is not a Deal must not be offered as one');
  }
  globalWorkspace.value = 'Client';
  byData(globalView.container, 'data-journal-input', 'title').value = 'Prepare client summary';
  byData(globalView.container, 'data-journal-input', 'minutes').value = '30';
  byData(globalView.container, 'data-journal-action', 'save-entry').click();
  await flush();
  const clientDeal = 'Client';
  if (api.storedEntries(clientDeal).length !== 1 || api.storedEntries(clientDeal)[0].title !== 'Prepare client summary') {
    throw new Error('global Journal entry was not stored under the selected Deal');
  }
  if (!globalView.container.textContent.includes('Prepare client summary')) throw new Error('global Journal did not render the created entry');

  // ── Filters, and editing outside a single Deal ────────────────────────
  // A journal you cannot narrow is a pile, and a global one you cannot edit in
  // is a report. Both were the case.
  const filterApi = makeApi({
    'worklog:workspace:Alpha': [
      { entryId: 'a-manual', workspaceRootPath: 'Alpha', date: '2026-07-01', title: 'Alpha by hand', minutes: 30, billable: true },
      { entryId: 'a-proposal', workspaceRootPath: 'Alpha', date: '2026-07-02', title: 'Alpha from proposal', minutes: 15, billable: false, sourceCandidateId: 'work-session:x' },
    ],
    'worklog:workspace:Beta': [
      { entryId: 'b-todo', workspaceRootPath: 'Beta', date: '2026-07-03', title: 'Beta from todo', minutes: 45, billable: true, sourceTodoId: 'todo-1' },
    ],
  });
  const filterView = await mountWithApi(filterApi, {});
  const titles = () => {
    const found = [];
    walk(filterView.container, (node) => {
      if (node.getAttribute && node.getAttribute('data-journal-entry')) found.push(node.textContent);
      return false;
    });
    return found.join(' | ');
  };
  const totalText = () => byData(filterView.container, 'data-journal-total', '').textContent;

  if (!titles().includes('Alpha by hand') || !titles().includes('Beta from todo')) {
    throw new Error('the global Journal must list entries from every Deal');
  }
  if (!totalText().includes('90')) throw new Error(`total should be 90 minutes, got ${totalText()}`);

  const dealFilter = byData(filterView.container, 'data-journal-filter-deal', '');
  if (!dealFilter) throw new Error('the global Journal has no Deal filter');
  dealFilter.value = 'Alpha';
  dealFilter.dispatchEvent('change');
  if (titles().includes('Beta from todo')) throw new Error('the Deal filter did not narrow the list');
  if (!totalText().includes('45')) throw new Error(`Alpha totals 45 minutes, got ${totalText()}`);

  dealFilter.value = '';
  dealFilter.dispatchEvent('change');
  const billableFilter = byData(filterView.container, 'data-journal-filter-billable', '');
  billableFilter.value = 'billable';
  billableFilter.dispatchEvent('change');
  if (titles().includes('Alpha from proposal')) throw new Error('the billable filter kept a non-billable entry');
  if (!totalText().includes('75')) throw new Error(`billable work totals 75 minutes, got ${totalText()}`);

  billableFilter.value = 'all';
  billableFilter.dispatchEvent('change');
  const sourceFilter = byData(filterView.container, 'data-journal-filter-source', '');
  sourceFilter.value = 'proposal';
  sourceFilter.dispatchEvent('change');
  if (!titles().includes('Alpha from proposal') || titles().includes('Alpha by hand') || titles().includes('Beta from todo')) {
    throw new Error(`the source filter did not isolate entries made from a proposal: ${titles()}`);
  }
  sourceFilter.value = 'todo';
  sourceFilter.dispatchEvent('change');
  if (!titles().includes('Beta from todo') || titles().includes('Alpha by hand')) {
    throw new Error('the source filter did not isolate entries made from a todo');
  }
  sourceFilter.value = 'manual';
  sourceFilter.dispatchEvent('change');
  if (!titles().includes('Alpha by hand') || titles().includes('Alpha from proposal')) {
    throw new Error('the source filter did not isolate hand-written entries');
  }

  sourceFilter.value = 'all';
  sourceFilter.dispatchEvent('change');
  const editButton = walk(filterView.container, (node) => node.getAttribute && node.getAttribute('data-journal-action') === 'edit');
  if (!editButton) throw new Error('entries cannot be edited outside a single Deal');
  const deleteButton = walk(filterView.container, (node) => node.getAttribute && node.getAttribute('data-journal-action') === 'delete');
  if (!deleteButton) throw new Error('entries cannot be deleted outside a single Deal');

  // The button existing is not the same as it working: an entry is stored under
  // its own Deal, which in the global Journal is not the one being looked at.
  const betaRow = byData(filterView.container, 'data-journal-entry', 'b-todo');
  walk(betaRow, (node) => node.getAttribute && node.getAttribute('data-journal-action') === 'delete').click();
  await flush();
  if (filterApi.storedEntries('Beta').length !== 0) {
    throw new Error('deleting from the global Journal did not reach the entry\'s own Deal');
  }
  if (filterApi.storedEntries('Alpha').length !== 2) {
    throw new Error('deleting one entry disturbed another Deal');
  }
  if (titles().includes('Beta from todo')) throw new Error('the deleted entry is still listed');

  component.unmount && component.unmount(filterView.container);

  // Proposals. The Journal asks whoever declares a worklogProviders
  // contribution, so it lists possible entries with no Activity view on screen
  // -- which is the only situation the user is ever in while reading the
  // Journal.
  const projectProposal = {
    candidateId: 'work-session:project:1',
    sessionId: 'session-project-1',
    handledThrough: '2026-07-20T09:20:00.000Z',
    workspaceRootPath: 'Project',
    workspaceId: 'deal-project',
    startedAt: '2026-07-20T09:00:00.000Z',
    endedAt: '2026-07-20T09:20:00.000Z',
    estimatedMinutes: 25,
    activityCount: 2,
    breakdown: [
      { kind: 'browser', count: 1, minutes: 18, sites: ['dash.example.com'] },
      { kind: 'note', count: 1, minutes: 7, sites: [] },
    ],
    activityIds: ['p-a', 'p-b'],
    activities: [
      { activityId: 'p-a', type: 'note.saved', occurredAt: '2026-07-20T09:00:00.000Z', sourcePluginId: 'verstak.notes' },
      { activityId: 'p-b', type: 'file.updated', occurredAt: '2026-07-20T09:20:00.000Z', sourcePluginId: 'verstak.files' },
    ],
  };
  const clientProposal = Object.assign({}, projectProposal, {
    candidateId: 'work-session:client:1',
    sessionId: 'session-client-1',
    workspaceRootPath: 'Client',
    workspaceId: 'deal-client',
    estimatedMinutes: 40,
    activityIds: ['c-a', 'c-b'],
    activities: [
      { activityId: 'c-a', type: 'note.saved', occurredAt: '2026-07-20T11:00:00.000Z', sourcePluginId: 'verstak.notes' },
      { activityId: 'c-b', type: 'file.updated', occurredAt: '2026-07-20T11:40:00.000Z', sourcePluginId: 'verstak.files' },
    ],
  });
  const proposalApi = makeApi({}, null, [projectProposal, clientProposal]);
  const proposalView = await mountWithApi(proposalApi, {});
  const proposalIds = () => walkAll(proposalView.container, (node) => node.getAttribute && node.getAttribute('data-journal-proposal'))
    .map((node) => node.getAttribute('data-journal-proposal'));
  if (proposalIds().length !== 2) throw new Error(`the global Journal must list proposals from every Deal, listed ${JSON.stringify(proposalIds())}`);
  if (!proposalApi.providerCalls.some((call) => call.pluginId === 'verstak.activity' && call.handler === 'verstak.activity.suggestWorklog')) {
    throw new Error('the Journal did not ask the declared worklog provider');
  }
  const projectRow = byData(proposalView.container, 'data-journal-proposal', projectProposal.candidateId);
  if (!projectRow.textContent.includes('25 min')) throw new Error('a proposal must show the time it accounts for');
  if (!projectRow.textContent.includes('Project')) throw new Error('a proposal must show which Deal it belongs to');
  // "25 min" alone leaves the user to remember what those minutes were.
  const proposalBreakdown = walk(projectRow, (node) => node.getAttribute && node.getAttribute('data-journal-proposal-breakdown') === '');
  if (!proposalBreakdown) throw new Error('a proposal does not say what the time went on');
  if (!proposalBreakdown.textContent.includes('browser: dash.example.com \u2014 18 min')) {
    throw new Error(`the breakdown must name the sites: ${proposalBreakdown.textContent}`);
  }
  if (!proposalBreakdown.textContent.includes('notes (1) \u2014 7 min')) {
    throw new Error(`the breakdown must name the other work: ${proposalBreakdown.textContent}`);
  }

  const proposalDealFilter = byData(proposalView.container, 'data-journal-filter-deal', '');
  proposalDealFilter.value = 'Client';
  proposalDealFilter.dispatchEvent('change');
  if (proposalIds().join(',') !== clientProposal.candidateId) {
    throw new Error(`the Deal filter must narrow proposals too, listed ${JSON.stringify(proposalIds())}`);
  }
  const proposalSourceFilter = byData(proposalView.container, 'data-journal-filter-source', '');
  proposalSourceFilter.value = 'manual';
  proposalSourceFilter.dispatchEvent('change');
  if (proposalIds().length !== 0) throw new Error('proposals are not hand-written entries and must not survive that filter');
  proposalSourceFilter.value = 'all';
  proposalSourceFilter.dispatchEvent('change');
  proposalDealFilter.value = '';
  proposalDealFilter.dispatchEvent('change');

  const reviewButton = walk(byData(proposalView.container, 'data-journal-proposal', projectProposal.candidateId), (node) => (
    node.getAttribute && node.getAttribute('data-journal-action') === 'review-proposal'
  ));
  if (!reviewButton) throw new Error('a proposal cannot be turned into an entry');
  reviewButton.click();
  await flush();
  if (byData(proposalView.container, 'data-journal-input', 'workspaceRootPath').value !== 'Project') {
    throw new Error("reviewing a proposal in the global Journal must keep the proposal's own Deal");
  }
  byData(proposalView.container, 'data-journal-input', 'title').value = 'Session from a proposal';
  byData(proposalView.container, 'data-journal-action', 'save-entry').click();
  await flush();
  const proposalEntries = proposalApi.storedEntries('Project');
  if (proposalEntries.length !== 1 || proposalEntries[0].sourceCandidateId !== projectProposal.candidateId) {
    throw new Error('a reviewed proposal was not stored against its own Deal');
  }
  if (proposalIds().indexOf(projectProposal.candidateId) !== -1) {
    throw new Error('a proposal that became an entry must leave the proposal list');
  }
  component.unmount && component.unmount(proposalView.container);

  // A guessed Deal is asked about, not asserted, and the answer teaches a rule
  // so the same question is not asked again tomorrow.
  const guessedProposal = Object.assign({}, projectProposal, {
    candidateId: 'work-session:guessed:1',
    guessed: true,
    guessedActivityIds: ['p-a'],
    breakdown: [{ kind: 'browser', count: 1, minutes: 25, sites: ['dash.example.com'] }],
    activities: [
      { activityId: 'p-a', type: 'browser.activity.domain', occurredAt: '2026-07-20T09:00:00.000Z', url: 'https://dash.example.com/projects/42' },
      { activityId: 'p-b', type: 'file.updated', occurredAt: '2026-07-20T09:20:00.000Z' },
    ],
  });
  const guessApi = makeApi({}, null, [guessedProposal]);
  const guessView = await mountWithApi(guessApi, {});
  const guessRow = byData(guessView.container, 'data-journal-proposal', guessedProposal.candidateId);
  if (!walk(guessRow, (node) => node.getAttribute && node.getAttribute('data-journal-action') === 'confirm-guess')) {
    throw new Error('a guessed proposal must offer the Deal it guessed');
  }
  if (!walk(guessRow, (node) => node.getAttribute && node.getAttribute('data-journal-action') === 'reassign-guess')) {
    throw new Error('a guessed proposal must offer another Deal');
  }
  const notWorkButton = walk(guessRow, (node) => node.getAttribute && node.getAttribute('data-journal-action') === 'not-work');
  if (!notWorkButton) throw new Error('a guessed proposal must offer "not work"');
  if (!guessRow.textContent.includes('Yes, Project')) throw new Error('the guessed Deal must be named on the button');

  notWorkButton.click();
  await flush();
  const notWorkCall = guessApi.providerCalls.find((call) => call.handler === 'verstak.activity.assignBrowserActivity');
  if (!notWorkCall || notWorkCall.args.notWork !== true) throw new Error('"not work" did not reach the record');
  if (notWorkCall.args.assignedBy !== 'user') throw new Error('an answer must be recorded as the user\'s own');
  const notWorkRule = guessApi.providerCalls.find((call) => call.handler === 'verstak.activity.setBrowserActivityRule');
  // The page, not the site: teaching a whole site from one page would quietly
  // claim every other page on it. Activity normalizes the address it stores.
  if (!notWorkRule || notWorkRule.args.pattern !== 'https://dash.example.com/projects/42' || notWorkRule.args.notWork !== true) {
    throw new Error(`the answer must teach a rule about the address: ${JSON.stringify(notWorkRule && notWorkRule.args)}`);
  }
  component.unmount && component.unmount(guessView.container);

  // Choosing another Deal teaches that Deal instead.
  const pickApi = makeApi({}, null, [guessedProposal]);
  const pickView = await mountWithApi(pickApi, {});
  walk(byData(pickView.container, 'data-journal-proposal', guessedProposal.candidateId),
    (node) => node.getAttribute && node.getAttribute('data-journal-action') === 'reassign-guess').click();
  await flush();
  const dealPicker = byData(pickView.container, 'data-journal-proposal-deal', '');
  dealPicker.value = 'Client';
  byData(pickView.container, 'data-journal-action', 'save-proposal-deal').click();
  await flush();
  const pickedCall = pickApi.providerCalls.find((call) => call.handler === 'verstak.activity.assignBrowserActivity');
  if (!pickedCall || pickedCall.args.workspaceRootPath !== 'Client') {
    throw new Error(`choosing another Deal must reach the record: ${JSON.stringify(pickedCall && pickedCall.args)}`);
  }
  const pickedRule = pickApi.providerCalls.find((call) => call.handler === 'verstak.activity.setBrowserActivityRule');
  if (!pickedRule || pickedRule.args.workspaceRootPath !== 'Client') {
    throw new Error('choosing another Deal must teach that Deal');
  }
  component.unmount && component.unmount(pickView.container);

  // ── The worklog that was already there ────────────────────────────────
  // Everything written before this version is in plugin settings. It is copied
  // into the Deal once, and the settings copy is left alone -- but it is never
  // read again, or deleting an entry would only bring it back at next start.
  const legacySettings = {
    'worklog:workspace:Project': [
      { entryId: 'old-1', workspaceRootPath: 'Project', date: '2026-05-04', title: 'Kickoff call', summary: 'Agreed the scope.', minutes: 60, billable: true },
      { entryId: 'old-2', workspaceRootPath: 'Project', date: '2026-06-11', title: 'Second month', minutes: 20, billable: false },
    ],
  };
  const migrateApi = makeApi(legacySettings);
  const migrateView = await mountWithApi(migrateApi, { workspaceNode: { name: 'Project' }, workspaceRootPath: 'Project' });
  const migrated = migrateApi.storedEntries('Project');
  if (migrated.length !== 2) {
    throw new Error(`the worklog already written was not moved into the Deal: ${JSON.stringify(Object.keys(migrateApi.vault))}`);
  }
  if (!('Project/Журнал/2026-05.md' in migrateApi.vault) || !('Project/Журнал/2026-06.md' in migrateApi.vault)) {
    throw new Error('each month belongs in its own file');
  }
  const kickoff = migrated.find((entry) => entry.entryId === 'old-1');
  if (!kickoff || kickoff.title !== 'Kickoff call' || kickoff.minutes !== 60 || kickoff.billable !== true || kickoff.summary !== 'Agreed the scope.') {
    throw new Error(`the moved entry lost something: ${JSON.stringify(kickoff)}`);
  }
  if (!migrateApi.settingsSnapshot()['worklog:workspace:Project']) {
    throw new Error('the copy that was already there must not be deleted to make the move look tidy');
  }
  byData(migrateView.container, 'data-journal-entry', 'old-2');
  walk(byData(migrateView.container, 'data-journal-entry', 'old-2'), (node) => node.getAttribute && node.getAttribute('data-journal-action') === 'delete').click();
  await flush();
  const afterDelete = await mountWithApi(migrateApi, { workspaceNode: { name: 'Project' }, workspaceRootPath: 'Project' });
  if (afterDelete.container.textContent.includes('Second month')) {
    throw new Error('a deleted entry came back from the settings copy at the next start');
  }
  component.unmount && component.unmount(migrateView.container);
  component.unmount && component.unmount(afterDelete.container);

  // ── The file is the user's too ────────────────────────────────────────
  // A worklog kept in a Deal can be opened in any editor. An entry written
  // there by hand is a journal entry, and a correction made there is the truth.
  const handWritten = [
    '---',
    'verstak: worklog',
    'version: 1',
    'deal: "Project"',
    'month: 2026-04',
    '---',
    '',
    '# Журнал',
    '',
    '## 2026-04-02',
    '',
    '### Wrote this in vim',
    '',
    '90 min · billable',
    '',
    'No comment, no ids, still an entry.',
    '',
  ].join('\n');
  const handApi = makeApi({}, null, [], { 'Project/Журнал/2026-04.md': handWritten });
  const handView = await mountWithApi(handApi, { workspaceNode: { name: 'Project' }, workspaceRootPath: 'Project' });
  const handRow = walk(handView.container, (node) => (
    node.getAttribute && node.getAttribute('data-journal-entry') && node.textContent.includes('Wrote this in vim')
  ));
  if (!handRow) throw new Error('an entry written into the file by hand must be read as an entry');
  const handMinutes = walk(handRow, (node) => node.className === 'journal-minutes');
  if (!handMinutes || handMinutes.textContent !== '90 min') {
    throw new Error(`what the file says the work took is what the work took, got ${JSON.stringify(handMinutes && handMinutes.textContent)}`);
  }
  const handSummary = walk(handRow, (node) => node.className === 'journal-summary');
  if (!handSummary || handSummary.textContent !== 'No comment, no ids, still an entry.') {
    throw new Error(`the body written by hand was not read back exactly: ${JSON.stringify(handSummary && handSummary.textContent)}`);
  }
  component.unmount && component.unmount(handView.container);

  // Prose that looks like structure stays prose. A body with its own heading
  // used to reappear as a separate entry with the rest of the text inside it.
  const proseApi = makeApi();
  const proseView = await mountWithApi(proseApi, { workspaceNode: { name: 'Project' }, workspaceRootPath: 'Project' });
  byData(proseView.container, 'data-journal-action', 'add').click();
  await flush();
  byData(proseView.container, 'data-journal-input', 'date').value = '2026-08-03';
  byData(proseView.container, 'data-journal-input', 'title').value = 'Wrote the report';
  byData(proseView.container, 'data-journal-input', 'summary').value = '### Findings\nTwo of them.';
  byData(proseView.container, 'data-journal-input', 'minutes').value = '25';
  byData(proseView.container, 'data-journal-action', 'save-entry').click();
  await flush();
  const proseEntries = proseApi.storedEntries('Project');
  if (proseEntries.length !== 1) {
    throw new Error(`a heading inside a body became a second entry: ${JSON.stringify(proseEntries.map((entry) => entry.title))}`);
  }
  if (proseEntries[0].summary !== '\\### Findings\nTwo of them.') {
    throw new Error(`a heading inside a body must be escaped in the file: ${JSON.stringify(proseEntries[0].summary)}`);
  }
  const reread = await mountWithApi(proseApi, { workspaceNode: { name: 'Project' }, workspaceRootPath: 'Project' });
  if (!reread.container.textContent.includes('### Findings')) {
    throw new Error('the escaped heading did not come back as the user wrote it');
  }
  component.unmount && component.unmount(proseView.container);
  component.unmount && component.unmount(reread.container);

  // ── The report ────────────────────────────────────────────────────────
  // The worklog answers what was done. This answers what to bill, from the
  // same entries and the same filters, and writes it where an invoice can be
  // built from it.
  function monthFile(deal, month, rows) {
    const lines = ['---', 'verstak: worklog', 'version: 1', `deal: "${deal}"`, `month: ${month}`, '---', '', '# Журнал', ''];
    let lastDate = '';
    for (const row of rows) {
      if (row.date !== lastDate) {
        lines.push(`## ${row.date}`, '');
        lastDate = row.date;
      }
      lines.push(`### ${row.title}`, '');
      lines.push(`${row.minutes} min · ${row.billable ? 'billable' : 'non-billable'}`, '');
      lines.push(`${ENTRY_MARK}${JSON.stringify({ entryId: row.entryId, minutes: row.minutes, billable: row.billable })}${ENTRY_MARK_END}`, '');
    }
    return lines.join('\n');
  }

  const reportApi = makeApi({}, null, [], {
    'Project/Журнал/2026-05.md': monthFile('Project', '2026-05', [
      { entryId: 'r-old', date: '2026-05-30', title: 'Last month work', minutes: 30, billable: true },
    ]),
    'Project/Журнал/2026-06.md': monthFile('Project', '2026-06', [
      { entryId: 'r-1', date: '2026-06-01', title: 'Kickoff', minutes: 90, billable: true },
      { entryId: 'r-2', date: '2026-06-01', title: 'Notes', minutes: 30, billable: false },
      { entryId: 'r-3', date: '2026-06-15', title: 'Review', minutes: 45, billable: true },
    ]),
    'Client/Журнал/2026-06.md': monthFile('Client', '2026-06', [
      { entryId: 'r-4', date: '2026-06-10', title: 'Client call', minutes: 60, billable: true },
    ]),
  });
  const reportView = await mountWithApi(reportApi, {});
  const reportToggle = byData(reportView.container, 'data-journal-action', 'toggle-report');
  if (byData(reportView.container, 'data-journal-report', '').getAttribute('hidden') !== 'hidden') {
    throw new Error('the Journal must open on its entries, not on a report');
  }
  reportToggle.click();
  await flush();
  const reportRoot = byData(reportView.container, 'data-journal-report', '');
  if (reportRoot.getAttribute('hidden') === 'hidden') throw new Error('the report did not open');

  const totalFigure = walk(reportRoot, (node) => node.getAttribute && node.getAttribute('data-journal-report-total'));
  if (!totalFigure || totalFigure.getAttribute('data-journal-report-total') !== '255') {
    throw new Error(`the report must add up every entry in view: ${totalFigure && totalFigure.getAttribute('data-journal-report-total')}`);
  }
  const billableFigure = walk(reportRoot, (node) => node.getAttribute && node.getAttribute('data-journal-report-billable'));
  if (!billableFigure || billableFigure.getAttribute('data-journal-report-billable') !== '225') {
    throw new Error(`what is billable is counted apart: ${billableFigure && billableFigure.getAttribute('data-journal-report-billable')}`);
  }
  if (!totalFigure.textContent.includes('4 h 15 min')) {
    throw new Error(`255 minutes is four and a quarter hours, not "${totalFigure.textContent}"`);
  }
  const projectBlock = byData(reportRoot, 'data-journal-report-deal', 'Project');
  const clientBlock = byData(reportRoot, 'data-journal-report-deal', 'Client');
  if (walk(projectBlock, (node) => node.getAttribute && node.getAttribute('data-journal-report-deal-total')).getAttribute('data-journal-report-deal-total') !== '195') {
    throw new Error('a Deal must add up its own time');
  }
  if (!clientBlock.textContent.includes('Client call')) throw new Error('the report must name the work, not only the hours');
  // Most time first: the Deal that took the month is the one being asked about.
  if (reportRoot.children.indexOf(projectBlock) > reportRoot.children.indexOf(clientBlock)) {
    throw new Error('the Deal that took the most time belongs at the top');
  }

  // A period is the question a worklog is usually asked.
  const periodFilter = byData(reportView.container, 'data-journal-filter-period', '');
  periodFilter.value = 'custom';
  periodFilter.dispatchEvent('change');
  await flush();
  byData(reportView.container, 'data-journal-filter-from', '').value = '2026-06-01';
  byData(reportView.container, 'data-journal-filter-from', '').dispatchEvent('change');
  await flush();
  byData(reportView.container, 'data-journal-filter-to', '').value = '2026-06-30';
  byData(reportView.container, 'data-journal-filter-to', '').dispatchEvent('change');
  await flush();
  const narrowedRoot = byData(reportView.container, 'data-journal-report', '');
  const narrowedTotal = walk(narrowedRoot, (node) => node.getAttribute && node.getAttribute('data-journal-report-total'));
  if (narrowedTotal.getAttribute('data-journal-report-total') !== '225') {
    throw new Error(`the period must leave May out: ${narrowedTotal.getAttribute('data-journal-report-total')}`);
  }
  if (narrowedRoot.textContent.includes('Last month work')) throw new Error('an entry outside the period is still in the report');

  walk(narrowedRoot, (node) => node.getAttribute && node.getAttribute('data-journal-action') === 'export-markdown').click();
  await flush();
  // Across Deals the report belongs to nobody in particular, so it goes to the
  // vault's own reports folder.
  const markdownPath = 'Отчёты/Отчёт 2026-06-01 - 2026-06-30.md';
  if (!(markdownPath in reportApi.vault)) {
    throw new Error(`the report was not saved: ${JSON.stringify(Object.keys(reportApi.vault))}`);
  }
  const savedReport = reportApi.vault[markdownPath];
  for (const expected of ['# Worklog report — 2026-06-01 — 2026-06-30', '## Project — 2 h 45 min', '| 2026-06-15 | Review | 45 min | yes |', '## Client — 1 h']) {
    if (!savedReport.includes(expected)) throw new Error(`the saved report is missing ${JSON.stringify(expected)}: ${savedReport}`);
  }
  if (savedReport.includes('Last month work')) throw new Error('the saved report ignored the period');
  const reportWrite = reportApi.writes.find((write) => write.relativePath === markdownPath);
  if (reportWrite.options.service === true) {
    throw new Error('a report is a document the user asked for, not the plugin keeping its own records');
  }
  if (!reportApi.opened.some((request) => request.path === markdownPath)) {
    throw new Error('the report that was just written should open');
  }

  walk(narrowedRoot, (node) => node.getAttribute && node.getAttribute('data-journal-action') === 'export-csv').click();
  await flush();
  const csvPath = 'Отчёты/Отчёт 2026-06-01 - 2026-06-30.csv';
  const savedCsv = reportApi.vault[csvPath];
  if (!savedCsv) throw new Error('a worklog nobody can put in a spreadsheet is half a report');
  if (savedCsv.split('\n')[0] !== '"Deal","Date","Title","Minutes","Billable"') {
    throw new Error(`unexpected CSV header: ${savedCsv.split('\n')[0]}`);
  }
  if (!savedCsv.includes('"Project","2026-06-15","Review",45,"yes"')) {
    throw new Error(`unexpected CSV rows: ${savedCsv}`);
  }
  component.unmount && component.unmount(reportView.container);

  // In one Deal, the report is that Deal's and belongs beside its journal.
  const dealReportApi = makeApi({}, null, [], {
    'Project/Журнал/2026-06.md': monthFile('Project', '2026-06', [
      { entryId: 'd-1', date: '2026-06-02', title: 'Only this Deal', minutes: 120, billable: true },
    ]),
    'Client/Журнал/2026-06.md': monthFile('Client', '2026-06', [
      { entryId: 'd-2', date: '2026-06-02', title: 'Someone else', minutes: 15, billable: true },
    ]),
  });
  const dealReportView = await mountWithApi(dealReportApi, { workspaceNode: { name: 'Project' }, workspaceRootPath: 'Project' });
  byData(dealReportView.container, 'data-journal-action', 'toggle-report').click();
  await flush();
  const dealReportRoot = byData(dealReportView.container, 'data-journal-report', '');
  if (dealReportRoot.textContent.includes('Someone else')) {
    throw new Error("a Deal's report must not count another Deal's work");
  }
  walk(dealReportRoot, (node) => node.getAttribute && node.getAttribute('data-journal-action') === 'export-markdown').click();
  await flush();
  if (!('Project/Журнал/Отчёт 2026-06-02.md' in dealReportApi.vault)) {
    throw new Error(`a Deal's report belongs beside its journal: ${JSON.stringify(Object.keys(dealReportApi.vault))}`);
  }
  component.unmount && component.unmount(dealReportView.container);

  component.unmount && component.unmount(container);
  component.unmount && component.unmount(candidateView.container);
  component.unmount && component.unmount(russianCandidateView.container);
  component.unmount && component.unmount(todoView.container);
  component.unmount && component.unmount(duplicateTodoView.container);
  component.unmount && component.unmount(globalView.container);

  console.log('journal plugin smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
