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
      readText: async (filePath) => {
        if ((options.readFailures || []).includes(filePath)) throw new Error('read failed');
        return options.files && Object.prototype.hasOwnProperty.call(options.files, filePath)
          ? options.files[filePath]
          : (options.content || '[DB password](verstak-secret://client-a.db)\n');
      },
      writeText: (path, content) => {
        written.push({ path, content });
        return options.writeText ? options.writeText(path, content) : Promise.resolve();
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
      path: options.path || 'Project/Notes/Secret.md',
      extension: /\.markdown$/i.test(options.path || '') ? '.markdown' : '.md',
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

  // A save acknowledges exactly the bytes it wrote, not edits made while the
  // filesystem operation was pending.
  let finishWrite;
  const racing = await mountEditor(false, {}, {}, {
    content: 'original',
    writeText: () => new Promise((resolve) => { finishWrite = resolve; }),
  });
  walk(racing.container, (node) => node.getAttribute && node.getAttribute('data-editor-mode-button') === 'edit').dispatchEvent('click');
  const racingText = walk(racing.container, (node) => node.getAttribute && node.getAttribute('data-editor-textarea') === '');
  racingText.value = 'first draft';
  racingText.dispatchEvent('input');
  walk(racing.container, (node) => node.getAttribute && node.getAttribute('data-editor-action') === 'save').dispatchEvent('click');
  racingText.value = 'newer draft';
  racingText.dispatchEvent('input');
  finishWrite();
  await flush();
  const racingSave = walk(racing.container, (node) => node.getAttribute && node.getAttribute('data-editor-action') === 'save');
  if (racing.written[0].content !== 'first draft' || racingSave.disabled || !racing.container.textContent.includes('Modified')) {
    throw new Error('a stale save response marked newer edits as saved');
  }
  racingSave.dispatchEvent('click');
  if (racing.written[1]?.content !== 'newer draft') throw new Error('saving again did not write the newer draft');
  finishWrite();
  await flush();
  if (!racingSave.disabled || !racing.container.textContent.includes('Saved')) throw new Error('the newer draft was not marked saved after its own write');

  // Find and replace operates on the open note without changing its Markdown
  // formatting or writing it to disk until the user saves.
  const finding = await mountEditor(false, {}, {}, { content: 'Alpha beta alpha' });
  walk(finding.container, (node) => node.getAttribute && node.getAttribute('data-editor-action') === 'find').dispatchEvent('click');
  const query = walk(finding.container, (node) => node.getAttribute && node.getAttribute('data-editor-find-query') === '');
  if (!query) throw new Error('find panel did not open');
  query.value = 'alpha';
  query.dispatchEvent('input');
  const findText = walk(finding.container, (node) => node.getAttribute && node.getAttribute('data-editor-textarea') === '');
  if (!findText || findText.selectionStart !== 0 || findText.selectionEnd !== 5) throw new Error('find did not select the first match');
  walk(finding.container, (node) => node.getAttribute && node.getAttribute('data-editor-find-action') === 'next').dispatchEvent('click');
  if (findText.selectionStart !== 11 || findText.selectionEnd !== 16) throw new Error('find next did not wrap to the second match');
  const replacement = walk(finding.container, (node) => node.getAttribute && node.getAttribute('data-editor-replace-value') === '');
  replacement.value = 'gamma';
  walk(finding.container, (node) => node.getAttribute && node.getAttribute('data-editor-find-action') === 'replace').dispatchEvent('click');
  if (findText.value !== 'Alpha beta gamma' || finding.written.length !== 0) throw new Error('replace one altered wrong content or saved implicitly');
  walk(finding.container, (node) => node.getAttribute && node.getAttribute('data-editor-find-action') === 'replace-all').dispatchEvent('click');
  if (findText.value !== 'gamma beta gamma') throw new Error('replace all did not replace remaining case-insensitive match');
  findText.value += ' [x]';
  findText.dispatchEvent('input');
  query.value = '[';
  query.dispatchEvent('input');
  if (!finding.container.textContent.includes('1 matches')) throw new Error('search punctuation must be treated as literal text');
  finding.container.dispatchEvent('keydown', { code: 'KeyF', ctrlKey: true });
  if (walk(finding.container, (node) => node.getAttribute && node.getAttribute('data-editor-find-panel') === '').hidden) {
    throw new Error('Ctrl+F did not open the in-note search panel');
  }

  // Links are scoped to the current Deal, resolve actual filenames, and skip
  // wiki-link-like text in code fences when building backlinks.
  const related = await mountEditor(false, {}, {}, {
    path: 'Project/Notes/Target.md',
    context: { notesMode: true, isInsideNotesFolder: true, notesScopePath: 'Project' },
    notes: ['Target.md', 'Source.md', 'Code.md', 'Inline.md', 'Meeting notes.markdown'],
    files: {
      'Project/Notes/Target.md': '# Target\nSee [[Meeting notes]]',
      'Project/Notes/Source.md': 'A link to [[Target]] and [[Target]] again.',
      'Project/Notes/Code.md': '```\n[[Target]]\n```',
      'Project/Notes/Inline.md': '`[[Target]]`',
      'Project/Notes/Meeting notes.markdown': '# Meeting notes',
    },
  });
  const linksToggle = walk(related.container, (node) => node.getAttribute && node.getAttribute('data-editor-action') === 'toggle-links');
  if (!linksToggle) throw new Error('notes editor has no links panel');
  linksToggle.dispatchEvent('click');
  await flush();
  const linksPanel = walk(related.container, (node) => node.getAttribute && node.getAttribute('data-note-links-panel') === '');
  if (!linksPanel) throw new Error('links panel did not open');
  const backlink = walk(linksPanel, (node) => node.getAttribute && node.getAttribute('data-note-backlink') === 'Project/Notes/Source.md');
  if (!backlink || walk(linksPanel, (node) => node.getAttribute && ['Project/Notes/Code.md', 'Project/Notes/Inline.md'].includes(node.getAttribute('data-note-backlink')))) {
    throw new Error('backlinks should include only actual links outside code fences');
  }
  backlink.dispatchEvent('click');
  await flush();
  if (!related.opened.some((request) => request.path === 'Project/Notes/Source.md' && request.context.notesMode)) {
    throw new Error('backlink did not navigate to its source note');
  }
  const outgoing = walk(linksPanel, (node) => node.getAttribute && node.getAttribute('data-note-outgoing') === 'Project/Notes/Meeting notes.markdown');
  if (!outgoing) throw new Error('outgoing link did not resolve the existing .markdown filename');
  related.container.dispatchEvent('click', {
    target: { closest: (selector) => selector === '.internal-link' ? { getAttribute: () => 'Meeting notes' } : null },
  });
  await flush();
  if (!related.opened.some((request) => request.path === 'Project/Notes/Meeting notes.markdown')) {
    throw new Error('wiki link did not navigate to the actual .markdown path');
  }
  const literal = await mountEditor(false, {}, {}, {
    content: '`[[Target]]` and [[Target]]', context: { notesMode: true },
  });
  const literalPreview = walk(literal.container, (node) => node.className === 'de-preview');
  if (!literalPreview || (literalPreview.innerHTML.match(/class="internal-link"/g) || []).length !== 1) {
    throw new Error('inline code must not create a navigable note link');
  }
  const openedBeforeMissing = related.opened.length;
  related.container.dispatchEvent('click', {
    target: { closest: (selector) => selector === '.internal-link' ? { getAttribute: () => 'Missing note' } : null },
  });
  await flush();
  if (related.opened.length !== openedBeforeMissing || !linksPanel.textContent.includes('not found or its title is ambiguous')) {
    throw new Error('a missing wiki link must not open an invented file path');
  }
  walk(related.container, (node) => node.getAttribute && node.getAttribute('data-editor-mode-button') === 'edit').dispatchEvent('click');
  const relatedText = walk(related.container, (node) => node.getAttribute && node.getAttribute('data-editor-textarea') === '');
  relatedText.value = '# Target\nSee [[Source]]';
  relatedText.dispatchEvent('input');
  if (!walk(linksPanel, (node) => node.getAttribute && node.getAttribute('data-note-outgoing') === 'Project/Notes/Source.md')) {
    throw new Error('outgoing links did not follow unsaved edits');
  }

  const ambiguous = await mountEditor(false, {}, {}, {
    path: 'Project/Notes/Target.md',
    context: { notesMode: true, notesScopePath: 'Project' },
    notes: ['Target.md', 'Meeting_notes.md', 'Meeting notes.markdown'],
    content: '[[Meeting notes]]',
  });
  ambiguous.container.dispatchEvent('click', {
    target: { closest: (selector) => selector === '.internal-link' ? { getAttribute: () => 'Meeting notes' } : null },
  });
  await flush();
  if (ambiguous.opened.length || !ambiguous.container.textContent.includes('ambiguous')) {
    throw new Error('ambiguous note titles must not silently choose one file');
  }

  const ambiguousBacklink = await mountEditor(false, {}, {}, {
    path: 'Project/Notes/Meeting_notes.md', context: { notesMode: true, notesScopePath: 'Project' },
    notes: ['Meeting_notes.md', 'Meeting notes.markdown', 'Source.md'],
    files: {
      'Project/Notes/Meeting_notes.md': '# Meeting notes',
      'Project/Notes/Meeting notes.markdown': '# Another',
      'Project/Notes/Source.md': '[[Meeting notes]]',
    },
  });
  walk(ambiguousBacklink.container, (node) => node.getAttribute && node.getAttribute('data-editor-action') === 'toggle-links').dispatchEvent('click');
  await flush();
  if (walk(ambiguousBacklink.container, (node) => node.getAttribute && node.getAttribute('data-note-backlink') === 'Project/Notes/Source.md')) {
    throw new Error('an ambiguous link must not be attributed to either possible target');
  }

  const underscored = await mountEditor(false, {}, {}, {
    path: 'Project/Notes/Target.md', context: { notesMode: true, notesScopePath: 'Project' },
    notes: ['Target.md', 'Meeting_notes.md'], content: '[[Meeting notes]]',
  });
  underscored.container.dispatchEvent('click', {
    target: { closest: (selector) => selector === '.internal-link' ? { getAttribute: () => 'Meeting notes' } : null },
  });
  await flush();
  if (underscored.opened[0]?.path !== 'Project/Notes/Meeting_notes.md') {
    throw new Error('wiki link did not resolve an existing underscored filename');
  }

  const partial = await mountEditor(false, {}, {}, {
    path: 'Project/Notes/Target.md', context: { notesMode: true, notesScopePath: 'Project' },
    notes: ['Target.md', 'Readable.md', 'Unreadable.md'],
    files: { 'Project/Notes/Target.md': '# Target', 'Project/Notes/Readable.md': '[[Target]]' },
    readFailures: ['Project/Notes/Unreadable.md'],
  });
  walk(partial.container, (node) => node.getAttribute && node.getAttribute('data-editor-action') === 'toggle-links').dispatchEvent('click');
  await flush();
  if (!partial.container.textContent.includes('Some notes could not be checked')
    || !walk(partial.container, (node) => node.getAttribute && node.getAttribute('data-note-backlink') === 'Project/Notes/Readable.md')) {
    throw new Error('partial backlink scan must report its uncertainty and retain readable results');
  }

  console.log('default editor smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
