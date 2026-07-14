#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'browser-inbox', 'frontend', 'src', 'index.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const catalogs = {
  en: JSON.parse(fs.readFileSync(path.join(root, 'plugins', 'browser-inbox', 'locales', 'en.json'), 'utf8')),
  ru: JSON.parse(fs.readFileSync(path.join(root, 'plugins', 'browser-inbox', 'locales', 'ru.json'), 'utf8')),
};
const technicalErrors = [];

class FakeNode {
  constructor(tagName) {
    this.tagName = String(tagName || '').toUpperCase();
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.style = {};
    this.className = '';
    this.id = '';
    this.value = '';
    this.parentNode = null;
    this._innerHTML = '';
    this._textContent = '';
  }

  appendChild(node) {
    if (!(node instanceof FakeNode)) throw new TypeError('appendChild expects FakeNode');
    this.children.push(node);
    node.parentNode = this;
    return node;
  }

  removeChild(node) {
    this.children = this.children.filter((child) => child !== node);
    node.parentNode = null;
    return node;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'id') this.id = String(value);
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  addEventListener(type, handler) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(handler);
  }

  dispatchEvent(type, event = {}) {
    const handlers = this.listeners[type] || [];
    handlers.forEach((handler) => handler({
      stopPropagation() {},
      preventDefault() {},
      target: this,
      ...event,
    }));
  }

  click() {
    this.dispatchEvent('click');
  }

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

function loadComponents(document) {
  const registry = {};
  const sandbox = {
    console: {
      ...console,
      warn(...args) {
        technicalErrors.push(args.map((value) => String(value)).join(' '));
      },
      error(...args) {
        technicalErrors.push(args.map((value) => String(value)).join(' '));
      },
    },
    Date,
    document,
    window: {
      VerstakPluginRegister(pluginId, bundle) {
        registry[pluginId] = bundle.components || {};
      },
    },
  };
  sandbox.window.window = sandbox.window;
  sandbox.window.document = document;
  vm.runInNewContext(source, sandbox, { filename: sourcePath });
  const components = registry['verstak.browser-inbox'];
  if (!components) throw new Error('Browser Inbox components were not registered');
  return components;
}

function loadComponent(document) {
  const component = loadComponents(document).BrowserInboxView;
  if (!component) throw new Error('BrowserInboxView was not registered');
  return component;
}

function makeApi(initialSettings = {}, locale = 'en') {
  const settings = { ...initialSettings };
  const handlers = {};
  const unsubscribed = [];
  const fileWrites = [];
  const fileByteWrites = [];
  const openedURLs = [];
  const publishedEvents = [];
  const workspaceEntries = [
    { name: 'ClientA', relativePath: 'ClientA', type: 'folder' },
    { name: 'Project', relativePath: 'Project', type: 'folder' },
  ];
  const receiverPairing = {
    receiverUrl: 'http://127.0.0.1:47731/api/browser-inbox/v1/captures',
    receiverToken: 'initial-browser-token',
  };
  let nextWriteError = null;
  function translate(key, params, fallback) {
    let value = catalogs[locale]?.[key] || catalogs.en[key] || fallback || key;
    Object.entries(params || {}).forEach(([name, replacement]) => {
      value = value.replace(new RegExp(`\\{${name}\\}`, 'g'), String(replacement));
    });
    return value;
  }
  function backendCaptures() {
    const keys = ['captures:global', 'captures', ...Object.keys(settings).filter((key) => key.startsWith('captures:workspace:'))];
    const seen = new Set();
    const captures = [];
    for (const key of keys) {
      for (const original of Array.isArray(settings[key]) ? settings[key] : []) {
        if (!original || !original.captureId || seen.has(original.captureId)) continue;
        seen.add(original.captureId);
        const capture = { ...original };
        if (!capture.workspaceRootPath && key.startsWith('captures:workspace:')) {
          capture.workspaceRootPath = decodeURIComponent(key.slice('captures:workspace:'.length));
          capture.workspaceName = capture.workspaceRootPath;
        }
        captures.push(capture);
      }
    }
    return { keys, captures };
  }
  function backendWriteCaptures(captures, keys) {
    settings['captures:global'] = captures.slice(0, 100);
    keys.forEach((key) => {
      if (key !== 'captures:global') settings[key] = [];
    });
  }
  function backendMutate(payload) {
    const { keys, captures } = backendCaptures();
    const ids = new Set([payload.captureId, ...(payload.captureIds || [])].filter(Boolean));
    const next = captures.flatMap((capture) => {
      if (!ids.has(capture.captureId)) return [capture];
      if (payload.action === 'delete') return [];
      if (payload.action === 'archive') return [{ ...capture, globalState: 'archived' }];
      if (payload.action === 'restore') return [{ ...capture, globalState: 'inbox' }];
      if (payload.action === 'assign') return [{ ...capture, workspaceRootPath: payload.workspaceRootPath || '', workspaceName: payload.workspaceRootPath || '' }];
      if (payload.action === 'processed') return [{ ...capture, processed: payload.processed === true }];
      return [capture];
    });
    backendWriteCaptures(next, keys);
  }
  function backendAppend(event) {
    const { keys, captures } = backendCaptures();
    const payload = { ...(event.payload || {}) };
    const next = [payload, ...captures.filter((capture) => capture.captureId !== payload.captureId)];
    backendWriteCaptures(next, keys);
  }
  return {
    settings,
    handlers,
    unsubscribed,
    fileWrites,
    fileByteWrites,
    openedURLs,
    publishedEvents,
    i18n: {
      getLocale: () => locale,
      t: translate,
      onDidChangeLocale: () => () => {},
    },
    failNextWrite(message) {
      nextWriteError = new Error(message || 'write failed');
    },
    events: {
      publish: async (name, payload) => {
        publishedEvents.push({ name, payload });
        if (name === 'browser-inbox.storage.mutate') backendMutate(payload || {});
      },
      subscribe: async (name, handler) => {
        handlers[name] = async (event) => {
          if (name.startsWith('browser.capture.')) backendAppend(event);
          return handler(event);
        };
        return () => {
          unsubscribed.push(name);
          delete handlers[name];
        };
      },
    },
    settings: {
      read: async (key) => (key ? settings[key] : { ...settings }),
      write: async (key, value) => {
        settings[key] = value;
        return { ...settings };
      },
    },
    files: {
      list: async () => workspaceEntries.map((entry) => ({ ...entry })),
      writeText: async (relativePath, content, options = {}) => {
        if (nextWriteError) {
          const err = nextWriteError;
          nextWriteError = null;
          throw err;
        }
        fileWrites.push({ relativePath, content, options });
      },
      writeBytes: async (relativePath, dataBase64, options = {}) => {
        if (nextWriteError) {
          const err = nextWriteError;
          nextWriteError = null;
          throw err;
        }
        fileByteWrites.push({ relativePath, dataBase64, options });
      },
      openURL: async (url) => {
        openedURLs.push(url);
      },
    },
    browserReceiver: {
      pairing: async () => ({ ...receiverPairing }),
      rotateToken: async () => {
        receiverPairing.receiverToken = 'rotated-browser-token';
        return { ...receiverPairing };
      },
    },
    getStoredCaptures(key = 'captures') {
      return settings[key] || [];
    },
  };
}

