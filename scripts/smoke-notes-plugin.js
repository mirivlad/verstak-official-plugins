#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'notes', 'frontend', 'src', 'index.js');
const source = fs.readFileSync(sourcePath, 'utf8');

if (!source.includes('.notes-sort{width:8rem;appearance:none;')) {
  throw new Error('notes sort select must use the shared custom dropdown style');
}

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
  const eventHandlers = {};
  return {
    entries,
    opened,
    contributionCalls,
    emitFileChanged(payload) {
      (eventHandlers['file.changed'] || []).forEach((handler) => handler({
        name: 'file.changed',
        payload,
        timestamp: new Date().toISOString(),
      }));
    },
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
    events: {
      subscribe: async (eventName, handler) => {
        eventHandlers[eventName] = eventHandlers[eventName] || [];
        eventHandlers[eventName].push(handler);
        return () => {
          eventHandlers[eventName] = (eventHandlers[eventName] || []).filter((candidate) => candidate !== handler);
        };
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
  const createModal = walk(document.body, (node) => node.getAttribute && node.getAttribute('data-notes-create-modal') !== undefined);
  if (!createModal) throw new Error('create modal not found');
  const input = walk(createModal, (node) => node.getAttribute && node.getAttribute('data-notes-create-input') !== undefined);
  if (!input) throw new Error('create input not found');
  const confirm = walk(createModal, (node) => node.tagName === 'BUTTON' && node.textContent === 'Create');
  if (!confirm) throw new Error('create confirm button not found');
  confirm.click();
  const createError = walk(createModal, (node) => node.getAttribute && node.getAttribute('data-notes-create-error') !== undefined);
  if (!createError || !createError.textContent.includes('Enter a note title') || input.getAttribute('aria-invalid') !== 'true') {
    throw new Error('create modal does not show a validation error for an empty title');
  }
  input.value = 'First Note';
  input.dispatchEvent('keydown', { key: 'Enter' });
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

  createApi.entries.set('Project/Notes/Third_Note.md', { type: 'file', content: '# Third Note\n' });
  createApi.emitFileChanged({ path: 'Project/Notes/Third_Note.md', operation: 'external.create', type: 'file' });
  await flush();
  if (!container.textContent.includes('Third Note')) {
    throw new Error(`notes list did not refresh after file.changed: ${container.textContent}`);
  }

  const renameButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-note-action') === 'rename');
  if (!renameButton) throw new Error('rename note button not found');
  renameButton.click();
  const renameModal = walk(document.body, (node) => node.getAttribute && node.getAttribute('data-notes-rename-modal') !== undefined);
  if (!renameModal) throw new Error('rename modal not found');
  const renameInput = walk(renameModal, (node) => node.getAttribute && node.getAttribute('data-notes-rename-input') !== undefined);
  if (!renameInput) throw new Error('rename input not found');
  renameInput.value = 'Second Note';
  renameInput.dispatchEvent('keydown', { key: 'Enter' });
  await flush();
  const renameError = walk(renameModal, (node) => node.getAttribute && node.getAttribute('data-notes-rename-error') !== undefined);
  if (!renameError || !renameError.textContent.includes('Project/Notes/Second_Note.md')) {
    throw new Error(`rename conflict should stay in the form modal, got ${renameError && renameError.textContent}`);
  }
  if (walk(document.body, (node) => node.className === 'notes-modal-msg')) {
    throw new Error('rename conflict opened a second modal instead of reporting in the form');
  }
  renameInput.dispatchEvent('keydown', { key: 'Escape' });
  await flush();
  if (walk(document.body, (node) => node.getAttribute && node.getAttribute('data-notes-rename-modal') !== undefined)) {
    throw new Error('Escape did not close the rename modal');
  }

  const thirdRow = walk(container, (node) => node.getAttribute && node.getAttribute('data-note-path') === 'Project/Notes/Third_Note.md');
  const successfulRenameButton = walk(thirdRow, (node) => node.getAttribute && node.getAttribute('data-note-action') === 'rename');
  if (!successfulRenameButton) throw new Error('unique note rename button not found');
  successfulRenameButton.click();
  const successfulRenameModal = walk(document.body, (node) => node.getAttribute && node.getAttribute('data-notes-rename-modal') !== undefined);
  const successfulRenameInput = walk(successfulRenameModal, (node) => node.getAttribute && node.getAttribute('data-notes-rename-input') !== undefined);
  successfulRenameInput.value = 'Renamed Note';
  successfulRenameInput.dispatchEvent('keydown', { key: 'Enter' });
  await flush();
  if (!createApi.entries.has('Project/Notes/Renamed_Note.md') || createApi.entries.has('Project/Notes/Third_Note.md')) {
    throw new Error('unique note rename was incorrectly reported as a conflict');
  }

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
