#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'search', 'frontend', 'src', 'index.js');
const manifestPath = path.join(root, 'plugins', 'search', 'plugin.json');
const source = fs.readFileSync(sourcePath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const technicalErrors = [];

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

function loadComponent(document) {
  const registry = {};
  vm.runInNewContext(source, {
    console: {
      ...console,
      warn(...args) {
        technicalErrors.push(args.map((value) => String(value)).join(' '));
      },
      error(...args) {
        technicalErrors.push(args.map((value) => String(value)).join(' '));
      },
    },
    document,
    window: {
      VerstakPluginRegister(pluginId, bundle) {
        registry[pluginId] = bundle.components || {};
      },
    },
    setTimeout,
    clearTimeout,
  }, { filename: sourcePath });
  const component = registry['verstak.search'] && registry['verstak.search'].SearchView;
  if (!component) throw new Error('SearchView was not registered');
  return component;
}

async function flush() {
  for (let i = 0; i < 12; i++) {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
  await flush();
}

(async () => {
  const document = makeDocument();
  const component = loadComponent(document);
  const opened = [];
  const fileContents = {
    'Project/Docs/case.md': '# Case\nTarget phrase is here.\n',
    'Project/Docs/notes.txt': 'No match here.\n',
  };
  const pluginData = {};
  const commandHandlers = new Map();
  const eventHandlers = {};
  const providerCalls = [];
  const api = {
    storage: {
      data: {
        read: async (name) => pluginData[name] || {},
        write: async (name, data) => {
          pluginData[name] = JSON.parse(JSON.stringify(data || {}));
        },
      },
    },
    commands: {
      register: async (commandId, handler) => {
        commandHandlers.set(commandId, handler);
        return () => commandHandlers.delete(commandId);
      },
      executeFor: async (pluginId, commandId, args) => {
        providerCalls.push({ pluginId, commandId, args });
        if (pluginId === 'external.notes' && commandId === 'external.notes.search') {
          return {
            status: 'handled',
            pluginId,
            commandId,
            result: [{
              path: 'Project/External/target.note',
              type: 'note',
              matchType: 'External note',
              snippet: 'External provider target result',
              openable: false,
            }],
          };
        }
        if (pluginId === 'broken.provider') {
          throw new Error('provider unavailable');
        }
        throw new Error(`unexpected provider call ${pluginId}:${commandId}`);
      },
    },
    contributions: {
      list: async (point) => {
        if (point !== 'searchProviders') return [];
        return [
          { pluginId: 'verstak.search', id: 'verstak.search.vault-text', label: 'Vault Text Search', handler: 'verstak.search.searchVaultText' },
          { pluginId: 'external.notes', id: 'external.notes.search', label: 'External Notes', handler: 'external.notes.search' },
          { pluginId: 'broken.provider', id: 'broken.provider.search', label: 'Broken Provider', handler: 'broken.provider.search' },
        ];
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
    files: {
      list: async (relativeDir) => {
        if (relativeDir === 'Project') {
          return [
            { name: 'Docs', relativePath: 'Project/Docs', type: 'folder' },
            { name: 'Target Assets', relativePath: 'Project/Target Assets', type: 'folder' },
            { name: 'image.png', relativePath: 'Project/image.png', type: 'file', extension: 'png' },
          ];
        }
        if (relativeDir === 'Project/Docs') {
          return [
            { name: 'case.md', relativePath: 'Project/Docs/case.md', type: 'file', extension: 'md' },
            { name: 'notes.txt', relativePath: 'Project/Docs/notes.txt', type: 'file', extension: 'txt' },
          ];
        }
        return [];
      },
      readText: async (relativePath) => {
        if (Object.prototype.hasOwnProperty.call(fileContents, relativePath)) return fileContents[relativePath];
        throw new Error('unexpected readText path ' + relativePath);
      },
    },
    workbench: {
      openResource: async (request) => {
        opened.push(request);
      },
    },
  };

  const container = new FakeNode('div');
  component.mount(container, { workspaceRootPath: 'Project' }, api);
  await flush();

  if (!commandHandlers.has('verstak.search.searchVaultText')) throw new Error('search provider command was not registered');
  if (!eventHandlers['file.changed'] || eventHandlers['file.changed'].length !== 1) throw new Error('file.changed subscription was not registered');
  if (!manifest.permissions.includes('storage.namespace')) throw new Error('search manifest must request storage.namespace');
  if (!manifest.permissions.includes('events.subscribe')) throw new Error('search manifest must request events.subscribe');
  if (!manifest.permissions.includes('commands.register')) throw new Error('search manifest must request commands.register');
  const command = (manifest.contributes.commands || []).find((item) => item.id === 'verstak.search.searchVaultText');
  if (!command || command.handler !== 'verstak.search.searchVaultText') throw new Error('search command contribution is missing');
  const provider = (manifest.contributes.searchProviders || []).find((item) => item.id === 'verstak.search.vault-text');
  if (!provider || provider.handler !== 'verstak.search.searchVaultText') throw new Error('search provider must point at the command handler');

  function queryInput() {
    const input = walk(container, (node) => node.getAttribute && node.getAttribute('data-search-input') === 'query');
    if (!input) throw new Error('query input not found');
    return input;
  }

  let input = queryInput();
  input.value = 'target';
  input.dispatchEvent('input');
  await wait(360);

  if (!container.textContent.includes('Project/Docs/case.md')) throw new Error('typing should search file contents');
  if (!container.textContent.includes('Target phrase is here')) throw new Error('typing should render content snippet');
  if (!container.textContent.includes('Project/Target Assets')) throw new Error('typing should search folder paths');
  if (!container.textContent.includes('Project/External/target.note')) throw new Error('external provider result should be rendered');
  if (!container.textContent.includes('External Notes')) throw new Error('external provider label should be rendered');
  if (!container.textContent.includes('A search provider is unavailable.')) throw new Error('provider failure should be reported without failing search');
  if (container.textContent.includes('provider unavailable')) throw new Error('provider failure leaked a raw backend error');
  if (!container.textContent.includes('Content match')) throw new Error('content result type was not rendered');
  if (!container.textContent.includes('Folder name')) throw new Error('folder result type was not rendered');
  if (!pluginData['search-index'] || !Array.isArray(pluginData['search-index'].files)) throw new Error('search index was not written to plugin data storage');
  if (providerCalls.some((call) => call.pluginId === 'verstak.search')) throw new Error('search must not call itself as an external provider');
  if (!technicalErrors.some((entry) => entry.includes('provider unavailable'))) throw new Error('provider failure was not retained in the console log');

  input = queryInput();
  input.value = 'image';
  input.dispatchEvent('input');
  await wait(360);

  if (!container.textContent.includes('Project/image.png')) throw new Error('binary file path match should be rendered');
  if (!container.textContent.includes('File name')) throw new Error('file name result type was not rendered');

  const button = walk(container, (node) => node.getAttribute && node.getAttribute('data-search-action') === 'run');
  if (!button) throw new Error('search button not found');
  input = queryInput();
  input.value = 'target';
  input.dispatchEvent('input');
  button.click();
  await flush();

  if (!container.textContent.includes('Project/Docs/case.md')) throw new Error('matching file path was not rendered');
  if (!container.textContent.includes('Target phrase is here')) throw new Error('matching snippet was not rendered');
  if (container.textContent.includes('image.png')) throw new Error('binary image file should not be rendered as a result');

  fileContents['Project/Docs/notes.txt'] = 'Edited target appears after file change.\n';
  eventHandlers['file.changed'].forEach((handler) => handler({
    type: 'file.changed',
    payload: { relativePath: 'Project/Docs/notes.txt', changeType: 'write' },
  }));
  await flush();

  input = queryInput();
  input.value = 'edited target';
  input.dispatchEvent('input');
  button.click();
  await flush();

  if (!container.textContent.includes('Project/Docs/notes.txt')) throw new Error('file.changed should refresh the persisted search index');

  input = queryInput();
  input.value = 'target';
  input.dispatchEvent('input');
  button.click();
  await flush();

  const openButton = walk(container, (node) => node.getAttribute && node.getAttribute('data-search-open') === 'Project/Docs/case.md');
  if (!openButton) throw new Error('result open button not found');
  openButton.click();
  await flush();
  if (!opened[0] || opened[0].path !== 'Project/Docs/case.md' || opened[0].mode !== 'view') {
    throw new Error('result did not open through workbench');
  }

  console.log('search plugin smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
