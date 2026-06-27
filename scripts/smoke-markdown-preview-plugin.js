#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'markdown-preview', 'frontend', 'src', 'index.js');
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
  const sandbox = {
    console,
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
  const component = registry['verstak.markdown-preview'] && registry['verstak.markdown-preview'].MarkdownPreview;
  if (!component) throw new Error('MarkdownPreview was not registered');
  return component;
}

async function flush() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

(async () => {
  const document = makeDocument();
  const component = loadComponent(document);
  const container = new FakeNode('div');
  const readPaths = [];
  component.mount(container, {
    request: { path: 'Docs/readme.md', mode: 'view' },
  }, {
    files: {
      readText: async (relativePath) => {
        readPaths.push(relativePath);
        return '# Title\n\nParagraph with `code`.\n\n- one\n- two\n';
      },
    },
  });
  await flush();

  if (container.getAttribute('data-plugin-id') !== 'verstak.markdown-preview') {
    throw new Error('plugin id marker missing');
  }
  if (readPaths[0] !== 'Docs/readme.md') {
    throw new Error(`expected readText Docs/readme.md, got ${readPaths[0] || '<none>'}`);
  }
  const html = container.innerHTML;
  if (!html.includes('<h1>Title</h1>')) throw new Error('heading was not rendered');
  if (!html.includes('<code>code</code>')) throw new Error('inline code was not rendered');
  if (!html.includes('<li>one</li>') || !html.includes('<li>two</li>')) throw new Error('list items were not rendered');

  console.log('markdown-preview smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