async function flush() {
  for (let i = 0; i < 16; i += 1) await Promise.resolve();
}

async function mountWithApi(api, props = { workspaceNode: { name: 'Project' }, workspaceRootPath: 'Project' }, document = makeDocument()) {
  const component = loadComponent(document);
  const container = new FakeNode('div');
  component.mount(container, props, api);
  await flush();
  return { component, container, document };
}

async function mountSettingsWithApi(api, document = makeDocument()) {
  const component = loadComponents(document).BrowserInboxSettings;
  const container = new FakeNode('div');
  component.mount(container, {}, api);
  await flush();
  return { component, container, document };
}

(async () => {
  const settingsComponents = loadComponents(makeDocument());
  if (!settingsComponents.BrowserInboxSettings) throw new Error('BrowserInboxSettings was not registered');

  const styleDocument = makeDocument();
  const styledView = await mountWithApi(makeApi(), {}, styleDocument);
  const injectedStyles = styleDocument.head.children.map((node) => node.textContent).join('\n');
  if (!injectedStyles.includes('.browser-inbox-select{') || !injectedStyles.includes('appearance:none')) {
    throw new Error('Browser Inbox selects do not use the application select styling');
  }
  styledView.component.unmount && styledView.component.unmount(styledView.container);

  const russianView = await mountWithApi(makeApi({}, 'ru'), {});
  if (!russianView.container.textContent.includes('Браузер')) {
    throw new Error('Browser Inbox does not use the localized Browser title');
  }
  if (!russianView.container.textContent.includes('Все Дела')) {
    throw new Error('Browser Inbox does not use the localized Deal filter');
  }
  if (!russianView.container.textContent.includes('Пока нет материалов из браузера')) {
    throw new Error('Browser Inbox empty state is not localized');
  }
  russianView.component.unmount && russianView.component.unmount(russianView.container);

  const api = makeApi();
  const settingsView = await mountSettingsWithApi(makeApi());
  const receiverURLInput = walk(settingsView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-pairing-url') === '');
  const receiverTokenInput = walk(settingsView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-pairing-token') === '');
  if (!receiverURLInput || receiverURLInput.value !== 'http://127.0.0.1:47731/api/browser-inbox/v1/captures') {
    throw new Error('Browser Inbox settings did not render receiver URL');
  }
  if (!receiverTokenInput || receiverTokenInput.value !== 'initial-browser-token') {
    throw new Error('Browser Inbox settings did not render pairing token');
  }
  const rotateTokenButton = walk(settingsView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-settings-action') === 'rotate-token');
  if (!rotateTokenButton) throw new Error('Browser Inbox settings rotate token action missing');
  rotateTokenButton.click();
  await flush();
  if (receiverTokenInput.value !== 'rotated-browser-token') {
    throw new Error('Browser Inbox settings did not update token after rotation');
  }
  settingsView.component.unmount && settingsView.component.unmount(settingsView.container);

  const { component, container } = await mountWithApi(api);

  for (const name of ['browser.capture.page', 'browser.capture.selection', 'browser.capture.link', 'browser.capture.file']) {
    if (typeof api.handlers[name] !== 'function') throw new Error(`${name} subscription missing`);
  }

  await api.handlers['browser.capture.selection']({
    name: 'browser.capture.selection',
    timestamp: '2026-06-27T00:00:00Z',
    payload: {
      captureId: 'capture-1',
      capturedAt: '2026-06-27T00:00:00.000Z',
      kind: 'selection',
      url: 'https://example.com/article',
      title: 'Example Article',
      domain: 'example.com',
      text: 'Selected text from the page',
      browserName: 'Firefox',
      workspaceRootPath: 'Project',
    },
  });
  await flush();

  const projectKey = 'captures:workspace:Project';
  const clientKey = 'captures:workspace:ClientA';
  const globalKey = 'captures:global';
  const captures = api.getStoredCaptures(globalKey);
  if (captures.length !== 1) throw new Error(`expected one stored capture, got ${captures.length}`);
  if (captures[0].captureId !== 'capture-1') throw new Error('stored capture id mismatch');
  if (api.getStoredCaptures(projectKey).length !== 0) throw new Error('workspace capture was stored in a legacy workspace key');

  const row = walk(container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'capture-1');
  if (!row) throw new Error('capture row was not rendered');
  if (!container.textContent.includes('Selected text from the page')) {
    throw new Error('selection text was not rendered');
  }

  await api.handlers['browser.capture.selection']({
    name: 'browser.capture.selection',
    timestamp: '2026-06-27T00:00:00Z',
    payload: {
      captureId: 'capture-1',
      capturedAt: '2026-06-27T00:00:00.000Z',
      kind: 'selection',
      url: 'https://example.com/article',
      title: 'Example Article',
      domain: 'example.com',
      text: 'Duplicate selected text',
      workspaceRootPath: 'Project',
    },
  });
  await flush();
  if (api.getStoredCaptures(globalKey).length !== 1) throw new Error('duplicate capture was stored');

  const clientView = await mountWithApi(api, { workspaceNode: { name: 'ClientA' }, workspaceRootPath: 'ClientA' });
  if (walk(clientView.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'capture-1')) {
    throw new Error('Project capture leaked into ClientA workspace view');
  }
  await api.handlers['browser.capture.page']({
    name: 'browser.capture.page',
    timestamp: '2026-06-27T00:10:00Z',
    payload: {
      captureId: 'capture-2',
      capturedAt: '2026-06-27T00:10:00.000Z',
      kind: 'page',
      url: 'https://client.example.com/',
      title: 'Client Page',
      domain: 'client.example.com',
      workspaceRootPath: 'ClientA',
    },
  });
  await flush();
  if (!api.getStoredCaptures(globalKey).some((capture) => capture.captureId === 'capture-2')) {
    throw new Error('ClientA capture was not stored in the global queue');
  }
  if (!walk(clientView.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'capture-2')) {
    throw new Error('ClientA capture was not rendered');
  }
  component.unmount && component.unmount(clientView.container);

  const globalView = await mountWithApi(api, {});
  if (!walk(globalView.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'capture-1')) {
    throw new Error('global browser inbox did not aggregate Project capture');
  }
  if (!walk(globalView.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'capture-2')) {
    throw new Error('global browser inbox did not aggregate ClientA capture');
  }
  await api.handlers['browser.capture.page']({
    name: 'browser.capture.page',
    timestamp: '2026-06-27T00:20:00Z',
    payload: {
      captureId: 'capture-unassigned',
      capturedAt: '2026-06-27T00:20:00.000Z',
      kind: 'page',
      url: 'https://inbox.example.com/unassigned',
      title: 'Unassigned Page',
      domain: 'inbox.example.com',
    },
  });
  await flush();
  if (!api.getStoredCaptures(globalKey).some((capture) => capture.captureId === 'capture-unassigned' && !capture.workspaceRootPath)) {
    throw new Error('untagged receiver event was not retained as unassigned');
  }
  const unassignedWorkspace = await mountWithApi(api, { workspaceNode: { name: 'Project' }, workspaceRootPath: 'Project' });
  if (walk(unassignedWorkspace.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'capture-unassigned')) {
    throw new Error('unassigned capture leaked into a workspace inbox');
  }
  component.unmount && component.unmount(unassignedWorkspace.container);
  component.unmount && component.unmount(globalView.container);

  const clearButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-action') === 'clear');
  if (!clearButton) throw new Error('clear button not found');
  clearButton.click();
  await flush();
  if (!api.getStoredCaptures(globalKey).some((capture) => capture.captureId === 'capture-1' && capture.globalState === 'archived')) {
    throw new Error('workspace clear action did not archive the Project capture');
  }
  if (!api.getStoredCaptures(globalKey).some((capture) => capture.captureId === 'capture-2')) {
    throw new Error('workspace clear action removed a capture from another workspace');
  }

  component.unmount && component.unmount(container);
  if (api.unsubscribed.length !== 16) throw new Error('component did not unsubscribe all capture handlers');

  const persistedApi = makeApi({ 'captures:workspace:Project': [captures[0]] });
  const persisted = await mountWithApi(persistedApi);
  if (!walk(persisted.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'capture-1')) {
    throw new Error('persisted capture was not rendered on mount');
  }

  const legacyApi = makeApi({
    captures: [
      {
        captureId: 'legacy-global-capture',
        capturedAt: '2026-06-27T02:00:00.000Z',
        kind: 'page',
        url: 'https://legacy.example.com/',
        title: 'Legacy Global Capture',
        domain: 'legacy.example.com',
      },
      {
        captureId: 'legacy-project-capture',
        capturedAt: '2026-06-27T02:10:00.000Z',
        kind: 'page',
        url: 'https://project.example.com/',
        title: 'Legacy Project Capture',
        domain: 'project.example.com',
        workspaceRootPath: 'Project',
      },
    ],
  });
  const legacyGlobal = await mountWithApi(legacyApi, {});
  if (!walk(legacyGlobal.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'legacy-global-capture')) {
    throw new Error('legacy global capture was not rendered in global view');
  }
  if (!walk(legacyGlobal.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'legacy-project-capture')) {
    throw new Error('legacy workspace capture was not rendered in global view');
  }
  if (legacyApi.getStoredCaptures('captures').length !== 0) {
    throw new Error('legacy captures were not removed after canonical migration');
  }
  component.unmount && component.unmount(legacyGlobal.container);

  const legacyProject = await mountWithApi(legacyApi, { workspaceNode: { name: 'Project' }, workspaceRootPath: 'Project' });
  if (!walk(legacyProject.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'legacy-project-capture')) {
    throw new Error('legacy workspace capture was not rendered in matching workspace');
  }
  if (walk(legacyProject.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'legacy-global-capture')) {
    throw new Error('legacy global capture leaked into workspace view');
  }

  const taggedGlobalApi = makeApi({
    'captures:global': [
      {
        captureId: 'global-project-capture',
        capturedAt: '2026-06-27T03:00:00.000Z',
        kind: 'page',
        url: 'https://project.example.com/global',
        title: 'Global Project Capture',
        domain: 'project.example.com',
        workspaceRootPath: 'Project',
      },
    ],
  });
  const taggedGlobalProject = await mountWithApi(taggedGlobalApi, { workspaceNode: { name: 'Project' }, workspaceRootPath: 'Project' });
  if (!walk(taggedGlobalProject.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'global-project-capture')) {
    throw new Error('workspace did not render workspace-tagged global capture');
  }
  const taggedGlobalClient = await mountWithApi(taggedGlobalApi, { workspaceNode: { name: 'ClientA' }, workspaceRootPath: 'ClientA' });
  if (walk(taggedGlobalClient.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'global-project-capture')) {
    throw new Error('workspace-tagged global capture leaked into another workspace');
  }

  const bindingApi = makeApi({
    domainBindings: {
      'client.example.com': 'ClientA',
      'project.example.com': 'Project',
    },
  });
  const bindingGlobal = await mountWithApi(bindingApi, {});
  await bindingApi.handlers['browser.capture.page']({
    name: 'browser.capture.page',
    timestamp: '2026-06-29T00:00:00Z',
    payload: {
      captureId: 'bound-client-capture',
      capturedAt: '2026-06-29T00:00:00.000Z',
      kind: 'page',
      url: 'https://client.example.com/page',
      title: 'Bound Client Page',
      domain: 'client.example.com',
    },
  });
  await flush();
  if (!bindingApi.getStoredCaptures('captures:global').some((capture) => capture.captureId === 'bound-client-capture' && capture.workspaceRootPath === 'ClientA')) {
    throw new Error('domain-bound capture was not stored with its ClientA assignment');
  }
  const bindingClient = await mountWithApi(bindingApi, { workspaceNode: { name: 'ClientA' }, workspaceRootPath: 'ClientA' });
  if (!walk(bindingClient.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'bound-client-capture')) {
    throw new Error('domain-bound capture was not rendered in bound workspace');
  }
  const bindingAggregate = await mountWithApi(bindingApi, {});
  if (!walk(bindingAggregate.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'bound-client-capture')) {
    throw new Error('global browser inbox did not aggregate domain-bound capture');
  }

  await bindingApi.handlers['browser.capture.page']({
    name: 'browser.capture.page',
    timestamp: '2026-06-29T00:10:00Z',
    payload: {
      captureId: 'explicit-project-capture',
      capturedAt: '2026-06-29T00:10:00.000Z',
      kind: 'page',
      url: 'https://client.example.com/explicit',
      title: 'Explicit Project Page',
      domain: 'client.example.com',
      workspaceRootPath: 'Project',
    },
  });
  await flush();
  if (!bindingApi.getStoredCaptures('captures:global').some((capture) => capture.captureId === 'explicit-project-capture' && capture.workspaceRootPath === 'Project')) {
    throw new Error('explicit workspace capture was not stored with its payload workspace');
  }
  if (bindingApi.getStoredCaptures('captures:global').some((capture) => capture.captureId === 'explicit-project-capture' && capture.workspaceRootPath === 'ClientA')) {
    throw new Error('domain binding overrode explicit workspaceRootPath');
  }
  component.unmount && component.unmount(bindingGlobal.container);
  component.unmount && component.unmount(bindingClient.container);
  component.unmount && component.unmount(bindingAggregate.container);

  const assignmentApi = makeApi({
    'captures:global': [
      {
        captureId: 'assignment-unassigned',
        capturedAt: '2026-06-29T00:20:00.000Z',
        kind: 'page',
        url: 'https://inbox.example.com/unassigned',
        title: 'Unassigned capture',
        domain: 'inbox.example.com',
      },
      {
        captureId: 'assignment-client-processed',
        capturedAt: '2026-06-29T00:10:00.000Z',
        kind: 'page',
        url: 'https://inbox.example.com/client',
        title: 'Processed client capture',
        domain: 'inbox.example.com',
        workspaceRootPath: 'ClientA',
        processed: true,
      },
    ],
  });
  const assignmentView = await mountWithApi(assignmentApi, {});
  const statusFilter = walk(assignmentView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-filter') === 'status');
  if (!statusFilter) throw new Error('global status filter was not rendered');
  statusFilter.value = 'unassigned';
  statusFilter.dispatchEvent('change');
  await flush();
  if (!walk(assignmentView.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'assignment-unassigned')) {
    throw new Error('unassigned filter did not render the unassigned capture');
  }
  if (walk(assignmentView.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'assignment-client-processed')) {
    throw new Error('unassigned filter leaked an assigned capture');
  }
  statusFilter.value = 'all';
  statusFilter.dispatchEvent('change');
  await flush();

  const assignmentSelect = walk(assignmentView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-assignment') === 'assignment-unassigned');
  if (!assignmentSelect) throw new Error('workspace assignment control was not rendered');
  assignmentSelect.value = 'ClientA';
  assignmentSelect.dispatchEvent('change');
  await flush();
  if (!assignmentApi.getStoredCaptures(globalKey).some((capture) => capture.captureId === 'assignment-unassigned' && capture.workspaceRootPath === 'ClientA')) {
    throw new Error('assignment did not persist ClientA workspace root path');
  }
  const reassignmentSelect = walk(assignmentView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-assignment') === 'assignment-unassigned');
  reassignmentSelect.value = 'Project';
  reassignmentSelect.dispatchEvent('change');
  await flush();
  if (!assignmentApi.getStoredCaptures(globalKey).some((capture) => capture.captureId === 'assignment-unassigned' && capture.workspaceRootPath === 'Project')) {
    throw new Error('reassignment did not persist Project workspace root path');
  }
  const clearAssignmentButton = walk(assignmentView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-action') === 'clear-assignment');
  if (!clearAssignmentButton) throw new Error('clear assignment action was not rendered');
  clearAssignmentButton.click();
  await flush();
  if (!assignmentApi.getStoredCaptures(globalKey).some((capture) => capture.captureId === 'assignment-unassigned' && !capture.workspaceRootPath)) {
    throw new Error('clear assignment did not make the capture unassigned');
  }
  const processedButton = walk(assignmentView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-action') === 'toggle-processed');
  if (!processedButton) throw new Error('processed state action was not rendered');
  processedButton.click();
  await flush();
  if (!assignmentApi.getStoredCaptures(globalKey).some((capture) => capture.captureId === 'assignment-unassigned' && capture.processed === true)) {
    throw new Error('mark processed did not persist state');
  }
  const unprocessedButton = walk(assignmentView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-action') === 'toggle-processed');
  unprocessedButton.click();
  await flush();
  if (!assignmentApi.getStoredCaptures(globalKey).some((capture) => capture.captureId === 'assignment-unassigned' && capture.processed === false)) {
    throw new Error('mark unprocessed did not persist state');
  }
  const deleteButton = walk(assignmentView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-action') === 'delete-permanently');
  if (!deleteButton) throw new Error('permanent delete action was not rendered');
  deleteButton.click();
  await flush();
  if (assignmentApi.getStoredCaptures(globalKey).some((capture) => capture.captureId === 'assignment-unassigned')) {
    throw new Error('delete did not remove the capture from global storage');
  }
  component.unmount && component.unmount(assignmentView.container);

  const archiveApi = makeApi({
    'captures:global': [{
      captureId: 'archived-capture',
      capturedAt: '2026-07-12T10:00:00.000Z',
      kind: 'page',
      url: 'https://example.com/archive',
      title: 'Archived capture',
      workspaceRootPath: 'Project',
      globalState: 'archived',
    }],
  });
  const archiveView = await mountWithApi(archiveApi, {});
  if (walk(archiveView.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'archived-capture')) {
    throw new Error('archived capture leaked into the active inbox');
  }
  const archiveFilter = walk(archiveView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-filter') === 'status');
  archiveFilter.value = 'archived';
  archiveFilter.dispatchEvent('change');
  await flush();
  if (!walk(archiveView.container, (node) => node.getAttribute && node.getAttribute('data-browser-capture-id') === 'archived-capture')) {
    throw new Error('archive filter did not reveal archived capture');
  }
  const restoreButton = walk(archiveView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-action') === 'restore');
  if (!restoreButton) throw new Error('restore archived capture action was not rendered');
  restoreButton.click();
  await flush();
  if (!archiveApi.getStoredCaptures(globalKey).some((capture) => capture.captureId === 'archived-capture' && capture.globalState === 'inbox')) {
    throw new Error('restore archived capture did not return it to Inbox');
  }
  component.unmount && component.unmount(archiveView.container);

  const conversionApi = makeApi({
    'captures:workspace:Project': [{
      captureId: 'convert-selection',
      capturedAt: '2026-06-29T01:00:00.000Z',
      kind: 'selection',
      url: 'https://example.com/article',
      title: 'Example Article',
      domain: 'example.com',
      text: 'Selected text from the page',
      workspaceRootPath: 'Project',
      workspaceName: 'Project',
    }],
  });
  const conversionView = await mountWithApi(conversionApi);
  const createNoteButton = walk(conversionView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-action') === 'create-note');
  if (!createNoteButton) throw new Error('create note button was not rendered');
  createNoteButton.click();
  await flush();
  if (conversionApi.fileWrites.length !== 1) throw new Error(`expected one note write, got ${conversionApi.fileWrites.length}`);
  const noteWrite = conversionApi.fileWrites[0];
  if (noteWrite.relativePath !== 'Project/Notes/Example_Article.md') {
    throw new Error(`note path mismatch: ${noteWrite.relativePath}`);
  }
  if (noteWrite.options.createIfMissing !== true || noteWrite.options.overwrite !== false) {
    throw new Error(`note write options mismatch: ${JSON.stringify(noteWrite.options)}`);
  }
  if (!noteWrite.content.includes('# Example Article')) throw new Error('note content missing heading');
  if (!noteWrite.content.includes('Source: https://example.com/article')) throw new Error('note content missing source URL');
  if (!noteWrite.content.includes('Selected text from the page')) throw new Error('note content missing selected text');
  if (!conversionApi.getStoredCaptures(globalKey).some((capture) => capture.captureId === 'convert-selection' && capture.globalState === 'archived')) {
    throw new Error('converted capture was not archived');
  }
  const convertedEvent = conversionApi.publishedEvents.find((event) => event.name === 'browser.capture.converted');
  if (!convertedEvent) throw new Error('browser.capture.converted event was not published');
  if (convertedEvent.payload.conversionType !== 'note') throw new Error('converted event conversionType mismatch');
  if (convertedEvent.payload.notePath !== 'Project/Notes/Example_Article.md') throw new Error('converted event notePath mismatch');
  component.unmount && component.unmount(conversionView.container);

  const failedConversionApi = makeApi({
    'captures:workspace:Project': [{
      captureId: 'convert-conflict',
      capturedAt: '2026-06-29T01:10:00.000Z',
      kind: 'page',
      url: 'https://example.com/existing',
      title: 'Existing Article',
      domain: 'example.com',
      workspaceRootPath: 'Project',
      workspaceName: 'Project',
    }],
  });
  const failedConversionView = await mountWithApi(failedConversionApi);
  const failedCreateNoteButton = walk(failedConversionView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-action') === 'create-note');
  if (!failedCreateNoteButton) throw new Error('create note button for failed conversion was not rendered');
  failedConversionApi.failNextWrite('file already exists');
  failedCreateNoteButton.click();
  await flush();
  if (!failedConversionApi.getStoredCaptures(globalKey).some((capture) => capture.captureId === 'convert-conflict')) {
    throw new Error('failed conversion removed capture from queue');
  }
  if (!failedConversionView.container.textContent.includes('Could not create the note. Please try again.')) {
    throw new Error('failed conversion did not render an error status');
  }
  if (failedConversionView.container.textContent.includes('file already exists')) {
    throw new Error('failed conversion exposed a raw backend error');
  }
  if (failedConversionApi.publishedEvents.some((event) => event.name === 'browser.capture.converted')) {
    throw new Error('failed conversion published converted event');
  }
  component.unmount && component.unmount(failedConversionView.container);

  const linkConversionApi = makeApi({
    'captures:workspace:Project': [{
      captureId: 'convert-link',
      capturedAt: '2026-06-29T01:20:00.000Z',
      kind: 'link',
      url: 'https://example.com/article',
      title: 'Example Article',
      domain: 'example.com',
      workspaceRootPath: 'Project',
      workspaceName: 'Project',
    }],
  });
  const linkConversionView = await mountWithApi(linkConversionApi);
  const createLinkButton = walk(linkConversionView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-action') === 'create-link');
  if (!createLinkButton) throw new Error('create link button was not rendered');
  const openLinkButton = walk(linkConversionView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-action') === 'open-link');
  if (!openLinkButton) throw new Error('open link action was not rendered');
  openLinkButton.click();
  await flush();
  if (linkConversionApi.openedURLs.join(',') !== 'https://example.com/article') throw new Error('open link did not use browser URL capability');
  createLinkButton.click();
  await flush();
  if (linkConversionApi.fileWrites.length !== 1) throw new Error(`expected one link write, got ${linkConversionApi.fileWrites.length}`);
  const linkWrite = linkConversionApi.fileWrites[0];
  if (linkWrite.relativePath !== 'Project/Links/Example_Article.url') {
    throw new Error(`link path mismatch: ${linkWrite.relativePath}`);
  }
  if (linkWrite.options.createIfMissing !== true || linkWrite.options.overwrite !== false) {
    throw new Error(`link write options mismatch: ${JSON.stringify(linkWrite.options)}`);
  }
  if (!linkWrite.content.includes('[InternetShortcut]')) throw new Error('link content missing InternetShortcut header');
  if (!linkWrite.content.includes('URL=https://example.com/article')) throw new Error('link content missing URL');
  if (!linkConversionApi.getStoredCaptures(globalKey).some((capture) => capture.captureId === 'convert-link' && capture.globalState === 'archived')) {
    throw new Error('converted link capture was not archived');
  }
  const convertedLinkEvent = linkConversionApi.publishedEvents.find((event) => event.name === 'browser.capture.converted');
  if (!convertedLinkEvent) throw new Error('browser.capture.converted link event was not published');
  if (convertedLinkEvent.payload.conversionType !== 'link') throw new Error('converted link event conversionType mismatch');
  if (convertedLinkEvent.payload.linkPath !== 'Project/Links/Example_Article.url') throw new Error('converted link event linkPath mismatch');
  component.unmount && component.unmount(linkConversionView.container);

  const collisionLinkApi = makeApi({
    'captures:workspace:Project': [{
      captureId: 'convert-link-collision',
      capturedAt: '2026-06-29T01:25:00.000Z',
      kind: 'link',
      url: 'https://example.com/collision',
      title: 'Example Article',
      workspaceRootPath: 'Project',
    }],
  });
  collisionLinkApi.failNextWrite('conflict: Project/Links/Example_Article.url');
  const collisionLinkView = await mountWithApi(collisionLinkApi);
  walk(collisionLinkView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-action') === 'create-link').click();
  await flush();
  if (collisionLinkApi.fileWrites.length !== 1 || collisionLinkApi.fileWrites[0].relativePath !== 'Project/Links/Example_Article (2).url') {
    throw new Error('link filename collision did not use the numbered suffix');
  }
  component.unmount && component.unmount(collisionLinkView.container);

  const failedLinkApi = makeApi({
    'captures:workspace:Project': [{
      captureId: 'convert-link-conflict',
      capturedAt: '2026-06-29T01:30:00.000Z',
      kind: 'link',
      url: 'https://example.com/existing-link',
      title: 'Existing Link',
      domain: 'example.com',
      workspaceRootPath: 'Project',
      workspaceName: 'Project',
    }],
  });
  const failedLinkView = await mountWithApi(failedLinkApi);
  const failedCreateLinkButton = walk(failedLinkView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-action') === 'create-link');
  if (!failedCreateLinkButton) throw new Error('create link button for failed conversion was not rendered');
  failedLinkApi.failNextWrite('link already exists');
  failedCreateLinkButton.click();
  await flush();
  if (!failedLinkApi.getStoredCaptures(globalKey).some((capture) => capture.captureId === 'convert-link-conflict')) {
    throw new Error('failed link conversion removed capture from queue');
  }
  if (!failedLinkView.container.textContent.includes('Could not create the link. Please try again.')) {
    throw new Error('failed link conversion did not render an error status');
  }
  if (failedLinkApi.publishedEvents.some((event) => event.name === 'browser.capture.converted')) {
    throw new Error('failed link conversion published converted event');
  }
  component.unmount && component.unmount(failedLinkView.container);

  const fileConversionApi = makeApi({
    'captures:workspace:Project': [{
      captureId: 'convert-file',
      capturedAt: '2026-06-29T02:20:00.000Z',
      kind: 'file',
      url: 'https://example.com/files',
      title: 'Example Files',
      domain: 'example.com',
      fileName: 'notes.txt',
      fileMime: 'text/plain',
      fileSize: 11,
      fileText: 'hello file',
      workspaceRootPath: 'Project',
      workspaceName: 'Project',
    }],
  });
  const fileConversionView = await mountWithApi(fileConversionApi);
  const createFileButton = walk(fileConversionView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-action') === 'create-file');
  if (!createFileButton) throw new Error('create file button was not rendered');
  createFileButton.click();
  await flush();
  if (fileConversionApi.fileWrites.length !== 1) throw new Error(`expected one file write, got ${fileConversionApi.fileWrites.length}`);
  const fileWrite = fileConversionApi.fileWrites[0];
  if (fileWrite.relativePath !== 'Project/Files/notes.txt') {
    throw new Error(`file path mismatch: ${fileWrite.relativePath}`);
  }
  if (fileWrite.content !== 'hello file') throw new Error(`file content mismatch: ${fileWrite.content}`);
  if (fileWrite.options.createIfMissing !== true || fileWrite.options.overwrite !== false) {
    throw new Error(`file write options mismatch: ${JSON.stringify(fileWrite.options)}`);
  }
  if (!fileConversionApi.getStoredCaptures(globalKey).some((capture) => capture.captureId === 'convert-file' && capture.globalState === 'archived')) {
    throw new Error('converted file capture was not archived');
  }
  const convertedFileEvent = fileConversionApi.publishedEvents.find((event) => event.name === 'browser.capture.converted');
  if (!convertedFileEvent) throw new Error('browser.capture.converted file event was not published');
  if (convertedFileEvent.payload.conversionType !== 'file') throw new Error('converted file event conversionType mismatch');
  if (convertedFileEvent.payload.filePath !== 'Project/Files/notes.txt') throw new Error('converted file event filePath mismatch');
  component.unmount && component.unmount(fileConversionView.container);

  const binaryFileApi = makeApi({
    'captures:workspace:Project': [{
      captureId: 'convert-binary-file',
      capturedAt: '2026-06-29T02:25:00.000Z',
      kind: 'file',
      url: 'https://example.com/files',
      title: 'Example Files',
      domain: 'example.com',
      fileName: 'logo.png',
      fileMime: 'image/png',
      fileSize: 4,
      fileDataBase64: 'iVBORw==',
      workspaceRootPath: 'Project',
      workspaceName: 'Project',
    }],
  });
  const binaryFileView = await mountWithApi(binaryFileApi);
  const createBinaryFileButton = walk(binaryFileView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-action') === 'create-file');
  if (!createBinaryFileButton) throw new Error('create file button for binary capture was not rendered');
  createBinaryFileButton.click();
  await flush();
  if (binaryFileApi.fileWrites.length !== 0) throw new Error('binary file conversion used writeText');
  if (binaryFileApi.fileByteWrites.length !== 1) throw new Error(`expected one byte write, got ${binaryFileApi.fileByteWrites.length}`);
  const byteWrite = binaryFileApi.fileByteWrites[0];
  if (byteWrite.relativePath !== 'Project/Files/logo.png') throw new Error(`byte write path mismatch: ${byteWrite.relativePath}`);
  if (byteWrite.dataBase64 !== 'iVBORw==') throw new Error(`byte write data mismatch: ${byteWrite.dataBase64}`);
  if (byteWrite.options.createIfMissing !== true || byteWrite.options.overwrite !== false) {
    throw new Error(`byte write options mismatch: ${JSON.stringify(byteWrite.options)}`);
  }
  const convertedBinaryFileEvent = binaryFileApi.publishedEvents.find((event) => event.name === 'browser.capture.converted');
  if (!convertedBinaryFileEvent || convertedBinaryFileEvent.payload.filePath !== 'Project/Files/logo.png') {
    throw new Error('binary file conversion event mismatch');
  }
  component.unmount && component.unmount(binaryFileView.container);

  const failedFileApi = makeApi({
    'captures:workspace:Project': [{
      captureId: 'convert-file-conflict',
      capturedAt: '2026-06-29T02:30:00.000Z',
      kind: 'file',
      url: 'https://example.com/files',
      title: 'Example Files',
      domain: 'example.com',
      fileName: 'existing.txt',
      fileMime: 'text/plain',
      fileSize: 12,
      fileText: 'existing file',
      workspaceRootPath: 'Project',
      workspaceName: 'Project',
    }],
  });
  const failedFileView = await mountWithApi(failedFileApi);
  const failedCreateFileButton = walk(failedFileView.container, (node) => node.getAttribute && node.getAttribute('data-browser-inbox-action') === 'create-file');
  if (!failedCreateFileButton) throw new Error('create file button for failed conversion was not rendered');
  failedFileApi.failNextWrite('file already exists');
  failedCreateFileButton.click();
  await flush();
  if (!failedFileApi.getStoredCaptures(globalKey).some((capture) => capture.captureId === 'convert-file-conflict')) {
    throw new Error('failed file conversion removed capture from queue');
  }
  if (!failedFileView.container.textContent.includes('Could not create the file. Please try again.')) {
    throw new Error('failed file conversion did not render an error status');
  }
  if (failedFileApi.publishedEvents.some((event) => event.name === 'browser.capture.converted')) {
    throw new Error('failed file conversion published converted event');
  }
  component.unmount && component.unmount(failedFileView.container);

  if (!technicalErrors.some((entry) => entry.includes('file already exists'))) {
    throw new Error('failed conversion did not retain its technical details in the console log');
  }

  console.log('browser inbox plugin smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
