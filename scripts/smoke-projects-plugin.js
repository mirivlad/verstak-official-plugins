#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'projects', 'frontend', 'src', 'index.js');
const source = fs.readFileSync(sourcePath, 'utf8');

class FakeNode {
  constructor(tag = '') { this.tagName = String(tag).toUpperCase(); this.children = []; this.attributes = {}; this.listeners = {}; this.style = {}; this.className = ''; this.value = ''; this._textContent = ''; this.parentNode = null; }
  appendChild(node) { if (!node) return node; this.children.push(node); node.parentNode = this; return node; }
  setAttribute(name, value) { this.attributes[name] = String(value); if (name === 'class') this.className = String(value); }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : undefined; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  dispatchEvent(type, event = {}) { const value = { target: this, currentTarget: this, preventDefault() {}, ...event }; (this.listeners[type] || []).forEach((handler) => handler(value)); }
  click() { this.dispatchEvent('click'); }
  get firstChild() { return this.children[0] || null; }
  set innerHTML(_value) { this.children = []; this._textContent = ''; }
  get textContent() { return this._textContent + this.children.map((child) => child.textContent).join(''); }
  set textContent(value) { this._textContent = String(value == null ? '' : value); this.children = []; }
}

function walk(node, predicate) { if (predicate(node)) return node; for (const child of node.children || []) { const found = walk(child, predicate); if (found) return found; } return null; }
function byAttr(node, name, value) { return walk(node, (item) => item.getAttribute && item.getAttribute(name) === value); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function flush(count = 2) { let next = Promise.resolve(); for (let i = 0; i < count; i += 1) next = next.then(() => new Promise((resolve) => setTimeout(resolve, 0))); return next; }

function loadBundle(document) {
  let bundle;
  const window = { VerstakPluginRegister(_id, definition) { bundle = definition; } };
  vm.runInNewContext(source, { console, setTimeout, clearTimeout, Date, Math, Promise, document, window }, { filename: sourcePath });
  if (!bundle?.components?.ProjectMetaView) throw new Error('Project Meta plugin did not register ProjectMetaView');
  return bundle;
}

(async () => {
  const document = { head: new FakeNode('head'), createElement: (tag) => new FakeNode(tag), createTextNode: (value) => { const node = new FakeNode('#text'); node.textContent = value; return node; }, getElementById: () => null };
  const dealOne = '11111111-1111-4111-8111-111111111111';
  const dealTwo = '22222222-2222-4222-8222-222222222222';
  const configs = { [dealTwo]: { schemaVersion: 1, name: 'Second Deal', status: 'paused', priority: 'low', tags: ['archived'] } };
  const navigation = [];
  const api = {
    i18n: { t: (_key, _params, fallback = '') => fallback, onDidChangeLocale: () => () => {} },
    workspaces: {
      tree: async () => ({ roots: [{ kind: 'folder', name: 'Root', children: [{ kind: 'workspace', workspaceId: dealOne, name: 'First Deal', rootPath: 'Deals/First' }, { kind: 'workspace', workspaceId: dealTwo, name: 'Second Deal', rootPath: 'Deals/Second' }] }] }),
      readToolConfig: async (workspaceId) => clone(configs[workspaceId] || {}),
      writeToolConfig: async (workspaceId, config) => { configs[workspaceId] = clone(config); }
    },
    navigation: { openWorkspace: (request) => navigation.push(clone(request)) }
  };
  const bundle = loadBundle(document);

  const dealView = new FakeNode('div');
  bundle.components.ProjectMetaView.mount(dealView, { workspaceNode: { workspaceId: dealOne, name: 'First Deal', rootPath: 'Deals/First' } }, api);
  await flush(3);
  byAttr(dealView, 'data-project-meta-field', 'name').value = 'Launch plan';
  byAttr(dealView, 'data-project-meta-field', 'description').value = 'Prepare launch';
  byAttr(dealView, 'data-project-meta-field', 'status').value = 'active';
  byAttr(dealView, 'data-project-meta-field', 'priority').value = 'high';
  byAttr(dealView, 'data-project-meta-field', 'tags').value = 'alpha, Launch, alpha';
  byAttr(dealView, 'data-project-meta-action', 'save').click();
  await flush(3);
  const saved = configs[dealOne];
  if (!saved || saved.schemaVersion !== 1 || saved.name !== 'Launch plan' || saved.description !== 'Prepare launch' || saved.status !== 'active' || saved.priority !== 'high' || saved.tags.join('|') !== 'alpha|Launch') throw new Error(`Deal metadata was not saved as Project Meta: ${JSON.stringify(saved)}`);
  if (Object.prototype.hasOwnProperty.call(saved, 'workspaceId') || Object.prototype.hasOwnProperty.call(saved, 'projectId')) throw new Error('Project Meta stored a second resource scope');
  bundle.components.ProjectMetaView.unmount(dealView);

  const portfolio = new FakeNode('div');
  bundle.components.ProjectMetaView.mount(portfolio, {}, api);
  await flush(3);
  if (!byAttr(portfolio, 'data-project-meta-portfolio', '')) throw new Error('global Project Meta view did not render a portfolio');
  const firstDeal = byAttr(portfolio, 'data-project-meta-deal', dealOne);
  if (!firstDeal || !firstDeal.textContent.includes('Launch plan')) throw new Error('portfolio did not read Deal-owned Project Meta');
  firstDeal.click();
  if (JSON.stringify(navigation[0]) !== JSON.stringify({ workspaceId: dealOne, workspaceItemId: 'verstak.projects.workspace' })) throw new Error(`portfolio navigation did not preserve Deal UUID: ${JSON.stringify(navigation[0])}`);
  bundle.components.ProjectMetaView.unmount(portfolio);

  console.log('Project Meta plugin smoke: OK');
})().catch((error) => { console.error(error.stack || error.message); process.exit(1); });
