#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'activity', 'frontend', 'src', 'index.js');
const manifestPath = path.join(root, 'plugins', 'activity', 'plugin.json');
const source = fs.readFileSync(sourcePath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const WORKLOG_COMMAND_ID = 'verstak.activity.suggestWorklog';

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
  const commandHandlers = new Map();
  const unsubscribed = [];
  return {
    handlers,
    commandHandlers,
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
    commands: {
      register: async (commandId, handler) => {
        commandHandlers.set(commandId, handler);
        return () => commandHandlers.delete(commandId);
      },
    },
    storedEvents(key = 'events') {
      return settings[key] || [];
    },
  };
}

async function flush() {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
}

async function mountWithApi(api, props = { workspaceNode: { name: 'Project' }, workspaceRootPath: 'Project' }, document = makeDocument()) {
  const component = loadComponent(document);
  const container = new FakeNode('div');
  component.mount(container, props, api);
  await flush();
  return { component, container, document };
}

(async () => {
  const api = makeApi();
  const { component, container } = await mountWithApi(api);
  const projectKey = 'events:workspace:Project';
  const clientKey = 'events:workspace:ClientA';
  const globalKey = 'events:global';

  if (!manifest.permissions.includes('commands.register')) throw new Error('activity manifest must request commands.register');
  const worklogCommand = (manifest.contributes.commands || []).find((item) => item.id === WORKLOG_COMMAND_ID);
  if (!worklogCommand || worklogCommand.handler !== WORKLOG_COMMAND_ID) throw new Error('activity worklog suggestion command contribution is missing');
  if (typeof api.commandHandlers.get(WORKLOG_COMMAND_ID) !== 'function') throw new Error('activity worklog suggestion command was not registered');
  const activityProvider = (manifest.contributes.activityProviders || []).find((item) => item.id === 'verstak.activity.log');
  if (!activityProvider || !activityProvider.events.includes('browser.capture.file')) throw new Error('activity provider must include browser.capture.file');
  if (!activityProvider || !activityProvider.events.includes('browser.capture.converted')) throw new Error('activity provider must include browser.capture.converted');

  for (const name of ['file.opened', 'file.changed', 'note.saved', 'action.started', 'browser.capture.received', 'case.selected', 'browser.capture.selection', 'browser.capture.file', 'browser.capture.converted']) {
    if (typeof api.handlers[name] !== 'function') throw new Error(`${name} subscription missing`);
  }

  await api.settings.write(projectKey, [{
    activityId: 'capture-1',
    type: 'browser.capture.selection',
    title: 'Example Article',
    summary: 'Selected text',
    occurredAt: '2026-06-27T00:00:00Z',
    sourcePluginId: 'verstak.browser-inbox',
    workspaceRootPath: 'Project',
    payload: {
      captureId: 'capture-1',
      kind: 'selection',
      title: 'Example Article',
      url: 'https://example.com/article',
      text: 'Selected text',
      workspaceRootPath: 'Project',
    },
  }, {
    activityId: 'note-1',
    type: 'note.saved',
    title: 'Saved note',
    summary: 'Project/Notes/Case.md',
    occurredAt: '2026-06-27T00:20:00Z',
    sourcePluginId: 'verstak.notes',
    workspaceRootPath: 'Project',
    payload: {
      title: 'Saved note',
      path: 'Project/Notes/Case.md',
      workspaceRootPath: 'Project',
    },
  }, {
    activityId: 'capture-1:browser.capture.converted',
    type: 'browser.capture.converted',
    title: 'Example Article converted',
    summary: 'Project/Notes/Example_Article.md',
    occurredAt: '2026-06-27T00:30:00Z',
    sourcePluginId: 'verstak.browser-inbox',
    workspaceRootPath: 'Project',
    payload: {
      captureId: 'capture-1',
      conversionType: 'note',
      notePath: 'Project/Notes/Example_Article.md',
      workspaceRootPath: 'Project',
      title: 'Example Article converted',
      url: 'https://example.com/article',
      sourcePluginId: 'verstak.browser-inbox',
    },
  }]);
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
  await api.handlers['browser.capture.converted']({
    name: 'browser.capture.converted',
    pluginId: 'verstak.browser-inbox',
    timestamp: '2026-06-27T00:30:00Z',
    payload: {
      captureId: 'capture-1',
      conversionType: 'note',
      notePath: 'Project/Notes/Example_Article.md',
      workspaceRootPath: 'Project',
      title: 'Example Article converted',
      url: 'https://example.com/article',
      sourcePluginId: 'verstak.browser-inbox',
    },
  });
  await flush();

  const stored = api.storedEvents(projectKey);
  if (stored.length !== 3) throw new Error(`expected three stored activity events, got ${stored.length}`);
  if (stored[0].type !== 'browser.capture.selection') throw new Error('stored event type mismatch');
  if (stored[0].sourcePluginId !== 'verstak.browser-inbox') throw new Error('stored event source plugin mismatch');
  if (!stored.some((event) => event.type === 'browser.capture.converted' && event.title === 'Example Article converted')) {
    throw new Error('conversion activity event was not stored');
  }
  if (api.storedEvents(globalKey).length !== 0) throw new Error('workspace activity leaked into global storage');
  if (!container.textContent.includes('Example Article')) throw new Error('browser capture title was not rendered');
  if (!container.textContent.includes('browser.capture.selection')) throw new Error('event type was not rendered');
  if (!container.textContent.includes('browser.capture.converted')) throw new Error('conversion event type was not rendered');
  if (!container.textContent.includes('Worklog suggestions')) throw new Error('worklog suggestions section was not rendered');
  if (!container.textContent.includes('Project work on 2026-06-27')) throw new Error('workspace worklog suggestion title was not rendered');
  if (!container.textContent.includes('30 min')) throw new Error('workspace worklog suggestion duration was not rendered');
  const suggestionNode = walk(container, (node) => node.getAttribute && node.getAttribute('data-worklog-suggestion') === 'worklog:Project:2026-06-27');
  if (!suggestionNode) throw new Error('worklog suggestion data attribute was not rendered');

  const commandResult = await api.commandHandlers.get(WORKLOG_COMMAND_ID)({ workspaceRootPath: 'Project' });
  const suggestions = commandResult && commandResult.suggestions;
  if (!Array.isArray(suggestions) || suggestions.length !== 1) throw new Error('worklog suggestion command returned unexpected suggestions');
  if (suggestions[0].suggestionId !== 'worklog:Project:2026-06-27') throw new Error('worklog suggestion id mismatch');
  if (suggestions[0].minutes !== 30) throw new Error(`expected 30 suggested minutes, got ${suggestions[0].minutes}`);
  if (!suggestions[0].summary.includes('Example Article') || !suggestions[0].summary.includes('Saved note')) throw new Error('worklog suggestion summary did not include event titles');
  if (suggestions[0].eventIds.join(',') !== 'capture-1,note-1,capture-1:browser.capture.converted') throw new Error('worklog suggestion event ids mismatch');

  const clientView = await mountWithApi(api, { workspaceNode: { name: 'ClientA' }, workspaceRootPath: 'ClientA' });
  if (clientView.container.textContent.includes('Example Article')) throw new Error('Project activity leaked into ClientA workspace view');
  await api.settings.write(clientKey, [{
    activityId: 'client-note',
    type: 'note.saved',
    title: 'Client note',
    summary: 'ClientA/Notes/Client.md',
    occurredAt: '2026-06-27T00:10:00Z',
    sourcePluginId: 'verstak.notes',
    workspaceRootPath: 'ClientA',
    payload: {
      title: 'Client note',
      path: 'ClientA/Notes/Client.md',
      workspaceRootPath: 'ClientA',
    },
  }]);
  await api.handlers['note.saved']({
    name: 'note.saved',
    pluginId: 'verstak.notes',
    timestamp: '2026-06-27T00:10:00Z',
    payload: {
      title: 'Client note',
      path: 'ClientA/Notes/Client.md',
      workspaceRootPath: 'ClientA',
    },
  });
  await flush();
  if (api.storedEvents(clientKey).length !== 1) throw new Error('ClientA activity was not stored under ClientA workspace key');
  if (!clientView.container.textContent.includes('Client note')) throw new Error('ClientA activity was not rendered');
  if (!clientView.container.textContent.includes('ClientA work on 2026-06-27')) throw new Error('ClientA worklog suggestion was not rendered');
  component.unmount && component.unmount(clientView.container);

  const globalView = await mountWithApi(api, {});
  if (!globalView.container.textContent.includes('Example Article')) throw new Error('global activity did not aggregate Project activity');
  if (!globalView.container.textContent.includes('Client note')) throw new Error('global activity did not aggregate ClientA activity');
  if (!globalView.container.textContent.includes('Project work on 2026-06-27')) throw new Error('global activity did not render Project worklog suggestion');
  if (!globalView.container.textContent.includes('ClientA work on 2026-06-27')) throw new Error('global activity did not render ClientA worklog suggestion');
  component.unmount && component.unmount(globalView.container);

  const manualButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-activity-action') === 'manual');
  if (manualButton) throw new Error('manual activity button should not be rendered');

  const clearButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-activity-action') === 'clear');
  if (!clearButton) throw new Error('clear activity button not found');
  clearButton.click();
  await flush();
  if (api.storedEvents(projectKey).length !== 0) throw new Error('clear action did not remove activity events');
  if (container.textContent.includes('Project work on 2026-06-27')) throw new Error('clear action did not remove worklog suggestions');

  component.unmount && component.unmount(container);
  if (api.unsubscribed.length !== 33) throw new Error(`expected 33 unsubscribers, got ${api.unsubscribed.length}`);

  const persistedApi = makeApi({
    'events:workspace:Project': [{
      activityId: 'persisted-1',
      type: 'note.saved',
      title: 'Saved note',
      summary: 'Notes/Case.md',
      occurredAt: '2026-06-27T01:00:00Z',
      sourcePluginId: 'verstak.notes',
    }, {
      activityId: 'persisted-open-1',
      type: 'file.opened',
      title: 'Selected file',
      summary: 'Project/Notes/Case.md',
      occurredAt: '2026-06-27T01:05:00Z',
      sourcePluginId: 'verstak.files',
    }],
  });
  const persisted = await mountWithApi(persistedApi);
  if (!persisted.container.textContent.includes('Saved note')) throw new Error('persisted activity was not rendered');
  if (persisted.container.textContent.includes('Selected file')) throw new Error('low-value file activity should not be rendered');

  const legacyApi = makeApi({
    events: [
      {
        activityId: 'legacy-global',
        type: 'browser.capture.page',
        title: 'Legacy global capture',
        occurredAt: '2026-06-27T02:00:00Z',
        sourcePluginId: 'verstak.browser-inbox',
      },
      {
        activityId: 'legacy-project',
        type: 'note.saved',
        title: 'Legacy project note',
        occurredAt: '2026-06-27T02:10:00Z',
        sourcePluginId: 'verstak.notes',
        payload: { path: 'Project/Notes/Legacy.md' },
      },
    ],
  });
  const legacyGlobal = await mountWithApi(legacyApi, {});
  if (!legacyGlobal.container.textContent.includes('Legacy global capture')) throw new Error('legacy global activity was not rendered in global view');
  if (!legacyGlobal.container.textContent.includes('Legacy project note')) throw new Error('legacy workspace activity was not rendered in global view');
  component.unmount && component.unmount(legacyGlobal.container);

  const legacyProject = await mountWithApi(legacyApi, { workspaceNode: { name: 'Project' }, workspaceRootPath: 'Project' });
  if (!legacyProject.container.textContent.includes('Legacy project note')) throw new Error('legacy workspace activity was not rendered in matching workspace');
  if (legacyProject.container.textContent.includes('Legacy global capture')) throw new Error('legacy global activity leaked into workspace view');

  const taggedGlobalApi = makeApi({
    'events:global': [
      {
        activityId: 'global-project',
        type: 'browser.capture.page',
        title: 'Global project capture',
        occurredAt: '2026-06-27T03:00:00Z',
        sourcePluginId: 'verstak.browser-inbox',
        workspaceRootPath: 'Project',
      },
    ],
  });
  const taggedGlobalProject = await mountWithApi(taggedGlobalApi, { workspaceNode: { name: 'Project' }, workspaceRootPath: 'Project' });
  if (!taggedGlobalProject.container.textContent.includes('Global project capture')) throw new Error('workspace did not render workspace-tagged global activity');
  const taggedGlobalClient = await mountWithApi(taggedGlobalApi, { workspaceNode: { name: 'ClientA' }, workspaceRootPath: 'ClientA' });
  if (taggedGlobalClient.container.textContent.includes('Global project capture')) throw new Error('workspace-tagged global activity leaked into another workspace');

  console.log('activity plugin smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
