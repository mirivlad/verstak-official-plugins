import { createDocument } from './document.js';
import { noteFile, parseMarkdown, titleKey } from './markdown.js';
import { notesFolder, readCatalog, matchesTitle, backlinkSnippet } from './catalog.js';
import { highlightCode } from './highlight.js';
import styles from './style.css?inline';

function node(tag, attributes = {}, children = []) {
  const result = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className') result.className = value;
    else if (key.startsWith('on')) result.addEventListener(key.slice(2).toLowerCase(), value);
    else result.setAttribute(key, value);
  }
  result.append(...children);
  return result;
}

export const DefaultEditor = {
  mount(root, props, api) {
    if (!document.getElementById('de-style-injected')) {
      const style = node('style', { id: 'de-style-injected' });
      style.textContent = styles;
      document.head.append(style);
    }
    root.replaceChildren();
    root.className = 'de-root';
    const request = props.request || {};
    const path = request.path || '';
    const notes = !!(request.context?.notesMode || request.context?.isInsideNotesFolder);
    const markdown = notes || /\.(md|markdown)$/i.test(request.extension || path);
    const folder = notesFolder(request);
    let mode = markdown && request.mode !== 'edit' ? 'preview' : 'edit';
    let session;
    let file;
    let disk = '';
    let saved = '';
    let state = '';
    let saving = null;
    let disposed = false;
    let secrets = false;
    let wrap = true;
    let outlineVisible = false;
    let linksVisible = false;
    let catalog = null;
    let catalogPromise = null;
    let preview = null;
    let rendered = null;
    let previewScroll = 0;
    let previewAnchor = null;
    let readingMoved = false;
    let autoSaveTimer;
    let renderTimer;
    let draftTimer;
    let draftWrites = Promise.resolve();
    let dialog = null;
    let unresolvedDraft = false;
    let draftWritable = true;
    const tr = (key, fallback, params) => api.i18n?.t(key, params || null, fallback) || fallback;
    const dirty = () => !!session && session.text !== saved;
    root.dataset.editorMode = notes ? 'notes-markdown' : markdown ? 'generic-markdown' : 'text';
    root.dataset.resourcePath = path;
    root.dataset.requestMode = request.mode || 'view';

    function button(action, label, handler, attributes = {}) {
      return node('button', { type: 'button', 'data-editor-action': action, onClick: handler, ...attributes }, [label]);
    }
    const toolbar = node('div', { className: 'de-toolbar' });
    toolbar.append(node('span', { className: 'de-toolbar-context', title: path }, [path]));
    const modeButtons = new Map();
    if (markdown) for (const [value, key, label] of [['edit', 'ui.edit', 'Edit'], ['preview', 'ui.preview', 'Read'], ['split', 'ui.split', 'Side by side']]) {
      const control = button(`mode-${value}`, tr(key, label), () => setMode(value), { 'data-editor-mode-button': value });
      modeButtons.set(value, control);
      toolbar.append(control);
    }
    const undoButton = button('undo', tr('ui.undo', 'Undo'), () => session?.undo(), { title: tr('ui.undoHint', 'Undo — Ctrl+Z') });
    const redoButton = button('redo', tr('ui.redo', 'Redo'), () => session?.redo(), { title: tr('ui.redoHint', 'Redo — Ctrl+Y / Ctrl+Shift+Z') });
    const saveButton = button('save', tr('ui.save', 'Save'), () => save());
    const status = node('span', { className: 'de-status', 'data-save-state': '', 'aria-live': 'polite' });
    const outlineButton = button('toggle-outline', tr('ui.outline', 'Outline'), () => {
      outlineVisible = !outlineVisible;
      api.settings?.write('outlineVisible', outlineVisible).catch(() => {});
      updateSides();
    });
    const linksButton = button('toggle-links', tr('ui.links', 'Links'), () => {
      linksVisible = !linksVisible;
      updateSides();
      if (linksVisible) refreshCatalog();
    });
    const wrapButton = button('toggle-wrap', tr('ui.wrapLongLines', 'Wrap long lines'), () => {
      wrap = !wrap;
      session?.setWrap(wrap);
      wrapButton.setAttribute('aria-pressed', String(wrap));
      api.settings?.write('wrapLongLines', wrap).catch(() => {});
    }, { 'aria-pressed': 'true' });
    const wideButton = button('toggle-width', tr('ui.wide', 'Wide page'), () => {
      const wide = root.classList.toggle('de-wide');
      wideButton.setAttribute('aria-pressed', String(wide));
    }, { 'aria-pressed': 'false' });
    toolbar.append(undoButton, redoButton);
    if (markdown) toolbar.append(outlineButton, wideButton);
    if (notes) toolbar.append(linksButton);
    toolbar.append(wrapButton, button('find', tr('ui.find', 'Find / replace'), openFind),
      button('reload', tr('ui.reload', 'Reload'), () => load(true)), saveButton, status);
    root.append(toolbar);

    const formatting = node('div', { className: 'de-md-toolbar', role: 'toolbar', 'aria-label': tr('ui.formatting', 'Text formatting') });
    const formattingButtons = new Map();
    if (markdown) for (const [action, key, label] of [
      ['heading', 'heading', 'Heading'], ['bold', 'bold', 'Bold'], ['italic', 'italic', 'Italic'],
      ['bullet', 'bulletList', 'Bullet list'], ['numbered', 'numberedList', 'Numbered list'],
      ['task', 'taskItem', 'Task list'], ['quote', 'quote', 'Quote'], ['code', 'inlineCode', 'Inline code'], ['code-block', 'codeBlock', 'Code block'],
    ]) {
      const control = button(`format-${action}`, tr(`ui.md.${key}`, label), () => session?.format(action), { 'data-md-action': action });
      control.addEventListener('mousedown', event => event.preventDefault());
      formattingButtons.set(action, control);
      formatting.append(control);
    }
    if (markdown) {
      formatting.append(button('insert-link', tr('ui.md.link', 'Link'), () => openLinkPicker(notes ? 'note' : 'web'), { 'data-md-action': 'link', title: 'Ctrl+K' }));
      if (notes) formatting.append(button('insert-note-link', tr('ui.noteLink', 'Link to note'), () => openLinkPicker('note')));
      root.append(formatting);
    }
    const message = node('p', { className: 'de-message', role: 'alert' });
    root.append(message);
    const find = node('div', { className: 'de-find', 'data-editor-find-panel': '' });
    find.hidden = true;
    const query = node('input', { type: 'search', 'data-editor-find-query': '', 'aria-label': tr('ui.findQuery', 'Find in note'), placeholder: tr('ui.findQuery', 'Find in note') });
    const replacement = node('input', { type: 'text', 'data-editor-replace-value': '', 'aria-label': tr('ui.replaceValue', 'Replace with'), placeholder: tr('ui.replaceValue', 'Replace with') });
    const count = node('span', { className: 'de-find-count', 'data-editor-find-count': '', 'aria-live': 'polite' });
    const findButtons = [];
    for (const [action, key, label, handler] of [
      ['previous', 'findPrevious', 'Previous', () => selectMatch(-1)], ['next', 'findNext', 'Next', () => selectMatch(1)],
      ['replace', 'replace', 'Replace', replaceCurrent], ['replace-all', 'replaceAll', 'Replace all', replaceAll],
    ]) findButtons.push(button(`find-${action}`, tr(`ui.${key}`, label), handler, { 'data-editor-find-action': action }));
    find.append(query, count, findButtons[0], findButtons[1], replacement, findButtons[2], findButtons[3],
      button('close-find', tr('ui.closeFind', 'Close'), () => { find.hidden = true; session?.focus(); }, { 'data-editor-find-action': 'close' }));
    query.addEventListener('input', updateFind);
    query.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); selectMatch(event.shiftKey ? -1 : 1); } });
    root.append(find);
    const workspace = node('div', { className: 'de-workspace' });
    const content = node('div', { className: 'de-content', 'data-mode': mode });
    const outline = node('aside', { className: 'de-side', 'data-editor-outline': '', 'aria-label': tr('ui.outline', 'Outline') });
    const links = node('aside', { className: 'de-side', 'data-note-links-panel': '', 'aria-label': tr('ui.links', 'Links') });
    workspace.append(content, outline, links);
    root.append(workspace);
    updateSides();

    // Per-file drafts use the public plugin storage namespace. Keep the path in
    // the record too, so a hash collision can never restore another note.
    let hash = 2166136261;
    for (const char of path) hash = Math.imul(hash ^ char.codePointAt(0), 16777619) >>> 0;
    const draftKey = `draft-${hash.toString(16)}`;
    function persistDraft() {
      clearTimeout(draftTimer);
      if (!session || !api.storage?.data || unresolvedDraft || !draftWritable) return;
      const record = dirty() ? { path, base: disk, content: file.serialize(session.text) } : {};
      draftWrites = draftWrites.catch(() => {}).then(() => api.storage.data.write(draftKey, record)).catch(error => {
        console.warn('[default-editor] draft write failed', error);
        if (!disposed) message.textContent = tr('ui.draftError', 'Could not preserve the draft. Keep this note open and save it.');
      });
    }
    function onChange(update) {
      if (!session || disposed) return;
      if (update.docChanged) {
        state = '';
        clearTimeout(renderTimer);
        renderTimer = setTimeout(() => { renderPreview(); renderOutline(); renderLinks(); }, 90);
        clearTimeout(draftTimer);
        draftTimer = setTimeout(persistDraft, 150);
        if (mode === 'preview') {
          clearTimeout(autoSaveTimer);
          autoSaveTimer = setTimeout(() => save(), 250);
        }
        updateFind();
      }
      updateStatus();
    }
    function updateStatus() {
      undoButton.disabled = !session?.canUndo;
      redoButton.disabled = !session?.canRedo;
      saveButton.disabled = !dirty() || !!saving;
      status.textContent = state === 'saving' ? tr('ui.saving', 'Saving…') : state === 'error' ? tr('ui.saveError', 'Error saving') : dirty() ? tr('ui.modified', 'Modified') : state === 'saved' ? tr('ui.saved', 'Saved') : '';
      status.className = `de-status ${state}`;
      for (const [action, control] of formattingButtons) {
        control.disabled = !session;
        control.setAttribute('aria-pressed', String(!!session?.active(action)));
      }
    }
    async function save() {
      if (!session || !dirty()) return true;
      if (unresolvedDraft) return false;
      if (saving) { const ok = await saving; return ok && dirty() ? save() : ok; }
      const value = session.text;
      const bytes = file.serialize(value);
      state = 'saving';
      saving = (async () => {
        try {
          const latest = await api.files.readText(path);
          if (latest !== disk) {
            message.textContent = tr('ui.externalChange', 'The file changed outside the editor. Your draft is preserved. Reload to review the file before saving.');
            state = 'error';
            persistDraft();
            return false;
          }
          await api.files.writeText(path, bytes, { createIfMissing: false, overwrite: true });
          disk = bytes;
          saved = value;
          state = dirty() ? '' : 'saved';
          message.textContent = '';
          persistDraft();
          return true;
        } catch (error) {
          console.error('[default-editor] save failed', error);
          state = 'error';
          message.textContent = tr('ui.saveRetry', 'Could not save. Your changes are still here. Try Save again.');
          persistDraft();
          return false;
        } finally {
          saving = null;
          if (!disposed) updateStatus();
        }
      })();
      updateStatus();
      return saving;
    }
    async function load(discard = false) {
      if (discard && dirty() && !window.confirm(tr('ui.discardConfirm', 'Discard unsaved changes and reload from disk?'))) return;
      try {
        const bytes = await api.files.readText(path);
        if (disposed) return;
        let draft = null;
        if (!discard && api.storage?.data) draft = await api.storage.data.read(draftKey).catch(() => null);
        if (disposed) return;
        session?.unmount();
        file = noteFile(bytes, notes);
        disk = bytes;
        saved = file.text;
        session = createDocument({ text: file.text, isMarkdown: markdown, onChange, completeNotes: notes ? completeNotes : null, onShortcut: shortcut });
        session.setWrap(wrap);
        state = '';
        unresolvedDraft = false;
        draftWritable = !draft?.path || draft.path === path;
        message.textContent = '';
        if (draft?.path === path && typeof draft.content === 'string') {
          if (draft.base === bytes) {
            session.change({ from: 0, to: session.text.length, insert: noteFile(draft.content, notes).text });
            message.textContent = tr('ui.draftRestored', 'Your unsaved draft was restored.');
          } else {
            unresolvedDraft = true;
            message.textContent = tr('ui.draftConflict', 'A draft and an externally changed file are available.');
            const restore = button('restore-draft', tr('ui.restoreDraft', 'Restore draft'), () => {
              unresolvedDraft = false;
              session.change({ from: 0, to: session.text.length, insert: noteFile(draft.content, notes).text });
              message.replaceChildren(tr('ui.draftRestored', 'Your unsaved draft was restored.'));
            });
            const keep = button('discard-draft', tr('ui.keepFile', 'Keep file version'), () => {
              unresolvedDraft = false; persistDraft(); message.replaceChildren();
            });
            message.append(' ', restore, ' ', keep);
          }
        }
        rebuild();
        if (discard) persistDraft();
      } catch (error) {
        console.error('[default-editor] load failed', error);
        message.textContent = tr('ui.loadFailed', 'Could not load the file. Please try again.');
      }
    }
    function rebuild() {
      if (preview) previewScroll = preview.scrollTop;
      session?.unmount();
      content.replaceChildren();
      preview = null;
      content.dataset.mode = mode;
      formatting.hidden = mode === 'preview';
      wrapButton.hidden = mode === 'preview';
      for (const [value, control] of modeButtons) control.setAttribute('aria-pressed', String(mode === value));
      if (session && mode !== 'preview') session.mount(nodePane('de-editor-pane'));
      if (mode !== 'edit') {
        preview = node('div', { className: 'de-preview', 'data-preview': '', tabindex: '0' });
        nodePane('de-preview-pane').append(preview);
        renderPreview();
        preview.scrollTop = previewScroll;
        preview.addEventListener('click', previewClick);
        preview.addEventListener('change', toggleTask);
        preview.addEventListener('wheel', () => { readingMoved = true; }, { passive: true });
        preview.addEventListener('keydown', event => {
          if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) readingMoved = true;
        });
        preview.addEventListener('scroll', () => {
          const top = preview.getBoundingClientRect().top;
          const block = [...preview.querySelectorAll('[data-source-from]')].find(el => el.getBoundingClientRect().bottom > top + 12);
          if (block) previewAnchor = Number(block.dataset.sourceFrom);
        });
      }
      renderOutline();
      renderLinks();
      updateStatus();
    }
    function nodePane(className) {
      const pane = node('div', { className: `de-pane ${className}` });
      content.append(pane);
      return pane;
    }
    function setMode(next) {
      if (!session || next === mode) return;
      const previous = mode;
      mode = next;
      if (previous === 'preview' && readingMoved && previewAnchor !== null && next !== 'preview') session.select(Math.min(previewAnchor, session.text.length));
      readingMoved = false;
      rebuild();
      if (next !== 'preview') session.focus();
    }
    function renderPreview() {
      if (!session || !markdown) return;
      rendered = parseMarkdown(session.text, { notes, secrets, copyLabel: tr('ui.copyCode', 'Copy code') });
      if (!preview) return;
      const scroll = preview.scrollTop;
      const focusedTask = document.activeElement?.dataset?.taskOffset;
      const prose = node('article', { className: 'de-prose' });
      prose.innerHTML = rendered.html;
      highlightCode(prose);
      preview.replaceChildren(prose);
      if (focusedTask) preview.querySelector(`[data-task-offset="${focusedTask}"]`)?.focus({ preventScroll: true });
      preview.scrollTop = scroll;
    }
    async function toggleTask(event) {
      const checkbox = event.target.closest('[data-task-offset]');
      if (!checkbox || !session) return;
      const offset = Number(checkbox.dataset.taskOffset);
      const fresh = parseMarkdown(session.text).tasks.find(task => task.offset === offset);
      if (!fresh) { renderPreview(); return; }
      session.change({ from: offset, to: offset + 1, insert: checkbox.checked ? 'x' : ' ' }, undefined, 'input.task');
      renderPreview();
      // WebKit does not always focus checkboxes on mouse activation. Keep the
      // keyboard inside this document after replacing the rendered task node.
      preview?.querySelector(`[data-task-offset="${offset}"]`)?.focus({ preventScroll: true });
      await save();
    }
    async function previewClick(event) {
      const copy = event.target.closest('[data-code-copy]');
      if (copy) {
        try {
          await navigator.clipboard.writeText(rendered.codeBlocks[Number(copy.dataset.codeCopy)]);
          copy.textContent = tr('ui.copied', 'Copied');
        } catch (_) { message.textContent = tr('ui.copyFailed', 'Could not copy. Select the code and copy it with Ctrl+C.'); }
        return;
      }
      const internal = event.target.closest('[data-note-link]');
      if (internal) { event.preventDefault(); await openTitle(internal.dataset.noteLink); return; }
      const secret = event.target.closest('[data-secret-id]');
      if (secret) {
        event.preventDefault();
        if (dirty() && !await save()) return;
        try { await api.workbench.openResource({ kind: 'secret', path: decodeURIComponent(secret.dataset.secretId), mode: 'view', context: { sourcePluginId: 'verstak.default-editor', sourceView: 'editor' } }); }
        catch (_) { message.textContent = tr('ui.linksOpenFailed', 'Could not open the note.'); }
      }
    }
    function updateSides() {
      outline.hidden = !outlineVisible;
      links.hidden = !linksVisible;
      outlineButton.setAttribute('aria-pressed', String(outlineVisible));
      linksButton.setAttribute('aria-pressed', String(linksVisible));
      renderOutline(); renderLinks();
    }
    function renderOutline() {
      if (!outlineVisible || !session) return;
      const headings = parseMarkdown(session.text).headings;
      outline.replaceChildren(node('h2', {}, [tr('ui.outline', 'Outline')]));
      if (!headings.length) outline.append(node('p', { className: 'de-empty' }, [tr('ui.outlineEmpty', 'No headings yet. Start a line with # to create one.')]));
      for (const heading of headings) {
        const control = button('heading', heading.title, () => {
          if (mode !== 'preview') { session.select(heading.from); session.focus(); }
          preview?.querySelector(`[data-heading-slug="${CSS.escape(heading.slug)}"]`)?.scrollIntoView({ block: 'start' });
          previewAnchor = heading.from;
        }, { 'data-outline-slug': heading.slug, 'data-level': heading.level });
        control.style.paddingLeft = `${8 + (heading.level - 1) * 10}px`;
        outline.append(control);
      }
    }
    async function getCatalog(force = false) {
      if (force) { catalog = null; catalogPromise = null; }
      if (!catalogPromise) catalogPromise = readCatalog(api, folder).then(result => { catalog = result; return result; }).catch(error => { catalogPromise = null; throw error; });
      return catalogPromise;
    }
    async function refreshCatalog() {
      links.replaceChildren(tr('ui.linksLoading', 'Checking notes…'));
      try { await getCatalog(true); if (!disposed) renderLinks(); }
      catch (_) { if (!disposed) links.replaceChildren(tr('ui.linksListFailed', 'Could not list notes in this Deal.')); }
    }
    function renderLinks() {
      if (!linksVisible || !session) return;
      links.replaceChildren(node('h2', {}, [tr('ui.links', 'Links')]), button('refresh-links', tr('ui.linksRefresh', 'Refresh'), refreshCatalog));
      if (!catalog) { links.append(tr('ui.linksLoading', 'Checking notes…')); return; }
      if (catalog.failures) links.append(node('p', { role: 'alert' }, [tr('ui.linksScanFailed', 'Some notes could not be checked. Refresh to try again.')]));
      links.append(node('h3', {}, [tr('ui.linksOutgoing', 'Links from this note')]));
      const outgoing = [...new Set(parseMarkdown(session.text).links)];
      if (!outgoing.length) links.append(node('p', { className: 'de-empty' }, [tr('ui.linksNoOutgoing', 'No links yet. Use Link to note or type [[.')]));
      for (const title of outgoing) {
        const found = matchesTitle(catalog.notes, title);
        const control = button('open-outgoing', title, () => openTitle(title), { 'data-note-outgoing': found.length === 1 ? found[0].path : '' });
        if (found.length !== 1) control.append(node('small', {}, [tr(found.length ? 'ui.linksAmbiguous' : 'ui.linksMissing', found.length ? 'Ambiguous title' : 'Not found')]));
        links.append(control);
      }
      links.append(node('h3', {}, [tr('ui.linksIncoming', 'Linked from')]));
      let incoming = 0;
      for (const source of catalog.notes) {
        if (source.path === path) continue;
        const snippet = backlinkSnippet(source, path, catalog.notes);
        if (!snippet) continue;
        const control = button('open-backlink', source.title, () => openNote(source), { 'data-note-backlink': source.path });
        control.append(node('small', {}, [snippet]));
        links.append(control); incoming++;
      }
      if (!incoming && !catalog.failures) links.append(node('p', { className: 'de-empty' }, [tr('ui.linksNoIncoming', 'No other notes link here.')]));
    }
    async function openNote(note) {
      if (dirty() && !await save()) return;
      try {
        await api.workbench.openResource({ kind: 'vault-file', path: note.path, extension: /\.markdown$/i.test(note.path) ? '.markdown' : '.md', mode: 'view',
          context: { sourcePluginId: 'verstak.default-editor', sourceView: 'editor', notesMode: true, isInsideNotesFolder: true, notesScopePath: folder.replace(/\/?Notes$/, '') } });
      } catch (_) { message.textContent = tr('ui.linksOpenFailed', 'Could not open the note.'); }
    }
    async function openTitle(title) {
      try {
        const result = await getCatalog(true);
        const found = matchesTitle(result.notes, title);
        if (found.length !== 1 || result.failures) { message.textContent = tr('ui.linksTargetUnavailable', 'The linked note was not found or its title is ambiguous.'); return; }
        await openNote(found[0]);
      } catch (_) { message.textContent = tr('ui.linksOpenFailed', 'Could not open the note.'); }
    }
    async function completeNotes(context) {
      const match = context.matchBefore(/\[\[[^\]\n]*/);
      if (!match) return null;
      try {
        const result = await getCatalog();
        return { from: match.from + 2, options: result.notes.filter(note => note.path !== path).map(note => ({
          label: note.title, detail: note.path, type: 'text',
          apply(view, completion, from, to) {
            const closing = view.state.sliceDoc(to, to + 2) === ']]' ? 2 : 0;
            session.change({ from, to: to + closing, insert: completion.label + ']]' }, { anchor: from + completion.label.length + 2 });
          },
        })), validFor: /^[^\]\n]*$/ };
      } catch (_) { return null; }
    }
    function closeDialog() { dialog?.remove(); dialog = null; session?.focus(); }
    async function openLinkPicker(kind) {
      if (!session) return;
      if (mode === 'preview') setMode('edit');
      closeDialog();
      const range = { from: session.selection.from, to: session.selection.to };
      dialog = node('div', { className: 'de-dialog-backdrop' });
      const panel = node('section', { className: 'de-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('ui.insertLink', 'Insert link') });
      const type = node('select', { 'aria-label': tr('ui.linkType', 'Link type') });
      if (notes) type.append(node('option', { value: 'note' }, [tr('ui.noteLink', 'Link to note')]));
      type.append(node('option', { value: 'web' }, [tr('ui.webLink', 'Web link')]));
      type.value = kind;
      const input = node('input', { type: 'text', 'data-link-query': '', 'aria-label': tr('ui.linkTarget', 'Note title or web address') });
      const resultList = node('div', { className: 'de-picker-results' });
      const error = node('p', { role: 'alert' });
      const insert = value => {
        session.select(range.from, range.to);
        session.replaceSelection(value);
        closeDialog();
      };
      let results;
      async function chooseNote(note) {
        const found = matchesTitle(results.notes, note.title);
        if (found.length !== 1 || results.failures) { error.textContent = tr('ui.linksTargetUnavailable', 'The linked note was not found or its title is ambiguous.'); return; }
        insert(`[[${note.title}]]`);
      }
      async function renderResults() {
        resultList.replaceChildren(); error.textContent = '';
        if (type.value === 'web') return;
        try {
          results = await getCatalog();
          if (!dialog?.contains(panel)) return;
          const query = titleKey(input.value);
          const found = results.notes.filter(note => [note.title, ...note.aliases].some(title => titleKey(title).includes(query))).slice(0, 30);
          for (const note of found) {
            const control = button('choose-note', note.title, () => chooseNote(note));
            control.append(node('small', {}, [note.path])); resultList.append(control);
          }
          if (!found.length) resultList.append(tr('ui.linkNoMatches', 'No matching note in this Deal'));
          const canCreate = await api.capabilities?.has?.('verstak/notes/v1');
          if (!dialog?.contains(panel)) return;
          if (input.value.trim() && !matchesTitle(results.notes, input.value.trim()).length && !results.failures && canCreate) {
            resultList.append(button('create-linked-note', tr('ui.createLinkedNote', 'Create this note and insert link'), async () => {
              try {
                const title = input.value.trim();
                const created = await api.capabilities.invoke('verstak/notes/v1', 'create', { title, workspaceRootPath: folder.replace(/\/?Notes$/, '') });
                if (created.conflict) throw new Error('conflict');
                await getCatalog(true);
                insert(`[[${created.filename ? created.filename.replace(/\.(md|markdown)$/i, '').replace(/_/g, ' ') : title}]]`);
              } catch (_) { error.textContent = tr('ui.createLinkFailed', 'Could not create the note. Check the title and try again.'); }
            }));
          }
        } catch (_) { error.textContent = tr('ui.linksListFailed', 'Could not list notes in this Deal.'); }
      }
      const confirm = button('confirm-link', tr('ui.insertLink', 'Insert link'), () => {
        if (type.value === 'note') {
          const found = results ? matchesTitle(results.notes, input.value) : [];
          if (found.length === 1) chooseNote(found[0]);
          else error.textContent = tr('ui.chooseNote', 'Choose a note from the list.');
        } else {
          const url = input.value.trim();
          if (!/^(https?:\/\/|mailto:)/i.test(url) || /[\s<>]/.test(url)) { error.textContent = tr('ui.invalidURL', 'Enter an http, https or mailto address.'); return; }
          const label = session.text.slice(range.from, range.to) || url;
          insert(`[${label.replace(/[\[\]]/g, '\\$&')}](${url.replace(/\(/g, '%28').replace(/\)/g, '%29')})`);
        }
      });
      input.addEventListener('input', renderResults);
      input.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown' && resultList.querySelector('button')) { event.preventDefault(); resultList.querySelector('button').focus(); }
      });
      resultList.addEventListener('keydown', event => {
        if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
        const controls = [...resultList.querySelectorAll('button')];
        const index = controls.indexOf(document.activeElement);
        event.preventDefault();
        if (index === 0 && event.key === 'ArrowUp') input.focus();
        else controls[Math.max(0, Math.min(controls.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))]?.focus();
      });
      type.addEventListener('change', renderResults);
      panel.append(node('h2', {}, [tr('ui.insertLink', 'Insert link')]), type, node('label', {}, [tr('ui.linkTarget', 'Note title or web address'), input]), resultList, error,
        node('div', { className: 'de-dialog-actions' }, [button('cancel-link', tr('ui.closeFind', 'Close'), closeDialog), confirm]));
      dialog.append(panel); root.append(dialog);
      dialog.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); closeDialog(); }
        if (event.key === 'Enter' && event.target === input) { event.preventDefault(); confirm.click(); }
        if (event.key === 'Tab') {
          const controls = [...panel.querySelectorAll('button,input,select')].filter(e => !e.disabled);
          if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
          else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
        }
      });
      input.focus(); renderResults();
    }
    function matches() {
      if (!query.value || !session) return [];
      const escaped = query.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return [...session.text.matchAll(new RegExp(escaped, 'gi'))].map(match => ({ from: match.index, to: match.index + match[0].length }));
    }
    function updateFind() {
      const found = matches();
      count.textContent = query.value ? tr('ui.findCount', `${found.length} matches`, { count: found.length }) : '';
      for (const control of findButtons) control.disabled = !found.length;
    }
    function openFind() { find.hidden = false; query.focus(); updateFind(); }
    function selectMatch(direction) {
      const found = matches(); if (!found.length) return;
      if (mode === 'preview') setMode('edit');
      const selected = direction < 0 ? found.filter(m => m.from < session.selection.from).at(-1) || found.at(-1) : found.find(m => m.from >= session.selection.to) || found[0];
      session.select(selected.from, selected.to); session.focus();
    }
    function replaceCurrent() {
      if (!session || !query.value) return;
      const { from, to } = session.selection;
      if (!matches().some(m => m.from === from && m.to === to)) { selectMatch(1); return; }
      session.replaceSelection(replacement.value); selectMatch(1);
    }
    function replaceAll() {
      const found = matches(); if (!found.length) return;
      session.change(found.map(match => ({ ...match, insert: replacement.value })));
    }
    function shortcut(event) {
      const target = event.target;
      if (dialog || target?.closest('input:not([type=checkbox]),select') || target?.closest('[contenteditable]') && !target.closest('.cm-editor')) return false;
      const match = (code, shift = false) => api.keys?.matches ? api.keys.matches(event, { code, ctrlOrMeta: true, shift }) : event.code === code && (event.ctrlKey || event.metaKey) && event.shiftKey === shift && !event.altKey;
      let handled = true;
      if (match('KeyZ', true)) session?.redo();
      else if (match('KeyZ')) session?.undo();
      else if (match('KeyY')) session?.redo();
      else if (match('KeyS')) save();
      else if (match('KeyF') || match('KeyH')) { openFind(); if (event.code === 'KeyH') replacement.focus(); }
      else if (markdown && match('KeyK')) openLinkPicker(notes ? 'note' : 'web');
      else if (markdown && (match('KeyB') || match('KeyI')) && mode !== 'preview') session?.format(event.code === 'KeyB' ? 'bold' : 'italic');
      else handled = false;
      if (handled) { event.preventDefault(); event.stopPropagation(); }
      return handled;
    }
    root.addEventListener('keydown', shortcut);
    const beforeUnload = event => { if (dirty()) { persistDraft(); event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    api.settings?.read('wrapLongLines').then(value => { if (!disposed && value === false) { wrap = false; session?.setWrap(false); wrapButton.setAttribute('aria-pressed', 'false'); } }).catch(() => {});
    api.settings?.read('outlineVisible').then(value => { if (!disposed && value === true) { outlineVisible = true; updateSides(); } }).catch(() => {});
    api.contributions?.list('openProviders').then(providers => {
      secrets = (providers || []).some(provider => (provider.supports || []).some(support => support.kind === 'secret'));
      if (!disposed) renderPreview();
    }).catch(() => {});
    const unsubscribe = api.events?.subscribe?.('file.changed', () => {
      catalogPromise = null; catalog = null;
      if (linksVisible) refreshCatalog();
    });
    const localeUnsubscribe = api.i18n?.onDidChangeLocale?.(() => {
      const actions = {
        'mode-edit': ['edit', 'Edit'], 'mode-preview': ['preview', 'Read'], 'mode-split': ['split', 'Side by side'],
        undo: ['undo', 'Undo'], redo: ['redo', 'Redo'], save: ['save', 'Save'], reload: ['reload', 'Reload'],
        'toggle-outline': ['outline', 'Outline'], 'toggle-links': ['links', 'Links'], 'toggle-width': ['wide', 'Wide page'],
        'toggle-wrap': ['wrapLongLines', 'Wrap long lines'], find: ['find', 'Find / replace'],
        'insert-link': ['md.link', 'Link'], 'insert-note-link': ['noteLink', 'Link to note'],
        'find-previous': ['findPrevious', 'Previous'], 'find-next': ['findNext', 'Next'],
        'find-replace': ['replace', 'Replace'], 'find-replace-all': ['replaceAll', 'Replace all'], 'close-find': ['closeFind', 'Close'],
      };
      for (const [action, [key, fallback]] of Object.entries(actions)) {
        const control = root.querySelector(`[data-editor-action="${action}"]`);
        if (control) control.textContent = tr(`ui.${key}`, fallback);
      }
      const formatKeys = { heading: 'heading', bold: 'bold', italic: 'italic', bullet: 'bulletList', numbered: 'numberedList', task: 'taskItem', quote: 'quote', code: 'inlineCode', 'code-block': 'codeBlock' };
      for (const [action, control] of formattingButtons) control.textContent = tr(`ui.md.${formatKeys[action]}`, control.textContent);
      for (const [control, key] of [[query, 'findQuery'], [replacement, 'replaceValue']]) {
        const label = tr(`ui.${key}`, control.placeholder);
        control.placeholder = label; control.setAttribute('aria-label', label);
      }
      updateStatus(); updateFind(); renderPreview(); renderOutline(); renderLinks();
    });
    load();
    root.__deCleanup = () => {
      persistDraft(); disposed = true;
      clearTimeout(renderTimer); clearTimeout(draftTimer); clearTimeout(autoSaveTimer);
      session?.unmount();
      window.removeEventListener('beforeunload', beforeUnload);
      root.removeEventListener('keydown', shortcut);
      if (typeof unsubscribe === 'function') unsubscribe();
      if (typeof localeUnsubscribe === 'function') localeUnsubscribe();
    };
  },
  unmount(root) { root.__deCleanup?.(); root.replaceChildren(); },
};
