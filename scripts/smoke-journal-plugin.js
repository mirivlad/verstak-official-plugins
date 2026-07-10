#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'plugins', 'journal', 'plugin.json');
const sourcePath = path.join(root, 'plugins', 'journal', 'frontend', 'src', 'index.js');

if (!fs.existsSync(manifestPath)) throw new Error('journal plugin manifest missing');
if (!fs.existsSync(sourcePath)) throw new Error('journal frontend entry missing');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const source = fs.readFileSync(sourcePath, 'utf8');

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

function makeApi(initialSettings = {}) {
  const settings = { ...initialSettings };
  return {
    settings: {
      read: async (key) => (key ? settings[key] : { ...settings }),
      write: async (key, value) => {
        settings[key] = value;
        return { ...settings };
      },
    },
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
  if (!candidateView.container.textContent.includes('Workspace: Project')) throw new Error('candidate workspace was not shown for review');
  if (!candidateView.container.textContent.includes('Estimated duration: 51 min')) throw new Error('candidate duration was not shown for review');
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
  if (walk(candidateView.container, (node) => node.getAttribute && node.getAttribute('data-journal-action') === 'view-activity')) {
    throw new Error('journal rows must not navigate to Activity by default');
  }

  byData(candidateView.container, 'data-journal-action', 'delete').click();
  await flush();
  if (api.storedEntries(projectKey).length !== 1) throw new Error('journal entry was not deleted');

  const globalView = await mountWithApi(api, {});
  if (!globalView.container.textContent.includes('Review research capture') && !globalView.container.textContent.includes('Draft brief updated')) {
    throw new Error('global journal did not aggregate remaining entries');
  }

  component.unmount && component.unmount(container);
  component.unmount && component.unmount(candidateView.container);
  component.unmount && component.unmount(globalView.container);

  console.log('journal plugin smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
