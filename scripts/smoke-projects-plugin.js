#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'projects', 'frontend', 'src', 'index.js');
const source = fs.readFileSync(sourcePath, 'utf8');

class FakeNode {
  constructor(tag = '') { this.tagName = String(tag).toUpperCase(); this.children = []; this.attributes = {}; this.listeners = {}; this.style = {}; this.className = ''; this.value = ''; this.checked = false; this._textContent = ''; this.parentNode = null; }
  appendChild(node) { if (!node) return node; this.children.push(node); node.parentNode = this; return node; }
  insertBefore(node, before) { const i = this.children.indexOf(before); if (!before || i < 0) return this.appendChild(node); this.children.splice(i, 0, node); node.parentNode = this; return node; }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((child) => child !== this); this.parentNode = null; }
  setAttribute(name, value) { this.attributes[name] = String(value); if (name === 'class') this.className = String(value); }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : undefined; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  dispatchEvent(type, event = {}) { const evt = { target: this, currentTarget: this, key: '', preventDefault() {}, stopPropagation() {}, ...event }; (this.listeners[type] || []).forEach((handler) => handler(evt)); }
  click() { this.dispatchEvent('click'); }
  focus() {}
  get firstChild() { return this.children[0] || null; }
  set innerHTML(_value) { this.children = []; this._textContent = ''; }
  get innerHTML() { return ''; }
  set textContent(value) { this._textContent = String(value == null ? '' : value); this.children = []; }
  get textContent() { return this._textContent + this.children.map((child) => child.textContent).join(''); }
}

