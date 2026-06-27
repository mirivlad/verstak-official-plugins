#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'search', 'frontend', 'src', 'index.js');
const source = fs.readFileSync(sourcePath, 'utf8');

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
    console,
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

(async () => {
  const document = makeDocument();
  const component = loadComponent(document);
  const opened = [];
  const api = {
    files: {
      list: async (relativeDir) => {
        if (relativeDir === 'Project') {
          return [
            { name: 'Docs', relativePath: 'Project/Docs', type: 'folder' },
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
        if (relativePath === 'Project/Docs/case.md') return '# Case\nTarget phrase is here.\n';
        if (relativePath === 'Project/Docs/notes.txt') return 'No match here.\n';
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

  const input = walk(container, (node) => node.getAttribute && node.getAttribute('data-search-input') === 'query');
  if (!input) throw new Error('query input not found');
  input.value = 'target';
  input.dispatchEvent('input');

  const button = walk(container, (node) => node.getAttribute && node.getAttribute('data-search-action') === 'run');
  if (!button) throw new Error('search button not found');
  button.click();
  await flush();

  if (!container.textContent.includes('Project/Docs/case.md')) throw new Error('matching file path was not rendered');
  if (!container.textContent.includes('Target phrase is here')) throw new Error('matching snippet was not rendered');
  if (container.textContent.includes('image.png')) throw new Error('binary image file should not be rendered as a result');

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
