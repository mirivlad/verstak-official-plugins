#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const pluginDir = path.join(root, 'plugins', 'milestones');
const sourcePath = path.join(pluginDir, 'frontend', 'src', 'index.js');
const manifestPath = path.join(pluginDir, 'plugin.json');

if (!fs.existsSync(sourcePath) || !fs.existsSync(manifestPath)) {
  throw new Error('Milestones plugin source and manifest must exist');
}

const source = fs.readFileSync(sourcePath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

class FakeNode {
  constructor(tag = '') {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.className = '';
    this.style = {};
    this._textContent = '';
  }
  appendChild(node) { this.children.push(node); return node; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  dispatchEvent(type, event = {}) { (this.listeners[type] || []).forEach((handler) => handler({ target: this, currentTarget: this, preventDefault() {}, ...event })); }
  click() { this.dispatchEvent('click'); }
  set innerHTML(_value) { this.children = []; this._textContent = ''; }
  get textContent() { return this._textContent + this.children.map((child) => child.textContent).join(''); }
  set textContent(value) { this._textContent = String(value == null ? '' : value); this.children = []; }
}

function walk(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.children || []) {
    const result = walk(child, predicate);
    if (result) return result;
  }
  return null;
}

function byData(node, name, value) {
  return walk(node, (item) => item.getAttribute && item.getAttribute(name) === value);
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

async function flush() {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
}

function loadBundle(document) {
  let bundle;
  const window = { VerstakPluginRegister(_id, definition) { bundle = definition; } };
  vm.runInNewContext(source, { console, Date, Math, Promise, document, window }, { filename: sourcePath });
  if (!bundle?.components?.MilestonesView || typeof bundle.activate !== 'function') {
    throw new Error('Milestones plugin did not register its view and commands');
  }
  return bundle;
}

(async () => {
  if (manifest.id !== 'verstak.milestones') throw new Error('Milestones manifest id mismatch');
  if (!manifest.provides.includes('verstak/milestones/v1')) throw new Error('Milestones must expose its Deal capability');
  if (!manifest.permissions.includes('storage.namespace') || !manifest.permissions.includes('commands.register')) throw new Error('Milestones must own storage and commands');
  if (manifest.capabilityOperations['verstak/milestones/v1']?.create !== 'verstak.milestones.create') throw new Error('Milestone create operation is missing');
  if (!manifest.sync?.records?.some((record) => record.id === 'milestones' && record.storage === 'data' && record.name === 'milestones' && record.identity === 'id')) throw new Error('Milestones must sync its owned records only');
  if (manifest.contributes.sidebarItems) throw new Error('Milestones must not be a global sidebar destination');

  const document = {
    head: new FakeNode('head'),
    createElement: (tag) => new FakeNode(tag),
    createTextNode: (value) => { const node = new FakeNode('#text'); node.textContent = value; return node; },
    getElementById: () => null,
  };
  const dealOne = '11111111-1111-4111-8111-111111111111';
  const dealTwo = '22222222-2222-4222-8222-222222222222';
  let records = [];
  const commands = {};
  const api = {
    i18n: { t: (_key, _params, fallback = '') => fallback },
    storage: { data: {
      readNDJSON: async (name) => { if (name !== 'milestones') throw new Error(`unexpected data name: ${name}`); return clone(records); },
      writeNDJSON: async (name, next) => { if (name !== 'milestones') throw new Error(`unexpected data name: ${name}`); records = clone(next); },
    } },
    workspaces: { list: async () => [{ id: dealOne, name: 'Standalone Deal' }, { id: dealTwo, name: 'Second Deal' }] },
    commands: { register: async (id, handler) => { commands[id] = handler; } },
  };
  const bundle = loadBundle(document);
  await bundle.activate(api);

  const created = await commands['verstak.milestones.create']({ scope: { kind: 'deal', workspaceId: dealOne }, title: 'Beta', dueAt: '2026-09-01' });
  if (!created.id || created.workspaceId !== dealOne || created.title !== 'Beta' || created.status !== 'open' || created.dueAt !== '2026-09-01') throw new Error(`create did not produce a Deal-owned milestone: ${JSON.stringify(created)}`);
  if (Object.prototype.hasOwnProperty.call(created, 'projectId')) throw new Error('Milestone retained a Project scope');
  if (records.length !== 1 || records[0].workspaceId !== dealOne) throw new Error('Milestone was not stored under its Deal UUID');

  const changed = await commands['verstak.milestones.update']({ scope: { kind: 'deal', workspaceId: dealOne }, id: created.id, status: 'done', title: 'Beta shipped' });
  if (changed.status !== 'done' || !changed.completedAt || changed.title !== 'Beta shipped') throw new Error('Milestone update did not persist status and completion');
  const listed = await commands['verstak.milestones.list']({ scope: { kind: 'deal', workspaceId: dealOne } });
  if (listed.length !== 1 || listed[0].id !== created.id) throw new Error('Deal capability list did not filter by UUID');
  await commands['verstak.milestones.create']({ scope: { kind: 'deal', workspaceId: dealTwo }, title: 'Do not leak' });
  const isolated = await commands['verstak.milestones.list']({ scope: { kind: 'deal', workspaceId: dealOne } });
  if (isolated.length !== 1 || isolated[0].workspaceId !== dealOne) throw new Error('Milestones leaked across Deals');

  const container = new FakeNode('div');
  bundle.components.MilestonesView.mount(container, { workspaceId: dealOne, workspaceName: 'Standalone Deal' }, api);
  await flush();
  if (!container.textContent.includes('Standalone Deal') || !byData(container, 'data-milestone-action', 'add')) throw new Error('Milestones Deal view did not render independently of Project Meta');
  byData(container, 'data-milestone-action', 'add').click();
  byData(container, 'data-milestone-input', 'title').value = 'UI milestone';
  byData(container, 'data-milestone-action', 'save').click();
  await flush();
  if (!records.some((record) => record.title === 'UI milestone' && record.workspaceId === dealOne)) throw new Error('Milestones Deal UI did not persist its own record');
  bundle.components.MilestonesView.unmount(container);

  await commands['verstak.milestones.delete']({ scope: { kind: 'deal', workspaceId: dealOne }, id: created.id });
  if (records.some((record) => record.id === created.id)) throw new Error('Milestone delete did not remove the owned record');

  records = Array.from({ length: 500 }, (_unused, index) => ({
    id: `existing-${index}`,
    workspaceId: dealOne,
    title: index === 499 ? 'Must remain' : `Existing ${index}`,
    status: 'open',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  }));
  await commands['verstak.milestones.create']({ scope: { kind: 'deal', workspaceId: dealOne }, title: '501st milestone' });
  if (records.length !== 501 || !records.some((record) => record.title === 'Must remain')) {
    throw new Error('Milestone writes must not silently discard existing records at a UI limit');
  }
  console.log('Milestones plugin smoke: OK');
})().catch((error) => { console.error(error.stack || error.message); process.exit(1); });