function walk(node, predicate) { if (predicate(node)) return node; for (const child of node.children || []) { const found = walk(child, predicate); if (found) return found; } return null; }
function all(node, predicate, out = []) { if (predicate(node)) out.push(node); for (const child of node.children || []) all(child, predicate, out); return out; }
function byAttr(node, name, value) { return walk(node, (item) => item.getAttribute && item.getAttribute(name) === value); }
function button(node, label) { return walk(node, (item) => item.tagName === 'BUTTON' && item.textContent === label); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function handled(pluginId, commandId, result) { return { status: 'handled', pluginId, commandId, result }; }
function flush(count = 2) { let p = Promise.resolve(); for (let i = 0; i < count; i += 1) p = p.then(() => new Promise((resolve) => setTimeout(resolve, 0))); return p; }

function makeDocument() {
  return { body: new FakeNode('body'), head: new FakeNode('head'), createElement: (tag) => new FakeNode(tag), createTextNode: (value) => { const n = new FakeNode('#text'); n.textContent = value; return n; }, getElementById: () => null };
}
function loadBundle(document, dispatched) {
  let bundle;
  class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  const win = { VerstakPluginRegister(_id, value) { bundle = value; }, dispatchEvent(event) { dispatched.push({ type: event.type, detail: event.detail }); return true; } };
  win.window = win; win.document = document;
  vm.runInNewContext(source, { console, setTimeout, clearTimeout, Date, Math, Promise, CustomEvent, document, window: win }, { filename: sourcePath });
  if (!bundle?.components?.ProjectsView) throw new Error('Projects plugin did not register');
  return bundle;
}

(async () => {
  const document = makeDocument();
  const dispatched = [];
  const bundle = loadBundle(document, dispatched);
  const settings = { 'projects:global': [
    { id: 'legacy-project', name: 'Creatures research', description: 'legacy v0.1.4 record', status: 'active', priority: 'normal', tags: ['research'], workspaceRootPath: 'Projects/Creatures2.0', milestones: [], links: [], events: [], createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' },
    { id: 'orphan-project', name: 'Old archived work', status: 'paused', priority: 'low', tags: [], workspaceRootPath: 'Deleted/OldDeal', milestones: [], links: [], events: [], createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' }
  ] };
  const commandHandlers = new Map();
  const published = [], capabilityCalls = [], todos = [], notes = [], files = [], openedUrls = [], navigationCalls = [];
  const tree = { roots: [
    { kind: 'folder', id: 'folder-projects', name: 'Projects', path: 'Projects', children: [
      { kind: 'workspace', id: 'deal-ai', name: 'AI-server', path: 'Projects/AI-server', children: [] },
      { kind: 'workspace', id: 'deal-creatures', name: 'Creatures2.0', path: 'Projects/Creatures2.0', children: [] }
    ] },
    { kind: 'folder', id: 'folder-archive', name: 'Archive', path: 'Archive', children: [
      { kind: 'workspace', id: 'deal-archive-creatures', name: 'Creatures2.0', path: 'Archive/Creatures2.0', children: [] }
    ] }
  ], currentWorkspaceId: 'deal-creatures', revision: 7, warnings: [] };
  const providers = { 'verstak/files/v1': 'verstak.files', 'activity.log': 'verstak.activity' };

  function makeApi(available = { 'todo.workspace': true, 'verstak/notes/v1': true, 'verstak/files/v1': true, 'activity.log': true }) {
    return {
      settings: { read: async () => settings, write: async (key, value) => { settings[key] = clone(value); return settings; } },
      commands: { register: async (id, handler) => { commandHandlers.set(id, handler); return () => commandHandlers.delete(id); } },
      i18n: { t: (_key, params, fallback = '') => Object.keys(params || {}).reduce((out, key) => out.replaceAll(`{${key}}`, String(params[key])), fallback), onDidChangeLocale: () => () => {} },
      events: { publish: async (type, payload) => published.push({ type, payload }) },
      files: { openURL: async (url) => openedUrls.push(url) },
      navigation: { openWorkspace: (request) => navigationCalls.push(clone(request)) },
      workspaces: { tree: async () => clone(tree), list: async () => [{ id: 'deal-creatures', name: 'Creatures2.0', rootPath: 'Projects/Creatures2.0' }] },
      contributions: { list: async (point) => point === 'workspaceItems' ? [{ pluginId: 'verstak.files', id: 'verstak.files.workspace', title: 'Files' }, { pluginId: 'verstak.activity', id: 'verstak.activity.workspace', title: 'Activity' }] : [] },
      capabilities: {
        has: async (name) => !!available[name],
        get: async (name) => available[name] && providers[name] ? { available: true, pluginId: providers[name] } : { available: !!available[name], name },
        invoke: async (name, operation, args = {}) => {
          capabilityCalls.push({ name, operation, args: { ...args } });
          if (!available[name]) throw new Error('capability unavailable');
          if (name === 'todo.workspace') {
            if (operation === 'list') return handled('verstak.todo', 'todo.list', clone(todos.filter((x) => x.workspaceRootPath === args.workspaceRootPath && (!Object.prototype.hasOwnProperty.call(args, 'projectId') || x.projectId === args.projectId) && (!args.status || args.status === 'all' || x.status === args.status))));
            if (operation === 'create') { const item = { id: `todo-${todos.length + 1}`, status: 'open', priority: args.priority || 'normal', ...args }; todos.push(item); return handled('verstak.todo', 'todo.create', clone(item)); }
            if (operation === 'setStatus') { const item = todos.find((x) => x.id === args.id); item.status = args.status; return handled('verstak.todo', 'todo.setStatus', clone(item)); }
          }
          if (name === 'verstak/notes/v1') {
            if (operation === 'list') return handled('verstak.notes', 'notes.list', clone(notes.filter((x) => x.workspaceRootPath === args.workspaceRootPath && (!Object.prototype.hasOwnProperty.call(args, 'projectId') || x.projectId === args.projectId))));
            if (operation === 'create') { const item = { title: args.title, path: `${args.workspaceRootPath}/Notes/${args.title.replace(/\s+/g, '_')}.md`, workspaceRootPath: args.workspaceRootPath, projectId: args.projectId || '' }; notes.push(item); return handled('verstak.notes', 'notes.create', clone(item)); }
            if (operation === 'open') return handled('verstak.notes', 'notes.open', { path: args.path });
          }
          if (name === 'verstak/files/v1') {
            if (operation === 'list') return handled('verstak.files', 'files.list', clone(files.filter((x) => x.workspaceRootPath === args.workspaceRootPath && (!Object.prototype.hasOwnProperty.call(args, 'projectId') || x.projectId === args.projectId))));
            if (operation === 'create') { const item = { name: args.name, path: `${args.workspaceRootPath}/Files/${args.name}`, workspaceRootPath: args.workspaceRootPath, projectId: args.projectId || '', type: 'file' }; files.push(item); return handled('verstak.files', 'files.create', clone(item)); }
            if (operation === 'open') return handled('verstak.files', 'files.open', { path: args.path });
          }
          throw new Error(`unsupported capability call ${name}:${operation}`);
        }
      }
    };
  }

  const api = makeApi();
  await bundle.activate(api);
  for (const id of ['verstak.projects.list', 'verstak.projects.get', 'verstak.projects.provideOverview']) if (!commandHandlers.has(id)) throw new Error(`missing command ${id}`);

  const container = new FakeNode('div');
  bundle.components.ProjectsView.mount(container, { workspaceNode: { workspaceId: 'deal-creatures', name: 'Creatures2.0', rootPath: 'Projects/Creatures2.0' } }, api);
  await flush(3);

  let legacy = settings['projects:global'].find((x) => x.id === 'legacy-project');
  const orphan = settings['projects:global'].find((x) => x.id === 'orphan-project');
  if (legacy.workspaceId !== 'deal-creatures' || legacy.workspaceRootPath !== 'Projects/Creatures2.0') throw new Error('legacy Deal path migration failed');
  if (orphan.workspaceId || orphan.workspaceRootPath !== 'Deleted/OldDeal') throw new Error('unresolved legacy Deal was not preserved');

  // Deal mode has no second project sidebar: the linked project is already selected.
  if (byAttr(container, 'data-project-portfolio', '')) throw new Error('Deal mode rendered the global portfolio');
  if (!byAttr(container, 'data-project-action', 'edit')) throw new Error('Deal project detail did not render');
  byAttr(container, 'data-project-action', 'edit').click();
  let modal = walk(container, (n) => n.getAttribute && n.getAttribute('data-project-modal') !== undefined);
  if (byAttr(modal, 'data-project-field', 'workspace')) throw new Error('raw workspace input is still exposed');
  let picker = byAttr(modal, 'data-deal-picker', '');
  byAttr(picker, 'data-deal-picker-toggle', '').click();
  const search = byAttr(picker, 'data-deal-picker-search', ''); search.value = 'Archive/Creatures2.0'; search.dispatchEvent('input');
  const duplicate = byAttr(picker, 'data-deal-id', 'deal-archive-creatures');
  if (!duplicate?.textContent.includes('Archive/Creatures2.0')) throw new Error('duplicate Deal search lost parent context');
  duplicate.click(); byAttr(modal, 'data-project-save', '').click(); await flush(3);
  legacy = settings['projects:global'].find((x) => x.id === 'legacy-project');
  if (`${legacy.workspaceId}|${legacy.workspaceRootPath}` !== 'deal-archive-creatures|Archive/Creatures2.0') throw new Error('Deal picker selection did not persist');
  if (!legacy.events.some((e) => e.type === 'project.linked')) throw new Error('Deal link history missing');

  const createForDeal = button(container, 'Create project for this Deal');
  if (!createForDeal) throw new Error('empty Deal did not offer project creation');
  createForDeal.click();
  modal = walk(container, (n) => n.getAttribute && n.getAttribute('data-project-modal') !== undefined);
  byAttr(modal, 'data-project-field', 'name').value = 'New local project';
  picker = byAttr(modal, 'data-deal-picker', '');
  if (!byAttr(picker, 'data-deal-picker-toggle', '').textContent.includes('Projects/Creatures2.0')) throw new Error('current Deal was not preselected');
  byAttr(modal, 'data-project-save', '').click(); await flush(3);
  let current = settings['projects:global'].find((x) => x.name === 'New local project');  if (`${current.workspaceId}|${current.workspaceRootPath}` !== 'deal-creatures|Projects/Creatures2.0') throw new Error('current Deal identity was not persisted');

  byAttr(container, 'data-project-tab', 'milestones').click();
  let pane = byAttr(container, 'data-project-pane', 'milestones');
  const milestoneInput = walk(pane, (n) => n.tagName === 'INPUT' && n.getAttribute('placeholder') === 'Milestone title'); milestoneInput.value = 'Ship UX v3'; button(pane, 'Add milestone').click(); await flush(2);
  pane = byAttr(container, 'data-project-pane', 'milestones');
  const milestone = walk(pane, (n) => n.getAttribute && n.getAttribute('data-milestone-id'));
  const check = walk(milestone, (n) => n.tagName === 'INPUT' && n.getAttribute('type') === 'checkbox'); check.checked = true; check.dispatchEvent('change'); await flush(2);
  current = settings['projects:global'].find((x) => x.id === current.id);
  if (!current.events.some((e) => e.type === 'milestone.completed' && e.subject === 'Ship UX v3')) throw new Error('meaningful milestone history missing');

  // Deal-wide resources remain visible in provider tabs but not in this project lens.
  todos.push({ id: 'deal-wide-task', title: 'Deal wide', workspaceRootPath: current.workspaceRootPath, projectId: '', status: 'open', priority: 'normal' });
  notes.push({ title: 'Deal wide note', path: `${current.workspaceRootPath}/Notes/Deal_wide.md`, workspaceRootPath: current.workspaceRootPath, projectId: '' });
  files.push({ name: 'deal-wide.txt', path: `${current.workspaceRootPath}/Files/deal-wide.txt`, workspaceRootPath: current.workspaceRootPath, projectId: '', type: 'file' });

  byAttr(container, 'data-project-tab', 'tasks').click(); await flush(2); pane = byAttr(container, 'data-project-pane', 'tasks');
  const taskInput = walk(pane, (n) => n.tagName === 'INPUT' && n.getAttribute('placeholder') === 'Task title');
  if (!taskInput) throw new Error('wrapped Tasks result was not unwrapped');
  taskInput.value = 'Regression test'; button(pane, 'Add task').click(); await flush(2);
  if (pane.textContent.includes('Deal wide')) throw new Error('project Tasks leaked an unscoped Deal task');
  const projectTask = todos.find((x) => x.title === 'Regression test');
  if (!projectTask || projectTask.projectId !== current.id) throw new Error('project task did not persist projectId');
  byAttr(container, 'data-project-tab', 'notes').click(); await flush(2); pane = byAttr(container, 'data-project-pane', 'notes');
  const noteInput = walk(pane, (n) => n.tagName === 'INPUT' && n.getAttribute('placeholder') === 'Note title');
  if (!noteInput) throw new Error('wrapped Notes result was not unwrapped');
  noteInput.value = 'Release notes'; button(pane, 'Create note').click(); await flush(2);
  if (pane.textContent.includes('Deal wide note')) throw new Error('project Notes leaked an unscoped Deal note');
  const projectNote = notes.find((x) => x.title === 'Release notes');
  if (!projectNote || projectNote.projectId !== current.id) throw new Error('project note did not persist projectId');

  byAttr(container, 'data-project-tab', 'files').click(); await flush(2); pane = byAttr(container, 'data-project-pane', 'files');
  const fileInput = walk(pane, (n) => n.tagName === 'INPUT' && n.getAttribute('placeholder') === 'File name');
  if (!fileInput) throw new Error('Files project UI did not render');
  if (pane.textContent.includes('deal-wide.txt')) throw new Error('project Files leaked an unscoped Deal file');
  fileInput.value = 'project.md'; button(pane, 'Create file').click(); await flush(2);
  const projectFile = files.find((x) => x.name === 'project.md');
  if (!projectFile || projectFile.projectId !== current.id) throw new Error('project file did not persist projectId');
  pane = byAttr(container, 'data-project-pane', 'files'); button(pane, 'Open').click(); await flush();
  if (!capabilityCalls.some((c) => c.name === 'verstak/files/v1' && c.operation === 'open' && c.args.projectId === current.id)) throw new Error('project file open lost project scope');

  byAttr(container, 'data-project-tab', 'activity').click(); pane = byAttr(container, 'data-project-pane', 'activity');
  if (!byAttr(pane, 'data-project-activity', '') || !pane.textContent.includes('Ship UX v3')) throw new Error('project Activity did not render project-owned history');

  byAttr(container, 'data-project-tab', 'links').click();
  pane = byAttr(container, 'data-project-pane', 'links');  const linkInputs = all(pane, (n) => n.tagName === 'INPUT');
  linkInputs[0].value = 'Repository'; linkInputs[1].value = 'https://example.com/projects';
  button(pane, 'Add link').click(); await flush(2);
  pane = byAttr(container, 'data-project-pane', 'links'); button(pane, 'Open').click(); await flush();
  if (openedUrls[0] !== 'https://example.com/projects') throw new Error('link open failed');

  // Global Projects is the portfolio across all Deals.
  const portfolio = new FakeNode('div');
  bundle.components.ProjectsView.mount(portfolio, {}, api); await flush(3);
  if (!byAttr(portfolio, 'data-project-portfolio', '')) throw new Error('global Projects did not render a portfolio');
  const portfolioCards = all(portfolio, (n) => n.getAttribute && n.getAttribute('data-project-card') === '');
  if (portfolioCards.length < 3) throw new Error(`portfolio did not show all projects: ${portfolioCards.length}`);
  // Orphaned legacy projects remain recoverable, but v3 does not allow a
  // project to be saved without a real Deal.
  byAttr(portfolio, 'data-project-id', 'orphan-project').click(); await flush();
  const repairModal = walk(portfolio, (n) => n.getAttribute && n.getAttribute('data-project-modal') !== undefined);
  const repairPicker = byAttr(repairModal, 'data-deal-picker', '');
  byAttr(repairPicker, 'data-deal-picker-toggle', '').click();
  if (byAttr(repairPicker, 'data-deal-unlink', '')) throw new Error('v3 picker still offers an unlinked project state');
  byAttr(repairModal, 'data-project-save', '').click(); await flush();
  if (!byAttr(repairModal, 'data-project-form-error', '').textContent.includes('Choose a Deal')) throw new Error('orphan project was saved without repairing its Deal');
  button(repairModal, 'Cancel').click();
  byAttr(portfolio, 'data-project-id', current.id).click(); await flush();
  const navigation = navigationCalls[navigationCalls.length - 1];
  if (!navigation || navigation.workspaceId !== 'deal-creatures' || navigation.workspaceItemId !== 'verstak.projects.workspace' || navigation.toolRequest?.projectId !== current.id) {
    throw new Error(`portfolio navigation contract failed: ${JSON.stringify(navigation)}`);
  }
  bundle.components.ProjectsView.unmount(portfolio);

  const overview = await commandHandlers.get('verstak.projects.provideOverview')({ workspaceRootPath: 'Archive/Creatures2.0' });
  if (!overview.summary || overview.summary[0].label !== legacy.name) throw new Error('Overview command failed');
  bundle.components.ProjectsView.unmount(container);

  const degraded = new FakeNode('div');
  bundle.components.ProjectsView.mount(degraded, {
    workspaceNode: { workspaceId: 'deal-archive-creatures', name: 'Creatures2.0', rootPath: 'Archive/Creatures2.0' },
    toolRequest: { projectId: legacy.id }
  }, makeApi({ 'todo.workspace': false, 'verstak/notes/v1': false, 'verstak/files/v1': false, 'activity.log': false }));
  await flush(3);
  if (byAttr(degraded, 'data-project-pane', 'overview').textContent.includes('not installed or enabled')) throw new Error('Overview exposes optional-provider failure cards');
  byAttr(degraded, 'data-project-tab', 'tasks').click(); await flush();
  if (!byAttr(degraded, 'data-project-pane', 'tasks').textContent.includes('not installed or enabled')) throw new Error('missing provider did not degrade gracefully');
  bundle.components.ProjectsView.unmount(degraded);

  const scopedCreates = capabilityCalls.filter((c) => ['todo.workspace', 'verstak/notes/v1', 'verstak/files/v1'].includes(c.name) && c.operation === 'create');
  if (!published.some((e) => e.type === 'project.created') || scopedCreates.length !== 3 || scopedCreates.some((c) => !c.args.projectId)) {
    throw new Error('public scoped capability contracts were bypassed');
  }
  console.log('projects plugin smoke passed');
})().catch((err) => { console.error(err); process.exit(1); });
