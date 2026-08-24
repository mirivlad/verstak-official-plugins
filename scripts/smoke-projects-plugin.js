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
  dispatchEvent(type, event = {}) { (this.listeners[type] || []).forEach((handler) => handler({ target: this, currentTarget: this, preventDefault() {}, stopPropagation() {}, ...event })); }
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
function flush() { return new Promise((resolve) => setTimeout(resolve, 0)); }

(async () => {
  const document = makeDocument();
  const dispatched = [];
  const bundle = loadBundle(document, dispatched);
  const settings = {};
  const published = [];
  const openedUrls = [];
  const commandHandlers = new Map();
  const capabilityCalls = [];
  const todos = [];
  const notes = [];
  const available = { 'todo.workspace': true, 'verstak/notes/v1': true, 'verstak/files/v1': true, 'activity.log': true };
  const providers = { 'verstak/files/v1': 'verstak.files', 'activity.log': 'verstak.activity' };

  const api = {
    settings: {
      read: async () => settings,
      write: async (key, value) => { settings[key] = JSON.parse(JSON.stringify(value)); return settings; },
    },
    commands: { register: async (id, handler) => { commandHandlers.set(id, handler); return () => commandHandlers.delete(id); } },
    i18n: { t: (_key, _params, fallback) => fallback, onDidChangeLocale: () => () => {} },
    events: { publish: async (type, payload) => { published.push({ type, payload }); } },
    files: { openURL: async (url) => { openedUrls.push(url); } },
    workspaces: { list: async () => [{ id: 'deal-1', name: 'TOS', rootPath: 'Deals/TOS' }] },
    contributions: {
      list: async (point) => point === 'workspaceItems' ? [
        { pluginId: 'verstak.files', id: 'verstak.files.workspace', title: 'Files' },
        { pluginId: 'verstak.activity', id: 'verstak.activity.workspace', title: 'Activity' },
      ] : [],
    },
    capabilities: {
      has: async (name) => !!available[name],
      get: async (name) => available[name] && providers[name] ? { available: true, pluginId: providers[name] } : { available: false, name },
      invoke: async (name, operation, args = {}) => {
        capabilityCalls.push({ name, operation, args: { ...args } });
        if (!available[name]) throw new Error('capability unavailable');
        if (name === 'todo.workspace') {
          if (operation === 'list') return todos.filter((todo) => todo.workspaceRootPath === args.workspaceRootPath && (!args.status || args.status === 'all' || todo.status === args.status));
          if (operation === 'create') { const todo = { id: `todo-${todos.length + 1}`, status: 'open', priority: args.priority || 'normal', ...args }; todos.push(todo); return todo; }
          if (operation === 'setStatus') { const todo = todos.find((item) => item.id === args.id); todo.status = args.status; return todo; }
        }
        if (name === 'verstak/notes/v1') {
          if (operation === 'list') return notes.filter((note) => note.workspaceRootPath === args.workspaceRootPath);
          if (operation === 'create') { const note = { title: args.title, path: `${args.workspaceRootPath}/Notes/${args.title.replace(/\s+/g, '_')}.md`, workspaceRootPath: args.workspaceRootPath }; notes.push(note); return note; }
          if (operation === 'open') return { status: 'opened', path: args.path };
        }
        throw new Error(`unsupported capability call ${name}:${operation}`);
      },
    },
  };

  await bundle.activate(api);
  ['verstak.projects.list', 'verstak.projects.get', 'verstak.projects.provideOverview'].forEach((id) => {
    if (!commandHandlers.has(id)) throw new Error(`missing command handler ${id}`);
  });

  const container = new FakeNode('div');
  bundle.components.ProjectsView.mount(container, {}, api);
  await flush();
  const newButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-project-action') === 'new');
  if (!newButton) throw new Error('new project button missing');
  newButton.click();
  const modal = walk(container, (node) => node.getAttribute && node.getAttribute('data-project-modal') !== undefined);
  if (!modal) throw new Error('project form did not open');
  const field = (name) => walk(modal, (node) => node.getAttribute && node.getAttribute('data-project-field') === name);
  field('name').value = 'TOS';
  field('description').value = 'Text operating system';
  field('tags').value = 'os, research';
  field('workspace').value = 'Deals/TOS';
  walk(modal, (node) => node.getAttribute && node.getAttribute('data-project-save') !== undefined).click();
  await flush();

  const stored = settings['projects:global'];
  if (!Array.isArray(stored) || stored.length !== 1 || stored[0].name !== 'TOS' || stored[0].workspaceRootPath !== 'Deals/TOS') throw new Error('project was not persisted correctly');
  if (!published.some((event) => event.type === 'project.created')) throw new Error('project.created event was not published');

  const projectId = stored[0].id;
  const listResult = await commandHandlers.get('verstak.projects.list')({ workspaceRootPath: 'Deals/TOS' });
  const getResult = await commandHandlers.get('verstak.projects.get')({ id: projectId });
  const overview = await commandHandlers.get('verstak.projects.provideOverview')({ workspaceRootPath: 'Deals/TOS' });
  if (listResult.length !== 1 || getResult.id !== projectId || !overview.summary || overview.summary[0].label !== 'TOS') throw new Error('Projects public commands returned wrong data');

  const tab = (name) => walk(container, (node) => node.getAttribute && node.getAttribute('data-project-tab') === name);
  tab('milestones').click();
  const milestonePane = walk(container, (node) => node.getAttribute && node.getAttribute('data-project-pane') === 'milestones');
  const milestoneInput = walk(milestonePane, (node) => node.tagName === 'INPUT' && node.getAttribute('placeholder') === 'Milestone title');
  milestoneInput.value = 'Boot to shell';
  walk(milestonePane, (node) => node.tagName === 'BUTTON' && node.textContent === 'Add milestone').click();
  await flush();
  const milestoneRow = walk(container, (node) => node.getAttribute && node.getAttribute('data-milestone-id'));
  const milestoneCheck = walk(milestoneRow, (node) => node.tagName === 'INPUT' && node.getAttribute('type') === 'checkbox');
  if (milestoneCheck.checked || milestoneCheck.getAttribute('checked') !== undefined) throw new Error('open milestone rendered as checked');
  milestoneCheck.checked = true; milestoneCheck.dispatchEvent('change'); await flush();
  if (settings['projects:global'][0].milestones[0].status !== 'done') throw new Error('milestone status was not persisted');

  tab('tasks').click(); await flush();
  let pane = walk(container, (node) => node.getAttribute && node.getAttribute('data-project-pane') === 'tasks');
  const taskInput = walk(pane, (node) => node.tagName === 'INPUT' && node.getAttribute('placeholder') === 'Task title');
  taskInput.value = 'Ship MVP';
  walk(pane, (node) => node.tagName === 'BUTTON' && node.textContent === 'Add task').click(); await flush();
  if (!todos.length || !capabilityCalls.some((call) => call.name === 'todo.workspace' && call.operation === 'create')) throw new Error('task was not created through capability.invoke');
  pane = walk(container, (node) => node.getAttribute && node.getAttribute('data-project-pane') === 'tasks');
  const taskRow = walk(pane, (node) => node.getAttribute && node.getAttribute('data-project-task') === todos[0].id);
  const taskCheck = walk(taskRow, (node) => node.tagName === 'INPUT' && node.getAttribute('type') === 'checkbox');
  if (taskCheck.checked) throw new Error('open task rendered as checked');
  taskCheck.checked = true; taskCheck.dispatchEvent('change'); await flush();
  if (todos[0].status !== 'done') throw new Error('task status did not flow through capability.invoke');

  tab('notes').click(); await flush();
  pane = walk(container, (node) => node.getAttribute && node.getAttribute('data-project-pane') === 'notes');
  const noteInput = walk(pane, (node) => node.tagName === 'INPUT' && node.getAttribute('placeholder') === 'Note title');
  noteInput.value = 'Architecture';
  walk(pane, (node) => node.tagName === 'BUTTON' && node.textContent === 'Create note').click(); await flush();
  if (!notes.length || !capabilityCalls.some((call) => call.name === 'verstak/notes/v1' && call.operation === 'create')) throw new Error('note was not created through capability.invoke');
  pane = walk(container, (node) => node.getAttribute && node.getAttribute('data-project-pane') === 'notes');
  walk(pane, (node) => node.tagName === 'BUTTON' && node.textContent === 'Open').click(); await flush();
  if (!capabilityCalls.some((call) => call.name === 'verstak/notes/v1' && call.operation === 'open')) throw new Error('note open did not use capability.invoke');

  tab('files').click(); await flush();
  pane = walk(container, (node) => node.getAttribute && node.getAttribute('data-project-pane') === 'files');
  const openFiles = walk(pane, (node) => node.tagName === 'BUTTON' && node.textContent === 'Open Files');
  if (!openFiles) throw new Error('Files provider workspace tool was not resolved');
  openFiles.click(); await flush();
  if (!dispatched.some((event) => event.type === 'verstak:workspace-open-tool' && event.detail.workspaceItemId === 'verstak.files.workspace')) throw new Error('Files tool was not opened through the provider contribution');

  available['activity.log'] = false;
  tab('activity').click(); await flush();
  pane = walk(container, (node) => node.getAttribute && node.getAttribute('data-project-pane') === 'activity');
  if (!pane.textContent.includes('not installed or enabled')) throw new Error('disabled optional provider did not degrade gracefully');

  tab('links').click();
  pane = walk(container, (node) => node.getAttribute && node.getAttribute('data-project-pane') === 'links');
  const linkInputs = all(pane, (node) => node.tagName === 'INPUT');
  linkInputs[0].value = 'Repository'; linkInputs[1].value = 'https://example.com/tos';
  walk(pane, (node) => node.tagName === 'BUTTON' && node.textContent === 'Add link').click(); await flush();
  pane = walk(container, (node) => node.getAttribute && node.getAttribute('data-project-pane') === 'links');
  walk(pane, (node) => node.tagName === 'BUTTON' && node.textContent === 'Open').click(); await flush();
  if (openedUrls[0] !== 'https://example.com/tos') throw new Error('project link did not use files.openURL');

  bundle.components.ProjectsView.unmount(container);
  console.log('projects plugin smoke passed');
})().catch((err) => { console.error(err); process.exit(1); });
