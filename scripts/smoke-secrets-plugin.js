#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'secrets', 'frontend', 'src', 'index.js');
const manifestPath = path.join(root, 'plugins', 'secrets', 'plugin.json');
const source = fs.readFileSync(sourcePath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

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

  set textContent(value) {
    this._textContent = String(value || '');
    this.children = [];
  }

  get textContent() {
    if (this.tagName === '#TEXT') return this._textContent;
    return this._textContent + this.children.map((child) => child.textContent).join('');
  }

  set innerHTML(value) {
    this._textContent = String(value || '');
    this.children = [];
  }

  get innerHTML() {
    return this.textContent;
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
      VerstakPluginRegister(pluginId, bundle) {
        registry[pluginId] = bundle.components || {};
      },
      navigator: { clipboard: { writeText: async () => undefined } },
    },
    setTimeout,
    clearTimeout,
  }, { filename: sourcePath });
  const component = registry['verstak.secrets'] && registry['verstak.secrets'].SecretsView;
  if (!component) throw new Error('SecretsView was not registered');
  return component;
}

async function flush() {
  for (let i = 0; i < 12; i++) {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

(async () => {
  if (!manifest.provides.includes('secret-store')) throw new Error('secrets manifest must provide secret-store');
  if (!manifest.provides.includes('secrets.read-ui')) throw new Error('secrets manifest must provide secrets.read-ui');
  if (!manifest.provides.includes('secrets.write-ui')) throw new Error('secrets manifest must provide secrets.write-ui');
  if (!manifest.permissions.includes('secrets.read')) throw new Error('secrets manifest must request secrets.read');
  if (!manifest.permissions.includes('secrets.write')) throw new Error('secrets manifest must request secrets.write');
  if (!manifest.permissions.includes('ui.register')) throw new Error('secrets manifest must request ui.register');
  if (!(manifest.contributes.workspaceItems || []).some((item) => item.component === 'SecretsView')) throw new Error('secrets workspace item missing');
  if (!(manifest.contributes.settingsPanels || []).some((item) => item.component === 'SecretsView')) throw new Error('secrets settings panel missing');

  const document = makeDocument();
  const component = loadComponent(document);
  const records = [
    { id: 'global.server', title: 'Global Server', username: 'root', scope: { kind: 'global' }, updatedAt: '2026-06-29T00:00:00Z' },
    { id: 'client-a.db', title: 'Client A DB', username: 'app', scope: { kind: 'workspace', workspaceRootPath: 'ClientA' }, updatedAt: '2026-06-29T00:00:00Z' },
  ];
  let unlocked = false;
  const readCalls = [];
  const copied = [];
  const api = {
    secrets: {
      status: async () => ({ unlocked }),
      unlock: async (password) => {
        if (password !== 'master') throw new Error('bad password');
        unlocked = true;
      },
      list: async () => records,
      read: async (id) => {
        readCalls.push(id);
        return { ...records.find((record) => record.id === id), value: 'secret-value' };
      },
      write: async (record) => ({ ...record, id: record.id || 'generated.id', updatedAt: '2026-06-29T00:00:00Z' }),
      copyLink: async (id) => `[${records.find((record) => record.id === id).title}](verstak-secret://${id})`,
    },
    clipboard: {
      writeText: async (text) => copied.push(text),
    },
  };

  const container = document.createElement('div');
  component.mount(container, { workspaceRootPath: 'ClientA', resource: { path: 'client-a.db' } }, api);
  await flush();

  if (!container.textContent.includes('Unlock secrets')) throw new Error('locked screen did not render');
  const passwordInput = walk(container, (node) => node.getAttribute && node.getAttribute('data-secret-master-password') === '');
  const unlockButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-secret-unlock') === '');
  if (!passwordInput || !unlockButton) throw new Error('unlock controls missing');
  passwordInput.value = 'master';
  unlockButton.click();
  await flush();

  if (!container.textContent.includes('Global')) throw new Error('global group missing');
  if (!container.textContent.includes('ClientA')) throw new Error('workspace group missing');
  if (!container.textContent.includes('Client A DB')) throw new Error('workspace secret missing');
  if (!readCalls.includes('client-a.db')) throw new Error('deep-linked secret was not selected/read');

  const copyButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-secret-copy-link') === 'client-a.db');
  if (!copyButton) throw new Error('copy link button missing');
  copyButton.click();
  await flush();
  if (!copied.includes('[Client A DB](verstak-secret://client-a.db)')) throw new Error('secret link was not copied');

  console.log('secrets plugin smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
