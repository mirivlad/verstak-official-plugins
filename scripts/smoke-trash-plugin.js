const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'trash', 'frontend', 'src', 'index.js');
const manifestPath = path.join(root, 'plugins', 'trash', 'plugin.json');
const source = fs.readFileSync(sourcePath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

class FakeClassList {
  constructor(node) {
    this.node = node;
  }

  add(name) {
    if (!this.contains(name)) this.node.className = `${this.node.className} ${name}`.trim();
  }

  remove(name) {
    this.node.className = this.node.className.split(/\s+/).filter((item) => item && item !== name).join(' ');
  }

  contains(name) {
    return this.node.className.split(/\s+/).includes(name);
  }
}

class FakeNode {
  constructor(tagName, text = '') {
    this.tagName = String(tagName || '').toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.listeners = {};
    this.style = {};
    this.className = '';
    this.classList = new FakeClassList(this);
    this.value = '';
    this.disabled = false;
    this._text = text;
  }

  appendChild(child) {
    if (child == null) return child;
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    this.children = this.children.filter((candidate) => candidate !== child);
    child.parentNode = null;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'class') this.className = String(value);
    if (name === 'value') this.value = String(value);
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  addEventListener(type, handler) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(handler);
  }

  dispatchEvent(event) {
    const payload = typeof event === 'string' ? { type: event, target: this } : Object.assign({ target: this }, event);
    (this.listeners[payload.type] || []).slice().forEach((handler) => handler(payload));
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this, preventDefault() {}, stopPropagation() {} });
  }

  focus() {}

  get textContent() {
    return `${this._text || ''}${this.children.map((child) => child.textContent || '').join('')}`;
  }

  set textContent(value) {
    this._text = String(value == null ? '' : value);
    this.children = [];
  }

  get innerHTML() {
    return this.textContent;
  }

  set innerHTML(value) {
    this._text = String(value || '');
    this.children = [];
  }
}

function walk(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.children || []) {
    const found = walk(child, predicate);
    if (found) return found;
  }
  return null;
}

function walkAll(node, predicate, output = []) {
  if (predicate(node)) output.push(node);
  for (const child of node.children || []) walkAll(child, predicate, output);
  return output;
}

function makeDocument() {
  const document = {
    head: new FakeNode('head'),
    body: new FakeNode('body'),
    activeElement: null,
    createElement(tagName) {
      return new FakeNode(tagName);
    },
    createTextNode(value) {
      return new FakeNode('#text', String(value));
    },
    getElementById(id) {
      return walk(this.head, (node) => node.getAttribute && node.getAttribute('id') === id)
        || walk(this.body, (node) => node.getAttribute && node.getAttribute('id') === id);
    },
  };
  return document;
}

function loadTrashComponent(document) {
  const registry = {};
  const sandbox = {
    console,
    Promise,
    Date,
    Intl,
    setTimeout,
    clearTimeout,
    document,
    window: {
      VerstakPluginRegister(pluginId, bundle) {
        registry[pluginId] = bundle.components || {};
      },
    },
  };
  sandbox.window.document = document;
  vm.runInNewContext(source, sandbox, { filename: sourcePath });
  const component = registry['verstak.trash'] && registry['verstak.trash'].TrashView;
  if (!component) throw new Error('TrashView was not registered');
  return component;
}

function makeApi() {
  let entries = [
    {
      trashId: 'old-project-file',
      originalPath: 'Project/Docs/old.txt',
      trashPath: '.verstak/trash/files/old-project-file/old.txt',
      deletedAt: '2026-06-20T08:00:00.000Z',
      originalType: 'file',
      basename: 'old.txt',
      size: 12,
    },
    {
      trashId: 'latest-client-report',
      originalPath: 'ClientA/Archive/report.pdf',
      trashPath: '.verstak/trash/files/latest-client-report/report.pdf',
      deletedAt: '2026-06-29T09:30:00.000Z',
      originalType: 'file',
      basename: 'report.pdf',
      size: 2048,
    },
    {
      trashId: 'conflict-project-folder',
      originalPath: 'Project/Assets',
      trashPath: '.verstak/trash/files/conflict-project-folder/Assets',
      deletedAt: '2026-06-28T09:30:00.000Z',
      originalType: 'folder',
      basename: 'Assets',
      size: 0,
    },
  ];
  const restoreCalls = [];
  const deleteCalls = [];
  return {
    restoreCalls,
    deleteCalls,
    files: {
      listTrash: async () => entries.slice(),
      restoreTrash: async (trashId, options) => {
        restoreCalls.push({ trashId, options });
        if (trashId === 'conflict-project-folder') throw new Error('conflict: Project/Assets');
        const entry = entries.find((item) => item.trashId === trashId);
        if (!entry) throw new Error(`not-found: trash entry ${trashId}`);
        entries = entries.filter((item) => item.trashId !== trashId);
        return entry.originalPath;
      },
      deleteTrash: async (trashId) => {
        deleteCalls.push(trashId);
        if (!entries.some((item) => item.trashId === trashId)) throw new Error(`not-found: trash entry ${trashId}`);
        entries = entries.filter((item) => item.trashId !== trashId);
      },
    },
  };
}

