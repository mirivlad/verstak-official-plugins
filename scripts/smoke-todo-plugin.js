#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'todo', 'frontend', 'src', 'index.js');
const manifestPath = path.join(root, 'plugins', 'todo', 'plugin.json');
const source = fs.readFileSync(sourcePath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

class FakeNode {
  constructor(tagName) {
    this.tagName = String(tagName || '').toUpperCase();
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.style = {};
    this.className = '';
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.parentNode = null;
    this._textContent = '';
    this._innerHTML = '';
  }

  appendChild(node) {
    if (!(node instanceof FakeNode)) throw new TypeError('appendChild expects FakeNode');
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

  removeAttribute(name) {
    delete this.attributes[name];
  }

  addEventListener(type, handler) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(handler);
  }

  dispatchEvent(type, event = {}) {
    (this.listeners[type] || []).forEach((handler) => handler({
      target: this,
      currentTarget: this,
      preventDefault() {},
      stopPropagation() {},
      ...event,
    }));
  }

  click() {
    this.dispatchEvent('click');
  }

  focus() {}

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

function walk(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.children) {
    const found = walk(child, predicate);
    if (found) return found;
  }
  return null;
}

function byData(node, name, value) {
  return walk(node, (item) => item.getAttribute && item.getAttribute(name) === value);
}

function makeDocument() {
  return {
    head: new FakeNode('head'),
    body: new FakeNode('body'),
    createElement(tagName) {
      return new FakeNode(tagName);
    },
    createTextNode(value) {
      const node = new FakeNode('#text');
      node.textContent = value;
      return node;
    },
    getElementById() {
      return null;
    },
  };
}

function loadComponent(document) {
  const registry = {};
  const window = {
    VerstakPluginRegister(pluginId, bundle) {
      registry[pluginId] = bundle.components || {};
    },
  };
  window.window = window;
  window.document = document;
  vm.runInNewContext(source, { console, Date, Math, document, window }, { filename: sourcePath });
  const component = registry['verstak.todo'] && registry['verstak.todo'].TodoView;
  if (!component) throw new Error('TodoView was not registered');
  return component;
}

function makeApi(initialSettings = {}) {
  const settings = { ...initialSettings };
  return {
    settings,
    settingsApi: {
      read: async (key) => (key ? settings[key] : { ...settings }),
      write: async (key, value) => {
        settings[key] = value;
        return { ...settings };
      },
    },
    files: {
      list: async () => [
        { name: 'ClientA', relativePath: 'ClientA', type: 'folder' },
        { name: 'Project', relativePath: 'Project', type: 'folder' },
      ],
    },
    get api() {
      return { settings: this.settingsApi, files: this.files };
    },
  };
}

async function flush() {
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
}

async function mountWithApi(apiState, props, document = makeDocument()) {
  const component = loadComponent(document);
  const container = new FakeNode('div');
  component.mount(container, props, apiState.api);
  await flush();
  return { component, container, document };
}

(async () => {
  if (manifest.id !== 'verstak.todo') throw new Error('todo manifest id mismatch');
  if (!manifest.permissions.includes('storage.namespace')) throw new Error('todo manifest must request storage.namespace');
  if (!manifest.permissions.includes('files.read')) throw new Error('todo manifest must request files.read');
  if (!(manifest.contributes.views || []).length) throw new Error('todo manifest must contribute a global view');
  if (!(manifest.contributes.workspaceItems || []).length) throw new Error('todo manifest must contribute a workspace item');

  const apiState = makeApi();
  const workspaceView = await mountWithApi(apiState, { workspaceRootPath: 'Project', workspaceNode: { name: 'Project' } });
  const { container } = workspaceView;
  if (!container.textContent.includes('Todos · Project')) throw new Error('workspace Todo title was not rendered');
  if (!byData(container, 'data-todo-action', 'add')) throw new Error('workspace add action was not rendered');

  byData(container, 'data-todo-action', 'add').click();
  byData(container, 'data-todo-input', 'title').value = 'Prepare project review';
  byData(container, 'data-todo-input', 'description').value = 'Collect factual review notes.';
  byData(container, 'data-todo-input', 'priority').value = 'high';
  byData(container, 'data-todo-input', 'dueAt').value = '2000-01-01';
  byData(container, 'data-todo-input', 'reminderAt').value = '2000-01-01T09:00';
  byData(container, 'data-todo-action', 'save').click();
  await flush();

  const storedAfterCreate = apiState.settings['todos:global'] || [];
  if (storedAfterCreate.length !== 1) throw new Error(`expected one stored todo, got ${storedAfterCreate.length}`);
  const createdTodo = storedAfterCreate[0];
  if (createdTodo.workspaceRootPath !== 'Project') throw new Error('workspace Todo did not keep the Project root path');
  if (createdTodo.status !== 'open' || createdTodo.priority !== 'high') throw new Error('Todo status or priority was not stored');
  if (createdTodo.dueAt !== '2000-01-01' || createdTodo.reminderAt !== '2000-01-01T09:00') throw new Error('Todo due/reminder metadata was not stored');
  if (!container.textContent.includes('Overdue') || !container.textContent.includes('Reminder due')) throw new Error('due/reminder indicators were not rendered');

  byData(container, 'data-todo-action', 'edit').click();
  byData(container, 'data-todo-input', 'title').value = 'Prepare project review updated';
  byData(container, 'data-todo-action', 'save').click();
  await flush();
  if (apiState.settings['todos:global'][0].title !== 'Prepare project review updated') throw new Error('Todo edit was not persisted');

  byData(container, 'data-todo-action', 'mark-done').click();
  await flush();
  if (apiState.settings['todos:global'][0].status !== 'done' || !apiState.settings['todos:global'][0].completedAt) {
    throw new Error('mark done did not persist completed state');
  }
  if (!byData(container, 'data-todo-action', 'reopen')) throw new Error('done Todo did not expose reopen action');

  apiState.settings['todos:global'].push({
    id: 'todo-client',
    title: 'Client follow-up',
    workspaceRootPath: 'ClientA',
    status: 'open',
    priority: 'normal',
    createdAt: '2026-06-30T08:00:00.000Z',
    updatedAt: '2026-06-30T08:00:00.000Z',
  });
  const globalView = await mountWithApi(apiState, {});
  if (!globalView.container.textContent.includes('Prepare project review updated') || !globalView.container.textContent.includes('Client follow-up')) {
    throw new Error('global Todo view did not aggregate workspace todos');
  }
  const workspaceFilter = byData(globalView.container, 'data-todo-filter', 'workspace');
  workspaceFilter.value = 'ClientA';
  workspaceFilter.dispatchEvent('change');
  await flush();
  if (!globalView.container.textContent.includes('Client follow-up') || globalView.container.textContent.includes('Prepare project review updated')) {
    throw new Error('global Todo workspace filter was not applied');
  }
  const statusFilter = byData(globalView.container, 'data-todo-filter', 'status');
  workspaceFilter.value = '';
  workspaceFilter.dispatchEvent('change');
  statusFilter.value = 'done';
  statusFilter.dispatchEvent('change');
  await flush();
  if (!globalView.container.textContent.includes('Prepare project review updated') || globalView.container.textContent.includes('Client follow-up')) {
    throw new Error('global Todo status filter was not applied');
  }

  const clientView = await mountWithApi(apiState, { workspaceRootPath: 'ClientA', workspaceNode: { name: 'ClientA' } });
  if (!clientView.container.textContent.includes('Client follow-up') || clientView.container.textContent.includes('Prepare project review updated')) {
    throw new Error('workspace Todo view leaked another workspace todo');
  }

  statusFilter.value = 'all';
  statusFilter.dispatchEvent('change');
  await flush();
  byData(container, 'data-todo-action', 'delete').click();
  await flush();
  if ((apiState.settings['todos:global'] || []).some((todo) => todo.id === createdTodo.id)) throw new Error('Todo delete was not persisted');

  workspaceView.component.unmount && workspaceView.component.unmount(container);
  globalView.component.unmount && globalView.component.unmount(globalView.container);
  clientView.component.unmount && clientView.component.unmount(clientView.container);
  console.log('todo plugin smoke passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
