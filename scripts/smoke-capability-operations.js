#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');

function loadBundle(name) {
  const source = fs.readFileSync(path.join(root, 'plugins', name, 'frontend', 'src', 'index.js'), 'utf8');
  let bundle = null;
  const sandbox = { console, setTimeout, clearTimeout, Date, Math, Promise, document: {}, window: {} };
  sandbox.window.VerstakPluginRegister = (_id, value) => { bundle = value; };
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(source, sandbox, { filename: name + '/index.js' });
  if (!bundle || typeof bundle.activate !== 'function') throw new Error(name + ' did not register activate()');
  return bundle;
}

function commandApi(extra = {}) {
  const handlers = new Map();
  return {
    handlers,
    api: Object.assign({
      commands: {
        register: async (id, handler) => { handlers.set(id, handler); return () => handlers.delete(id); },
      },
    }, extra),
  };
}

(async () => {
  const entries = new Map();
  const opened = [];
  const notes = commandApi({
    files: {
      list: async (dir) => Array.from(entries.entries())
        .filter(([key]) => key.startsWith(dir + '/') && !key.slice(dir.length + 1).includes('/'))
        .map(([key, value]) => ({ name: path.basename(key), relativePath: key, type: value.type, modifiedAt: value.modifiedAt || '' })),
      createFolder: async (dir) => { if (entries.has(dir)) throw new Error('conflict'); entries.set(dir, { type: 'folder' }); },
      writeText: async (file, content, options = {}) => {
        if (entries.has(file) && !options.overwrite) throw new Error('conflict');
        entries.set(file, { type: 'file', content });
      },
    },
    workbench: { openResource: async (request) => { opened.push(request); return { status: 'opened' }; } },
  });
  await loadBundle('notes').activate(notes.api);
  const createNote = notes.handlers.get('verstak.notes.create');
  const listNotes = notes.handlers.get('verstak.notes.list');
  const openNote = notes.handlers.get('verstak.notes.open');
  if (!createNote || !listNotes || !openNote) throw new Error('notes capability handlers were not registered');
  const created = await createNote({ workspaceRootPath: 'Project', title: 'Architecture' });
  if (created.path !== 'Project/Notes/Architecture.md') throw new Error('notes create returned wrong path');
  const listed = await listNotes({ workspaceRootPath: 'Project' });
  if (listed.length !== 1 || listed[0].title !== 'Architecture') throw new Error('notes list did not return created note');
  await openNote({ workspaceRootPath: 'Project', path: created.path });
  if (!opened.length || opened[0].path !== created.path) throw new Error('notes open did not route to workbench');

  const settings = {};
  let notifications = [];
  const todo = commandApi({
    settings: {
      read: async () => settings,
      write: async (key, value) => { settings[key] = value; return settings; },
    },
    notifications: { replace: async (items) => { notifications = items; } },
    i18n: { t: (_key, _params, fallback) => fallback },
  });
  await loadBundle('todo').activate(todo.api);
  const createTodo = todo.handlers.get('verstak.todo.create');
  const listTodos = todo.handlers.get('verstak.todo.list');
  const setStatus = todo.handlers.get('verstak.todo.setStatus');
  if (!createTodo || !listTodos || !setStatus) throw new Error('todo capability handlers were not registered');
  const task = await createTodo({ workspaceRootPath: 'Project', title: 'Ship MVP', priority: 'high' });
  const tasks = await listTodos({ workspaceRootPath: 'Project', status: 'open' });
  if (tasks.length !== 1 || tasks[0].id !== task.id) throw new Error('todo list did not return created task');
  const done = await setStatus({ id: task.id, status: 'done' });
  if (done.status !== 'done') throw new Error('todo setStatus returned the wrong status');
  const openAfter = await listTodos({ workspaceRootPath: 'Project', status: 'open' });
  if (openAfter.length !== 0) throw new Error('todo setStatus did not remove task from open list');
  if (!Array.isArray(notifications)) throw new Error('todo capability persistence did not sync notifications');

  console.log('capability operation smoke passed');
})().catch((err) => { console.error(err); process.exit(1); });
