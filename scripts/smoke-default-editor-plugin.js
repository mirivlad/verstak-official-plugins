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
    this.style = {};
    // Enough of a textarea for caret-aware behaviour to be testable: the
    // wiki-link completion and the outline both work from the selection.
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.scrollTop = 0;
    this.scrollHeight = 100;
    this.scrolledIntoView = false;
  }

  appendChild(node) {
    this.children.push(node);
    node.parentNode = this;
    return node;
  }

  removeChild(node) {
    this.children = this.children.filter((child) => child !== node);
    node.parentNode = null;
    return node;
  }

  setSelectionRange(start, end) {
    this.selectionStart = start;
    this.selectionEnd = end;
  }

  focus() {}

  scrollIntoView() {
    this.scrolledIntoView = true;
  }

  // Supports the one shape the editor uses: [attribute="value"].
  querySelector(selector) {
    const match = /^\[([a-zA-Z-]+)="(.*)"\]$/.exec(selector);
    if (!match) return null;
    return walk(this, (node) => node.getAttribute && node.getAttribute(match[1]) === match[2].replace(/\\(.)/g, '$1'));
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

async function mountEditor(secretProviderEnabled, translations, settings = {}, options = {}) {
  const document = makeDocument();
  const component = loadComponent(document);
  const opened = [];
  const written = [];
  const listed = [];
  const api = {
    files: {
      readText: async () => options.content || '[DB password](verstak-secret://client-a.db)\n',
      writeText: async (path, content) => {
        written.push({ path, content });
      },
      list: async (dir) => {
        listed.push(dir);
        return (options.notes || []).map((name) => ({ name, type: 'file', relativePath: dir + '/' + name }));
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
    request: {
      kind: 'vault-file',
      path: 'Project/Notes/Secret.md',
      extension: '.md',
      mode: 'view',
      context: options.context,
    },
  }, api);
  await flush();
  return { container, opened, written, listed, settings, document };
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

  // ── Outline (navigation by headings) ──────────────────────────────────
  const noteWithHeadings = [
    '# Overview',
    'body',
    '## Details',
    '```',
    '# not a heading, this is code',
    '```',
    '## Details',
    'more',
  ].join('\n');

  const outline = await mountEditor(false, {}, { outlineVisible: true }, { content: noteWithHeadings });
  const outlinePane = walk(outline.container, (node) => node.getAttribute && node.getAttribute('data-outline') === '');
  if (!outlinePane) throw new Error('outline pane did not appear when the stored preference asked for it');
  const outlineEntries = [];
  walk(outlinePane, (node) => {
    if (node.getAttribute && node.getAttribute('data-outline-slug')) outlineEntries.push(node);
    return false;
  });
  if (outlineEntries.length !== 3) {
    throw new Error(`outline should list three headings, got ${outlineEntries.length}: ${outlineEntries.map((n) => n.textContent)}`);
  }
  if (outlineEntries.map((node) => node.textContent).join('|') !== 'Overview|Details|Details') {
    throw new Error(`outline entries = ${outlineEntries.map((node) => node.textContent)}`);
  }
  // A heading inside a fenced block is code, not a section.
  if (outlineEntries.some((node) => node.textContent.includes('not a heading'))) {
    throw new Error('outline included a heading from inside a code fence');
  }
  // Two sections with the same title must remain separately reachable.
  const slugs = outlineEntries.map((node) => node.getAttribute('data-outline-slug'));
  if (new Set(slugs).size !== slugs.length) {
    throw new Error(`duplicate heading titles produced duplicate anchors: ${slugs}`);
  }

  const outlinePreview = walk(outline.container, (node) => node.className === 'de-preview');
  slugs.forEach((slug) => {
    if (!outlinePreview.innerHTML.includes(`id="${slug}"`)) {
      throw new Error(`rendered note has no anchor for outline entry ${slug}`);
    }
  });

  // Clicking an entry has to move the reader, not merely look clickable. In
  // split view the editor pane is present, so the caret is what can be checked
  // here; the preview side is layout and belongs to a browser test.
  walk(outline.container, (node) => node.getAttribute && node.getAttribute('data-editor-mode-button') === 'split').dispatchEvent('click');
  await flush();
  const outlineAfterSplit = [];
  walk(outline.container, (node) => {
    if (node.getAttribute && node.getAttribute('data-outline-slug')) outlineAfterSplit.push(node);
    return false;
  });
  const outlineTextarea = walk(outline.container, (node) => node.getAttribute && node.getAttribute('data-editor-textarea') === '');
  if (!outlineTextarea) throw new Error('split view has no textarea');
  // '# Overview\n' (11) + 'body\n' (5) puts '## Details' at offset 16.
  outlineAfterSplit[1].dispatchEvent('click');
  await flush();
  if (outlineTextarea.selectionStart !== 16) {
    throw new Error(`clicking an outline entry put the caret at ${outlineTextarea.selectionStart}, expected the heading at 16`);
  }
  if (!outlineAfterSplit[1].className.includes('is-current')) throw new Error('the outline did not mark the section jumped to');
  // The second "Details" must reach the second occurrence, not the first.
  outlineAfterSplit[2].dispatchEvent('click');
  await flush();
  if (outlineTextarea.selectionStart === 16) {
    throw new Error('the repeated heading jumped to the first occurrence');
  }

  // ── Wiki-link completion ──────────────────────────────────────────────
  const linking = await mountEditor(false, {}, {}, {
    content: 'start\n',
    notes: ['Meeting notes.md', 'Budget.md', 'Secret.md'],
    context: { notesMode: true, isInsideNotesFolder: true },
  });
  walk(linking.container, (node) => node.getAttribute && node.getAttribute('data-editor-mode-button') === 'edit').dispatchEvent('click');
  const linkTextarea = walk(linking.container, (node) => node.getAttribute && node.getAttribute('data-editor-textarea') === '');
  if (!linkTextarea) throw new Error('edit mode has no textarea');

  linkTextarea.value = 'see [[me';
  linkTextarea.setSelectionRange(8, 8);
  linkTextarea.dispatchEvent('input');
  await flush();
  const suggest = walk(linking.container, (node) => node.getAttribute && node.getAttribute('data-note-suggest') === '');
  if (!suggest) throw new Error('typing [[ offered no note suggestions');
  const suggestions = [];
  walk(suggest, (node) => {
    if (node.getAttribute && node.getAttribute('data-note-suggestion')) suggestions.push(node.getAttribute('data-note-suggestion'));
    return false;
  });
  if (suggestions.join('|') !== 'Meeting notes') {
    throw new Error(`suggestions should be filtered by what was typed, got ${suggestions}`);
  }

  // With nothing typed yet the whole list shows -- and the note being edited
  // must not be in it, since a note linking to itself is never what was meant.
  linkTextarea.value = 'see [[';
  linkTextarea.setSelectionRange(6, 6);
  linkTextarea.dispatchEvent('input');
  await flush();
  const allSuggest = walk(linking.container, (node) => node.getAttribute && node.getAttribute('data-note-suggest') === '');
  const allSuggestions = [];
  walk(allSuggest, (node) => {
    if (node.getAttribute && node.getAttribute('data-note-suggestion')) allSuggestions.push(node.getAttribute('data-note-suggestion'));
    return false;
  });
  if (allSuggestions.join('|') !== 'Budget|Meeting notes') {
    throw new Error(`unfiltered suggestions = ${allSuggestions}`);
  }

  linkTextarea.value = 'see [[me';
  linkTextarea.setSelectionRange(8, 8);
  linkTextarea.dispatchEvent('input');
  await flush();

  linkTextarea.dispatchEvent('keydown', { key: 'Enter', preventDefault() {} });
  await flush();
  if (linkTextarea.value !== 'see [[Meeting notes]]') {
    throw new Error(`accepting a suggestion produced ${JSON.stringify(linkTextarea.value)}`);
  }
  if (walk(linking.container, (node) => node.getAttribute && node.getAttribute('data-note-suggest') === '')) {
    throw new Error('the suggestion list stayed open after a choice was made');
  }

  // A caret past a closed link is not inside one.
  linkTextarea.value = 'see [[Budget]] and more';
  linkTextarea.setSelectionRange(23, 23);
  linkTextarea.dispatchEvent('input');
  await flush();
  if (walk(linking.container, (node) => node.getAttribute && node.getAttribute('data-note-suggest') === '')) {
    throw new Error('suggestions appeared with the caret outside a wiki link');
  }

  console.log('default editor smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
