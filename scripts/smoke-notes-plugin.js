#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'notes', 'frontend', 'src', 'index.js');
const source = fs.readFileSync(sourcePath, 'utf8');

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
    this._innerHTML = '';
    this._textContent = '';
  }

  appendChild(node) {
    if (!(node instanceof FakeNode)) throw new TypeError('appendChild expects FakeNode');
    this.children.push(node);
    node.parentNode = this;
    return node;
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
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
    handlers.forEach((handler) => handler({ stopPropagation() {}, ...event }));
  }

  click() {
    this.dispatchEvent('click');
  }

  focus() {}
  select() {}

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
  const body = new FakeNode('body');
  return {
    body,
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

function loadNotesComponent(document) {
  const registry = {};
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
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
  const component = registry['verstak.notes'] && registry['verstak.notes'].NotesView;
  if (!component) throw new Error('NotesView was not registered');
  return component;
}

function makeApi(options = {}) {
  const entries = new Map();
  const opened = [];
  const contributionCalls = [];
  return {
    entries,
    opened,
    contributionCalls,
    files: {
      list: async (relativeDir) => {
        const prefix = relativeDir ? `${relativeDir}/` : '';
        if (!entries.has(relativeDir)) throw new Error(`not-found: ${relativeDir}`);
        return Array.from(entries.entries())
          .filter(([entryPath]) => entryPath.startsWith(prefix) && entryPath !== relativeDir && !entryPath.slice(prefix.length).includes('/'))
          .map(([entryPath, entry]) => ({
            name: path.basename(entryPath),
            relativePath: entryPath,
            type: entry.type,
          }));
      },
      metadata: async (relativePath) => {
        if (options.metadataAlwaysExists) return { relativePath, type: 'file' };
        const entry = entries.get(relativePath);
        if (!entry) throw new Error(`not-found: ${relativePath}`);
        return { relativePath, type: entry.type };
      },
      createFolder: async (relativePath) => {
        if (entries.has(relativePath)) throw new Error(`conflict: ${relativePath}`);
        entries.set(relativePath, { type: 'folder' });
      },
      writeText: async (relativePath, content, writeOptions = {}) => {
        if (entries.has(relativePath) && !writeOptions.overwrite) throw new Error(`conflict: ${relativePath}`);
        const parent = relativePath.split('/').slice(0, -1).join('/');
        if (parent && !entries.has(parent)) throw new Error(`parent-not-found: ${parent}`);
        entries.set(relativePath, { type: 'file', content });
      },
      move: async (fromRelativePath, toRelativePath) => {
        const entry = entries.get(fromRelativePath);
        if (!entry) throw new Error(`not-found: ${fromRelativePath}`);
        if (entries.has(toRelativePath)) throw new Error(`conflict: ${toRelativePath}`);
        entries.set(toRelativePath, entry);
        entries.delete(fromRelativePath);
      },
      trash: async (relativePath) => {
        if (!entries.has(relativePath)) throw new Error(`not-found: ${relativePath}`);
        entries.delete(relativePath);
        return {
          originalPath: relativePath,
          trashPath: `.verstak/trash/files/mock/${path.basename(relativePath)}`,
          trashId: 'mock',
          deletedAt: new Date().toISOString(),
        };
      },
    },
    workbench: {
      openResource: async (request) => {
        opened.push(request);
        return { status: 'opened' };
      },
    },
    contributions: {
      list: async (point) => {
        if (point === 'noteActions') {
          return [{
            pluginId: 'provider.plugin',
            id: 'provider.note.action',
            label: 'Provider Note Action',
            handler: 'provider.noteCommand',
          }];
        }
        return [];
      },
    },
    commands: {
      executeFor: async (pluginId, commandId, args) => {
        contributionCalls.push({ pluginId, commandId, args });
        return { status: 'handled' };
      },
    },
  };
}

async function flush() {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
  }
}

async function mountNotes(api) {
  const document = makeDocument();
  const component = loadNotesComponent(document);
  const container = new FakeNode('div');
  component.mount(container, { workspaceNode: { name: 'Project' } }, api);
  await flush();
  return { container, document, component };
}

