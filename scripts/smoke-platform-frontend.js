#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const bundlePath = path.join(root, 'plugins', 'platform-test', 'frontend', 'src', 'index.js');
const source = fs.readFileSync(bundlePath, 'utf8');

class FakeNode {
  constructor(tagName) {
    this.tagName = String(tagName || '').toUpperCase();
    this.children = [];
    this.attributes = {};
    this.style = {};
    this.className = '';
    this.id = '';
    this.innerHTML = '';
    this.textContent = '';
  }

  appendChild(node) {
    if (!(node instanceof FakeNode)) {
      throw new TypeError("Argument 1 ('node') to Node.appendChild must be an instance of Node");
    }
    this.children.push(node);
    this.firstChild = this.children[0] || null;
    this.lastChild = this.children[this.children.length - 1] || null;
    return node;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'id') this.id = String(value);
  }

  addEventListener() {}
}

function makeDocument() {
  return {
    head: new FakeNode('head'),
    createElement(tagName) {
      return new FakeNode(tagName);
    },
    createTextNode(text) {
      const node = new FakeNode('#text');
      node.textContent = String(text);
      return node;
    },
    getElementById() {
      return null;
    },
  };
}

const registry = {};
const sandbox = {
  console,
  document: makeDocument(),
  window: {
    VerstakPluginRegister(pluginId, bundle) {
      registry[pluginId] = bundle.components || {};
    },
  },
};
sandbox.window.window = sandbox.window;
sandbox.window.document = sandbox.document;

vm.runInNewContext(source, sandbox, { filename: bundlePath });

const components = registry['verstak.platform-test'];
if (!components) {
  throw new Error('verstak.platform-test did not register components');
}

const api = {
  pluginId: 'verstak.platform-test',
  settings: {
    read: async () => 'initial value',
    write: async () => undefined,
  },
  capabilities: {
    has: async () => true,
    list: async () => [{ name: 'verstak/platform-test/v1', pluginId: 'verstak.platform-test', status: 'draft' }],
  },
  commands: {
    _handlers: new Map(),
    register: async (commandId, handler) => {
      api.commands._handlers.set(commandId, handler);
      return () => { api.commands._handlers.delete(commandId); };
    },
    execute: async (commandId, args = {}) => {
      const handler = api.commands._handlers.get(commandId);
      if (!handler) throw new Error(`declared-but-unhandled: ${commandId}`);
      return { status: 'handled', result: await handler(args, { status: 'declared', commandId, pluginId: api.pluginId }) };
    },
  },
  events: {
    publish: async () => undefined,
    subscribe: async () => () => undefined,
  },
  files: {
    _entries: new Map([['', { type: 'folder' }]]),
    createFolder: async (relativePath) => {
      if (api.files._entries.has(relativePath)) throw new Error(`conflict: ${relativePath}`);
      api.files._entries.set(relativePath, { type: 'folder' });
    },
    writeText: async (relativePath, content) => {
      api.files._entries.set(relativePath, { type: 'file', content });
    },
    readBytes: async (relativePath) => {
      const entry = api.files._entries.get(relativePath);
      if (!entry) throw new Error(`not-found: ${relativePath}`);
      const content = entry.content || '';
      return { relativePath, size: content.length, mimeHint: '', dataBase64: Buffer.from(content, 'binary').toString('base64') };
    },
    writeBytes: async (relativePath, dataBase64) => {
      api.files._entries.set(relativePath, { type: 'file', content: Buffer.from(dataBase64, 'base64').toString('binary') });
    },
    readText: async (relativePath) => {
      if (String(relativePath).split('/')[0].toLowerCase() === '.verstak') {
        throw new Error('reserved-path: .verstak is internal');
      }
      const entry = api.files._entries.get(relativePath);
      if (!entry) throw new Error(`not-found: ${relativePath}`);
      return entry.content || '';
    },
    list: async (relativeDir) => {
      const prefix = relativeDir ? `${relativeDir}/` : '';
      return Array.from(api.files._entries.entries())
        .filter(([entryPath]) => entryPath.startsWith(prefix) && entryPath !== relativeDir && !entryPath.slice(prefix.length).includes('/'))
        .map(([entryPath, entry]) => ({
          name: path.basename(entryPath),
          relativePath: entryPath,
          type: entry.type,
        }));
    },
    move: async (fromRelativePath, toRelativePath) => {
      const entry = api.files._entries.get(fromRelativePath);
      if (!entry) throw new Error(`not-found: ${fromRelativePath}`);
      api.files._entries.set(toRelativePath, entry);
      api.files._entries.delete(fromRelativePath);
    },
    trash: async (relativePath) => {
      if (!api.files._entries.has(relativePath)) throw new Error(`not-found: ${relativePath}`);
      api.files._entries.delete(relativePath);
      return { originalPath: relativePath, trashPath: `.verstak/trash/files/mock/${path.basename(relativePath)}`, trashId: 'mock', deletedAt: new Date().toISOString() };
    },
  },
  workbench: {
    openResource: async (request) => ({
      status: 'opened',
      providerId: 'verstak.platform-test.markdown-diagnostic',
      providerPluginId: 'verstak.platform-test',
      providerComponent: 'MarkdownDiagnosticProvider',
      request: { mode: 'view', ...request },
    }),
    editResource: async (request) => ({
      status: 'opened',
      providerId: 'verstak.platform-test.markdown-diagnostic',
      providerPluginId: 'verstak.platform-test',
      providerComponent: 'MarkdownDiagnosticProvider',
      request: { mode: 'edit', ...request },
    }),
  },
};

(async () => {
  for (const name of ['DiagnosticsPanel', 'PlatformTestSettings', 'MarkdownDiagnosticProvider']) {
    const component = components[name];
    if (!component || typeof component.mount !== 'function') {
      throw new Error(`${name} is not mountable`);
    }
    const container = new FakeNode('div');
    component.mount(container, {}, api);
    await Promise.resolve();
    await Promise.resolve();
    if (container.children.length === 0) {
      throw new Error(`${name} mounted no DOM nodes`);
    }
    if (typeof component.unmount === 'function') {
      component.unmount(container);
    }
  }

  console.log('platform-test frontend smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
