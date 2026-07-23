#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'plugins', 'default-editor', 'frontend', 'src', 'index.js');
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

  set textContent(value) {
    this._textContent = String(value || '');
    this._innerHTML = '';
    this.children = [];
  }

  get textContent() {
    if (this.tagName === '#TEXT') return this._textContent;
    return this._textContent + this._innerHTML.replace(/<[^>]*>/g, '') + this.children.map((child) => child.textContent).join('');
  }

  set innerHTML(value) {
    this._innerHTML = String(value || '');
    this._textContent = '';
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML + this.children.map((child) => child.innerHTML).join('');
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
    head: new FakeNode('head'),
    body: new FakeNode('body'),
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
      confirm: () => true,
      VerstakPluginRegister(pluginId, bundle) {
        registry[pluginId] = bundle.components || {};
      },
    },
    Event: function Event() {},
    setTimeout,
    clearTimeout,
  }, { filename: sourcePath });
  const component = registry['verstak.default-editor'] && registry['verstak.default-editor'].DefaultEditor;
  if (!component) throw new Error('DefaultEditor was not registered');
  return component;
}

async function flush() {
  for (let i = 0; i < 12; i++) {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function mountEditor(secretProviderEnabled, translations, settings = {}) {
  const document = makeDocument();
  const component = loadComponent(document);
  const opened = [];
  const written = [];
  const api = {
    files: {
      readText: async () => '[DB password](verstak-secret://client-a.db)\n',
      writeText: async (path, content) => {
        written.push({ path, content });
      },
    },
    settings: {
      read: async (key) => settings[key],
      write: async (key, value) => {
        settings[key] = value;
      },
    },
    contributions: {
      list: async (point) => {
        if (point !== 'openProviders' || !secretProviderEnabled) return [];
        return [{
          pluginId: 'verstak.secrets',
          id: 'verstak.secrets.secret',
          component: 'SecretsView',
          supports: [{ kind: 'secret', modes: ['view'] }],
        }];
      },
    },
    workbench: {
      openResource: async (request) => {
        opened.push(request);
        return { status: 'opened', request };
      },
    },
    i18n: {
      t: (key, params, fallback) => {
        let value = translations && translations[key] ? translations[key] : (fallback || key);
        Object.entries(params || {}).forEach(([name, replacement]) => {
          value = value.replace(`{${name}}`, String(replacement));
        });
        return value;
      },
    },
  };
  const container = document.createElement('div');
  component.mount(container, {
    request: { kind: 'vault-file', path: 'Project/Notes/Secret.md', extension: '.md', mode: 'view' },
  }, api);
  await flush();
  return { container, opened, written, settings };
}

(async () => {
  const disabled = await mountEditor(false);
  const disabledPreview = walk(disabled.container, (node) => node.className === 'de-preview');
  if (!disabledPreview) throw new Error('disabled preview missing');
  if (disabledPreview.innerHTML.includes('data-secret-id')) throw new Error('secret link rendered without secrets provider');

  const enabled = await mountEditor(true);
  if (enabled.container.textContent.includes('notes-markdown') || enabled.container.textContent.includes('generic-markdown')) {
    throw new Error('editor must not expose the technical editor mode in its toolbar');
  }
  if (enabled.container.textContent.includes('Notes context active')) {
    throw new Error('editor must not show an implementation roadmap in the notes UI');
  }
  const preview = walk(enabled.container, (node) => node.className === 'de-preview');
  if (!preview) throw new Error('enabled preview missing');
  if (!preview.innerHTML.includes('data-secret-id="client-a.db"')) throw new Error('secret link did not render with provider');

  enabled.container.dispatchEvent('click', {
    target: {
      closest(selector) {
        if (selector === '.secret-link') {
          return { getAttribute: (name) => name === 'data-secret-id' ? 'client-a.db' : '' };
        }
        return null;
      },
    },
  });
  await flush();

  if (!enabled.opened.some((request) => request.kind === 'secret' && request.path === 'client-a.db')) {
    throw new Error('secret link did not open through workbench');
  }

  const russian = await mountEditor(true, {
    'ui.md.heading': 'Заголовок',
    'ui.wrapLongLines': 'Переносить длинные строки',
  });
  const headingButton = walk(russian.container, (node) => node.getAttribute && node.getAttribute('data-md-action') === 'heading');
  if (!headingButton || headingButton.getAttribute('title') !== 'Заголовок') {
    throw new Error('Markdown toolbar titles must use the locale catalog');
  }
  const russianWrapButton = walk(russian.container, (node) => node.getAttribute && node.getAttribute('data-editor-action') === 'toggle-wrap');
  if (!russianWrapButton || russianWrapButton.textContent !== 'Переносить длинные строки') {
    throw new Error('soft wrap label must use the Russian locale catalog');
  }

  const wrapSettings = {};
  const wrapping = await mountEditor(true, { 'ui.wrapLongLines': 'Wrap long lines' }, wrapSettings);
  walk(wrapping.container, (node) => node.getAttribute && node.getAttribute('data-editor-mode-button') === 'edit').dispatchEvent('click');
  const wrapButton = walk(wrapping.container, (node) => node.getAttribute && node.getAttribute('data-editor-action') === 'toggle-wrap');
  const textarea = walk(wrapping.container, (node) => node.getAttribute && node.getAttribute('data-editor-textarea') === '');
  if (!wrapButton || wrapButton.getAttribute('aria-pressed') !== 'true' || !textarea) {
    throw new Error('soft wrap must be enabled by default');
  }
  if (textarea.getAttribute('wrap') !== 'soft' || !textarea.className.includes('de-textarea-wrap')) {
    throw new Error('soft wrap did not update textarea presentation');
  }
  const exactText = 'first very long logical line without inserted breaks\\r\\nsecond line';
  textarea.value = exactText;
  textarea.dispatchEvent('input');
  const saveButton = walk(wrapping.container, (node) => node.getAttribute && node.getAttribute('data-editor-action') === 'save');
  saveButton.dispatchEvent('click');
  await flush();
  if (wrapping.written.length !== 1 || wrapping.written[0].content !== exactText) {
    throw new Error('soft wrap changed saved text or newline bytes');
  }
  wrapButton.dispatchEvent('click');
  await flush();
  if (wrapSettings.wrapLongLines !== false || wrapButton.getAttribute('aria-pressed') !== 'false') {
    throw new Error('soft wrap off state was not persisted');
  }
  const remounted = await mountEditor(true, { 'ui.wrapLongLines': 'Wrap long lines' }, wrapSettings);
  walk(remounted.container, (node) => node.getAttribute && node.getAttribute('data-editor-mode-button') === 'edit').dispatchEvent('click');
  const remountedWrapButton = walk(remounted.container, (node) => node.getAttribute && node.getAttribute('data-editor-action') === 'toggle-wrap');
  const remountedTextarea = walk(remounted.container, (node) => node.getAttribute && node.getAttribute('data-editor-textarea') === '');
  if (remountedWrapButton.getAttribute('aria-pressed') !== 'false' || remountedTextarea.getAttribute('wrap') !== 'off') {
    throw new Error('persisted soft wrap state was not restored');
  }

  console.log('default editor smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
