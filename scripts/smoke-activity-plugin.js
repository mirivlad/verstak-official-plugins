#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'activity', 'frontend', 'src', 'index.js');
const manifestPath = path.join(root, 'plugins', 'activity', 'plugin.json');
const source = fs.readFileSync(sourcePath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const WORKLOG_COMMAND_ID = 'verstak.activity.suggestWorklog';
const DEAL_A = '11111111-1111-4111-8111-111111111111';
const DEAL_B = '22222222-2222-4222-8222-222222222222';

class FakeNode {
  constructor(tagName) {
    this.tagName = String(tagName || '').toUpperCase();
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.className = '';
    this.value = '';
    this.disabled = false;
    this.parentNode = null;
    this._textContent = '';
  }

  appendChild(node) { this.children.push(node); node.parentNode = this; return node; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener(type, handler) { (this.listeners[type] = this.listeners[type] || []).push(handler); }
  dispatchEvent(type, event = {}) { (this.listeners[type] || []).forEach((handler) => handler({ target: this, currentTarget: this, preventDefault() {}, ...event })); }
  click() { this.dispatchEvent('click'); }
  set innerHTML(value) { this._textContent = String(value || ''); this.children = []; }
  get innerHTML() { return this._textContent + this.children.map((child) => child.innerHTML).join(''); }
  set textContent(value) { this._textContent = String(value || ''); this.children = []; }
  get textContent() { return this.tagName === '#TEXT' ? this._textContent : this._textContent + this.children.map((child) => child.textContent).join(''); }
}

function walk(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.children) {
    const found = walk(child, predicate);
    if (found) return found;
  }
  return null;
}

function makeDocument() {
  return {
    body: new FakeNode('body'),
    head: new FakeNode('head'),
    createElement(tagName) { return new FakeNode(tagName); },
    createTextNode(value) { const node = new FakeNode('#text'); node.textContent = value; return node; },
    getElementById() { return null; },
  };
}

function loadBundle(document) {
  const registry = {};
  vm.runInNewContext(source, {
    console,
    Date,
    Math,
    document,
    window: { VerstakPluginRegister(pluginId, bundle) { registry[pluginId] = bundle; } },
  }, { filename: sourcePath });
  const bundle = registry['verstak.activity'];
  if (!bundle || !bundle.components || !bundle.components.ActivityView) throw new Error('ActivityView was not registered');
  return bundle;
}

async function flush() {
  for (let index = 0; index < 20; index += 1) await Promise.resolve();
}

function makeApi(initialSettings = {}, initialData = {}) {
  const settings = { ...initialSettings };
  const data = { ...initialData };
  const handlers = {};
  const commandHandlers = new Map();
  const navigationCalls = [];
  return {
    handlers,
    commandHandlers,
    navigationCalls,
    settings: {
      read: async (key) => (key ? settings[key] : { ...settings }),
      write: async (key, value) => { settings[key] = value; return { ...settings }; },
    },
    storage: { data: {
      readNDJSON: async (name) => Array.isArray(data[name]) ? data[name].slice() : [],
      writeNDJSON: async (name, records) => { data[name] = Array.isArray(records) ? records.slice() : []; },
    } },
    events: { subscribe: async (name, handler) => { handlers[name] = handler; return () => delete handlers[name]; } },
    commands: { register: async (commandId, handler) => { commandHandlers.set(commandId, handler); return () => commandHandlers.delete(commandId); } },
    navigation: { openWorkspace: async (request) => { navigationCalls.push(request); } },
    storedSettings: (key) => settings[key],
    storedData: (name) => data[name] || [],
  };
}

async function activate(api) {
  const bundle = loadBundle(makeDocument());
  await bundle.activate(api);
  await flush();
}

async function mount(api, props) {
  const document = makeDocument();
  const component = loadBundle(document).components.ActivityView;
  const container = new FakeNode('div');
  component.mount(container, props, api);
  await flush();
  return { component, container };
}

function dealScope(workspaceId) {
  return { kind: 'deal', workspaceId };
}

(async () => {
  if (!manifest.permissions.includes('commands.register')) throw new Error('Activity must register its Deal-scoped commands');
  if (!manifest.provides.includes('verstak/activity/v2')) throw new Error('Activity must provide the Deal-scoped v2 capability');
  if (manifest.capabilityOperations['verstak/activity/v2']?.list !== 'verstak.activity.list') throw new Error('Activity v2 list capability is missing');

  const api = makeApi({
    // A pre-migration value remains untouched and is never consulted at runtime.
    'events:workspace:Clients%2FAcme': [{ activityId: 'legacy', workspaceRootPath: 'Clients/Acme', title: 'legacy' }],
  }, {
    'activity-events': [
      { activityId: 'a-note', type: 'note.saved', title: 'First Deal note', occurredAt: '2026-08-30T09:00:00Z', workspaceId: DEAL_A, workspaceRootPath: 'Clients/Acme', payload: { workspaceId: DEAL_A } },
      { activityId: 'a-file', type: 'file.changed', title: 'First Deal file', occurredAt: '2026-08-30T09:12:00Z', workspaceId: DEAL_A, workspaceRootPath: 'Clients/Acme', payload: { workspaceId: DEAL_A } },
      { activityId: 'b-note', type: 'note.saved', title: 'Second Deal note', occurredAt: '2026-08-30T09:50:00Z', workspaceId: DEAL_B, workspaceRootPath: 'Clients/Acme', payload: { workspaceId: DEAL_B } },
      { activityId: 'page', type: 'browser.activity.domain', title: 'Acme browser time', occurredAt: '2026-08-30T09:30:00Z', durationSeconds: 900, workspaceRootPath: '', payload: { durationSeconds: 900 } },
    ],
  });
  await activate(api);
  for (const command of [WORKLOG_COMMAND_ID, 'verstak.activity.list', 'verstak.activity.search', 'verstak.activity.listBrowserActivity', 'verstak.activity.assignBrowserActivity', 'verstak.activity.provideOverview']) {
    if (typeof api.commandHandlers.get(command) !== 'function') throw new Error(`${command} was not registered during activation`);
  }
  const listed = await api.commandHandlers.get('verstak.activity.list')({ scope: dealScope(DEAL_A) });
  if (listed.map((event) => event.activityId).join(',') !== 'a-file,a-note') throw new Error('Activity list must use the Deal UUID');
  const searched = await api.commandHandlers.get('verstak.activity.search')({ query: 'note', scope: dealScope(DEAL_B) });
  if (searched.results.length !== 1 || searched.results[0].id !== 'b-note' || searched.results[0].action.workspaceId !== DEAL_B) {
    throw new Error('Activity search must use and return the Deal UUID');
  }

  const view = await mount(api, { workspaceId: DEAL_A, workspaceNode: { workspaceId: DEAL_A, rootPath: 'Clients/Acme', name: 'Acme' } });
  for (const eventName of ['file.opened', 'note.saved', 'browser.capture.file']) {
    if (typeof api.handlers[eventName] !== 'function') throw new Error(`${eventName} subscription missing`);
  }
  if (!view.container.textContent.includes('First Deal note') || view.container.textContent.includes('Second Deal note') || view.container.textContent.includes('legacy')) {
    throw new Error('Activity view must read raw records and isolate same-path Deals by UUID');
  }
  const unresolvedView = await mount(api, { workspaceRootPath: 'Clients/Acme', workspaceNode: { rootPath: 'Clients/Acme' } });
  if (unresolvedView.container.textContent.includes('First Deal note') || unresolvedView.container.textContent.includes('Second Deal note')) {
    throw new Error('A workspace view without a Deal UUID must not fall back to global activity');
  }
  const candidate = walk(view.container, (node) => node.getAttribute && node.getAttribute('data-work-session-candidate'));
  if (!candidate) throw new Error(`Deal-scoped work session candidate was not rendered: ${view.container.textContent}`);
  const review = walk(candidate, (node) => node.getAttribute && node.getAttribute('data-work-session-action') === 'review');
  review.click();
  await flush();
  if (api.navigationCalls.length !== 1 || api.navigationCalls[0].workspaceId !== DEAL_A) throw new Error('Candidate review must navigate by Deal UUID');
  const worklog = await api.commandHandlers.get(WORKLOG_COMMAND_ID)({ scope: dealScope(DEAL_A) });
  if (worklog.candidates.length !== 1 || worklog.candidates[0].workspaceId !== DEAL_A) throw new Error('Journal suggestions must filter by Deal UUID');
  const pathOnlyWorklog = await api.commandHandlers.get(WORKLOG_COMMAND_ID)({ workspaceRootPath: 'Clients/Acme' });
  if (pathOnlyWorklog.candidates.length !== 0) throw new Error('Journal suggestions must reject a path-only scope');
  const dismiss = walk(candidate, (node) => node.getAttribute && node.getAttribute('data-work-session-action') === 'dismiss');
  dismiss.click();
  await flush();
  if (!api.storedSettings(`work-session-dismissals:deal:${DEAL_A}`)) throw new Error('Candidate dismissal must be keyed by Deal UUID');

  const assign = api.commandHandlers.get('verstak.activity.assignBrowserActivity');
  const noScope = await assign({ activityIds: ['page'], workspaceRootPath: 'Clients/Acme' });
  if (noScope.assigned !== 0) throw new Error('Browser activity must reject a path-only assignment');
  const assigned = await assign({ activityIds: ['page'], scope: dealScope(DEAL_A), workspaceRootPath: 'Clients/Acme' });
  if (assigned.assigned !== 1 || assigned.workspaceId !== DEAL_A) throw new Error('Browser activity must attach by Deal UUID');
  const browser = await api.commandHandlers.get('verstak.activity.listBrowserActivity')({ scope: dealScope(DEAL_A) });
  if (browser.activities.length !== 1 || browser.activities[0].workspaceId !== DEAL_A) throw new Error('Browser activity list must filter by Deal UUID');
  const pathOnlyBrowser = await api.commandHandlers.get('verstak.activity.listBrowserActivity')({ workspaceRootPath: 'Clients/Acme' });
  if (pathOnlyBrowser.activities.length !== 0) throw new Error('Browser activity list must reject a path-only scope');
  const saveRule = api.commandHandlers.get('verstak.activity.setBrowserActivityRule');
  if ((await saveRule({ pattern: 'example.test', workspaceRootPath: 'Clients/Acme' })).saved) {
    throw new Error('Browser activity rule must reject a path-only Deal');
  }
  const savedRule = await saveRule({ pattern: 'example.test', scope: dealScope(DEAL_A), workspaceRootPath: 'Clients/Acme' });
  if (!savedRule.saved || savedRule.rule.workspaceId !== DEAL_A) throw new Error('Browser activity rule must store a Deal UUID');

  const overview = await api.commandHandlers.get('verstak.activity.provideOverview')({ scope: dealScope(DEAL_A) });
  if (!overview.summary || overview.summary[0].count !== 3) throw new Error('Activity overview must read one Deal by UUID');

  const clear = walk(view.container, (node) => node.getAttribute && node.getAttribute('data-activity-action') === 'clear');
  clear.click();
  const confirm = walk(view.container, (node) => node.getAttribute && node.getAttribute('data-activity-clear-confirm') === '');
  confirm.click();
  await flush();
  const remaining = api.storedData('activity-events');
  if (remaining.some((event) => event.workspaceId === DEAL_A) || !remaining.some((event) => event.workspaceId === DEAL_B)) {
    throw new Error('Clear must remove only the selected Deal UUID');
  }

  console.log('activity plugin smoke passed');
})().catch((err) => { console.error(err); process.exit(1); });
