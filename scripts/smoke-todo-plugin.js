#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'todo', 'frontend', 'src', 'index.js');
const manifestPath = path.join(root, 'plugins', 'todo', 'plugin.json');
const source = fs.readFileSync(sourcePath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const localeCatalogs = {
  en: JSON.parse(fs.readFileSync(path.join(root, 'plugins', 'todo', 'locales', 'en.json'), 'utf8')),
  ru: JSON.parse(fs.readFileSync(path.join(root, 'plugins', 'todo', 'locales', 'ru.json'), 'utf8')),
};

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

function FakeCustomEvent(type, options = {}) {
  this.type = type;
  this.detail = options.detail;
}

function loadComponent(document, emittedEvents) {
  const registry = {};
  const window = {
    VerstakPluginRegister(pluginId, bundle) {
      registry[pluginId] = bundle.components || {};
    },
    dispatchEvent(event) {
      emittedEvents.push(event);
    },
  };
  window.window = window;
  window.document = document;
  window.CustomEvent = FakeCustomEvent;
  vm.runInNewContext(source, { console, Date, Math, CustomEvent: FakeCustomEvent, document, window }, { filename: sourcePath });
  const component = registry['verstak.todo'] && registry['verstak.todo'].TodoView;
  if (!component) throw new Error('TodoView was not registered');
  return component;
}

function makeApi(initialSettings = {}, initialLocale = 'en') {
  const settings = { ...initialSettings };
  const notificationCalls = [];
  let locale = initialLocale;
  const localeListeners = [];
  return {
    settings,
    notificationCalls,
    settingsApi: {
      read: async (key) => (key ? settings[key] : { ...settings }),
      write: async (key, value) => {
        settings[key] = value;
        return { ...settings };
      },
    },
    files: {
      list: async () => [
        { name: 'OrdinaryFolder', relativePath: 'OrdinaryFolder', type: 'folder' },
        { name: 'DealWithoutTodo', relativePath: 'DealWithoutTodo', type: 'folder' },
        { name: 'Project', relativePath: 'Project', type: 'folder' },
      ],
    },
    workspaces: {
      list: async () => [
        { id: 'workspace-project', name: 'Project', rootPath: 'Project' },
        { id: 'workspace-client', name: 'ClientA', rootPath: 'ClientA' },
        { id: 'workspace-nested', name: 'Acme', rootPath: 'Clients/Acme' },
      ],
    },
    notifications: {
      replace: async (items) => {
        notificationCalls.push((Array.isArray(items) ? items : []).map((item) => ({ ...item })));
      },
    },
    setLocale(nextLocale) {
      locale = nextLocale;
      localeListeners.slice().forEach((listener) => listener(locale));
    },
    get api() {
      return {
        settings: this.settingsApi,
        files: this.files,
        workspaces: this.workspaces,
        notifications: this.notifications,
        i18n: {
          getLocale: () => locale,
          t: (key, params, fallback) => {
            const message = localeCatalogs[locale]?.[key] || localeCatalogs.en[key] || fallback || key;
            return message.replace(/\{([^}]+)\}/g, (placeholder, name) => (
              Object.prototype.hasOwnProperty.call(params || {}, name) ? String(params[name]) : placeholder
            ));
          },
          onDidChangeLocale: (listener) => {
            localeListeners.push(listener);
            return () => {
              const index = localeListeners.indexOf(listener);
              if (index !== -1) localeListeners.splice(index, 1);
            };
          },
        },
      };
    },
  };
}

async function flush() {
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
}

async function mountWithApi(apiState, props, emittedEvents = [], document = makeDocument()) {
  const component = loadComponent(document, emittedEvents);
  const container = new FakeNode('div');
  component.mount(container, props, apiState.api);
  await flush();
  return { component, container, document, emittedEvents };
}

