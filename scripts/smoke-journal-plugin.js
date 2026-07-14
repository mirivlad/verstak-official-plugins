#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'plugins', 'journal', 'plugin.json');
const sourcePath = path.join(root, 'plugins', 'journal', 'frontend', 'src', 'index.js');
const russianLocalePath = path.join(root, 'plugins', 'journal', 'locales', 'ru.json');

if (!fs.existsSync(manifestPath)) throw new Error('journal plugin manifest missing');
if (!fs.existsSync(sourcePath)) throw new Error('journal frontend entry missing');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const source = fs.readFileSync(sourcePath, 'utf8');
const russianLocale = JSON.parse(fs.readFileSync(russianLocalePath, 'utf8'));

class FakeNode {
  constructor(tagName) {
    this.tagName = String(tagName || '').toUpperCase();
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.className = '';
    this.value = '';
    this.checked = false;
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
    if (name === 'value') this.value = String(value);
    if (name === 'checked') this.checked = true;
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

function walkAll(node, fn, matches = []) {
  if (fn(node)) matches.push(node);
  for (const child of node.children) walkAll(child, fn, matches);
  return matches;
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
    document,
    window: {
      VerstakPluginRegister(pluginId, bundle) {
        registry[pluginId] = bundle.components || {};
      },
    },
  }, { filename: sourcePath });
  const component = registry['verstak.journal'] && registry['verstak.journal'].JournalView;
  if (!component) throw new Error('JournalView was not registered');
  return component;
}

function makeApi(initialSettings = {}, locale = null) {
  const settings = { ...initialSettings };
  const publishedEvents = [];
  return {
    publishedEvents,
    settings: {
      read: async (key) => (key ? settings[key] : { ...settings }),
      write: async (key, value) => {
        settings[key] = value;
        return { ...settings };
      },
    },
    events: {
      publish: async (name, payload) => {
        publishedEvents.push({ name, payload });
      },
    },
    files: {
      list: async () => [
        { type: 'folder', relativePath: 'Project', name: 'Project' },
        { type: 'folder', relativePath: 'Client', name: 'Client' },
      ],
    },
    i18n: locale ? {
      t(key, params, fallback) {
        return String(locale[key] || fallback || key).replace(/\{(\w+)\}/g, (_match, name) => String((params || {})[name] ?? ''));
      },
    } : null,
    storedEntries(key) {
      return settings[key] || [];
    },
  };
}

async function flush() {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
}

async function mountWithApi(api, props = { workspaceNode: { name: 'Project' }, workspaceRootPath: 'Project' }, document = makeDocument()) {
  const component = loadComponent(document);
  const container = new FakeNode('div');
  component.mount(container, props, api);
  await flush();
  return { component, container, document };
}

function byData(container, attr, value) {
  const node = walk(container, (candidate) => candidate.getAttribute && candidate.getAttribute(attr) === value);
  if (!node) throw new Error(`${attr}=${value} not found`);
  return node;
}