(async () => {
  const emptyApi = makeApi();
  const emptyMounted = await mountNotes(emptyApi);
  if (walk(emptyMounted.container, (node) => node.getAttribute && node.getAttribute('data-action') === 'overview')) {
    throw new Error('NotesView must not render a persistent Overview button');
  }
  if (emptyMounted.container.textContent.includes('<svg')) {
    throw new Error('NotesView empty state renders raw SVG text');
  }

  const createApi = makeApi({ metadataAlwaysExists: true });
  createApi.entries.set('Project/Notes', { type: 'folder' });
  createApi.entries.set('Project/Notes/Second_Note.md', { type: 'file', content: '# Second Note\n' });
  const { container, document } = await mountNotes(createApi);
  const createButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-action') === 'create');
  if (!createButton) throw new Error('create button not found');
  createButton.click();
  const input = walk(container, (node) => node.getAttribute && node.getAttribute('data-notes-create-input') !== undefined);
  if (!input) throw new Error('create input not found');
  input.value = 'First Note';
  const confirm = walk(container, (node) => node.tagName === 'BUTTON' && node.textContent === 'Create');
  if (!confirm) throw new Error('create confirm button not found');
  confirm.click();
  await flush();

  const created = createApi.entries.get('Project/Notes/First_Note.md');
  if (!created || created.content !== '# First Note\n') {
    throw new Error('create note did not write the markdown file');
  }
  if (document.body.children.some((node) => node.className === 'notes-modal-overlay')) {
    throw new Error('create note showed a conflict modal for a new file');
  }
  if (!createApi.opened.some((request) => request.path === 'Project/Notes/First_Note.md')) {
    throw new Error('create note did not open the newly created file');
  }

  const filterInput = walk(container, (node) => node.getAttribute && node.getAttribute('data-notes-filter') !== undefined);
  if (!filterInput) throw new Error('notes filter input not found');
  filterInput.value = 'second';
  filterInput.dispatchEvent('input');
  if (!container.textContent.includes('Second Note') || container.textContent.includes('First Note')) {
    throw new Error(`notes filter did not narrow the rendered list: ${container.textContent}`);
  }
  filterInput.value = 'missing';
  filterInput.dispatchEvent('input');
  if (!container.textContent.includes('No matching notes')) {
    throw new Error('notes filter empty state not shown');
  }
  filterInput.value = '';
  filterInput.dispatchEvent('input');

  const sortSelect = walk(container, (node) => node.getAttribute && node.getAttribute('data-notes-sort') !== undefined);
  if (!sortSelect) throw new Error('notes sort select not found');
  sortSelect.value = 'title-desc';
  sortSelect.dispatchEvent('change');
  const renderedText = container.textContent;
  if (renderedText.indexOf('Second Note') === -1 || renderedText.indexOf('First Note') === -1 || renderedText.indexOf('Second Note') > renderedText.indexOf('First Note')) {
    throw new Error(`notes descending sort order is wrong: ${renderedText}`);
  }
  sortSelect.value = 'title-asc';
  sortSelect.dispatchEvent('change');

  const renameButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-note-action') === 'rename');
  if (!renameButton) throw new Error('rename note button not found');
  renameButton.click();
  const renameInput = walk(container, (node) => node.getAttribute && node.getAttribute('data-notes-rename-input') !== undefined);
  if (!renameInput) throw new Error('rename input not found');
  renameInput.value = 'Second Note';
  const renameConfirm = walk(container, (node) => node.tagName === 'BUTTON' && node.textContent === 'Rename');
  if (!renameConfirm) throw new Error('rename confirm button not found');
  renameConfirm.click();
  await flush();
  const conflictModal = walk(document.body, (node) => node.className === 'notes-modal-msg');
  if (!conflictModal || !conflictModal.textContent.includes('Project/Notes/Second_Note.md')) {
    throw new Error(`rename conflict modal should include existing path, got ${conflictModal && conflictModal.textContent}`);
  }
  const conflictOk = walk(document.body, (node) => node.tagName === 'BUTTON' && node.textContent === 'OK');
  if (!conflictOk) throw new Error('rename conflict OK button not found');
  conflictOk.click();
  await flush();

  const providerAction = walk(container, (node) => node.getAttribute && node.getAttribute('data-note-contribution-action') === 'provider.note.action');
  if (!providerAction) throw new Error('provider note action button not found');
  providerAction.click();
  await flush();
  if (!createApi.contributionCalls.some((call) => call.pluginId === 'provider.plugin' && call.commandId === 'provider.noteCommand' && call.args.path === 'Project/Notes/First_Note.md')) {
    throw new Error(`expected provider note action call, got ${JSON.stringify(createApi.contributionCalls)}`);
  }

  const trashButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-note-action') === 'trash');
  if (!trashButton) throw new Error('trash note button not found');
  trashButton.click();
  await flush();
  const trashConfirm = walk(document.body, (node) => node.getAttribute && node.getAttribute('data-notes-confirm-trash') !== undefined);
  if (!trashConfirm) throw new Error('trash confirmation button not found');
  trashConfirm.click();
  await flush();
  if (createApi.entries.has('Project/Notes/First_Note.md')) {
    throw new Error('trash note did not remove the markdown file from active entries');
  }

  console.log('notes plugin smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
