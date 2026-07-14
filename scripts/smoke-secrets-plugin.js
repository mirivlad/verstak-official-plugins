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

  removeChild(node) {
    this.children = this.children.filter((child) => child !== node);
    node.parentNode = null;
    return node;
  }

  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
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

function loadComponent(document, errorLog) {
  const registry = {};
  vm.runInNewContext(source, {
    console: {
      ...console,
      warn(...args) {
        errorLog.push(args.map((value) => String(value)).join(' '));
      },
      error(...args) {
        errorLog.push(args.map((value) => String(value)).join(' '));
      },
    },
    document,
    window: {
      VerstakPluginRegister(pluginId, bundle) {
        registry[pluginId] = bundle.components || {};
      },
      confirm: () => true,
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
  if (!manifest.permissions.includes('files.read')) throw new Error('secrets manifest must request files.read for the Deal selector');
  if (!manifest.permissions.includes('ui.register')) throw new Error('secrets manifest must request ui.register');
  if (!(manifest.contributes.openProviders || []).some((item) => (item.supports || []).some((support) => support.kind === 'secret'))) throw new Error('secrets secret open provider missing');
  if (!(manifest.contributes.views || []).some((item) => item.component === 'SecretsView')) throw new Error('secrets global view missing');
  if (!(manifest.contributes.sidebarItems || []).some((item) => item.view === 'verstak.secrets.view')) throw new Error('secrets global sidebar item missing');
  if (!(manifest.contributes.workspaceItems || []).some((item) => item.component === 'SecretsView')) throw new Error('secrets workspace item missing');
  if (!(manifest.contributes.settingsPanels || []).some((item) => item.component === 'SecretsView')) throw new Error('secrets settings panel missing');

  const document = makeDocument();
  const errorLog = [];
  const component = loadComponent(document, errorLog);
  const records = [
    { id: 'global.server', title: 'Global Server', username: 'root', scope: { kind: 'global' }, updatedAt: '2026-06-29T00:00:00Z' },
    { id: 'client-a.db', title: 'Client A DB', username: 'app', scope: { kind: 'workspace', workspaceRootPath: 'ClientA' }, updatedAt: '2026-06-29T00:00:00Z' },
  ];
  let initialized = false;
  let unlocked = false;
  let unlockError = '';
  const readCalls = [];
  const copied = [];
  const deleted = [];
  const api = {
    secrets: {
      status: async () => ({ initialized, unlocked }),
      unlock: async (password) => {
        if (unlockError) throw new Error(unlockError);
        if (password !== 'master-password') throw new Error('bad password');
        initialized = true;
        unlocked = true;
      },
      list: async () => records,
      read: async (id) => {
        readCalls.push(id);
        return { ...records.find((record) => record.id === id), value: 'secret-value' };
      },
      write: async (record) => {
        const next = { ...record, id: record.id || 'generated.id', updatedAt: '2026-06-29T00:00:00Z' };
        const idx = records.findIndex((item) => item.id === next.id);
        const listRecord = { ...next };
        delete listRecord.value;
        if (idx >= 0) records[idx] = listRecord;
        else records.push(listRecord);
        return listRecord;
      },
      delete: async (id) => {
        deleted.push(id);
        const idx = records.findIndex((record) => record.id === id);
        if (idx >= 0) records.splice(idx, 1);
      },
      copyLink: async (id) => `[${records.find((record) => record.id === id).title}](verstak-secret://${id})`,
    },
    clipboard: {
      writeText: async (text) => copied.push(text),
    },
    files: {
      list: async () => [
        { type: 'folder', relativePath: 'ClientA' },
        { type: 'folder', relativePath: 'ClientB' },
      ],
    },
  };

  const container = document.createElement('div');
  component.mount(container, { workspaceRootPath: 'ClientA', resource: { path: 'client-a.db' } }, api);
  await flush();

  if (!container.textContent.includes('Create master password')) throw new Error('setup screen did not render');
  const passwordInput = walk(container, (node) => node.getAttribute && node.getAttribute('data-secret-master-password') === '');
  const confirmInput = walk(container, (node) => node.getAttribute && node.getAttribute('data-secret-master-password-confirm') === '');
  const unlockButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-secret-unlock') === '');
  if (!passwordInput || !confirmInput || !unlockButton) throw new Error('setup controls missing');
  unlockError = '[plugin:verstak.secrets] secrets.unlock failed: master password must be at least 8 characters';
  passwordInput.value = 'short';
  confirmInput.value = 'short';
  unlockButton.click();
  await flush();
  if (!container.textContent.includes('Master password must be at least 8 characters')) {
    throw new Error('weak master password error was not explained clearly');
  }
  if (container.textContent.includes('[plugin:') || container.textContent.includes('secrets.unlock')) {
    throw new Error('technical unlock details leaked into the Secrets UI');
  }
  if (!errorLog.some((entry) => entry.includes('[plugin:verstak.secrets] secrets.unlock failed'))) {
    throw new Error('technical unlock details were not retained in the console log');
  }
  unlockError = '';
  passwordInput.value = 'master-password';
  confirmInput.value = 'master-password';
  unlockButton.click();
  await flush();

  if (!container.textContent.includes('Global')) throw new Error('global group missing');
  if (!container.textContent.includes('ClientA')) throw new Error('workspace group missing');
  if (!container.textContent.includes('Client A DB')) throw new Error('workspace secret missing');
  if (!readCalls.includes('client-a.db')) throw new Error('deep-linked secret was not selected/read');
  if (!container.textContent.includes('Group')) throw new Error('secret field table missing Group row');
  if (!container.textContent.includes('Username')) throw new Error('secret field table missing Username row');
  if (!container.textContent.includes('Password')) throw new Error('secret field table missing Password row');
  if (container.textContent.includes('secret-value')) throw new Error('secret value must stay hidden until the user explicitly reveals it');
  const copyValueButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-secret-copy-value') === 'client-a.db');
  if (!copyValueButton) throw new Error('copy value button missing');
  copyValueButton.click();
  await flush();
  if (!copied.includes('secret-value')) throw new Error('secret value was not copied');
  const showValueButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-secret-toggle-value') === 'client-a.db');
  if (!showValueButton) throw new Error('show value button missing');
  showValueButton.click();
  await flush();
  if (!container.textContent.includes('secret-value')) throw new Error('secret value was not revealed after explicit request');

  const copyButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-secret-copy-link') === 'client-a.db');
  if (!copyButton) throw new Error('copy link button missing');
  copyButton.click();
  await flush();
  if (!copied.includes('[Client A DB](verstak-secret://client-a.db)')) throw new Error('secret link was not copied');

  const editButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-secret-edit') === 'client-a.db');
  if (!editButton) throw new Error('edit button missing');
  editButton.click();
  await flush();
  const titleInput = walk(container, (node) => node.getAttribute && node.getAttribute('data-secret-title') === '');
  const valueInput = walk(container, (node) => node.getAttribute && node.getAttribute('data-secret-value') === '');
  const saveButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-secret-save') === '');
  if (!titleInput || !valueInput || !saveButton) throw new Error('edit form controls missing');
  titleInput.value = 'Client A DB Updated';
  valueInput.value = 'updated-secret-value';
  saveButton.click();
  await flush();
  if (!records.some((record) => record.id === 'client-a.db' && record.title === 'Client A DB Updated')) throw new Error('secret edit did not persist');

  const deleteButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-secret-delete') === 'client-a.db');
  if (!deleteButton) throw new Error('delete button missing');
  deleteButton.click();
  await flush();
  if (deleted.includes('client-a.db')) throw new Error('secret delete must wait for confirmation');
  const deleteConfirmModal = walk(document.body, (node) => node.getAttribute && node.getAttribute('data-secret-delete-modal') === '');
  if (!deleteConfirmModal) throw new Error('secret delete confirmation modal missing');
  const deleteCancelButton = walk(deleteConfirmModal, (node) => node.getAttribute && node.getAttribute('data-secret-delete-cancel') === '');
  if (!deleteCancelButton) throw new Error('secret delete cancel button missing');
  deleteCancelButton.click();
  await flush();
  if (deleted.includes('client-a.db')) throw new Error('secret delete ran after cancelling the confirmation');
  deleteButton.click();
  await flush();
  const deleteConfirmButton = walk(document.body, (node) => node.getAttribute && node.getAttribute('data-secret-delete-confirm') === '');
  if (!deleteConfirmButton) throw new Error('secret delete confirm button missing');
  deleteConfirmButton.click();
  await flush();
  if (!deleted.includes('client-a.db')) throw new Error('secret delete was not called');

  records.push({ id: 'client-a.global-view', title: 'Client A Global View', username: 'app', scope: { kind: 'workspace', workspaceRootPath: 'ClientA' }, updatedAt: '2026-06-29T00:00:00Z' });
  const globalContainer = document.createElement('div');
  component.mount(globalContainer, {}, api);
  await flush();

  if (!globalContainer.textContent.includes('Global Server') || !globalContainer.textContent.includes('Client A Global View')) {
    throw new Error('global secrets view did not show global and Deal-scoped records');
  }
  const scopeFilter = walk(globalContainer, (node) => node.getAttribute && node.getAttribute('data-secret-scope-filter') === '');
  if (!scopeFilter) throw new Error('global secrets scope filter missing');
  scopeFilter.value = 'workspace:ClientA';
  scopeFilter.dispatchEvent('change');
  await flush();
  if (!globalContainer.textContent.includes('Client A Global View') || globalContainer.textContent.includes('Global Server')) {
    throw new Error('global secrets scope filter did not isolate the selected Deal');
  }
  const searchInput = walk(globalContainer, (node) => node.getAttribute && node.getAttribute('data-secret-search') === '');
  if (!searchInput) throw new Error('global secrets search missing');
  searchInput.value = 'no-match';
  searchInput.dispatchEvent('input');
  await flush();
  if (!globalContainer.textContent.includes('No secrets')) throw new Error('global secrets search did not filter records');

  scopeFilter.value = 'all';
  scopeFilter.dispatchEvent('change');
  await flush();
  const newButton = walk(globalContainer, (node) => node.tagName === 'BUTTON' && node.textContent === 'New');
  if (!newButton) throw new Error('global secrets new button missing');
  newButton.click();
  await flush();
  const globalTitleInput = walk(globalContainer, (node) => node.getAttribute && node.getAttribute('data-secret-title') === '');
  const globalValueInput = walk(globalContainer, (node) => node.getAttribute && node.getAttribute('data-secret-value') === '');
  const scopeInput = walk(globalContainer, (node) => node.getAttribute && node.getAttribute('data-secret-scope') === '');
  const workspaceInput = walk(globalContainer, (node) => node.getAttribute && node.getAttribute('data-secret-workspace') === '');
  const globalSaveButton = walk(globalContainer, (node) => node.getAttribute && node.getAttribute('data-secret-save') === '');
  if (!globalTitleInput || !globalValueInput || !scopeInput || !workspaceInput || !globalSaveButton) throw new Error('global Deal-scoped secret form controls missing');
  globalTitleInput.value = 'Client B API';
  globalValueInput.value = 'client-b-api-value';
  scopeInput.value = 'workspace';
  scopeInput.dispatchEvent('change');
  workspaceInput.value = 'ClientB';
  globalSaveButton.click();
  await flush();
  if (!records.some((record) => record.title === 'Client B API' && record.scope && record.scope.workspaceRootPath === 'ClientB')) {
    throw new Error('global secrets form did not create a Deal-scoped secret');
  }

  console.log('secrets plugin smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