(async () => {
  if (manifest.id !== 'verstak.journal') throw new Error('journal manifest id mismatch');
  for (const capability of ['worklog', 'journal', 'report.worklog']) {
    if (!manifest.provides.includes(capability)) throw new Error(`journal manifest missing capability ${capability}`);
  }
  if ((manifest.optionalRequires || []).includes('activity.reconstruction')) throw new Error('Journal must remain available without Activity');
  if (!manifest.permissions.includes('storage.namespace')) throw new Error('journal manifest must request storage.namespace');
  if (!manifest.permissions.includes('events.publish')) throw new Error('journal manifest must request events.publish');
  if (!manifest.permissions.includes('ui.register')) throw new Error('journal manifest must request ui.register');
  if (!(manifest.contributes.workspaceItems || []).some((item) => item.component === 'JournalView')) throw new Error('journal workspace item missing');
  if (!(manifest.contributes.sidebarItems || []).some((item) => item.view === 'verstak.journal.view')) throw new Error('journal sidebar item missing');

  const api = makeApi();
  const { component, container } = await mountWithApi(api);
  const projectKey = 'worklog:workspace:Project';

  if (walk(container, (node) => node.getAttribute && node.getAttribute('data-journal-action') === 'import-activity')) {
    throw new Error('Journal must not provide direct Activity import');
  }

  byData(container, 'data-journal-action', 'add').click();
  await flush();
  byData(container, 'data-journal-input', 'date').value = '2026-06-27';
  byData(container, 'data-journal-input', 'title').value = 'Draft brief';
  byData(container, 'data-journal-input', 'summary').value = 'Reviewed docs';
  byData(container, 'data-journal-input', 'minutes').value = '45';
  byData(container, 'data-journal-action', 'save-entry').click();
  await flush();

  if (api.storedEntries(projectKey).length !== 1) throw new Error('manual journal entry was not stored');
  if (api.storedEntries(projectKey)[0].activityIds.length !== 0) throw new Error('manual journal entry must not require activity links');
  if (!container.textContent.includes('Draft brief')) throw new Error('manual journal entry was not rendered');
  if (!container.textContent.includes('45 min')) throw new Error('manual journal entry minutes were not rendered');

  byData(container, 'data-journal-action', 'edit').click();
  await flush();
  byData(container, 'data-journal-input', 'title').value = 'Draft brief updated';
  byData(container, 'data-journal-input', 'summary').value = 'Reviewed docs and drafted notes';
  byData(container, 'data-journal-input', 'minutes').value = '60';
  byData(container, 'data-journal-action', 'save-entry').click();
  await flush();

  if (api.storedEntries(projectKey).length !== 1) throw new Error('editing journal entry created a duplicate');
  if (api.storedEntries(projectKey)[0].title !== 'Draft brief updated') throw new Error('journal entry title was not updated');
  if (!container.textContent.includes('60 min')) throw new Error('edited journal entry minutes were not rendered');

  const candidate = {
    candidateId: 'work-session:Project:capture-1:note-1',
    sessionId: 'session-journal-1',
    handledThrough: '2026-06-27T11:03:00.000Z',
    workspaceRootPath: 'Project',
    startedAt: '2026-06-27T10:12:00.000Z',
    endedAt: '2026-06-27T11:03:00.000Z',
    estimatedMinutes: 51,
    activityCount: 2,
    activityIds: ['capture-1', 'note-1'],
    activities: [
      { activityId: 'capture-1', type: 'browser.capture.selection', occurredAt: '2026-06-27T10:12:00.000Z', sourcePluginId: 'verstak.browser-inbox' },
      { activityId: 'note-1', type: 'note.saved', occurredAt: '2026-06-27T11:03:00.000Z', sourcePluginId: 'verstak.notes' },
    ],
  };
  const candidateView = await mountWithApi(api, {
    workspaceNode: { name: 'Project' },
    workspaceRootPath: 'Project',
    toolRequest: { type: 'work-session-candidate', candidate },
  });
  if (!candidateView.container.textContent.includes('Review possible journal entry')) throw new Error('candidate review modal was not opened');
  if (!candidateView.container.textContent.includes('Deal: Project')) throw new Error('candidate Deal was not shown for review');
  if (!candidateView.container.textContent.includes('Estimated duration: 51 min')) throw new Error('candidate duration was not shown for review');
  if (candidateView.container.textContent.includes('browser.capture.selection') || candidateView.container.textContent.includes('verstak.browser-inbox') || candidateView.container.textContent.includes('capture-1')) {
    throw new Error('candidate review exposed technical Activity identifiers');
  }
  if (byData(candidateView.container, 'data-journal-input', 'title').value !== '') throw new Error('candidate review must start with an empty title');
  if (byData(candidateView.container, 'data-journal-input', 'summary').value !== '') throw new Error('candidate review must start with an empty body');
  if (byData(candidateView.container, 'data-journal-input', 'minutes').value !== '51') throw new Error('candidate review must prefill the factual duration');
  const linkedActivityInputs = walkAll(candidateView.container, (node) => node.getAttribute && node.getAttribute('data-journal-candidate-activity'));
  if (linkedActivityInputs.length !== 2 || linkedActivityInputs.some((node) => node.checked !== true)) throw new Error('candidate activities were not available for review');
  byData(candidateView.container, 'data-journal-input', 'title').value = 'Review research capture';
  byData(candidateView.container, 'data-journal-input', 'summary').value = 'Read the capture and updated the project note.';
  linkedActivityInputs[1].checked = false;
  byData(candidateView.container, 'data-journal-action', 'save-entry').click();
  await flush();

  if (api.storedEntries(projectKey).length !== 2) throw new Error('reviewed candidate was not saved as a journal entry');
  const linkedEntry = api.storedEntries(projectKey).find((entry) => entry.sourceCandidateId === candidate.candidateId);
  if (!linkedEntry) throw new Error('candidate reference was not stored on the journal entry');
  if (linkedEntry.title !== 'Review research capture' || linkedEntry.summary !== 'Read the capture and updated the project note.') {
    throw new Error('candidate review did not keep the user-authored entry fields');
  }
  if (linkedEntry.activityIds.join(',') !== 'capture-1') throw new Error('candidate review did not persist selected activity ids');
  const handledEvent = api.publishedEvents.find((event) => event.name === 'activity.session.handled');
  if (!handledEvent || handledEvent.payload.sessionId !== 'session-journal-1' || handledEvent.payload.handledThrough !== '2026-06-27T11:03:00.000Z' || handledEvent.payload.status !== 'accepted') {
    throw new Error('accepted Journal candidate did not persist a session watermark');
  }
  if (walk(candidateView.container, (node) => node.getAttribute && node.getAttribute('data-journal-action') === 'view-activity')) {
    throw new Error('journal rows must not navigate to Activity by default');
  }

  const russianCandidateView = await mountWithApi(makeApi({}, russianLocale), {
    workspaceNode: { name: 'Project' },
    workspaceRootPath: 'Project',
    toolRequest: { type: 'work-session-candidate', candidate },
  });
  if (!russianCandidateView.container.textContent.includes('Дело: Project') || !russianCandidateView.container.textContent.includes('Захвачено выделение')) {
    throw new Error('candidate review was not localized');
  }

  byData(candidateView.container, 'data-journal-action', 'delete').click();
  await flush();
  if (api.storedEntries(projectKey).length !== 1) throw new Error('journal entry was not deleted');

  const completedTodo = {
    id: 'todo:Project:project-review',
    title: 'Prepare project review',
    description: 'Collect factual review notes.',
    workspaceRootPath: 'Project',
    completedAt: '2026-06-27T11:15:00.000Z',
  };
  const todoView = await mountWithApi(api, {
    workspaceNode: { name: 'Project' },
    workspaceRootPath: 'Project',
    toolRequest: { type: 'completed-todo', todo: completedTodo },
  });
  if (!todoView.container.textContent.includes('Create journal entry from completed todo')) {
    throw new Error('completed Todo did not open the Journal conversion form');
  }
  if (!byData(todoView.container, 'data-journal-todo', completedTodo.id)) {
    throw new Error('completed Todo context was not shown in the Journal form');
  }
  if (byData(todoView.container, 'data-journal-input', 'title').value !== completedTodo.title) {
    throw new Error('completed Todo Journal form did not prefill the exact title');
  }
  if (byData(todoView.container, 'data-journal-input', 'summary').value !== completedTodo.description) {
    throw new Error('completed Todo Journal form did not prefill the exact description');
  }
  if (byData(todoView.container, 'data-journal-input', 'minutes').value !== '0') {
    throw new Error('completed Todo Journal form must not invent a duration');
  }
  byData(todoView.container, 'data-journal-input', 'title').value = 'Prepare project review for handoff';
  byData(todoView.container, 'data-journal-input', 'summary').value = 'Reviewed factual project notes before handoff.';
  byData(todoView.container, 'data-journal-action', 'save-entry').click();
  await flush();

  if (api.storedEntries(projectKey).length !== 2) throw new Error('completed Todo Journal entry was not saved');
  const todoEntry = api.storedEntries(projectKey).find((entry) => entry.sourceTodoId === completedTodo.id);
  if (!todoEntry) throw new Error('completed Todo reference was not stored on the Journal entry');
  if (todoEntry.title !== 'Prepare project review for handoff' || todoEntry.summary !== 'Reviewed factual project notes before handoff.') {
    throw new Error('completed Todo Journal form did not preserve the user-edited fields');
  }

  const duplicateTodoView = await mountWithApi(api, {
    workspaceNode: { name: 'Project' },
    workspaceRootPath: 'Project',
    toolRequest: { type: 'completed-todo', todo: completedTodo },
  });
  byData(duplicateTodoView.container, 'data-journal-action', 'save-entry').click();
  await flush();
  if (api.storedEntries(projectKey).filter((entry) => entry.sourceTodoId === completedTodo.id).length !== 1) {
    throw new Error('completed Todo Journal conversion created a duplicate entry');
  }

  const globalView = await mountWithApi(api, {});
  if (!globalView.container.textContent.includes('Review research capture') && !globalView.container.textContent.includes('Draft brief updated')) {
    throw new Error('global journal did not aggregate remaining entries');
  }
  const globalAdd = byData(globalView.container, 'data-journal-action', 'add');
  if (globalAdd.disabled) throw new Error('global Journal Add must be available');
  globalAdd.click();
  await flush();
  const globalWorkspace = byData(globalView.container, 'data-journal-input', 'workspaceRootPath');
  if (!globalWorkspace || globalWorkspace.tagName !== 'SELECT') throw new Error('global Journal form did not render the Deal selector');
  globalWorkspace.value = 'Client';
  byData(globalView.container, 'data-journal-input', 'title').value = 'Prepare client summary';
  byData(globalView.container, 'data-journal-input', 'minutes').value = '30';
  byData(globalView.container, 'data-journal-action', 'save-entry').click();
  await flush();
  const clientKey = 'worklog:workspace:Client';
  if (api.storedEntries(clientKey).length !== 1 || api.storedEntries(clientKey)[0].title !== 'Prepare client summary') {
    throw new Error('global Journal entry was not stored under the selected Deal');
  }
  if (!globalView.container.textContent.includes('Prepare client summary')) throw new Error('global Journal did not render the created entry');

  component.unmount && component.unmount(container);
  component.unmount && component.unmount(candidateView.container);
  component.unmount && component.unmount(russianCandidateView.container);
  component.unmount && component.unmount(todoView.container);
  component.unmount && component.unmount(duplicateTodoView.container);
  component.unmount && component.unmount(globalView.container);

  console.log('journal plugin smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
