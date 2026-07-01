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
  const commandCalls = [];
  return {
    commandCalls,
    settings: {
      read: async (key) => (key ? settings[key] : { ...settings }),
      write: async (key, value) => {
        settings[key] = value;
        return { ...settings };
      },
    },
    commands: {
      executeFor: async (pluginId, commandId, args) => {
        commandCalls.push({ pluginId, commandId, args });
        if (pluginId !== 'verstak.activity' || commandId !== 'verstak.activity.suggestWorklog') {
          throw new Error(`unexpected command ${pluginId}:${commandId}`);
        }
        return {
          status: 'handled',
          pluginId,
          commandId,
          result: {
            suggestions: [{
              suggestionId: 'worklog:Project:2026-06-27',
              workspaceRootPath: 'Project',
              date: '2026-06-27',
              title: 'Project work on 2026-06-27',
              summary: 'Example Article; Saved note',
              minutes: 30,
              eventIds: ['capture-1', 'note-1'],
            }],
          },
        };
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
  if (!manifest.optionalRequires.includes('activity.reconstruction')) throw new Error('journal manifest must optionally require activity.reconstruction');
  if (!manifest.permissions.includes('storage.namespace')) throw new Error('journal manifest must request storage.namespace');
  if (!manifest.permissions.includes('ui.register')) throw new Error('journal manifest must request ui.register');
  if (!(manifest.contributes.workspaceItems || []).some((item) => item.component === 'JournalView')) throw new Error('journal workspace item missing');
  if (!(manifest.contributes.sidebarItems || []).some((item) => item.view === 'verstak.journal.view')) throw new Error('journal sidebar item missing');

  const api = makeApi();
  const { component, container } = await mountWithApi(api);
  const projectKey = 'worklog:workspace:Project';

  byData(container, 'data-journal-action', 'add').click();
  await flush();
  byData(container, 'data-journal-input', 'date').value = '2026-06-27';
  byData(container, 'data-journal-input', 'title').value = 'Draft brief';
  byData(container, 'data-journal-input', 'summary').value = 'Reviewed docs';
  byData(container, 'data-journal-input', 'minutes').value = '45';
  byData(container, 'data-journal-action', 'save-entry').click();
  await flush();

  if (api.storedEntries(projectKey).length !== 1) throw new Error('manual journal entry was not stored');
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

  byData(container, 'data-journal-action', 'import-activity').click();
  await flush();

  if (api.commandCalls.length !== 1) throw new Error('activity suggestion command was not called');
  if (api.commandCalls[0].args.workspaceRootPath !== 'Project') throw new Error('activity suggestion command used wrong workspace');
  if (api.storedEntries(projectKey).length !== 2) throw new Error('activity suggestion was not imported as a journal entry');
  if (!container.textContent.includes('Project work on 2026-06-27')) throw new Error('imported activity suggestion was not rendered');

  byData(container, 'data-journal-action', 'import-activity').click();
  await flush();
  if (api.storedEntries(projectKey).length !== 2) throw new Error('duplicate activity suggestion was imported');

  byData(container, 'data-journal-action', 'delete').click();
  await flush();
  if (api.storedEntries(projectKey).length !== 1) throw new Error('journal entry was not deleted');

  const globalView = await mountWithApi(api, {});
  if (!globalView.container.textContent.includes('Project work on 2026-06-27') && !globalView.container.textContent.includes('Draft brief updated')) {
    throw new Error('global journal did not aggregate remaining entries');
  }

  component.unmount && component.unmount(container);
  component.unmount && component.unmount(globalView.container);

  console.log('journal plugin smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
