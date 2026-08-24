#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'projects', 'frontend', 'src', 'index.js');
const source = fs.readFileSync(sourcePath, 'utf8');

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
    this._textContent = '';
    this.parentNode = null;
  }
  appendChild(node) { if (!node) return node; this.children.push(node); node.parentNode = this; return node; }
  insertBefore(node, before) {
    if (!before) return this.appendChild(node);
    const index = this.children.indexOf(before);
    if (index < 0) return this.appendChild(node);
    this.children.splice(index, 0, node); node.parentNode = this; return node;
  }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((child) => child !== this); this.parentNode = null; }
  setAttribute(name, value) { this.attributes[name] = String(value); if (name === 'class') this.className = String(value); }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : undefined; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  dispatchEvent(type, event = {}) {
    const evt = { target: this, currentTarget: this, key: '', preventDefault() {}, stopPropagation() {}, ...event };
    (this.listeners[type] || []).forEach((handler) => handler(evt));
  }
  click() { this.dispatchEvent('click'); }
  focus() {}
  get firstChild() { return this.children[0] || null; }
  set innerHTML(_value) { this.children = []; this._textContent = ''; }
  get innerHTML() { return ''; }
  set textContent(value) { this._textContent = String(value == null ? '' : value); this.children = []; }
  get textContent() { return this._textContent + this.children.map((child) => child.textContent).join(''); }
}

