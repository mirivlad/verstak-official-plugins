#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'files', 'frontend', 'src', 'index.js');
const source = fs.readFileSync(sourcePath, 'utf8');

class FakeNode {
  constructor(tagName) {
    this.tagName = String(tagName || '').toUpperCase();
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.style = {};
    this.className = '';
    this.id = '';
    this.value = '';
    this.parentNode = null;
    this._innerHTML = '';
    this._textContent = '';
    this.classList = {
      add: (cls) => {
        if (!this.className.split(/\s+/).includes(cls)) this.className = (this.className + ' ' + cls).trim();
      },
      remove: (cls) => {
        this.className = this.className.split(/\s+/).filter((name) => name && name !== cls).join(' ');
      },
      contains: (cls) => this.className.split(/\s+/).includes(cls),
    };
  }

  appendChild(node) {
    if (!(node instanceof FakeNode)) throw new TypeError('appendChild expects FakeNode');
    this.children.push(node);
    node.parentNode = this;
    return node;
  }

  removeChild(node) {
    this.children = this.children.filter((child) => child !== node);
    node.parentNode = null;
    return node;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'id') this.id = String(value);
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  addEventListener(type, handler) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(handler);
  }

  removeEventListener(type, handler) {
    this.listeners[type] = (this.listeners[type] || []).filter((candidate) => candidate !== handler);
  }

  dispatchEvent(type, event = {}) {
    const handlers = this.listeners[type] || [];
    handlers.forEach((handler) => handler({
      preventDefault() {},
      stopPropagation() {},
      target: this,
      clientX: 10,
      clientY: 10,
      ...event,
    }));
  }

  click() {
    this.dispatchEvent('click');
  }

  contains(node) {
    if (node === this) return true;
    return this.children.some((child) => child.contains(node));
  }

  closest(selector) {
    if (selector.startsWith('.') && this.classList.contains(selector.slice(1))) return this;
    return this.parentNode ? this.parentNode.closest(selector) : null;
  }

  querySelector(selector) {
    return walk(this, (node) => {
      if (selector.startsWith('.')) return node.classList && node.classList.contains(selector.slice(1));
      return false;
    });
  }

  focus() {}
  select() {}

  set innerHTML(value) {
    this._innerHTML = String(value || '');
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set textContent(value) {
    this._textContent = String(value || '');
    this.children = [];
  }

  get textContent() {
    if (this.tagName === '#TEXT') return this._textContent;
    return this._textContent + this.children.map((child) => child.textContent).join('');
  }

  get offsetWidth() { return 200; }
  get offsetHeight() { return 120; }
}

function walk(node, fn) {
  if (fn(node)) return node;
  for (const child of node.children) {
    const found = walk(child, fn);
    if (found) return found;
  }
  return null;
}

function makeDocument() {
  const body = new FakeNode('body');
  return {
    body,
    head: new FakeNode('head'),
    listeners: {},
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
    addEventListener(type, handler) {
      this.listeners[type] = this.listeners[type] || [];
      this.listeners[type].push(handler);
    },
    removeEventListener(type, handler) {
      this.listeners[type] = (this.listeners[type] || []).filter((candidate) => candidate !== handler);
    },
  };
}

function loadFilesComponent(document) {
  const registry = {};
  const sandbox = {
    console,
    document,
    window: {
      innerWidth: 1024,
      innerHeight: 768,
      listeners: {},
      addEventListener(type, handler) {
        this.listeners[type] = this.listeners[type] || [];
        this.listeners[type].push(handler);
      },
      removeEventListener(type, handler) {
        this.listeners[type] = (this.listeners[type] || []).filter((candidate) => candidate !== handler);
      },
      VerstakPluginRegister(pluginId, bundle) {
        registry[pluginId] = bundle.components || {};
      },
    },
    navigator: {
      clipboard: {
        written: [],
        writeText: async (text) => {
          sandbox.navigator.clipboard.written.push(String(text));
        },
      },
    },
  };
  sandbox.window.window = sandbox.window;
  sandbox.window.document = document;
  sandbox.window.navigator = sandbox.navigator;
  vm.runInNewContext(source, sandbox, { filename: sourcePath });
  const component = registry['verstak.files'] && registry['verstak.files'].FilesView;
  if (!component) throw new Error('FilesView was not registered');
  return { component, clipboard: sandbox.navigator.clipboard };
}

