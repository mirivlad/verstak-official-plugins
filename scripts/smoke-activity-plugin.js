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

function loadBundle(document) {
  const registry = {};
  vm.runInNewContext(source, {
    console,
    Date,
    Math,
    document,
    window: {
      VerstakPluginRegister(pluginId, bundle) {
        registry[pluginId] = bundle;
      },
    },
  }, { filename: sourcePath });
  const bundle = registry['verstak.activity'];
  if (!bundle || !bundle.components || !bundle.components.ActivityView) throw new Error('ActivityView was not registered');
  return bundle;
}

function loadComponent(document) {
  return loadBundle(document).components.ActivityView;
}

// Activation is what the shell does for a plugin nothing is showing: the
// Journal asks Activity for possible entries while the user is looking at the
// Journal.
async function activateWithApi(api, document = makeDocument()) {
  const bundle = loadBundle(document);
  if (typeof bundle.activate !== 'function') throw new Error('activity bundle declares no activate hook');
  await bundle.activate(api);
  await flush();
  return bundle;
}

function makeApi(initialSettings = {}, initialData = {}) {
  const settings = { ...initialSettings };
  const data = { ...initialData };
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
    storage: {
      data: {
        readNDJSON: async (name) => Array.isArray(data[name]) ? data[name].slice() : [],
        writeNDJSON: async (name, records) => {
          data[name] = Array.isArray(records) ? records.slice() : [];
        },
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
    storedData(name) {
      return Array.isArray(data[name]) ? data[name] : [];
    },
  };
}

async function flush() {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
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
  const worklogProvider = (manifest.contributes.worklogProviders || []).find((item) => item.handler === WORKLOG_COMMAND_ID);
  if (!worklogProvider) throw new Error('activity must declare itself a worklog provider so the Journal can find it');
  // The command belongs to activation, not to a mounted view. Registering it
  // from mount() meant the Journal could reach possible entries exactly when
  // the user was looking at Activity instead.
  if (api.commandHandlers.has(WORKLOG_COMMAND_ID)) throw new Error('mounting a view must not be what registers the worklog command');
  await activateWithApi(api);
  if (typeof api.commandHandlers.get(WORKLOG_COMMAND_ID) !== 'function') throw new Error('activation did not register the worklog suggestion command');
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
  if (!container.textContent.includes('Selection captured')) throw new Error('browser capture label was not rendered');
  if (!container.textContent.includes('Capture converted')) throw new Error('conversion label was not rendered');
  if (container.textContent.includes('browser.capture.selection') || container.textContent.includes('browser.capture.converted') || container.textContent.includes('verstak.browser-inbox')) {
    throw new Error('Activity must not expose technical event or plugin identifiers in its UI');
  }
  if (!container.textContent.includes('Possible journal entries')) throw new Error('work session candidate section was not rendered');
  if (container.textContent.includes('Project work on 2026-06-27')) throw new Error('candidate must not invent a worklog title');
  const candidateNode = walk(container, (node) => node.getAttribute && node.getAttribute('data-work-session-candidate'));
  if (!candidateNode) throw new Error('work session candidate data attribute was not rendered');
  if (!candidateNode.textContent.includes('Deal: Project')) throw new Error('candidate Deal was not rendered');
  // 20 minutes between the first and last event, plus the five-minute lead-in
  // credited to the work that produced the first one.
  if (!candidateNode.textContent.includes('Estimated duration: 25 min')) throw new Error('candidate duration was not rendered');
  if (!candidateNode.textContent.includes('Activities: 3')) throw new Error('candidate activity count was not rendered');
  // A card that reports only minutes makes the user open the list to find out
  // what those minutes were.
  const breakdownNode = walk(candidateNode, (node) => node.getAttribute && node.getAttribute('data-work-session-breakdown') === '');
  if (!breakdownNode) throw new Error('the candidate does not say what the time went on');
  if (!breakdownNode.textContent.includes('notes (1)') || !breakdownNode.textContent.includes('saved from the browser (2)')) {
    throw new Error(`the breakdown must name each kind of work: ${breakdownNode.textContent}`);
  }
  if (!walk(candidateNode, (node) => node.getAttribute && node.getAttribute('data-work-session-action') === 'review')) throw new Error('candidate review action was not rendered');
  if (!walk(candidateNode, (node) => node.getAttribute && node.getAttribute('data-work-session-action') === 'dismiss')) throw new Error('candidate dismiss action was not rendered');

  const commandResult = await api.commandHandlers.get(WORKLOG_COMMAND_ID)({ workspaceRootPath: 'Project' });
  const candidates = commandResult && commandResult.candidates;
  if (!Array.isArray(candidates) || candidates.length !== 1) throw new Error('work session command returned unexpected candidates');
  const candidate = candidates[0];
  if (!candidate.candidateId) throw new Error('candidate id is missing');
  if (candidate.workspaceRootPath !== 'Project') throw new Error('candidate workspace mismatch');
  if (candidate.startedAt !== '2026-06-27T00:00:00.000Z' || candidate.endedAt !== '2026-06-27T00:30:00.000Z') throw new Error('candidate range mismatch');
  if (candidate.estimatedMinutes !== 25) throw new Error(`expected 25 candidate minutes, got ${candidate.estimatedMinutes}`);
  if (candidate.activityCount !== 3) throw new Error(`expected three candidate activities, got ${candidate.activityCount}`);
  if (candidate.activityIds.join(',') !== 'capture-1,note-1,capture-1:browser.capture.converted') throw new Error('candidate activity ids mismatch');
  if (!Array.isArray(candidate.activities) || candidate.activities.length !== 3) throw new Error('candidate activity list is missing');
  if ('title' in candidate || 'summary' in candidate || 'description' in candidate) throw new Error('candidate contains non-factual journal fields');
  const cachedCandidates = api.storedEvents('work-session-candidates:workspace:Project');
  if (!Array.isArray(cachedCandidates) || cachedCandidates.length !== 1 || cachedCandidates[0].candidateId !== candidate.candidateId) {
    throw new Error('candidate cache was not persisted for Overview');
  }

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
  if (clientView.container.textContent.includes('Possible journal entries')) throw new Error('a single activity must not create a work session candidate');
  component.unmount && component.unmount(clientView.container);

  const globalView = await mountWithApi(api, {});
  if (!globalView.container.textContent.includes('Example Article')) throw new Error('global activity did not aggregate Project activity');
  if (!globalView.container.textContent.includes('Client note')) throw new Error('global activity did not aggregate ClientA activity');
  if (!globalView.container.textContent.includes('Possible journal entries')) throw new Error('global activity did not render work session candidates');
  component.unmount && component.unmount(globalView.container);

  const dismissButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-work-session-action') === 'dismiss');
  if (!dismissButton) throw new Error('candidate dismiss action was not available');
  dismissButton.click();
  await flush();
  if (container.textContent.includes('Possible journal entries')) throw new Error('dismiss action did not remove the candidate from Activity');
  if (api.storedEvents('work-session-candidates:workspace:Project').length !== 0) throw new Error('dismiss action did not update the candidate cache');

  const manualButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-activity-action') === 'manual');
  if (manualButton) throw new Error('manual activity button should not be rendered');

  const clearButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-activity-action') === 'clear');
  if (!clearButton) throw new Error('clear activity button not found');
  clearButton.click();
  await flush();
  if (api.storedEvents(projectKey).length === 0) throw new Error('clear action removed activity before confirmation');
  const clearConfirmation = walk(container, (node) => node.getAttribute && node.getAttribute('data-activity-clear-confirmation') === '');
  if (!clearConfirmation) throw new Error('clear activity confirmation was not rendered');
  const confirmClear = walk(clearConfirmation, (node) => node.getAttribute && node.getAttribute('data-activity-clear-confirm') === '');
  if (!confirmClear) throw new Error('clear activity confirmation button was not rendered');
  confirmClear.click();
  await flush();
  if (api.storedEvents(projectKey).length !== 0) throw new Error('clear action did not remove activity events');
  if (api.storedEvents('work-session-candidates:workspace:Project').length !== 0) throw new Error('clear action did not remove cached candidates');

  component.unmount && component.unmount(container);
  if (api.unsubscribed.length !== 39) throw new Error(`expected 39 unsubscribers, got ${api.unsubscribed.length}`);

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
  if (!persisted.container.textContent.includes('Selected file')) throw new Error('raw Activity log must retain low-value technical events');

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

  const sessionsApi = makeApi({
    'events:workspace:Project': [
      { activityId: 'project-first', type: 'note.saved', occurredAt: '2026-06-27T00:00:00Z', workspaceRootPath: 'Project' },
      { activityId: 'project-second', type: 'file.changed', occurredAt: '2026-06-27T00:10:00Z', workspaceRootPath: 'Project' },
      { activityId: 'project-after-switch-first', type: 'note.saved', occurredAt: '2026-06-27T00:24:00Z', workspaceRootPath: 'Project' },
      { activityId: 'project-after-switch-second', type: 'file.changed', occurredAt: '2026-06-27T00:34:00Z', workspaceRootPath: 'Project' },
      { activityId: 'project-after-idle-first', type: 'note.saved', occurredAt: '2026-06-27T01:10:00Z', workspaceRootPath: 'Project' },
      { activityId: 'project-after-idle-second', type: 'file.changed', occurredAt: '2026-06-27T01:22:00Z', workspaceRootPath: 'Project' },
    ],
    'events:workspace:ClientA': [
      { activityId: 'client-first', type: 'note.saved', occurredAt: '2026-06-27T00:12:00Z', workspaceRootPath: 'ClientA' },
      { activityId: 'client-second', type: 'file.changed', occurredAt: '2026-06-27T00:22:00Z', workspaceRootPath: 'ClientA' },
    ],
  });
  const sessionView = await mountWithApi(sessionsApi, {});
  await activateWithApi(sessionsApi);
  const sessionResult = await sessionsApi.commandHandlers.get(WORKLOG_COMMAND_ID)({});
  const sessionCandidates = sessionResult && sessionResult.candidates;
  if (!Array.isArray(sessionCandidates) || sessionCandidates.length !== 4) throw new Error('workspace switches and idle gaps must split candidates');
  const projectCandidates = sessionCandidates.filter((item) => item.workspaceRootPath === 'Project');
  if (projectCandidates.length !== 3) throw new Error('workspace switch must close the prior Project candidate');
  if (!projectCandidates.some((item) => item.activityIds.join(',') === 'project-after-idle-first,project-after-idle-second')) {
    throw new Error('idle gap must start a separate Project candidate');
  }
  if (sessionCandidates.some((item) => 'title' in item || 'summary' in item || 'description' in item)) {
    throw new Error('session candidates must contain only factual fields');
  }
  component.unmount && component.unmount(sessionView.container);

  // Bulk writers -- an import publishing a run, sync applying a pull -- record
  // files appearing, not work done. One import produced 497 events in a single
  // minute across 44 Deals, which drowned the log and could have become journal
  // entries for work nobody did.
  const serviceApi = makeApi({
    'events:workspace:Project': [
      { activityId: 'user-a', type: 'note.saved', occurredAt: '2026-07-20T10:00:00Z', workspaceRootPath: 'Project' },
      { activityId: 'user-b', type: 'file.changed', occurredAt: '2026-07-20T10:12:00Z', workspaceRootPath: 'Project' },
      // Flagged at the source.
      { activityId: 'svc-a', type: 'file.changed', occurredAt: '2026-07-20T10:01:00Z', workspaceRootPath: 'Project', payload: { service: true, operation: 'external.create', path: 'Project/Files/a.md' } },
      // Recorded before the flag existed. The external marker alone is enough,
      // whatever the operation is called...
      { activityId: 'svc-b', type: 'file.changed', occurredAt: '2026-07-20T10:02:00Z', workspaceRootPath: 'Project', payload: { external: true, operation: 'update', path: 'Project/Files/b.md' } },
      // ...and so is the operation prefix on its own.
      { activityId: 'svc-c', type: 'file.changed', occurredAt: '2026-07-20T10:03:00Z', workspaceRootPath: 'Project', payload: { operation: 'external.update', path: 'Project/Files/c.md' } },
    ],
  });
  const serviceView = await mountWithApi(serviceApi, { workspaceNode: { name: 'Project' }, workspaceRootPath: 'Project' });
  const serviceRows = () => {
    const found = [];
    walk(serviceView.container, (node) => {
      if (node.getAttribute && node.getAttribute('data-activity-id')) found.push(node.getAttribute('data-activity-id'));
      return false;
    });
    return found;
  };
  const hiddenRows = serviceRows();
  if (hiddenRows.length !== 2 || !hiddenRows.includes('user-a') || !hiddenRows.includes('user-b')) {
    throw new Error(`service activity must be hidden by default, listed ${JSON.stringify(hiddenRows)}`);
  }

  const serviceCheckbox = walk(serviceView.container, (node) => node.getAttribute && node.getAttribute('data-activity-show-service') !== undefined);
  if (!serviceCheckbox) throw new Error('no control for showing service activity');
  serviceCheckbox.checked = true;
  serviceCheckbox.dispatchEvent('change');
  const shownRows = serviceRows();
  if (shownRows.length !== 5) {
    throw new Error(`the filter must reveal service activity, listed ${JSON.stringify(shownRows)}`);
  }

  // Whether the filter is on or off, service activity is never work.
  await activateWithApi(serviceApi);
  const serviceCandidates = (await serviceApi.commandHandlers.get(WORKLOG_COMMAND_ID)({ workspaceRootPath: 'Project' })).candidates;
  if (!Array.isArray(serviceCandidates) || serviceCandidates.length !== 1) {
    throw new Error(`expected one candidate from the two real events, got ${serviceCandidates && serviceCandidates.length}`);
  }
  if (serviceCandidates[0].activityIds.join(',') !== 'user-a,user-b') {
    throw new Error(`service activity leaked into a journal proposal: ${serviceCandidates[0].activityIds}`);
  }
  component.unmount && component.unmount(serviceView.container);

  const lateApi = makeApi({
    'events:workspace:Project': [
      { activityId: 'late-a', type: 'note.saved', occurredAt: '2026-07-12T10:00:00Z', workspaceRootPath: 'Project' },
      { activityId: 'late-b', type: 'file.changed', occurredAt: '2026-07-12T10:10:00Z', workspaceRootPath: 'Project' },
    ],
  });
  const lateView = await mountWithApi(lateApi);
  await activateWithApi(lateApi);
  const lateCommand = lateApi.commandHandlers.get(WORKLOG_COMMAND_ID);
  const firstLateCandidate = (await lateCommand({ workspaceRootPath: 'Project' })).candidates[0];
  // 10 minutes between the two events, plus the five-minute lead-in.
  if (!firstLateCandidate || !firstLateCandidate.sessionId || firstLateCandidate.estimatedMinutes !== 15) {
    throw new Error('file activity duration must use the capped adjacent-event algorithm');
  }
  await lateApi.settings.write('events:workspace:Project', [
    { activityId: 'late-before', type: 'note.saved', occurredAt: '2026-07-12T09:55:00Z', workspaceRootPath: 'Project' },
    { activityId: 'late-a', type: 'note.saved', occurredAt: '2026-07-12T10:00:00Z', workspaceRootPath: 'Project' },
    { activityId: 'late-b', type: 'file.changed', occurredAt: '2026-07-12T10:10:00Z', workspaceRootPath: 'Project' },
  ]);
  await lateApi.handlers['note.saved']({ name: 'note.saved', payload: {} });
  await flush();
  const afterLateCandidate = (await lateCommand({ workspaceRootPath: 'Project' })).candidates[0];
  if (!afterLateCandidate || afterLateCandidate.sessionId !== firstLateCandidate.sessionId) {
    throw new Error('late events changed an immutable session identity');
  }
  const dismissLate = walk(lateView.container, (node) => node.getAttribute && node.getAttribute('data-work-session-action') === 'dismiss');
  dismissLate.click();
  await flush();
  await lateApi.settings.write('events:workspace:Project', [
    { activityId: 'late-before', type: 'note.saved', occurredAt: '2026-07-12T09:55:00Z', workspaceRootPath: 'Project' },
    { activityId: 'late-a', type: 'note.saved', occurredAt: '2026-07-12T10:00:00Z', workspaceRootPath: 'Project' },
    { activityId: 'late-b', type: 'file.changed', occurredAt: '2026-07-12T10:10:00Z', workspaceRootPath: 'Project' },
    { activityId: 'late-one', type: 'note.saved', occurredAt: '2026-07-12T10:15:00Z', workspaceRootPath: 'Project' },
  ]);
  await lateApi.handlers['note.saved']({ name: 'note.saved', payload: {} });
  await flush();
  if ((await lateCommand({ workspaceRootPath: 'Project' })).candidates.length !== 0) {
    throw new Error('dismissed session was re-offered without substantial new activity');
  }
  await lateApi.settings.write('events:workspace:Project', [
    { activityId: 'late-before', type: 'note.saved', occurredAt: '2026-07-12T09:55:00Z', workspaceRootPath: 'Project' },
    { activityId: 'late-a', type: 'note.saved', occurredAt: '2026-07-12T10:00:00Z', workspaceRootPath: 'Project' },
    { activityId: 'late-b', type: 'file.changed', occurredAt: '2026-07-12T10:10:00Z', workspaceRootPath: 'Project' },
    { activityId: 'late-one', type: 'note.saved', occurredAt: '2026-07-12T10:15:00Z', workspaceRootPath: 'Project' },
    { activityId: 'late-two', type: 'file.changed', occurredAt: '2026-07-12T10:25:00Z', workspaceRootPath: 'Project' },
  ]);
  await lateApi.handlers['file.changed']({ name: 'file.changed', payload: {} });
  await flush();
  if ((await lateCommand({ workspaceRootPath: 'Project' })).candidates.length !== 1) {
    throw new Error('dismissed session was not re-offered after substantial new activity');
  }
  component.unmount && component.unmount(lateView.container);

  const rawApi = makeApi({}, {
    'activity-events': [{
      activityId: 'browser-domain:batch-1:0',
      type: 'browser.activity.domain',
      title: 'https://example.com/admin/settings?tab=billing',
      summary: '5 min browser activity',
      occurredAt: '2026-07-12T10:05:00Z',
      sourcePluginId: 'verstak-browser-extension',
      sourceBatchId: 'batch-1',
      hostname: 'example.com',
      url: 'https://example.com/admin/settings?tab=billing',
      durationSeconds: 300,
      payload: { hostname: 'example.com', url: 'https://example.com/admin/settings?tab=billing', durationSeconds: 300 },
    }],
  });
  const rawView = await mountWithApi(rawApi, {});
  // The address, not the site: which page was open is the difference between
  // configuring a site and reading it.
  if (!rawView.container.textContent.includes('https://example.com/admin/settings?tab=billing')) {
    throw new Error('the page address was not rendered');
  }
  // Measured time is said in the reader's language, not in the English the
  // core wrote into the record.
  if (!rawView.container.textContent.includes('5 min in the browser')) {
    throw new Error('browser time was not stated in the interface language');
  }
  if (rawView.container.textContent.includes('5 min browser activity')) {
    throw new Error("the core's untranslated summary was shown to the user");
  }
  const rawClear = walk(rawView.container, (node) => node.getAttribute && node.getAttribute('data-activity-action') === 'clear');
  rawClear.click();
  await flush();
  if (rawApi.storedData('activity-events').length === 0) throw new Error('append-only activity was removed before confirmation');
  const rawClearConfirmation = walk(rawView.container, (node) => node.getAttribute && node.getAttribute('data-activity-clear-confirmation') === '');
  if (!rawClearConfirmation) throw new Error('append-only activity confirmation was not rendered');
  const rawConfirmClear = walk(rawClearConfirmation, (node) => node.getAttribute && node.getAttribute('data-activity-clear-confirm') === '');
  if (!rawConfirmClear) throw new Error('append-only activity confirmation button was not rendered');
  rawConfirmClear.click();
  await flush();
  if (rawApi.storedData('activity-events').length !== 0) throw new Error('clear activity did not replace append-only data');
  component.unmount && component.unmount(rawView.container);

  // Browser time arrives belonging to nobody -- the extension cannot know which
  // Deal a page was for. The Browser tool lists it and says, through these two
  // commands, with no Activity view mounted.
  const browserApi = makeApi({}, {
    'activity-events': [
      {
        activityId: 'browser-domain:b1:0',
        type: 'browser.activity.domain',
        title: 'https://dash.example.com/projects/42',
        occurredAt: '2026-07-22T11:20:00Z',
        hostname: 'dash.example.com',
        url: 'https://dash.example.com/projects/42',
        startedAt: '2026-07-22T11:02:00Z',
        endedAt: '2026-07-22T11:20:00Z',
        durationSeconds: 1080,
        workspaceRootPath: '',
        payload: { hostname: 'dash.example.com', url: 'https://dash.example.com/projects/42', durationSeconds: 1080 },
      },
      {
        activityId: 'browser-domain:b1:1',
        type: 'browser.activity.domain',
        title: 'https://example.com/blog/post',
        occurredAt: '2026-07-22T11:40:00Z',
        hostname: 'example.com',
        url: 'https://example.com/blog/post',
        startedAt: '2026-07-22T11:33:00Z',
        endedAt: '2026-07-22T11:40:00Z',
        durationSeconds: 420,
        workspaceRootPath: '',
        payload: { hostname: 'example.com', url: 'https://example.com/blog/post', durationSeconds: 420 },
      },
      // Not browser activity, and must never be offered for attaching here.
      // Far enough away that it says nothing about the pages above.
      {
        activityId: 'note-x',
        type: 'note.saved',
        occurredAt: '2026-07-22T18:00:00Z',
        workspaceRootPath: 'Project',
        payload: { workspaceRootPath: 'Project' },
      },
    ],
  });
  await activateWithApi(browserApi);
  const listBrowser = browserApi.commandHandlers.get('verstak.activity.listBrowserActivity');
  const assignBrowser = browserApi.commandHandlers.get('verstak.activity.assignBrowserActivity');
  if (typeof listBrowser !== 'function' || typeof assignBrowser !== 'function') {
    throw new Error('the Browser tool has no way to list or attach browser activity');
  }
  const listed = (await listBrowser({})).activities;
  if (listed.length !== 2) throw new Error(`expected the two recorded pages, got ${JSON.stringify(listed)}`);
  if (listed[0].url !== 'https://example.com/blog/post') throw new Error('browser activity must be listed newest first');
  if (listed[0].durationSeconds !== 420) throw new Error('browser activity must carry the time it accounts for');
  if ((await listBrowser({ onlyUnassigned: true })).activities.length !== 2) {
    throw new Error('nothing is attached yet, so everything is unassigned');
  }

  // Until the user says which Deal a page was for, the time is not countable
  // against anything -- the browser cannot know, and guessing would put
  // invented work in the Journal.
  if ((await browserApi.commandHandlers.get(WORKLOG_COMMAND_ID)({})).candidates.length !== 0) {
    throw new Error('browser time that belongs to no Deal must not be proposed as work');
  }

  const assignResult = await assignBrowser({ activityIds: ['browser-domain:b1:0', 'note-x'], workspaceRootPath: 'Project', workspaceId: 'deal-project' });
  if (assignResult.assigned !== 1) throw new Error(`only browser activity may be attached, assigned ${assignResult.assigned}`);
  const storedBrowser = browserApi.storedData('activity-events');
  const attached = storedBrowser.find((item) => item.activityId === 'browser-domain:b1:0');
  if (attached.workspaceRootPath !== 'Project' || attached.payload.workspaceRootPath !== 'Project') {
    throw new Error(`attaching did not reach the stored record: ${JSON.stringify(attached)}`);
  }
  if (storedBrowser.find((item) => item.activityId === 'browser-domain:b1:1').workspaceRootPath !== '') {
    throw new Error('attaching one page must not touch another');
  }
  // Sessions are grouped by the Deal's id, which everything else recorded in a
  // Deal carries. Without it the attached time forms a session of its own
  // beside the work it belongs to.
  if (attached.workspaceId !== 'deal-project' || attached.payload.workspaceId !== 'deal-project') {
    throw new Error(`attaching must record the Deal's id: ${JSON.stringify(attached)}`);
  }
  const afterAttach = (await listBrowser({ onlyUnassigned: true })).activities;
  if (afterAttach.length !== 1 || afterAttach[0].activityId !== 'browser-domain:b1:1') {
    throw new Error('an attached page is no longer unassigned');
  }
  if ((await listBrowser({ workspaceRootPath: 'Project' })).activities.length !== 1) {
    throw new Error('a Deal must be able to ask for its own browser activity');
  }

  // Attaching is what makes the time countable: until the user says which Deal
  // a page was for, nobody can bill it to anything.
  const browserWorklog = browserApi.commandHandlers.get(WORKLOG_COMMAND_ID);
  const browserCandidates = (await browserWorklog({ workspaceRootPath: 'Project' })).candidates;
  if (browserCandidates.length !== 1) {
    throw new Error(`attached browser time must become a possible journal entry, got ${JSON.stringify(browserCandidates)}`);
  }
  // 18 minutes measured by the extension, not guessed from the gap to a
  // neighbouring event, so one page on its own is enough to propose.
  if (browserCandidates[0].estimatedMinutes !== 18) {
    throw new Error(`expected the measured 18 minutes, got ${browserCandidates[0].estimatedMinutes}`);
  }
  if (browserCandidates[0].activityIds.join(',') !== 'browser-domain:b1:0') {
    throw new Error(`the proposal must be built from the attached page: ${browserCandidates[0].activityIds}`);
  }
  if ((await browserWorklog({ workspaceRootPath: 'ClientA' })).candidates.length !== 0) {
    throw new Error('browser time attached to one Deal must not be offered to another');
  }

  // A rule answers for every future page at an address, so the user answers
  // once per address rather than once per page.
  const ruleApi = makeApi({}, {
    'activity-events': [
      { activityId: 'k-dash', type: 'browser.activity.domain', occurredAt: '2026-07-25T09:20:00Z', hostname: 'dash.example.com', url: 'https://dash.example.com/projects/42/settings', durationSeconds: 900, workspaceRootPath: '', payload: {} },
      { activityId: 'k-other-page', type: 'browser.activity.domain', occurredAt: '2026-07-25T10:20:00Z', hostname: 'dash.example.com', url: 'https://dash.example.com/help', durationSeconds: 900, workspaceRootPath: '', payload: {} },
      { activityId: 'k-social', type: 'browser.activity.domain', occurredAt: '2026-07-25T11:20:00Z', hostname: 'chat.example.net', url: 'https://chat.example.net/rooms/1', durationSeconds: 900, workspaceRootPath: '', payload: {} },
      // A different project whose number merely starts with the ruled one.
      { activityId: 'k-neighbour', type: 'browser.activity.domain', occurredAt: '2026-07-25T12:20:00Z', hostname: 'dash.example.com', url: 'https://dash.example.com/projects/420', durationSeconds: 900, workspaceRootPath: '', payload: {} },
    ],
  });
  await activateWithApi(ruleApi);
  const listRules = ruleApi.commandHandlers.get('verstak.activity.listBrowserActivityRules');
  const setRule = ruleApi.commandHandlers.get('verstak.activity.setBrowserActivityRule');
  const removeRule = ruleApi.commandHandlers.get('verstak.activity.removeBrowserActivityRule');
  const listRuled = ruleApi.commandHandlers.get('verstak.activity.listBrowserActivity');
  if (typeof listRules !== 'function' || typeof setRule !== 'function' || typeof removeRule !== 'function') {
    throw new Error('rules cannot be listed, taught or removed');
  }
  if ((await listRules()).rules.length !== 0) throw new Error('a fresh vault has no rules');

  await setRule({ pattern: 'https://dash.example.com/projects/42', workspaceRootPath: 'Project', workspaceId: 'deal-project' });
  await setRule({ pattern: 'chat.example.net', notWork: true });
  const taught = (await listRules()).rules;
  if (taught.length !== 2) throw new Error(`expected two rules, got ${JSON.stringify(taught)}`);
  // Stored without the scheme, so http and https are one rule.
  if (!taught.some((rule) => rule.pattern === 'dash.example.com/projects/42')) {
    throw new Error(`a rule must be stored as a plain address: ${JSON.stringify(taught)}`);
  }

  const ruled = (await listRuled({})).activities;
  const dashPage = ruled.find((item) => item.activityId === 'k-dash');
  if (!dashPage || dashPage.workspaceRootPath !== 'Project') throw new Error('the rule did not reach the page it covers');
  if (dashPage.assignedBy !== 'rule') throw new Error('the user must be able to tell a rule from their own answer');
  // The rule is for one part of the site, not the whole site.
  const helpPage = ruled.find((item) => item.activityId === 'k-other-page');
  if (!helpPage || helpPage.workspaceRootPath !== '') throw new Error('a rule for one page must not claim the whole site');
  // Matching has to stop at a path boundary, or project 42 swallows 420.
  const neighbour = ruled.find((item) => item.activityId === 'k-neighbour');
  if (!neighbour || neighbour.workspaceRootPath !== '') {
    throw new Error(`a rule must match whole path segments: ${JSON.stringify(neighbour)}`);
  }
  if (ruled.some((item) => item.activityId === 'k-social')) throw new Error('a page ruled out as not work must leave the list');
  const withNotWork = (await listRuled({ includeNotWork: true })).activities;
  const social = withNotWork.find((item) => item.activityId === 'k-social');
  if (!social || social.notWork !== true) throw new Error('not work is a state, not a deletion, and must stay findable');

  // An answer given by hand is never overwritten by a rule taught afterwards.
  await ruleApi.commandHandlers.get('verstak.activity.assignBrowserActivity')({
    activityIds: ['k-other-page'], workspaceRootPath: 'ClientA', workspaceId: 'deal-client',
  });
  await setRule({ pattern: 'dash.example.com', workspaceRootPath: 'Project', workspaceId: 'deal-project' });
  const afterBroadRule = (await listRuled({})).activities.find((item) => item.activityId === 'k-other-page');
  if (afterBroadRule.workspaceRootPath !== 'ClientA' || afterBroadRule.assignedBy !== 'user') {
    throw new Error('a rule must not overwrite an answer the user gave by hand');
  }

  if ((await removeRule({ pattern: 'https://chat.example.net/' })).removed !== 1) {
    throw new Error('a rule must be removable by the address it was taught with');
  }
  if ((await listRules()).rules.some((rule) => rule.pattern === 'chat.example.net')) {
    throw new Error('the removed rule is still there');
  }

  // A page opened while the user was demonstrably working in one Deal was
  // almost certainly for that Deal. Where two Deals are in play there is no
  // guess: the wrong Deal is worse than none.
  const guessApi = makeApi({}, {
    'activity-events': [
      { activityId: 'g-note', type: 'note.saved', occurredAt: '2026-07-26T09:00:00Z', workspaceRootPath: 'Project', workspaceId: 'deal-project', payload: { workspaceRootPath: 'Project', workspaceId: 'deal-project' } },
      { activityId: 'g-page', type: 'browser.activity.domain', occurredAt: '2026-07-26T09:10:00Z', hostname: 'docs.example.com', url: 'https://docs.example.com/a', durationSeconds: 900, workspaceRootPath: '', payload: {} },
      { activityId: 'g-far', type: 'browser.activity.domain', occurredAt: '2026-07-26T20:00:00Z', hostname: 'docs.example.com', url: 'https://docs.example.com/b', durationSeconds: 900, workspaceRootPath: '', payload: {} },
      { activityId: 'g-a', type: 'note.saved', occurredAt: '2026-07-26T14:00:00Z', workspaceRootPath: 'Project', workspaceId: 'deal-project', payload: { workspaceRootPath: 'Project', workspaceId: 'deal-project' } },
      { activityId: 'g-page-two', type: 'browser.activity.domain', occurredAt: '2026-07-26T14:05:00Z', hostname: 'docs.example.com', url: 'https://docs.example.com/c', durationSeconds: 900, workspaceRootPath: '', payload: {} },
      { activityId: 'g-b', type: 'file.changed', occurredAt: '2026-07-26T14:10:00Z', workspaceRootPath: 'ClientA', workspaceId: 'deal-client', payload: { workspaceRootPath: 'ClientA', workspaceId: 'deal-client' } },
    ],
  });
  await activateWithApi(guessApi);
  const guessed = (await guessApi.commandHandlers.get('verstak.activity.listBrowserActivity')({ includeNotWork: true })).activities;
  const nearWork = guessed.find((item) => item.activityId === 'g-page');
  if (!nearWork || nearWork.workspaceRootPath !== 'Project' || nearWork.assignedBy !== 'guess') {
    throw new Error(`a page opened inside work on one Deal must be guessed to it: ${JSON.stringify(nearWork)}`);
  }
  const between = guessed.find((item) => item.activityId === 'g-page-two');
  if (!between || between.workspaceRootPath !== '') {
    throw new Error('a page between work on two Deals must not be guessed at all');
  }
  const alone = guessed.find((item) => item.activityId === 'g-far');
  if (!alone || alone.workspaceRootPath !== '') {
    throw new Error('a page with no work around it has nothing to guess from');
  }

  // Attached browser time joins the work it happened during, rather than
  // standing beside it as a session of its own. Everything recorded in a Deal
  // carries the Deal's id, and sessions are grouped by it.
  const joinApi = makeApi({}, {
    'activity-events': [
      { activityId: 'j-note', type: 'note.saved', occurredAt: '2026-07-24T11:00:00Z', workspaceRootPath: 'Project', workspaceId: 'deal-project', payload: { workspaceRootPath: 'Project', workspaceId: 'deal-project' } },
      { activityId: 'j-page', type: 'browser.activity.domain', occurredAt: '2026-07-24T11:20:00Z', hostname: 'dash.example.com', url: 'https://dash.example.com/x', durationSeconds: 1080, workspaceRootPath: '', payload: { durationSeconds: 1080 } },
      { activityId: 'j-file', type: 'file.changed', occurredAt: '2026-07-24T11:30:00Z', workspaceRootPath: 'Project', workspaceId: 'deal-project', payload: { workspaceRootPath: 'Project', workspaceId: 'deal-project' } },
    ],
  });
  await activateWithApi(joinApi);
  await joinApi.commandHandlers.get('verstak.activity.assignBrowserActivity')({
    activityIds: ['j-page'],
    workspaceRootPath: 'Project',
    workspaceId: 'deal-project',
  });
  const joined = (await joinApi.commandHandlers.get(WORKLOG_COMMAND_ID)({ workspaceRootPath: 'Project' })).candidates;
  if (joined.length !== 1) {
    throw new Error(`attached browser time must join the work around it, got ${JSON.stringify(joined.map((c) => c.activityIds))}`);
  }
  if (joined[0].activityIds.slice().sort().join(',') !== 'j-file,j-note,j-page') {
    throw new Error(`the session must cover all three: ${joined[0].activityIds}`);
  }

  // A proposal is identified by its session id. Only the view used to save
  // those, so a Journal that never opened Activity saw a new id for the same
  // session on every read -- and an accepted proposal came straight back.
  const stableApi = makeApi({}, {
    'activity-events': [
      { activityId: 's-1', type: 'note.saved', occurredAt: '2026-07-28T09:00:00Z', workspaceRootPath: 'Project', workspaceId: 'deal-project', payload: { workspaceRootPath: 'Project', workspaceId: 'deal-project' } },
      { activityId: 's-2', type: 'file.changed', occurredAt: '2026-07-28T09:12:00Z', workspaceRootPath: 'Project', workspaceId: 'deal-project', payload: { workspaceRootPath: 'Project', workspaceId: 'deal-project' } },
    ],
  });
  await activateWithApi(stableApi);
  const askTwice = stableApi.commandHandlers.get(WORKLOG_COMMAND_ID);
  const firstAsk = (await askTwice({ workspaceRootPath: 'Project' })).candidates[0];
  const secondAsk = (await askTwice({ workspaceRootPath: 'Project' })).candidates[0];
  if (!firstAsk || !secondAsk) throw new Error('expected a candidate from both reads');
  if (firstAsk.candidateId !== secondAsk.candidateId) {
    throw new Error(`the same session must keep its identity between reads: ${firstAsk.candidateId} then ${secondAsk.candidateId}`);
  }

  // A breakdown whose parts do not add up to the total reads as a mistake.
  // Here the session is a whole 13 minutes while notes and files each own half
  // a minute, which is exactly where flooring each part separately loses one.
  const roundingApi = makeApi({
    'events:workspace:Project': [
      { activityId: 'r-a', type: 'note.saved', occurredAt: '2026-07-23T09:00:00Z', workspaceRootPath: 'Project' },
      { activityId: 'r-b', type: 'note.saved', occurredAt: '2026-07-23T09:05:00Z', workspaceRootPath: 'Project' },
      { activityId: 'r-c', type: 'file.changed', occurredAt: '2026-07-23T09:06:30Z', workspaceRootPath: 'Project' },
      { activityId: 'r-d', type: 'note.saved', occurredAt: '2026-07-23T09:08:00Z', workspaceRootPath: 'Project' },
    ],
  });
  await activateWithApi(roundingApi);
  const rounded = (await roundingApi.commandHandlers.get(WORKLOG_COMMAND_ID)({ workspaceRootPath: 'Project' })).candidates[0];
  if (!rounded) throw new Error('expected a candidate from three events three minutes apart');
  const breakdownTotal = rounded.breakdown.reduce((total, part) => total + part.minutes, 0);
  if (breakdownTotal !== rounded.estimatedMinutes) {
    throw new Error(`the breakdown must add up to ${rounded.estimatedMinutes}, got ${breakdownTotal}: ${JSON.stringify(rounded.breakdown)}`);
  }
  if (rounded.breakdown.reduce((total, part) => total + part.count, 0) !== rounded.activityCount) {
    throw new Error('every activity must be counted somewhere in the breakdown');
  }

  // The Journal's situation exactly: no Activity view has ever been mounted
  // against this api, and possible entries still have to come back.
  const headlessApi = makeApi({
    'events:workspace:Project': [
      { activityId: 'headless-a', type: 'note.saved', occurredAt: '2026-07-20T09:00:00Z', workspaceRootPath: 'Project' },
      { activityId: 'headless-b', type: 'file.changed', occurredAt: '2026-07-20T09:20:00Z', workspaceRootPath: 'Project' },
    ],
  });
  await activateWithApi(headlessApi);
  const headless = await headlessApi.commandHandlers.get(WORKLOG_COMMAND_ID)({ workspaceRootPath: 'Project' });
  if (!headless || !Array.isArray(headless.candidates) || headless.candidates.length !== 1) {
    throw new Error(`possible entries must be available with no view mounted, got ${JSON.stringify(headless)}`);
  }
  if (headless.candidates[0].activityIds.join(',') !== 'headless-a,headless-b') {
    throw new Error('the unmounted handler returned the wrong activities');
  }

  console.log('activity plugin smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
