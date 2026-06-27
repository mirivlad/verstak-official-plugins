#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'browser-inbox', 'frontend', 'src', 'index.js');
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

  dispatchEvent(type, event = {}) {
    const handlers = this.listeners[type] || [];
    handlers.forEach((handler) => handler({
      stopPropagation() {},
      preventDefault() {},
      target: this,
      ...event,
    }));
  }

  click() {
    this.dispatchEvent('click');
  }

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
  const sandbox = {
    console,
    Date,
    document,
    window: {
      VerstakPluginRegister(pluginId, bundle) {
        registry[pluginId] = bundle.components || {};
      },
    },
  };
  sandbox.window.window = sandbox.window;
  sandbox.window.document = document;
  vm.runInNewContext(source, sandbox, { filename: sourcePath });
  const component = registry['verstak.browser-inbox'] && registry['verstak.browser-inbox'].BrowserInboxView;
  if (!component) throw new Error('BrowserInboxView was not registered');
  return component;
}

function makeApi(initialSettings = {}) {
  const settings = { ...initialSettings };
  const handlers = {};
  const unsubscribed = [];
  return {
    settings,
    handlers,
    unsubscribed,
    events: {
      subscribe: async (name, handler) => {
        handlers[name] = handler;
        return () => {
          unsubscribed.push(name);
          delete handlers[name];
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
    getStoredCaptures() {
      return settings.captures || [];
    },
  };
}

async function flush() {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

async function mountWithApi(api, document = makeDocument()) {
  const component = loadComponent(document);
  const container = new FakeNode('div');
  component.mount(container, { workspaceNode: { name: 'Project' } }, api);
  await flush();
  return { component, container, document };
}

(async () => {
  const api = makeApi();
  const { component, container } = await mountWithApi(api);

  for (const name of ['browser.capture.page', 'browser.capture.selection', 'browser.capture.link']) {
    if (typeof api.handlers[name] !== 'function') throw new Error(`${name} subscription missing`);
  }

  await api.handlers['browser.capture.selection']({
    name: 'browser.capture.selection',
    timestamp: '2026-06-27T00:00:00Z',
    payload: {
      captureId: 'capture-1',
      capturedAt: '2026-06-27T00:00:00.000Z',
      kind: 'selection',
      url: 'https://example.com/article',
      title: 'Example Article',
      domain: 'example.com',
      text: 'Selected text from the page',
      browserName: 'Firefox',
    },
  });
  await flush();

  const captures = api.getStoredCaptures();
  if (captures.length !== 1) throw new Error(`expected one stored capture, got ${captures.length}`);
  if (captures[0].captureId !== 'capture-1') throw new Error('stored capture id mismatch');

  const row = walk(container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'capture-1');
  if (!row) throw new Error('capture row was not rendered');
  if (!container.textContent.includes('Selected text from the page')) {
    throw new Error('selection text was not rendered');
  }

  await api.handlers['browser.capture.selection']({
    name: 'browser.capture.selection',
    timestamp: '2026-06-27T00:00:00Z',
    payload: {
      captureId: 'capture-1',
      capturedAt: '2026-06-27T00:00:00.000Z',
      kind: 'selection',
      url: 'https://example.com/article',
      title: 'Example Article',
      domain: 'example.com',
      text: 'Duplicate selected text',
    },
  });
  await flush();
  if (api.getStoredCaptures().length !== 1) throw new Error('duplicate capture was stored');

  const clearButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-action') === 'clear');
  if (!clearButton) throw new Error('clear button not found');
  clearButton.click();
  await flush();
  if (api.getStoredCaptures().length !== 0) throw new Error('clear action did not empty stored captures');

  component.unmount && component.unmount(container);
  if (api.unsubscribed.length !== 3) throw new Error('component did not unsubscribe all capture handlers');

  const persistedApi = makeApi({ captures: [captures[0]] });
  const persisted = await mountWithApi(persistedApi);
  if (!walk(persisted.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'capture-1')) {
    throw new Error('persisted capture was not rendered on mount');
  }

  console.log('browser inbox plugin smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