(async () => {
  if (manifest.id !== 'verstak.todo') throw new Error('todo manifest id mismatch');
  if (!manifest.permissions.includes('storage.namespace')) throw new Error('todo manifest must request storage.namespace');
  if (!manifest.permissions.includes('files.read')) throw new Error('todo manifest must request files.read');
  if (!manifest.permissions.includes('notifications.schedule')) throw new Error('todo manifest must request notifications.schedule');
  if (!manifest.requires.includes('verstak/core/notifications/v1')) throw new Error('todo manifest must require native notifications');
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
  byData(container, 'data-todo-input', 'dueAt').value = '01/02/2000';
  const reminderDate = byData(container, 'data-todo-input', 'reminderDate');
  const reminderTime = byData(container, 'data-todo-input', 'reminderTime');
  if (!reminderDate || reminderDate.getAttribute('type') !== 'date') throw new Error('Todo reminder date input was not rendered');
  if (!reminderTime || reminderTime.getAttribute('type') !== 'text') throw new Error('Todo reminder time must be a keyboard-editable text input');
  reminderDate.value = '01/02/2000';
  reminderTime.value = '09:30';
  byData(container, 'data-todo-action', 'save').click();
  await flush();

  const storedAfterCreate = apiState.settings['todos:global'] || [];
  if (storedAfterCreate.length !== 1) throw new Error(`expected one stored todo, got ${storedAfterCreate.length}`);
  const createdTodo = storedAfterCreate[0];
  if (createdTodo.workspaceRootPath !== 'Project') throw new Error('workspace Todo did not keep the Project root path');
  if (createdTodo.status !== 'open' || createdTodo.priority !== 'high') throw new Error('Todo status or priority was not stored');
  if (createdTodo.dueAt !== '2000-01-02' || createdTodo.reminderDate !== '2000-01-02' || createdTodo.reminderAt !== '2000-01-02T09:30') throw new Error('Todo due/reminder metadata was not stored');
  if (!container.textContent.includes('Overdue') || !container.textContent.includes('Reminder due')) throw new Error('due/reminder indicators were not rendered');
  const scheduledAfterCreate = apiState.notificationCalls.at(-1) || [];
  if (scheduledAfterCreate.length !== 1
    || scheduledAfterCreate[0].id !== createdTodo.id
    || scheduledAfterCreate[0].dueAt !== new Date(createdTodo.reminderAt).toISOString()
    || scheduledAfterCreate[0].title !== 'Todo reminder'
    || scheduledAfterCreate[0].body !== 'Prepare project review') {
    throw new Error('open Todo reminder was not scheduled as a native notification');
  }

  apiState.setLocale('ru');
  if (!container.textContent.includes('Задачи · Project') || !container.textContent.includes('Просрочено')) {
    throw new Error('Todo view did not update to Russian without remounting');
  }
  byData(container, 'data-todo-action', 'add').click();
  if (!container.textContent.includes('Дело: Project')) {
    throw new Error('Todo editor did not use Deal terminology in Russian');
  }
  const cancelModal = walk(container, (node) => node.tagName === 'BUTTON' && node.textContent === 'Отмена' && !node.getAttribute('data-todo-action'));
  if (!cancelModal) throw new Error('Todo editor cancel action was not rendered in Russian');
  cancelModal.click();
  if ((apiState.settings['todos:global'] || []).length !== 1) throw new Error('locale change lost Todo state');
  apiState.setLocale('en');

  byData(container, 'data-todo-action', 'edit').click();
  byData(container, 'data-todo-input', 'title').value = 'Prepare project review updated';
  byData(container, 'data-todo-input', 'reminderTime').value = '29:30';
  byData(container, 'data-todo-action', 'save').click();
  await flush();
  if (apiState.settings['todos:global'][0].title !== 'Prepare project review' || !container.textContent.includes('Enter a valid reminder time')) {
    throw new Error('invalid reminder time was saved instead of showing a human-readable error');
  }
  byData(container, 'data-todo-input', 'reminderTime').value = '';
  byData(container, 'data-todo-action', 'save').click();
  await flush();
  if (apiState.settings['todos:global'][0].title !== 'Prepare project review updated') throw new Error('Todo edit was not persisted');
  if (apiState.settings['todos:global'][0].reminderDate !== '2000-01-02' || apiState.settings['todos:global'][0].reminderAt !== '') {
    throw new Error('clearing reminder time did not preserve its date while cancelling the reminder');
  }
  if ((apiState.notificationCalls.at(-1) || []).length !== 0) throw new Error('clearing reminder time did not remove the native notification');

  byData(container, 'data-todo-action', 'mark-done').click();
  await flush();
  if (apiState.settings['todos:global'][0].status !== 'done' || !apiState.settings['todos:global'][0].completedAt) {
    throw new Error('mark done did not persist completed state');
  }
  if ((apiState.notificationCalls.at(-1) || []).length !== 0) {
    throw new Error('completed Todo reminder was not removed from native notification schedules');
  }
  if (!byData(container, 'data-todo-action', 'reopen')) throw new Error('done Todo did not expose reopen action');
  if (!byData(container, 'data-todo-action', 'create-journal-entry')) throw new Error('done workspace Todo did not expose Journal conversion');

  byData(container, 'data-todo-action', 'create-journal-entry').click();
  const journalEvent = workspaceView.emittedEvents.find((event) => event.type === 'verstak:workspace-open-tool');
  if (!journalEvent || !journalEvent.detail || journalEvent.detail.kind !== 'journal') {
    throw new Error('Todo Journal conversion did not request the Journal workspace tool');
  }
  const journalRequest = journalEvent.detail.toolRequest;
  if (!journalRequest || journalRequest.type !== 'completed-todo' || !journalRequest.todo) {
    throw new Error('Todo Journal conversion did not send a completed-todo request');
  }
  if (journalRequest.todo.id !== createdTodo.id
    || journalRequest.todo.title !== 'Prepare project review updated'
    || journalRequest.todo.description !== 'Collect factual review notes.'
    || journalRequest.todo.workspaceRootPath !== 'Project'
    || !journalRequest.todo.completedAt) {
    throw new Error('Todo Journal conversion did not preserve factual completed Todo fields');
  }

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
  if (!globalView.container.textContent.includes('All Deals')) {
    throw new Error('global Todo filter did not use Deal terminology');
  }
  const workspaceFilter = byData(globalView.container, 'data-todo-filter', 'workspace');
  const workspaceFilterValues = workspaceFilter.children.map((option) => option.value);
  if (!workspaceFilterValues.includes('Clients/Acme')) {
    throw new Error('global Todo selector omitted a nested semantic Deal');
  }
  if (workspaceFilterValues.includes('OrdinaryFolder') || workspaceFilterValues.includes('DealWithoutTodo')) {
    throw new Error('global Todo selector included a folder or a Deal without Todo');
  }
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