function walk(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.children || []) { const found = walk(child, predicate); if (found) return found; }
  return null;
}
function all(node, predicate, out = []) {
  if (predicate(node)) out.push(node);
  for (const child of node.children || []) all(child, predicate, out);
  return out;
}
function byAttr(node, name, value) {
  return walk(node, (item) => item.getAttribute && item.getAttribute(name) === value);
}
function buttonByText(node, value) {
  return walk(node, (item) => item.tagName === 'BUTTON' && item.textContent === value);
}
function makeDocument() {
  return {
    body: new FakeNode('body'), head: new FakeNode('head'),
    createElement: (tag) => new FakeNode(tag),
    createTextNode: (value) => { const node = new FakeNode('#text'); node.textContent = value; return node; },
    getElementById: () => null,
  };
}
function loadBundle(document, dispatched) {
  let bundle;
  class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  const win = {
    VerstakPluginRegister(_id, value) { bundle = value; },
    dispatchEvent(event) { dispatched.push({ type: event.type, detail: event.detail }); return true; },
  };
  win.window = win; win.document = document;
  vm.runInNewContext(source, { console, setTimeout, clearTimeout, Date, Math, Promise, CustomEvent, document, window: win }, { filename: sourcePath });
  if (!bundle || !bundle.components || !bundle.components.ProjectsView) throw new Error('Projects plugin did not register');
  return bundle;
}
function flush(count = 2) {
  let promise = Promise.resolve();
  for (let i = 0; i < count; i += 1) promise = promise.then(() => new Promise((resolve) => setTimeout(resolve, 0)));
  return promise;
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function handled(pluginId, commandId, result) { return { status: 'handled', pluginId, commandId, result }; }

(async () => {
  const document = makeDocument();
  const dispatched = [];
  const bundle = loadBundle(document, dispatched);
  const settings = {
    'projects:global': [
      {
        id: 'legacy-project',
        name: 'Creatures research',
        description: 'legacy v0.1.4 record',
        status: 'active',
        priority: 'normal',
        tags: ['research'],
        workspaceRootPath: 'Projects/Creatures2.0',
        milestones: [], links: [], events: [],
        createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z'
      },
      {
        id: 'orphan-project',
        name: 'Old archived work',
        status: 'paused', priority: 'low', tags: [],
        workspaceRootPath: 'Deleted/OldDeal',
        milestones: [], links: [], events: [],
        createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z'
      }
    ]
  };
  const published = [];
  const openedUrls = [];
  const commandHandlers = new Map();
  const capabilityCalls = [];
  const todos = [];
  const notes = [];
  const workspaceTree = {
    roots: [
      {
        key: 'folder:projects', kind: 'folder', id: 'folder-projects', name: 'Projects', path: 'Projects', children: [
          { key: 'workspace:deal-ai', kind: 'workspace', id: 'deal-ai', name: 'AI-server', path: 'Projects/AI-server', children: [] },
          { key: 'workspace:deal-creatures', kind: 'workspace', id: 'deal-creatures', name: 'Creatures2.0', path: 'Projects/Creatures2.0', children: [] }
        ]
      },
      {
        key: 'folder:archive', kind: 'folder', id: 'folder-archive', name: 'Archive', path: 'Archive', children: [
          { key: 'workspace:deal-archive-creatures', kind: 'workspace', id: 'deal-archive-creatures', name: 'Creatures2.0', path: 'Archive/Creatures2.0', children: [] }
        ]
      }
    ],
    currentWorkspaceId: 'deal-creatures', revision: 7, warnings: []
  };
  const providers = { 'verstak/files/v1': 'verstak.files', 'activity.log': 'verstak.activity' };

  function makeApi(availability = { 'todo.workspace': true, 'verstak/notes/v1': true, 'verstak/files/v1': true, 'activity.log': true }) {
    return {
      settings: {
        read: async () => settings,
        write: async (key, value) => { settings[key] = clone(value); return settings; },
      },
      commands: { register: async (id, handler) => { commandHandlers.set(id, handler); return () => commandHandlers.delete(id); } },
      i18n: { t: (_key, params = {}, fallback = '') => Object.keys(params).reduce((out, key) => out.replaceAll(`{${key}}`, String(params[key])), fallback), onDidChangeLocale: () => () => {} },
      events: { publish: async (type, payload) => { published.push({ type, payload }); } },
      files: { openURL: async (url) => { openedUrls.push(url); } },
      workspaces: {
        tree: async () => clone(workspaceTree),
        list: async () => [{ id: 'deal-creatures', name: 'Creatures2.0', rootPath: 'Projects/Creatures2.0' }],
      },
      contributions: {
        list: async (point) => point === 'workspaceItems' ? [
          { pluginId: 'verstak.files', id: 'verstak.files.workspace', title: 'Files' },
          { pluginId: 'verstak.activity', id: 'verstak.activity.workspace', title: 'Activity' },
        ] : [],
      },
      capabilities: {
        has: async (name) => !!availability[name],
        get: async (name) => availability[name] && providers[name] ? { available: true, pluginId: providers[name] } : { available: !!availability[name], name },
        invoke: async (name, operation, args = {}) => {
          capabilityCalls.push({ name, operation, args: { ...args } });
          if (!availability[name]) throw new Error('capability unavailable');
          if (name === 'todo.workspace') {
            if (operation === 'list') {
              const result = todos.filter((todo) => todo.workspaceRootPath === args.workspaceRootPath && (!args.status || args.status === 'all' || todo.status === args.status));
              return handled('verstak.todo', 'verstak.todo.workspace.list', clone(result));
            }
            if (operation === 'create') {
              const todo = { id: `todo-${todos.length + 1}`, status: 'open', priority: args.priority || 'normal', ...args };
              todos.push(todo); return handled('verstak.todo', 'verstak.todo.workspace.create', clone(todo));
            }
            if (operation === 'setStatus') {
              const todo = todos.find((item) => item.id === args.id); todo.status = args.status;
              return handled('verstak.todo', 'verstak.todo.workspace.setStatus', clone(todo));
            }
          }
          if (name === 'verstak/notes/v1') {
            if (operation === 'list') return handled('verstak.notes', 'verstak.notes.list', clone(notes.filter((note) => note.workspaceRootPath === args.workspaceRootPath)));
            if (operation === 'create') {
              const note = { title: args.title, path: `${args.workspaceRootPath}/Notes/${args.title.replace(/\s+/g, '_')}.md`, workspaceRootPath: args.workspaceRootPath };
              notes.push(note); return handled('verstak.notes', 'verstak.notes.create', clone(note));
            }
            if (operation === 'open') return handled('verstak.notes', 'verstak.notes.open', { status: 'opened', path: args.path });
          }
          throw new Error(`unsupported capability call ${name}:${operation}`);
        },
      },
    };
  }

  const api = makeApi();
  await bundle.activate(api);
  ['verstak.projects.list', 'verstak.projects.get', 'verstak.projects.provideOverview'].forEach((id) => {
    if (!commandHandlers.has(id)) throw new Error(`missing command handler ${id}`);
  });

  const container = new FakeNode('div');
  const props = { workspaceNode: { workspaceId: 'deal-creatures', name: 'Creatures2.0', rootPath: 'Projects/Creatures2.0' } };
  bundle.components.ProjectsView.mount(container, props, api);
  await flush(3);

  let legacy = settings['projects:global'].find((project) => project.id === 'legacy-project');
  const orphan = settings['projects:global'].find((project) => project.id === 'orphan-project');
  if (!legacy || legacy.workspaceId !== 'deal-creatures' || legacy.workspaceRootPath !== 'Projects/Creatures2.0') throw new Error('v0.1.4 Deal path did not migrate to stable workspaceId');
  if (!orphan || orphan.workspaceId || orphan.workspaceRootPath !== 'Deleted/OldDeal') throw new Error('unresolved legacy Deal path was not preserved safely');

  let card = byAttr(container, 'data-project-id', 'legacy-project');
  if (!card || !card.textContent.includes('Projects/Creatures2.0')) throw new Error('project row does not show readable Deal context');
  card.click();
  byAttr(container, 'data-project-action', 'edit').click();
  let modal = walk(container, (node) => node.getAttribute && node.getAttribute('data-project-modal') !== undefined);
  if (!modal) throw new Error('edit form did not open');
  if (byAttr(modal, 'data-project-field', 'workspace')) throw new Error('raw workspace path input is still user-facing');
  let picker = byAttr(modal, 'data-deal-picker', '');
  if (!picker) throw new Error('Deal picker missing');
  const pickerButton = byAttr(picker, 'data-deal-picker-toggle', '');
  if (!pickerButton.textContent.includes('Projects/Creatures2.0')) throw new Error('existing Deal link did not resolve in picker');
  pickerButton.click();
  const pickerSearch = byAttr(picker, 'data-deal-picker-search', '');
  pickerSearch.value = 'Archive/Creatures2.0'; pickerSearch.dispatchEvent('input');
  const duplicateDeal = byAttr(picker, 'data-deal-id', 'deal-archive-creatures');
  if (!duplicateDeal || !duplicateDeal.textContent.includes('Archive/Creatures2.0')) throw new Error('Deal search lost parent context for duplicate leaf names');
  duplicateDeal.click();
  byAttr(modal, 'data-project-save', '').click();
  await flush(3);
  legacy = settings['projects:global'].find((project) => project.id === 'legacy-project');
  if (legacy.workspaceId !== 'deal-archive-creatures' || legacy.workspaceRootPath !== 'Archive/Creatures2.0') throw new Error('Deal picker selection did not persist canonical identity/path');
  if (!(legacy.events || []).some((event) => event.type === 'project.linked' && event.to.includes('Archive/Creatures2.0'))) throw new Error('meaningful Deal-link history was not recorded');

  const newButton = byAttr(container, 'data-project-action', 'new');
  if (!newButton) throw new Error('new project button missing');
  newButton.click();
  modal = walk(container, (node) => node.getAttribute && node.getAttribute('data-project-modal') !== undefined);
  const field = (name) => byAttr(modal, 'data-project-field', name);
  field('name').value = 'New local project';
  field('description').value = 'Created from the current Deal';
  field('tags').value = 'ux, test';
  picker = byAttr(modal, 'data-deal-picker', '');
  if (!byAttr(picker, 'data-deal-picker-toggle', '').textContent.includes('Projects/Creatures2.0')) throw new Error('new project did not preselect current Deal');
  byAttr(modal, 'data-project-save', '').click();
  await flush(3);
  let current = settings['projects:global'].find((project) => project.name === 'New local project');
  if (!current || current.workspaceId !== 'deal-creatures' || current.workspaceRootPath !== 'Projects/Creatures2.0') throw new Error('new project did not persist current Deal identity');
  if (!published.some((event) => event.type === 'project.created' && event.payload.projectId === current.id)) throw new Error('project.created event was not published');

  card = byAttr(container, 'data-project-id', current.id); card.click();
  const tab = (name) => byAttr(container, 'data-project-tab', name);
  tab('milestones').click();
  let pane = byAttr(container, 'data-project-pane', 'milestones');
  const milestoneInput = walk(pane, (node) => node.tagName === 'INPUT' && node.getAttribute('placeholder') === 'Milestone title');
  milestoneInput.value = 'Ship UX v2';
  buttonByText(pane, 'Add milestone').click(); await flush(2);
  pane = byAttr(container, 'data-project-pane', 'milestones');
  const milestoneRow = walk(pane, (node) => node.getAttribute && node.getAttribute('data-milestone-id'));
  const milestoneCheck = walk(milestoneRow, (node) => node.tagName === 'INPUT' && node.getAttribute('type') === 'checkbox');
  milestoneCheck.checked = true; milestoneCheck.dispatchEvent('change'); await flush(2);
  current = settings['projects:global'].find((project) => project.id === current.id);
  if (!current.events.some((event) => event.type === 'milestone.completed' && event.subject === 'Ship UX v2')) throw new Error('milestone completion history is not meaningful');

  tab('tasks').click(); await flush(2);
  pane = byAttr(container, 'data-project-pane', 'tasks');
  const taskInput = walk(pane, (node) => node.tagName === 'INPUT' && node.getAttribute('placeholder') === 'Task title');
  if (!taskInput) throw new Error('wrapped capability list result was not unwrapped for Tasks');
  taskInput.value = 'Regression test'; buttonByText(pane, 'Add task').click(); await flush(2);
  if (!todos.some((todo) => todo.title === 'Regression test')) throw new Error('task was not created through capability.invoke wrapper');

  tab('notes').click(); await flush(2);
  pane = byAttr(container, 'data-project-pane', 'notes');
  const noteInput = walk(pane, (node) => node.tagName === 'INPUT' && node.getAttribute('placeholder') === 'Note title');
  if (!noteInput) throw new Error('wrapped capability list result was not unwrapped for Notes');
  noteInput.value = 'Release notes'; buttonByText(pane, 'Create note').click(); await flush(2);
  if (!notes.some((note) => note.title === 'Release notes')) throw new Error('note was not created through capability.invoke wrapper');

  tab('files').click(); await flush(2);
  pane = byAttr(container, 'data-project-pane', 'files');
  const openFiles = buttonByText(pane, 'Open Files');
  if (!openFiles) throw new Error('Files provider workspace contribution was not resolved');
  openFiles.click(); await flush(2);
  if (!dispatched.some((event) => event.type === 'verstak:workspace-open-tool' && event.detail.workspaceItemId === 'verstak.files.workspace')) throw new Error('Files tool was not opened through provider contribution');

  tab('links').click();
  pane = byAttr(container, 'data-project-pane', 'links');
  const linkInputs = all(pane, (node) => node.tagName === 'INPUT');
  linkInputs[0].value = 'Repository'; linkInputs[1].value = 'https://example.com/projects';
  buttonByText(pane, 'Add link').click(); await flush(2);
  pane = byAttr(container, 'data-project-pane', 'links'); buttonByText(pane, 'Open').click(); await flush();
  if (openedUrls[0] !== 'https://example.com/projects') throw new Error('project link did not use files.openURL');

  byAttr(container, 'data-project-action', 'edit').click();
  modal = walk(container, (node) => node.getAttribute && node.getAttribute('data-project-modal') !== undefined);
  picker = byAttr(modal, 'data-deal-picker', ''); byAttr(picker, 'data-deal-picker-toggle', '').click();
  byAttr(picker, 'data-deal-unlink', '').click(); byAttr(modal, 'data-project-save', '').click(); await flush(3);
  current = settings['projects:global'].find((project) => project.id === current.id);
  if (current.workspaceId || current.workspaceRootPath) throw new Error('Deal unlink did not clear canonical identity/path');
  if (!current.events.some((event) => event.type === 'project.unlinked')) throw new Error('Deal unlink did not create meaningful history');
  if (current.events.some((event) => event.type === 'project.updated')) throw new Error('meaningless generic project.updated history was recorded');

  const listResult = await commandHandlers.get('verstak.projects.list')({ workspaceRootPath: 'Archive/Creatures2.0' });
  const getResult = await commandHandlers.get('verstak.projects.get')({ id: legacy.id });
  const overview = await commandHandlers.get('verstak.projects.provideOverview')({ workspaceRootPath: 'Archive/Creatures2.0' });
  if (listResult.length !== 1 || getResult.id !== legacy.id || !overview.summary || overview.summary[0].label !== legacy.name) throw new Error('Projects public commands returned wrong data');

  bundle.components.ProjectsView.unmount(container);

  const degradedContainer = new FakeNode('div');
  const degradedApi = makeApi({ 'todo.workspace': false, 'verstak/notes/v1': false, 'verstak/files/v1': false, 'activity.log': false });
  bundle.components.ProjectsView.mount(degradedContainer, {}, degradedApi); await flush(3);
  byAttr(degradedContainer, 'data-project-id', legacy.id).click();
  const overviewPane = byAttr(degradedContainer, 'data-project-pane', 'overview');
  if (overviewPane.textContent.includes('Unavailable') || overviewPane.textContent.includes('not installed or enabled')) throw new Error('Overview exposes oversized optional-provider failure state');
  byAttr(degradedContainer, 'data-project-tab', 'tasks').click(); await flush();
  pane = byAttr(degradedContainer, 'data-project-pane', 'tasks');
  if (!pane.textContent.includes('not installed or enabled')) throw new Error('explicit missing-provider tab did not degrade gracefully');
  bundle.components.ProjectsView.unmount(degradedContainer);

  if (!capabilityCalls.some((call) => call.name === 'todo.workspace' && call.operation === 'create')) throw new Error('Todo integration bypassed capability.invoke');
  if (!capabilityCalls.some((call) => call.name === 'verstak/notes/v1' && call.operation === 'create')) throw new Error('Notes integration bypassed capability.invoke');

  console.log('projects plugin smoke passed');
})().catch((err) => { console.error(err); process.exit(1); });
