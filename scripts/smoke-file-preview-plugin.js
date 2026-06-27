#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'file-preview', 'frontend', 'src', 'index.js');
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
    this.parentNode = null;
    this._innerHTML = '';
    this._textContent = '';
  }

  appendChild(node) {
    if (!(node instanceof FakeNode)) throw new TypeError('appendChild expects FakeNode');
    this.children.push(node);
    node.parentNode = this;
    return node;
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
    (this.listeners[type] || []).forEach((handler) => handler({ stopPropagation() {}, ...event }));
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
  }, { filename: sourcePath });
  const component = registry['verstak.file-preview'] && registry['verstak.file-preview'].FilePreview;
  if (!component) throw new Error('FilePreview was not registered');
  return component;
}

async function flush() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

(async () => {
  const document = makeDocument();
  const component = loadComponent(document);

  const textContainer = new FakeNode('div');
  const readPaths = [];
  component.mount(textContainer, {
    request: { path: 'Docs/app.log', extension: '.log', mode: 'view' },
  }, {
    files: {
      metadata: async () => ({ type: 'file', size: 11, isText: true, modifiedAt: '2026-06-27T00:00:00Z' }),
      readText: async (relativePath) => {
        readPaths.push(relativePath);
        return 'hello log';
      },
      openExternal: async () => undefined,
    },
  });
  await flush();
  if (readPaths[0] !== 'Docs/app.log') throw new Error('text preview did not read text file');
  if (!textContainer.textContent.includes('hello log')) throw new Error('text preview did not render file text');

  const imageContainer = new FakeNode('div');
  const opened = [];
  component.mount(imageContainer, {
    request: { path: 'Images/logo.png', extension: '.png', mode: 'view' },
  }, {
    files: {
      metadata: async () => ({ type: 'file', size: 2048, isText: false, modifiedAt: '2026-06-27T00:00:00Z' }),
      readText: async () => { throw new Error('image preview should not read bytes through readText'); },
      openExternal: async (relativePath) => { opened.push(relativePath); },
    },
  });
  await flush();
  if (!imageContainer.textContent.includes('Image Preview')) throw new Error('image preview metadata was not rendered');
  const openButton = walk(imageContainer, (node) => node.getAttribute && node.getAttribute('data-action') === 'open-external');
  if (!openButton) throw new Error('open external button not found');
  openButton.click();
  await flush();
  if (opened[0] !== 'Images/logo.png') throw new Error(`expected external open path Images/logo.png, got ${opened[0] || '<none>'}`);

  console.log('file-preview smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
