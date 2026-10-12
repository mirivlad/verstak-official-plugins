import { createDocument } from './document.js';
import { noteFile, parseMarkdown, readAliases, titleKey } from './markdown.js';
import { notesFolder, readCatalog, matchesTitle, backlinkSnippet } from './catalog.js';
import { highlightCode } from './highlight.js';
import styles from './style.css?inline';

const ICONS = {
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  preview: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  split: '<rect x="3" y="4" width="8" height="16" rx="1"/><rect x="13" y="4" width="8" height="16" rx="1"/>',
  undo: '<path d="M9 7 4 12l5 5"/><path d="M20 17a8 8 0 0 0-8-8H4"/>',
  redo: '<path d="m15 7 5 5-5 5"/><path d="M4 17a8 8 0 0 1 8-8h8"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
  outline: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  wide: '<path d="M8 7 3 12l5 5M16 7l5 5-5 5M3 12h18"/>',
  links: '<path d="M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15"/><path d="M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.15-1.15"/>',
  wrap: '<path d="M4 6h12a4 4 0 0 1 0 8H9"/><path d="m12 11-3 3 3 3"/><path d="M4 18h3"/>',
  find: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  reload: '<path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M18.5 9A7 7 0 0 0 6 6.5L4 11M5.5 15A7 7 0 0 0 18 17.5l2-4.5"/>',
  heading: '<path d="M6 4v16M18 4v16M6 12h12"/>',
  bold: '<path d="M7 5h6a4 4 0 0 1 0 8H7Z"/><path d="M7 13h7a3.5 3.5 0 0 1 0 7H7Z"/>',
  italic: '<path d="M10 4h8M6 20h8M14 4 10 20"/>',
  bullet: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  numbered: '<path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 4h1v4M4 8h2M4 11.5c.5-.5 2-.5 2 .7 0 1.3-2 1.3-2 2.8h2M4 17h1.5a1 1 0 0 1 0 2H4m1.5 0a1 1 0 0 1 0 2H4"/>',
  task: '<rect x="3" y="4" width="5" height="5" rx="1"/><path d="m4 6 1 1 2-2M11 6h10"/><rect x="3" y="15" width="5" height="5" rx="1"/><path d="M11 17h10"/>',
  quote: '<path d="M7 17H4a2 2 0 0 1-2-2v-3a5 5 0 0 1 5-5v3a2 2 0 0 0-2 2h2ZM18 17h-3a2 2 0 0 1-2-2v-3a5 5 0 0 1 5-5v3a2 2 0 0 0-2 2h2Z"/>',
  code: '<path d="m8 9-4 3 4 3M16 9l4 3-4 3"/>',
  'code-block': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m9 9-3 3 3 3M15 9l3 3-3 3"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15"/><path d="M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.15-1.15"/>',
  'note-link': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"/><path d="M14 2v6h6M10 13H8M10 17H8"/><path d="M16 16h2a3 3 0 0 1 0 6h-2M18 19h-4"/>',
  attachment: '<path d="m20.8 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8L15.2 6"/>',
  rename: '<path d="M12 20h9"/><path d="m15 5 4 4M5 19l4-.8L20 7.2 16.8 4 5.8 15Z"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M7 16h10"/>',
};

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'de-icon');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML = ICONS[name] || ICONS.edit;
  return svg;
}

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
    let path = request.path || '';
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
    function iconButton(action, label, iconName, handler, attributes = {}) {
      const title = attributes.title || label;
      return node('button', {
        type: 'button',
        className: 'de-icon-button',
        'data-editor-action': action,
        title,
        'aria-label': attributes['aria-label'] || label,
        onClick: handler,
        ...attributes,
      }, [icon(iconName)]);
    }
    const toolbar = node('div', { className: 'de-toolbar' });
    const pathLabel = node('span', { className: 'de-toolbar-context', title: path }, [path]);
    toolbar.append(pathLabel);
    const toolbarActions = node('div', { className: 'de-toolbar-actions', role: 'toolbar', 'aria-label': tr('ui.editorActions', 'Editor actions') });
    const modeButtons = new Map();
    if (markdown) for (const [value, key, label, iconName] of [
      ['edit', 'ui.edit', 'Edit', 'edit'], ['preview', 'ui.preview', 'Read', 'preview'], ['split', 'ui.split', 'Side by side', 'split'],
    ]) {
      const translated = tr(key, label);
      const shortcut = value === 'split' ? 'Ctrl+Shift+E' : 'Ctrl+E';
      const control = iconButton(`mode-${value}`, translated, iconName, () => setMode(value), {
        'data-editor-mode-button': value, title: `${translated} — ${shortcut}`,
      });
      modeButtons.set(value, control);
      toolbarActions.append(control);
    }
    const undoButton = iconButton('undo', tr('ui.undo', 'Undo'), 'undo', () => session?.undo(), { title: tr('ui.undoHint', 'Undo — Ctrl+Z') });
    const redoButton = iconButton('redo', tr('ui.redo', 'Redo'), 'redo', () => session?.redo(), { title: tr('ui.redoHint', 'Redo — Ctrl+Y / Ctrl+Shift+Z') });
    const renameButton = iconButton('rename', tr('ui.rename', 'Rename note'), 'rename', () => openRenameDialog(), { title: `${tr('ui.rename', 'Rename note')} — F2` });
    const saveLabel = tr('ui.save', 'Save');
    const saveButton = iconButton('save', saveLabel, 'save', () => save(), { title: `${saveLabel} — Ctrl+S` });
    const status = node('span', { className: 'de-status', 'data-save-state': '', 'aria-live': 'polite' });
    const outlineButton = iconButton('toggle-outline', tr('ui.outline', 'Outline'), 'outline', () => {
      outlineVisible = !outlineVisible;
      api.settings?.write('outlineVisible', outlineVisible).catch(() => {});
      updateSides();
    });
    const linksButton = iconButton('toggle-links', tr('ui.links', 'Links'), 'links', () => {
      linksVisible = !linksVisible;
      updateSides();
      if (linksVisible) refreshCatalog();
    });
    const wrapButton = iconButton('toggle-wrap', tr('ui.wrapLongLines', 'Wrap long lines'), 'wrap', () => {
      wrap = !wrap;
      session?.setWrap(wrap);
      wrapButton.setAttribute('aria-pressed', String(wrap));
      api.settings?.write('wrapLongLines', wrap).catch(() => {});
    }, { 'aria-pressed': 'true' });
    const wideButton = iconButton('toggle-width', tr('ui.wide', 'Wide page'), 'wide', () => {
      const wide = root.classList.toggle('de-wide');
      wideButton.setAttribute('aria-pressed', String(wide));
    }, { 'aria-pressed': 'false' });
    toolbarActions.append(undoButton, redoButton);
    if (markdown) toolbarActions.append(outlineButton, wideButton);
    if (notes) toolbarActions.append(linksButton);
    const findLabel = tr('ui.find', 'Find / replace');
    toolbarActions.append(wrapButton, iconButton('find', findLabel, 'find', openFind, { title: `${findLabel} — Ctrl+F` }),
      iconButton('reload', tr('ui.reload', 'Reload'), 'reload', () => load(true)));
    if (notes) toolbarActions.append(renameButton);
    toolbarActions.append(saveButton);
    toolbarActions.append(iconButton('shortcuts', tr('ui.shortcuts', 'Keyboard shortcuts'), 'keyboard', () => openShortcutHelp()));
    toolbarActions.append(status);
    toolbar.append(toolbarActions);
    root.append(toolbar);

    const formatting = node('div', { className: 'de-md-toolbar', role: 'toolbar', 'aria-label': tr('ui.formatting', 'Text formatting') });
    const formattingButtons = new Map();
    if (markdown) for (const [action, key, label] of [
      ['heading', 'heading', 'Heading'], ['bold', 'bold', 'Bold'], ['italic', 'italic', 'Italic'],
      ['bullet', 'bulletList', 'Bullet list'], ['numbered', 'numberedList', 'Numbered list'],
      ['task', 'taskItem', 'Task list'], ['quote', 'quote', 'Quote'], ['code', 'inlineCode', 'Inline code'], ['code-block', 'codeBlock', 'Code block'],
    ]) {
      const translated = tr(`ui.md.${key}`, label);
      const shortcut = action === 'bold' ? 'Ctrl+B' : action === 'italic' ? 'Ctrl+I'
        : action === 'numbered' ? 'Ctrl+Shift+7' : action === 'bullet' ? 'Ctrl+Shift+8'
        : action === 'task' ? 'Ctrl+Shift+9' : '';
      const control = iconButton(`format-${action}`, translated, action, () => session?.format(action), {
        'data-md-action': action,
        title: shortcut ? `${translated} — ${shortcut}` : translated,
      });
      control.addEventListener('mousedown', event => event.preventDefault());
      formattingButtons.set(action, control);
      formatting.append(control);
    }
    if (markdown) {
      const linkLabel = tr('ui.md.link', 'Link');
      formatting.append(iconButton('insert-link', linkLabel, 'link', () => openLinkPicker(notes ? 'note' : 'web'), {
        'data-md-action': 'link',
        title: `${linkLabel} — Ctrl+K`,
      }));
      if (notes) formatting.append(iconButton('insert-note-link', tr('ui.noteLink', 'Link to note'), 'note-link', () => openLinkPicker('note')));
      const attachmentInput = node('input', { type: 'file', multiple: '', hidden: '', 'data-attachment-input': '', 'aria-label': tr('ui.attachFile', 'Attach file') });
      attachmentInput.addEventListener('change', () => {
        if (session && attachmentInput.files?.length) {
          const { from, to } = session.selection;
          queueAttachments(attachmentInput.files, from, to);
        }
        attachmentInput.value = '';
      });
      formatting.append(iconButton('attach-file', tr('ui.attachFile', 'Attach file'), 'attachment', () => attachmentInput.click()));
      root.append(formatting, attachmentInput);
    }
    const selectionActions = node('div', {
      className: 'de-selection-actions', role: 'toolbar',
      'aria-label': tr('ui.selectionActions', 'Selected text actions'),
    });
    selectionActions.hidden = true;
    for (const [action, key, fallback, iconName] of [
      ['bold', 'md.bold', 'Bold', 'bold'], ['italic', 'md.italic', 'Italic', 'italic'],
      ['link', 'md.link', 'Link', 'link'],
    ]) {
      const actionButton = iconButton('selection-' + action, tr('ui.' + key, fallback), iconName, () => {
        if (action === 'link') openLinkPicker(notes ? 'note' : 'web');
        else session?.format(action);
      });
      actionButton.addEventListener('mousedown', event => event.preventDefault());
      selectionActions.append(actionButton);
    }
    root.append(selectionActions);
    function updateSelectionActions() {
      if (!markdown || mode === 'preview' || dialog || !session?.view ||
          session.selection.from === session.selection.to) {
        selectionActions.hidden = true;
        return;
      }
      const rect = session.view.coordsAtPos(session.selection.from);
      if (!rect) { selectionActions.hidden = true; return; }
      const bounds = root.getBoundingClientRect();
      const left = Math.max(6, Math.min(bounds.width - 120, rect.left - bounds.left));
      const top = rect.top - bounds.top > 50 ? rect.top - bounds.top - 43 : rect.bottom - bounds.top + 6;
      selectionActions.style.left = Math.round(left) + 'px';
      selectionActions.style.top = Math.round(top) + 'px';
      selectionActions.hidden = false;
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

    const attachmentFolder = path.slice(0, path.lastIndexOf('/') + 1) + 'attachments';
    let attachmentQueue = Promise.resolve();
    function encodeBytes(bytes) {
      let result = '';
      for (let offset = 0; offset < bytes.length; offset += 8192) {
        result += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      }
      return btoa(result);
    }
    function safeAttachmentName(name) {
      const cleaned = (name || 'image.png').normalize('NFC').replaceAll('/', '_').replaceAll(String.fromCharCode(92), '_').replace(/[<>:"|?*]/g, '_').split('').filter(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127).join('').replace(/\.\.+/g, '.').replace(/^\.+/, '').trim();
      return (cleaned || 'attachment').slice(0, 120);
    }
    async function importAttachments(files, from, to, initialText) {
      if (!markdown || !session || !api.files?.writeBytes || !api.files?.createFolder) return;
      const imports = Array.from(files || []).filter(file => file && typeof file.arrayBuffer === 'function');
      if (!imports.length) return;
      const links = [];
      let failed = false;
      try {
        try { await api.files.createFolder(attachmentFolder); }
        catch (error) { if (!/conflict/i.test(String(error))) throw error; }
        for (const file of imports) {
          if (file.size > 8 * 1024 * 1024) throw new Error('too-large');
          const filename = safeAttachmentName(file.name);
          const dot = filename.lastIndexOf('.');
          const stem = dot > 0 ? filename.slice(0, dot) : filename;
          const ext = dot > 0 ? filename.slice(dot) : '';
          const data = encodeBytes(new Uint8Array(await file.arrayBuffer()));
          let selected;
          for (let i = 0; i < 1000; i++) {
            const candidate = i ? stem + '-' + i + ext : filename;
            try {
              await api.files.writeBytes(attachmentFolder + '/' + candidate, data, { createIfMissing: true, overwrite: false });
              selected = candidate;
              break;
            } catch (error) {
              if (!/exist|already|conflict/i.test(String(error))) throw error;
            }
          }
          if (!selected) throw new Error('no-name');
          const image = /\.(png|jpe?g|gif|webp|avif)$/i.test(selected);
          const label = selected.replace(/[\[\]\\]/g, '\\$&');
          const url = 'attachments/' + encodeURIComponent(selected).replace(/%2F/gi, '/');
          links.push((image ? '!' : '') + '[' + label + '](' + url + ')');
        }
      } catch (error) {
        failed = true;
        message.textContent = tr('ui.attachmentFailed', 'Could not attach the file. Check storage permissions and the 8 MiB file-size limit.');
      } finally {
        if (links.length && !disposed && session) {
          if (session.text === initialText) {
            session.change({ from: Math.min(from, session.text.length), to: Math.min(to, session.text.length), insert: links.join('\n') });
          } else {
            session.replaceSelection(links.join('\n'));
          }
          if (!failed) message.textContent = '';
        }
      }
    }
    function queueAttachments(files, from, to) {
      const snapshot = Array.from(files || []);
      const initialText = session?.text;
      attachmentQueue = attachmentQueue.catch(() => {}).then(() => importAttachments(snapshot, from, to, initialText));
    }
    root.addEventListener('dragover', event => {
      if (markdown && Array.from(event.dataTransfer?.types || []).includes('Files')) event.preventDefault();
    }, true);
    root.addEventListener('drop', event => {
      if (!markdown || !event.dataTransfer?.files?.length) return;
      event.preventDefault();
      if (mode === 'preview') setMode('edit');
      let { from, to } = session.selection;
      if (event.target.closest('.cm-editor') && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
        const position = session.view?.posAtCoords({ x: event.clientX, y: event.clientY });
        if (position !== null && position !== undefined) from = to = position;
      }
      queueAttachments(event.dataTransfer.files, from, to);
    }, true);
    root.addEventListener('paste', event => {
      if (!markdown || !event.clipboardData?.files?.length || !event.target.closest('.cm-editor')) return;
      event.preventDefault();
      const { from, to } = session.selection;
      queueAttachments(event.clipboardData.files, from, to);
    }, true);

    // Per-file drafts use the public plugin storage namespace. Keep the path in
    // the record too, so a hash collision can never restore another note.
    let hash = 2166136261;
    for (const char of path) hash = Math.imul(hash ^ char.codePointAt(0), 16777619) >>> 0;
    let draftKey = `draft-${hash.toString(16)}`;
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
      if (update.selectionChanged || update.docChanged) updateSelectionActions();
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
      if (session && mode !== 'preview') {
        const view = session.mount(nodePane('de-editor-pane'));
        view.scrollDOM.addEventListener('scroll', updateSelectionActions, { passive: true });
      }
      updateSelectionActions();
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
      // Resolve private vault images through the permission-checked plugin API.
      // A relative URL must never be resolved against the application's web origin.
      for (const image of prose.querySelectorAll('img[src^="attachments/"]')) {
        const relative = image.getAttribute('src');
        image.removeAttribute('src');
        let name;
        try { name = decodeURIComponent(relative.slice('attachments/'.length)); }
        catch (_) { continue; }
        if (!name || name === '.' || name === '..' || name.includes('/') || name.includes(String.fromCharCode(92))) continue;
        const mime = /\.png$/i.test(name) ? 'image/png'
          : /\.jpe?g$/i.test(name) ? 'image/jpeg'
          : /\.gif$/i.test(name) ? 'image/gif'
          : /\.webp$/i.test(name) ? 'image/webp'
          : /\.avif$/i.test(name) ? 'image/avif' : '';
        if (!mime) continue;
        api.files.readBytes(attachmentFolder + '/' + name).then(result => {
          if (image.isConnected && result?.dataBase64 && result.size <= 8 * 1024 * 1024) {
            image.src = 'data:' + mime + ';base64,' + result.dataBase64;
          }
        }).catch(() => {});
      }
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
      const attachment = event.target.closest('a[href^="attachments/"]');
      if (attachment) {
        event.preventDefault();
        let filename;
        try { filename = decodeURIComponent(attachment.getAttribute('href').slice('attachments/'.length)); }
        catch (_) { return; }
        if (!filename || filename === '.' || filename === '..' || filename.includes('/') || filename.includes(String.fromCharCode(92))) return;
        if (dirty() && !await save()) return;
        try {
          await api.workbench.openResource({ kind: 'vault-file', path: attachmentFolder + '/' + filename,
            extension: filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '', mode: 'view',
            context: { sourcePluginId: 'verstak.default-editor', sourceView: 'editor' } });
        } catch (_) { message.textContent = tr('ui.attachmentOpenFailed', 'Could not open the attachment.'); }
        return;
      }
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
    function normalizeNoteName(value) {
      let title = String(value || '').trim().replace(/\.(?:md|markdown)$/i, '').trim();
      if (!title) return '';
      title = title.replace(/\s+/g, '_').replace(/[\u2012-\u2015\u2212]/g, '-')
        .replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, '');
      let name = '';
      for (const char of title) {
        if (/[A-Za-z0-9._-]/.test(char) || /[\p{L}\p{N}]/u.test(char)) name += char;
        else if (/\S/.test(char)) name += '_';
      }
      return name.replace(/[_.-]+/g, '_').replace(/^[._\-\s]+|[._\-\s]+$/g, '');
    }
    function renameError(errorNode, message) {
      errorNode.textContent = message;
    }
    function openRenameDialog() {
      if (!notes || !session || dialog) return;
      const oldPath = path;
      const oldName = oldPath.slice(oldPath.lastIndexOf('/') + 1);
      const ext = /\.markdown$/i.test(oldName) ? '.markdown' : '.md';
      const currentTitle = oldName.replace(/\.(?:md|markdown)$/i, '').replace(/_/g, ' ');
      dialog = node('div', { className: 'de-dialog-backdrop' });
      const panel = node('section', { className: 'de-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('ui.rename', 'Rename note') });
      const input = node('input', { type: 'text', value: currentTitle, 'data-rename-input': '', 'aria-label': tr('ui.renameTitle', 'New note name') });
      const error = node('p', { role: 'alert', className: 'de-rename-error' });
      const confirm = button('confirm-rename', tr('ui.renameConfirm', 'Rename'), async () => {
        const name = normalizeNoteName(input.value);
        if (!name) { renameError(error, tr('ui.renameInvalid', 'Enter a valid note name.')); input.focus(); return; }
        const newPath = oldPath.slice(0, oldPath.lastIndexOf('/') + 1) + name + ext;
        if (newPath === oldPath) { closeDialog(); return; }
        confirm.disabled = true;
        input.disabled = true;
        try {
          if (saving) await saving;
          if (dirty() && !await save()) {
            renameError(error, tr('ui.renameSaveFailed', 'Save the note before renaming it.'));
            return;
          }
          if (unresolvedDraft) {
            renameError(error, tr('ui.renameSaveFailed', 'Save the note before renaming it.'));
            return;
          }
          // Retain the old title as an alias so incoming [[links]] still resolve.
          const originalTitle = oldName.replace(/\.(?:md|markdown)$/i, '').replace(/_/g, ' ');
          const parsed = readAliases(disk);
          const aliasNeeded = titleKey(originalTitle) !== titleKey(name.replace(/_/g, ' '))
            && !parsed.aliases.some(alias => titleKey(alias) === titleKey(originalTitle));
          const aliases = aliasNeeded ? [...parsed.aliases, originalTitle] : parsed.aliases;
          const newline = disk.includes('\r\n') ? '\r\n' : '\n';
          const nextBytes = aliasNeeded
            ? '<!-- verstak-note-aliases-v1: ' + JSON.stringify(aliases) + ' -->' + newline + parsed.body
            : disk;
          await api.files.move(oldPath, newPath, { overwrite: false });
          if (nextBytes !== disk) {
            try { await api.files.writeText(newPath, nextBytes, { createIfMissing: false, overwrite: true }); }
            catch (writeError) {
              try { await api.files.move(newPath, oldPath, { overwrite: false }); }
              catch (_) {
                renameError(error, tr('ui.renamePartial', 'The file was renamed, but its old links could not be preserved. Reopen the note from the list.'));
                return;
              }
              throw writeError;
            }
          }
          await draftWrites.catch(() => {});
          const previousDraftKey = draftKey;
          path = newPath;
          request.path = path;
          root.dataset.resourcePath = path;
          pathLabel.textContent = path;
          pathLabel.title = path;
          disk = nextBytes;
          file = noteFile(nextBytes, notes);
          saved = session.text;
          hash = 2166136261;
          for (const char of path) hash = Math.imul(hash ^ char.codePointAt(0), 16777619) >>> 0;
          draftKey = 'draft-' + hash.toString(16);
          if (api.storage?.data?.write) await api.storage.data.write(previousDraftKey, {}).catch(() => {});
          catalog = null;
          catalogPromise = null;
          closeDialog();
          updateStatus();
          try {
            await api.workbench.openResource({
              kind: 'vault-file', path, extension: ext, mode: mode === 'preview' ? 'view' : 'edit',
              context: { ...request.context, sourcePluginId: 'verstak.default-editor', sourceView: 'editor' },
            });
          } catch (_) { message.textContent = tr('ui.renameOpenFailed', 'Note renamed. Open it from the notes list if navigation failed.'); }
        } catch (caught) {
          renameError(error, /conflict|exist/i.test(String(caught))
            ? tr('ui.renameConflict', 'A note with that name already exists.')
            : tr('ui.renameFailed', 'Could not rename the note. Try again.'));
        } finally {
          confirm.disabled = false;
          input.disabled = false;
        }
      });
      panel.append(node('h2', {}, [tr('ui.rename', 'Rename note')]),
        node('label', {}, [tr('ui.renameTitle', 'New note name'), input]), error,
        node('div', { className: 'de-dialog-actions' }, [button('cancel-rename', tr('ui.closeFind', 'Close'), closeDialog), confirm]));
      dialog.append(panel);
      root.append(dialog);
      dialog.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !confirm.disabled) { event.preventDefault(); closeDialog(); }
        if (event.key === 'Enter' && event.target === input) { event.preventDefault(); confirm.click(); }
        if (event.key === 'Tab') {
          const controls = [...panel.querySelectorAll('button,input')].filter(control => !control.disabled);
          if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
          else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
        }
      });
      input.focus();
      input.select();
    }
    function openShortcutHelp() {
      if (dialog) return;
      dialog = node('div', { className: 'de-dialog-backdrop' });
      const panel = node('section', {
        className: 'de-dialog', role: 'dialog', 'aria-modal': 'true',
        'aria-label': tr('ui.shortcuts', 'Keyboard shortcuts'),
      });
      const items = [
        ['Ctrl+S', 'ui.save', 'Save'],
        ...(notes ? [['F2', 'ui.rename', 'Rename note']] : []),
        ...(markdown ? [
          ['Ctrl+E', 'ui.toggleMode', 'Switch editing / reading'],
          ['Ctrl+Shift+E', 'ui.split', 'Side by side'],
          ['Ctrl+B', 'ui.md.bold', 'Bold'],
          ['Ctrl+I', 'ui.md.italic', 'Italic'],
          ['Ctrl+K', 'ui.md.link', 'Link'],
          ['Ctrl+Shift+7', 'ui.md.numberedList', 'Numbered list'],
          ['Ctrl+Shift+8', 'ui.md.bulletList', 'Bullet list'],
          ['Ctrl+Shift+9', 'ui.md.taskItem', 'Task list'],
        ] : []),
        ['Ctrl+F', 'ui.find', 'Find / replace'],
        ['Ctrl+H', 'ui.replaceValue', 'Replace with'],
        ['Ctrl+Z', 'ui.undo', 'Undo'],
        ['Ctrl+Y / Ctrl+Shift+Z', 'ui.redo', 'Redo'],
      ];
      const shortcuts = node('div', { className: 'de-shortcuts-list' });
      for (const [keys, key, fallback] of items) {
        shortcuts.append(node('div', { className: 'de-shortcut-row' }, [
          node('span', {}, [tr(key, fallback)]),
          node('kbd', {}, [keys]),
        ]));
      }
      const close = button('close-shortcuts', tr('ui.closeFind', 'Close'), closeDialog);
      panel.append(node('h2', {}, [tr('ui.shortcuts', 'Keyboard shortcuts')]), shortcuts,
        node('div', { className: 'de-dialog-actions' }, [close]));
      dialog.append(panel);
      root.append(dialog);
      dialog.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); closeDialog(); }
      });
      close.focus();
    }
    function closeDialog() { dialog?.remove(); dialog = null; session?.focus(); }
    function linkAtCaret() {
      if (!session || session.selection.from !== session.selection.to) return null;
      const offset = session.selection.from;
      const line = session.state.doc.lineAt(offset);
      const patterns = [
        { kind: 'note', pattern: /\[\[([^\]\n]+)\]\]/g },
        { kind: 'web', pattern: /\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g },
      ];
      for (const { kind, pattern } of patterns) {
        for (const match of line.text.matchAll(pattern)) {
          const from = line.from + match.index;
          const to = from + match[0].length;
          if (offset < from || offset > to || line.text[match.index - 1] === '!') continue;
          return { from, to, kind, label: match[1], target: kind === 'note' ? match[1] : match[2] };
        }
      }
      return null;
    }
    async function openLinkPicker(kind) {
      if (!session) return;
      if (mode === 'preview') setMode('edit');
      closeDialog();
      const existing = linkAtCaret();
      const range = existing || { from: session.selection.from, to: session.selection.to };
      if (existing) kind = existing.kind;
      const dialogTitle = existing ? tr('ui.editLink', 'Edit link') : tr('ui.insertLink', 'Insert link');
      dialog = node('div', { className: 'de-dialog-backdrop' });
      const panel = node('section', { className: 'de-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': dialogTitle });
      const type = node('select', { 'aria-label': tr('ui.linkType', 'Link type') });
      if (notes) type.append(node('option', { value: 'note' }, [tr('ui.noteLink', 'Link to note')]));
      type.append(node('option', { value: 'web' }, [tr('ui.webLink', 'Web link')]));
      type.value = kind;
      const input = node('input', { type: 'text', 'data-link-query': '', 'aria-label': tr('ui.linkTarget', 'Note title or web address'), value: existing?.target || '' });
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
      const confirm = button('confirm-link', existing ? tr('ui.updateLink', 'Update link') : tr('ui.insertLink', 'Insert link'), () => {
        if (type.value === 'note') {
          const found = results ? matchesTitle(results.notes, input.value) : [];
          if (found.length === 1) chooseNote(found[0]);
          else error.textContent = tr('ui.chooseNote', 'Choose a note from the list.');
        } else {
          const url = input.value.trim();
          if (!/^(https?:\/\/|mailto:)/i.test(url) || /[\s<>]/.test(url)) { error.textContent = tr('ui.invalidURL', 'Enter an http, https or mailto address.'); return; }
          const label = existing?.label || session.text.slice(range.from, range.to) || url;
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
      panel.append(node('h2', {}, [dialogTitle]), type, node('label', {}, [tr('ui.linkTarget', 'Note title or web address'), input]), resultList, error,
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
      if (notes && event.key === 'F2' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) openRenameDialog();
      else if (match('KeyZ', true)) session?.redo();
      else if (match('KeyZ')) session?.undo();
      else if (match('KeyY')) session?.redo();
      else if (match('KeyS')) save();
      else if (markdown && match('KeyE', true)) setMode('split');
      else if (markdown && match('KeyE')) setMode(mode === 'edit' ? 'preview' : 'edit');
      else if (match('KeyF') || match('KeyH')) { openFind(); if (event.code === 'KeyH') replacement.focus(); }
      else if (markdown && match('KeyK')) openLinkPicker(notes ? 'note' : 'web');
      else if (markdown && (match('KeyB') || match('KeyI')) && mode !== 'preview') session?.format(event.code === 'KeyB' ? 'bold' : 'italic');
      else if (markdown && mode !== 'preview' && (match('Digit7', true) || match('Digit8', true) || match('Digit9', true))) {
        session?.format(event.code === 'Digit7' ? 'numbered' : event.code === 'Digit8' ? 'bullet' : 'task');
      }
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
        shortcuts: ['shortcuts', 'Keyboard shortcuts'],
        'mode-edit': ['edit', 'Edit'], 'mode-preview': ['preview', 'Read'], 'mode-split': ['split', 'Side by side'],
        undo: ['undo', 'Undo'], redo: ['redo', 'Redo'], save: ['save', 'Save'], reload: ['reload', 'Reload'],
        'toggle-outline': ['outline', 'Outline'], 'toggle-links': ['links', 'Links'], 'toggle-width': ['wide', 'Wide page'],
        'toggle-wrap': ['wrapLongLines', 'Wrap long lines'], find: ['find', 'Find / replace'], rename: ['rename', 'Rename note'],
        'insert-link': ['md.link', 'Link'], 'insert-note-link': ['noteLink', 'Link to note'], 'attach-file': ['attachFile', 'Attach file or image'],
        'find-previous': ['findPrevious', 'Previous'], 'find-next': ['findNext', 'Next'],
        'find-replace': ['replace', 'Replace'], 'find-replace-all': ['replaceAll', 'Replace all'], 'close-find': ['closeFind', 'Close'],
      };
      for (const [action, [key, fallback]] of Object.entries(actions)) {
        const control = root.querySelector(`[data-editor-action="${action}"]`);
        if (!control) continue;
        const label = tr(`ui.${key}`, fallback);
        if (control.classList.contains('de-icon-button')) {
          control.setAttribute('aria-label', label);
          const shortcut = action === 'save' ? 'Ctrl+S' : action === 'find' ? 'Ctrl+F' : action === 'insert-link' ? 'Ctrl+K' : action === 'rename' ? 'F2' : action === 'mode-edit' || action === 'mode-preview' ? 'Ctrl+E' : action === 'mode-split' ? 'Ctrl+Shift+E' : '';
          control.title = action === 'undo' ? tr('ui.undoHint', 'Undo — Ctrl+Z')
            : action === 'redo' ? tr('ui.redoHint', 'Redo — Ctrl+Y / Ctrl+Shift+Z')
            : shortcut ? `${label} — ${shortcut}` : label;
        } else control.textContent = label;
      }
      const formatKeys = { heading: 'heading', bold: 'bold', italic: 'italic', bullet: 'bulletList', numbered: 'numberedList', task: 'taskItem', quote: 'quote', code: 'inlineCode', 'code-block': 'codeBlock' };
      for (const [action, control] of formattingButtons) {
        const label = tr(`ui.md.${formatKeys[action]}`, control.getAttribute('aria-label') || action);
        control.setAttribute('aria-label', label);
        const shortcut = action === 'bold' ? 'Ctrl+B' : action === 'italic' ? 'Ctrl+I'
          : action === 'numbered' ? 'Ctrl+Shift+7' : action === 'bullet' ? 'Ctrl+Shift+8'
          : action === 'task' ? 'Ctrl+Shift+9' : '';
        control.title = shortcut ? `${label} — ${shortcut}` : label;
      }
      selectionActions.setAttribute('aria-label', tr('ui.selectionActions', 'Selected text actions'));
      for (const [action, key] of [['bold', 'bold'], ['italic', 'italic'], ['link', 'link']]) {
        const control = root.querySelector(`[data-editor-action="selection-${action}"]`);
        if (!control) continue;
        const label = tr(`ui.md.${key}`, action);
        control.title = label;
        control.setAttribute('aria-label', label);
      }
      root.querySelector('[data-attachment-input]')?.setAttribute('aria-label', tr('ui.attachFile', 'Attach file or image'));
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