async function flush() {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
}

function findByData(rootNode, name, value) {
  return walk(rootNode, (node) => node.getAttribute && node.getAttribute(name) === value);
}

(async () => {
  if (!manifest.contributes || !Array.isArray(manifest.contributes.sidebarItems) || !manifest.contributes.sidebarItems.some((item) => item.view === 'verstak.trash.view')) {
    throw new Error('Trash manifest must provide a global sidebar item');
  }
  if (manifest.contributes.workspaceItems) throw new Error('Trash must not be a workspace tab');
  if (!manifest.permissions.includes('files.delete') || !manifest.permissions.includes('files.write')) {
    throw new Error('Trash manifest must request delete and write permissions');
  }

  const document = makeDocument();
  const component = loadTrashComponent(document);
  const container = new FakeNode('div');
  const api = makeApi();
  component.mount(container, {}, api);
  await flush();

  const latestRow = findByData(container, 'data-trash-row', 'latest-client-report');
  if (!latestRow || !latestRow.textContent.includes('ClientA') || !latestRow.textContent.includes('ClientA/Archive/report.pdf')) {
    throw new Error(`global Trash must render workspace and original path: ${container.textContent}`);
  }

  const workspaceFilter = findByData(container, 'data-trash-filter-workspace', '');
  workspaceFilter.value = 'Project';
  workspaceFilter.dispatchEvent({ type: 'change', target: workspaceFilter });
  if (walkAll(container, (node) => node.getAttribute && node.getAttribute('data-trash-row') !== null).length !== 2) {
    throw new Error('workspace filter must keep only Project trash entries');
  }

  workspaceFilter.value = '';
  workspaceFilter.dispatchEvent({ type: 'change', target: workspaceFilter });
  const searchFilter = findByData(container, 'data-trash-filter-search', '');
  searchFilter.value = 'report';
  searchFilter.dispatchEvent({ type: 'input', target: searchFilter });
  if (!findByData(container, 'data-trash-row', 'latest-client-report') || findByData(container, 'data-trash-row', 'old-project-file')) {
    throw new Error('name/path search must filter trash entries');
  }

  searchFilter.value = '';
  searchFilter.dispatchEvent({ type: 'input', target: searchFilter });
  const sortSelect = findByData(container, 'data-trash-sort', '');
  sortSelect.value = 'date-asc';
  sortSelect.dispatchEvent({ type: 'change', target: sortSelect });
  const sortedRows = walkAll(container, (node) => node.getAttribute && node.getAttribute('data-trash-row') !== null);
  if (!sortedRows.length || sortedRows[0].getAttribute('data-trash-row') !== 'old-project-file') {
    throw new Error('deleted-date ascending sort must place the oldest entry first');
  }

  const restore = findByData(container, 'data-trash-restore', 'old-project-file');
  restore.click();
  await flush();
  if (!api.restoreCalls.some((call) => call.trashId === 'old-project-file' && call.options && call.options.overwrite === false)) {
    throw new Error(`restore must explicitly reject overwrites: ${JSON.stringify(api.restoreCalls)}`);
  }
  if (findByData(container, 'data-trash-row', 'old-project-file')) throw new Error('restored entry must leave Trash');

  const conflictRestore = findByData(container, 'data-trash-restore', 'conflict-project-folder');
  conflictRestore.click();
  await flush();
  const status = findByData(container, 'data-trash-status', '');
  if (!status || !/Restore blocked/i.test(status.textContent) || !findByData(container, 'data-trash-row', 'conflict-project-folder')) {
    throw new Error('restore conflict must stay visible and keep the entry in Trash');
  }

  const permanentDelete = findByData(container, 'data-trash-delete', 'latest-client-report');
  permanentDelete.click();
  await flush();
  if (api.deleteCalls.length !== 0 || !findByData(container, 'data-trash-confirm', 'latest-client-report')) {
    throw new Error('permanent delete must wait for explicit confirmation');
  }
  const confirmDelete = findByData(container, 'data-trash-confirm-delete', 'latest-client-report');
  confirmDelete.click();
  await flush();
  if (!api.deleteCalls.includes('latest-client-report') || findByData(container, 'data-trash-row', 'latest-client-report')) {
    throw new Error('confirmed permanent delete must remove the entry from Trash');
  }

  component.unmount(container);
  console.log('trash frontend smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