function makeApi() {
  const externalCalls = [];
  const contributionCalls = [];
  const eventHandlers = {};
  let restored = false;
  let externalVisible = false;
  let trashEntries = [{
    originalPath: 'Docs/deleted.md',
    trashPath: '.verstak/trash/files/mock/deleted.md',
    trashId: 'mock-trash',
    deletedAt: '2026-06-27T01:02:03Z',
    originalType: 'file',
    basename: 'deleted.md',
  }];
  return {
    externalCalls,
    contributionCalls,
    emitFileChanged(payload) {
      (eventHandlers['file.changed'] || []).forEach((handler) => handler({
        name: 'file.changed',
        payload,
        timestamp: new Date().toISOString(),
      }));
    },
    files: {
      list: async () => {
        const entries = [{
          name: 'readme.md',
          relativePath: 'Docs/readme.md',
          type: 'file',
          extension: 'md',
          size: 12,
          modifiedAt: '2026-06-27T00:00:00Z',
        }];
        if (restored) {
          entries.push({
            name: 'deleted.md',
            relativePath: 'Docs/deleted.md',
            type: 'file',
            extension: 'md',
            size: 8,
            modifiedAt: '2026-06-27T01:03:00Z',
          });
        }
        if (externalVisible) {
          entries.push({
            name: 'external.md',
            relativePath: 'Docs/external.md',
            type: 'file',
            extension: 'md',
            size: 9,
            modifiedAt: '2026-06-27T01:04:00Z',
          });
        }
        return entries;
      },
      metadata: async () => { throw new Error('not-found'); },
      readText: async () => '# Readme\n',
      writeText: async () => undefined,
      createFolder: async () => undefined,
      move: async () => undefined,
      trash: async () => undefined,
      listTrash: async () => trashEntries.slice(),
      restoreTrash: async (trashId) => {
        if (trashId !== 'mock-trash') throw new Error(`unexpected restore trash id: ${trashId}`);
        restored = true;
        trashEntries = [];
        return 'Docs/deleted.md';
      },
      openExternal: async (relativePath) => { externalCalls.push({ action: 'open', path: relativePath }); },
      showInFolder: async (relativePath) => { externalCalls.push({ action: 'show', path: relativePath }); },
    },
    workbench: {
      openResource: async () => ({ status: 'opened' }),
    },
    contributions: {
      list: async (point) => {
        if (point === 'fileActions') {
          return [{
            pluginId: 'provider.plugin',
            id: 'provider.file.action',
            label: 'Provider File Action',
            handler: 'provider.command',
          }];
        }
        if (point === 'contextMenuEntries') {
          return [{
            pluginId: 'provider.plugin',
            id: 'provider.file.context',
            label: 'Provider Context Action',
            context: 'file',
            handler: 'provider.context',
          }];
        }
        return [];
      },
    },
    commands: {
      executeFor: async (pluginId, commandId, args) => {
        contributionCalls.push({ pluginId, commandId, args });
        return { status: 'handled' };
      },
    },
    events: {
      subscribe: async (eventName, handler) => {
        eventHandlers[eventName] = eventHandlers[eventName] || [];
        eventHandlers[eventName].push(handler);
        return () => {
          eventHandlers[eventName] = (eventHandlers[eventName] || []).filter((candidate) => candidate !== handler);
        };
      },
    },
    showExternalFile() {
      externalVisible = true;
    },
  };
}

async function flush() {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

(async () => {
  const document = makeDocument();
  const { component, clipboard } = loadFilesComponent(document);
  const container = new FakeNode('div');
  const api = makeApi();
  component.mount(container, {}, api);
  await flush();

  const row = walk(container, (node) => node.getAttribute && node.getAttribute('data-file-path') === 'Docs/readme.md');
  if (!row) throw new Error('file row not rendered');

  const list = walk(container, (node) => node.getAttribute && node.getAttribute('data-files-list') !== undefined);
  if (!list) throw new Error('files list not rendered');
  list.dispatchEvent('contextmenu', { target: row, clientX: 20, clientY: 20 });

  const openExternal = walk(document.body, (node) => node.getAttribute && node.getAttribute('data-files-menu-action') === 'open-external');
  if (!openExternal) throw new Error('Open External menu item not found');
  const showInExplorer = walk(document.body, (node) => node.getAttribute && node.getAttribute('data-files-menu-action') === 'show-in-explorer');
  if (!showInExplorer) throw new Error('Show in Explorer menu item not found');

  openExternal.click();
  await flush();
  if (!api.externalCalls.some((call) => call.action === 'open' && call.path === 'Docs/readme.md')) {
    throw new Error(`expected openExternal call for Docs/readme.md, got ${JSON.stringify(api.externalCalls)}`);
  }
  if (walk(document.body, (node) => node.tagName === 'BUTTON' && node.textContent === 'Copy Path')) {
    throw new Error('external fallback should not show Copy Path after successful API call');
  }

  showInExplorer.click();
  await flush();
  if (!api.externalCalls.some((call) => call.action === 'show' && call.path === 'Docs/readme.md')) {
    throw new Error(`expected showInFolder call for Docs/readme.md, got ${JSON.stringify(api.externalCalls)}`);
  }
  if (clipboard.written.length !== 0) {
    throw new Error(`expected no copied path after successful external API calls, got ${clipboard.written.join(', ')}`);
  }

  list.dispatchEvent('contextmenu', { target: row, clientX: 20, clientY: 20 });
  const providerAction = walk(document.body, (node) => node.getAttribute && node.getAttribute('data-files-menu-action') === 'contribution-provider.file.action');
  if (!providerAction) throw new Error('provider file action menu item not found');
  const providerContext = walk(document.body, (node) => node.getAttribute && node.getAttribute('data-files-menu-action') === 'contribution-provider.file.context');
  if (!providerContext) throw new Error('provider context menu item not found');
  providerAction.click();
  await flush();
  if (!api.contributionCalls.some((call) => call.pluginId === 'provider.plugin' && call.commandId === 'provider.command' && call.args.path === 'Docs/readme.md')) {
    throw new Error(`expected provider file action call, got ${JSON.stringify(api.contributionCalls)}`);
  }

  const trashViewButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-files-action') === 'trash-view');
  if (trashViewButton) throw new Error('Files must not expose a trash metadata toolbar button');
  const restoreTrash = walk(container, (node) => node.getAttribute && node.getAttribute('data-files-restore-trash'));
  if (restoreTrash) throw new Error('Files must not render trash restore controls');
  api.showExternalFile();
  api.emitFileChanged({ path: 'Docs/external.md', operation: 'external.create', type: 'file' });
  await flush();
  const externalRow = walk(container, (node) => node.getAttribute && node.getAttribute('data-file-path') === 'Docs/external.md');
  if (!externalRow) {
    throw new Error(`external file row not rendered after file.changed: ${container.textContent}`);
  }

  console.log('files frontend smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
