#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'activity', 'frontend', 'src', 'index.js');
const source = fs.readFileSync(sourcePath, 'utf8');

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
    this._innerHTML = '';
  }

  appendChild(node) {
    this.children.push(node);
    node.parentNode = this;
    return node;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name];
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
    Math,
    document,
    window: {
      VerstakPluginRegister(pluginId, bundle) {
        registry[pluginId] = bundle.components || {};
      },
    },
  }, { filename: sourcePath });
  const component = registry['verstak.activity'] && registry['verstak.activity'].ActivityView;
  if (!component) throw new Error('ActivityView was not registered');
  return component;
}

function makeApi(initialSettings = {}) {
  const settings = { ...initialSettings };
  const handlers = {};
  const unsubscribed = [];
  return {
    handlers,
    unsubscribed,
    settings: {
      read: async (key) => (key ? settings[key] : { ...settings }),
      write: async (key, value) => {
        settings[key] = value;
        return { ...settings };
      },
    },
    events: {
      subscribe: async (name, handler) => {
        handlers[name] = handler;
        return () => {
          unsubscribed.push(name);
          delete handlers[name];
        };
      },
    },
    storedEvents() {
      return settings.events || [];
    },
  };
}

async function flush() {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
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

  for (const name of ['file.opened', 'file.changed', 'note.saved', 'action.started', 'browser.capture.received', 'case.selected', 'browser.capture.selection']) {
    if (typeof api.handlers[name] !== 'function') throw new Error(`${name} subscription missing`);
  }

  await api.handlers['browser.capture.selection']({
    name: 'browser.capture.selection',
    pluginId: 'verstak.browser-inbox',
    timestamp: '2026-06-27T00:00:00Z',
    payload: {
      captureId: 'capture-1',
      kind: 'selection',
      title: 'Example Article',
      url: 'https://example.com/article',
      text: 'Selected text',
    },
  });
  await flush();

  const stored = api.storedEvents();
  if (stored.length !== 1) throw new Error(`expected one stored activity event, got ${stored.length}`);
  if (stored[0].type !== 'browser.capture.selection') throw new Error('stored event type mismatch');
  if (stored[0].sourcePluginId !== 'verstak.browser-inbox') throw new Error('stored event source plugin mismatch');
  if (!container.textContent.includes('Example Article')) throw new Error('browser capture title was not rendered');
  if (!container.textContent.includes('browser.capture.selection')) throw new Error('event type was not rendered');

  const manualButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-activity-action') === 'manual');
  if (!manualButton) throw new Error('manual activity button not found');
  manualButton.click();
  await flush();
  if (api.storedEvents().length !== 2) throw new Error('manual activity was not stored');
  if (!container.textContent.includes('Manual activity')) throw new Error('manual activity was not rendered');

  const clearButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-activity-action') === 'clear');
  if (!clearButton) throw new Error('clear activity button not found');
  clearButton.click();
  await flush();
  if (api.storedEvents().length !== 0) throw new Error('clear action did not remove activity events');

  component.unmount && component.unmount(container);
  if (api.unsubscribed.length !== 9) throw new Error(`expected 9 unsubscribers, got ${api.unsubscribed.length}`);

  const persistedApi = makeApi({
    events: [{
      activityId: 'persisted-1',
      type: 'note.saved',
      title: 'Saved note',
      summary: 'Notes/Case.md',
      occurredAt: '2026-06-27T01:00:00Z',
      sourcePluginId: 'verstak.notes',
    }],
  });
  const persisted = await mountWithApi(persistedApi);
  if (!persisted.container.textContent.includes('Saved note')) throw new Error('persisted activity was not rendered');

  console.log('activity plugin smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
