#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'default-editor', 'frontend', 'src', 'index.js');
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

  set textContent(value) {
    this._textContent = String(value || '');
    this._innerHTML = '';
    this.children = [];
  }

  get textContent() {
    if (this.tagName === '#TEXT') return this._textContent;
    return this._textContent + this._innerHTML.replace(/<[^>]*>/g, '') + this.children.map((child) => child.textContent).join('');
  }

  set innerHTML(value) {
    this._innerHTML = String(value || '');
    this._textContent = '';
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML + this.children.map((child) => child.innerHTML).join('');
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
    head: new FakeNode('head'),
    body: new FakeNode('body'),
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
    document,
    window: {
      confirm: () => true,
      VerstakPluginRegister(pluginId, bundle) {
        registry[pluginId] = bundle.components || {};
      },
    },
    Event: function Event() {},
    setTimeout,
    clearTimeout,
  }, { filename: sourcePath });
  const component = registry['verstak.default-editor'] && registry['verstak.default-editor'].DefaultEditor;
  if (!component) throw new Error('DefaultEditor was not registered');
  return component;
}

async function flush() {
  for (let i = 0; i < 12; i++) {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function mountEditor(secretProviderEnabled) {
  const document = makeDocument();
  const component = loadComponent(document);
  const opened = [];
  const api = {
    files: {
      readText: async () => '[DB password](verstak-secret://client-a.db)\n',
      writeText: async () => undefined,
    },
    contributions: {
      list: async (point) => {
        if (point !== 'openProviders' || !secretProviderEnabled) return [];
        return [{
          pluginId: 'verstak.secrets',
          id: 'verstak.secrets.secret',
          component: 'SecretsView',
          supports: [{ kind: 'secret', modes: ['view'] }],
        }];
      },
    },
    workbench: {
      openResource: async (request) => {
        opened.push(request);
        return { status: 'opened', request };
      },
    },
  };
  const container = document.createElement('div');
  component.mount(container, {
    request: { kind: 'vault-file', path: 'Project/Notes/Secret.md', extension: '.md', mode: 'view' },
  }, api);
  await flush();
  return { container, opened };
}

(async () => {
  const disabled = await mountEditor(false);
  const disabledPreview = walk(disabled.container, (node) => node.className === 'de-preview');
  if (!disabledPreview) throw new Error('disabled preview missing');
  if (disabledPreview.innerHTML.includes('data-secret-id')) throw new Error('secret link rendered without secrets provider');

  const enabled = await mountEditor(true);
  const preview = walk(enabled.container, (node) => node.className === 'de-preview');
  if (!preview) throw new Error('enabled preview missing');
  if (!preview.innerHTML.includes('data-secret-id="client-a.db"')) throw new Error('secret link did not render with provider');

  enabled.container.dispatchEvent('click', {
    target: {
      closest(selector) {
        if (selector === '.secret-link') {
          return { getAttribute: (name) => name === 'data-secret-id' ? 'client-a.db' : '' };
        }
        return null;
      },
    },
  });
  await flush();

  if (!enabled.opened.some((request) => request.kind === 'secret' && request.path === 'client-a.db')) {
    throw new Error('secret link did not open through workbench');
  }

  console.log('default editor smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
