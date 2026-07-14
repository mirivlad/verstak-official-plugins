/* ===========================================================
   Notes Plugin — Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  function injectStyles() {
    if (document.getElementById('notes-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'notes-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  var STYLES = [
    '.notes-root{display:flex;flex-direction:column;height:100%;min-height:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:var(--vt-color-text-primary,#f4f7fb);background:var(--vt-color-background,#101020);outline:none}',
    '.notes-toolbar{display:flex;align-items:center;gap:.5rem;min-height:2.75rem;padding:.5rem .75rem;border-bottom:1px solid var(--vt-color-border,#202b46);flex-shrink:0;background:var(--vt-color-surface-muted,#111629);flex-wrap:wrap}',
    '.notes-btn{font-size:.78rem;padding:.36rem .7rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-secondary,#b7c0d4);cursor:pointer;display:inline-flex;align-items:center;gap:.35rem}',
    '.notes-btn:hover{background:var(--vt-color-surface-hover,#1b2440);border-color:var(--vt-color-accent,#4ecca3);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.notes-btn:focus-visible{outline:0;box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34))}',
    '.notes-btn:disabled{opacity:.45;cursor:default}',
    '.notes-btn.primary{background:var(--vt-color-accent,#4ecca3);border-color:var(--vt-color-accent,#4ecca3);color:#101827}',
    '.notes-btn.primary:hover{background:#63d9b3;color:#101827}',
    '.notes-filter,.notes-sort{font-size:.78rem;padding:.32rem .5rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:#0f1424;color:var(--vt-color-text-primary,#f4f7fb);outline:none}',
    '.notes-filter{width:11rem}',
    '.notes-sort{width:8rem;appearance:none;background-color:#0f1424;background-image:linear-gradient(45deg,transparent 50%,#8b8ba8 50%),linear-gradient(135deg,#8b8ba8 50%,transparent 50%);background-position:calc(100% - 14px) 50%,calc(100% - 9px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;padding-right:1.6rem}.notes-sort option{background:#0f1424;color:var(--vt-color-text-primary,#f4f7fb)}',
    '.notes-filter:focus,.notes-sort:focus{border-color:var(--vt-color-accent,#4ecca3);box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34))}',
    '.notes-list{flex:1;overflow:auto;min-height:0}',
    '.notes-item{display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;border-bottom:1px solid rgba(32,43,70,.72);cursor:pointer;font-size:.85rem}',
    '.notes-item:hover{background:var(--vt-color-surface-hover,#1b2440)}',
    '.notes-item.selected{background:var(--vt-color-surface-selected,rgba(78,204,163,.14));box-shadow:inset 2px 0 0 var(--vt-color-accent,#4ecca3)}',
    '.notes-item-icon{width:1.25rem;height:1.25rem;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.notes-item-icon svg{width:16px;height:16px;display:block;fill:currentColor}',
    '.notes-item-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.notes-item-actions{display:flex;gap:.25rem;opacity:.78;transition:opacity .15s}',
    '.notes-item:hover .notes-item-actions{opacity:1}',
    '.notes-item-btn{width:1.65rem;height:1.65rem;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-sm,4px);background:transparent;color:var(--vt-color-text-muted,#7f8aa3);cursor:pointer;padding:0;font-size:.7rem}',
    '.notes-item-btn:hover{background:var(--vt-color-surface-hover,#1b2440);border-color:var(--vt-color-accent,#4ecca3);color:var(--vt-color-accent,#4ecca3)}',
    '.notes-item-btn:focus-visible{outline:0;box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34))}',
    '.notes-item-btn svg{width:14px;height:14px;display:block;fill:currentColor}',
    '.notes-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--vt-color-text-muted,#7f8aa3);font-size:.85rem;padding:2rem;gap:.5rem;text-align:center}',
    '.notes-empty-hint{font-size:.75rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.notes-error{flex:1;display:flex;align-items:center;justify-content:center;color:var(--vt-color-danger,#e94560);padding:1rem;font-size:.85rem}',
    '.notes-panel{display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;border-top:1px solid var(--vt-color-border,#202b46);flex-shrink:0;background:var(--vt-color-surface-muted,#111629)}',
    '.notes-input{flex:1;font-size:.78rem;padding:.32rem .5rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:#0f1424;color:var(--vt-color-text-primary,#f4f7fb);outline:none;min-width:120px}',
    '.notes-input:focus{border-color:var(--vt-color-accent,#4ecca3);box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34))}',
    '.notes-title-bar{padding:.4rem .75rem;font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3);background:var(--vt-color-surface-muted,#111629);border-bottom:1px solid var(--vt-color-border,#202b46);text-transform:uppercase;letter-spacing:.04em}',
    '.notes-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center}',
    '.notes-modal{width:380px;max-width:90vw;padding:20px;background:#1a1a2e;border:1px solid #333;border-radius:10px;color:#e0e0e0;font-family:inherit;box-shadow:0 12px 40px rgba(0,0,0,.5)}',
    '.notes-modal-title{font-size:.9rem;font-weight:600;margin-bottom:12px}',
    '.notes-modal-msg{font-size:.82rem;color:#aaa;margin-bottom:16px;word-wrap:break-word}',
    '.notes-modal-actions{display:flex;justify-content:flex-end;gap:8px}',
    '.notes-modal-btn{font-size:.8rem;padding:.35rem .9rem;border:1px solid #333;border-radius:5px;cursor:pointer;font-family:inherit}',
    '.notes-modal-btn.cancel{background:#2a2a4e;color:#ccc}',
    '.notes-modal-btn.cancel:hover{background:#3a3a5e}',
    '.notes-modal-btn.confirm{background:#4ecca3;color:#111;border-color:#4ecca3}',
    '.notes-modal-btn.confirm:hover{background:#3dbb92}',
    '.notes-modal-btn.danger{background:#7a2a35;color:#fff;border-color:#b84a5a}',
    '.notes-modal-btn.danger:hover{background:#963545}',
    '.notes-status{font-size:.72rem;color:#8b8ba8;padding:.15rem .5rem;white-space:nowrap}',
    '.notes-status.success{color:#4ecca3}',
    '.notes-status.error{color:#e74c3c}',
    '.notes-status.loading{color:#79c0ff}',
    '@media(max-width:600px){.notes-toolbar{flex-direction:column;align-items:stretch}}'
  ].join('\n');

  function el(tag, attrs, children) {
    var elem = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') elem.className = attrs[k];
        else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(elem.style, attrs[k]);
        else if (k.slice(0, 2) === 'on') elem.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (k === 'innerHTML') elem.innerHTML = attrs[k];
        else if (k === 'textContent') elem.textContent = attrs[k];
        else elem.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        elem.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return elem;
  }

  function svgIcon(path) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="' + path + '" fill="currentColor"/></svg>';
  }

  var ICONS = {
    note: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 9h-1v1c0 .83-.67 1.5-1.5 1.5S9 12.83 9 12V9.5c0-.83.67-1.5 1.5-1.5S12 8.67 12 9.5v1h1v-1c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v2.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5v-1z',
    overview: 'M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z',
    add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    rename: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    open: 'M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zM5 5h6V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6h-2v6H5V5z',
    search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5-1-1h-5l-1 1H5v2h14V4z'
  };

  function iconSvg(name) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (ICONS[name] || ICONS.note) + '" fill="currentColor"/></svg>';
  }

  function fileName(path) {
    var parts = String(path || '').split('/');
    return parts[parts.length - 1] || '';
  }

  function cleanPath(path) {
    return String(path || '').split('/').filter(Boolean).join('/');
  }

  function parentPath(path) {
    path = cleanPath(path);
    var idx = path.lastIndexOf('/');
    return idx === -1 ? '' : path.slice(0, idx);
  }

  function notesFolderPath(parent) {
    parent = cleanPath(parent);
    return parent ? parent + '/Notes' : 'Notes';
  }

  function titleFromFilename(filename) {
    filename = String(filename || '').trim();
    if (/\.markdown$/i.test(filename)) filename = filename.slice(0, -9);
    else if (/\.md$/i.test(filename)) filename = filename.slice(0, -3);
    return filename.replace(/_/g, ' ').trim();
  }

  function normalizeNoteFilename(title) {
    var original = String(title == null ? '' : title);
    var value = original.trim();
    if (/\.markdown$/i.test(value) && value.length > 9) value = value.slice(0, -9);
    else if (/\.md$/i.test(value) && value.length > 3) value = value.slice(0, -3);
    if (!value) throw new Error('note title must not be empty');
    value = value.replace(/\s+/g, '_');
    value = value.replace(/[\u2012\u2013\u2014\u2015\u2212]/g, '-');
    value = value.replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, '');
    var out = '';
    for (var i = 0; i < value.length; i++) {
      var ch = value.charAt(i);
      if (/[A-Za-z0-9._-]/.test(ch) || /[\p{L}\p{N}]/u.test(ch)) out += ch;
      else if (/\S/.test(ch)) out += '_';
    }
    out = out.replace(/[_.-]+/g, '_').replace(/^[._\-\s]+|[._\-\s]+$/g, '');
    if (!out) throw new Error('note title normalizes to an empty filename');
    return out + '.md';
  }

  function isConflictError(err) {
    var msg = (err && err.message) ? err.message : String(err || '');
    return /conflict|already exists|exists/i.test(msg);
  }

  function isNotFoundError(err) {
    var msg = (err && err.message) ? err.message : String(err || '');
    return /not.?found|does not exist|no such/i.test(msg);
  }

  var NotesView = {
    mount: function (containerEl, props, api) {
      injectStyles();
      containerEl.innerHTML = '';
      containerEl.className = 'notes-root';
      containerEl.setAttribute('data-plugin-id', 'verstak.notes');

      var workspaceNode = props && props.workspaceNode;
      var workspaceRoot = (workspaceNode && (workspaceNode.rootPath || workspaceNode.name || workspaceNode.id)) || '';
      var workspaceName = workspaceRoot || (workspaceNode && (workspaceNode.name || workspaceNode.title)) || 'Workspace';

      var notes = [];
      var selectedPath = '';
      var statusText = '';
      var statusClass = '';
      var disposed = false;
      var noteActions = [];
      var filterText = '';
      var sortMode = 'title-asc';
      var renameTarget = null;

      function tr(key, params, fallback) {
        if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
        return fallback || key;
      }

      function notesParent() {
        return workspaceRoot || '';
      }

      function noteFromEntry(parent, entry) {
        return {
          title: titleFromFilename(entry.name),
          filename: entry.name,
          path: entry.relativePath,
          parentPath: cleanPath(parent),
          modifiedAt: entry.modifiedAt || ''
        };
      }

      function sortNotes(list, mode) {
        return list.sort(function (a, b) {
          var byTitle = String(a.title || '').toLowerCase().localeCompare(String(b.title || '').toLowerCase());
          if (mode === 'title-desc') return -byTitle;
          return byTitle;
        });
      }

      function listNotes(parent) {
        return api.files.list(notesFolderPath(parent)).then(function (entries) {
          return (entries || []).filter(function (entry) {
            return entry.type === 'file' && /\.(md|markdown)$/i.test(entry.name || '');
          }).map(function (entry) {
            return noteFromEntry(parent, entry);
          });
        }).catch(function (err) {
          if (isNotFoundError(err)) return [];
          throw err;
        });
      }

      function ensureNotesFolder(parent) {
        return api.files.createFolder(notesFolderPath(parent)).catch(function (err) {
          if (!isConflictError(err)) throw err;
        });
      }

      function createNote(parent, title) {
        var trimmedTitle = String(title || '').trim();
        if (!trimmedTitle) return Promise.reject(new Error('note title must not be empty'));
        var path = notesFolderPath(parent) + '/' + normalizeNoteFilename(trimmedTitle);
        return ensureNotesFolder(parent).then(function () {
          return api.files.writeText(path, '# ' + trimmedTitle + '\n', {
            createIfMissing: true,
            overwrite: false
          }).then(function () {
            return { path: path };
          }).catch(function (writeErr) {
            if (isConflictError(writeErr)) return { path: path, conflict: true };
            throw writeErr;
          });
        });
      }

      function renameNote(notePath, newTitle) {
        var trimmedTitle = String(newTitle || '').trim();
        if (!trimmedTitle) return Promise.reject(new Error('note title must not be empty'));
        var newPath = parentPath(notePath) + '/' + normalizeNoteFilename(trimmedTitle);
        if (newPath === notePath) return Promise.resolve({ path: notePath });
        return api.files.metadata(newPath).then(function () {
          return { path: newPath, conflict: true };
        }).catch(function (err) {
          if (!isNotFoundError(err)) throw err;
          return api.files.move(notePath, newPath, { overwrite: false }).then(function () {
            return { path: newPath };
          }).catch(function (moveErr) {
            if (isConflictError(moveErr)) return { path: newPath, conflict: true };
            throw moveErr;
          });
        });
      }

      // ─── UI Elements ────────────────────────────────────────

      var toolbar = el('div', { className: 'notes-toolbar' });
      var createBtn = el('button', { className: 'notes-btn primary', 'data-action': 'create', innerHTML: iconSvg('add') + ' ' + tr('ui.newNote', null, 'New Note') });
      var filterInput = el('input', { className: 'notes-filter', 'data-notes-filter': '', placeholder: tr('ui.filter', null, 'Filter notes') });
      var sortSelect = el('select', { className: 'notes-sort', 'data-notes-sort': '' }, [
        el('option', { value: 'title-asc' }, ['A-Z']),
        el('option', { value: 'title-desc' }, ['Z-A'])
      ]);
      var statusEl = el('span', { className: 'notes-status' });
      toolbar.appendChild(createBtn);
      toolbar.appendChild(filterInput);
      toolbar.appendChild(sortSelect);
      toolbar.appendChild(el('span', { style: { flex: '1' } }));
      toolbar.appendChild(statusEl);
      containerEl.appendChild(toolbar);

      var titleBar = el('div', { className: 'notes-title-bar' }, [tr('ui.title', { workspace: workspaceName }, 'Notes in ' + workspaceName)]);
      containerEl.appendChild(titleBar);

      var listContainer = el('div', { className: 'notes-list', 'data-notes-list': '' });
      containerEl.appendChild(listContainer);

      var createPanel = el('div', { className: 'notes-panel', style: { display: 'none' } });
      var createInput = el('input', { className: 'notes-input', 'data-notes-create-input': '', placeholder: tr('ui.noteTitle', null, 'Note title') });
      var createConfirm = el('button', { className: 'notes-btn', textContent: tr('ui.create', null, 'Create') });
      var createCancel = el('button', { className: 'notes-btn', textContent: tr('ui.cancel', null, 'Cancel') });
      createPanel.appendChild(createInput);
      createPanel.appendChild(createConfirm);
      createPanel.appendChild(createCancel);
      containerEl.appendChild(createPanel);

      var renamePanel = el('div', { className: 'notes-panel', style: { display: 'none' } });
      var renameInput = el('input', { className: 'notes-input', 'data-notes-rename-input': '', placeholder: tr('ui.newTitle', null, 'New title') });
      var renameConfirm = el('button', { className: 'notes-btn', textContent: tr('ui.rename', null, 'Rename') });
      var renameCancel = el('button', { className: 'notes-btn', textContent: tr('ui.cancel', null, 'Cancel') });
      renamePanel.appendChild(renameInput);
      renamePanel.appendChild(renameConfirm);
      renamePanel.appendChild(renameCancel);
      containerEl.appendChild(renamePanel);

      // ─── Core Functions ─────────────────────────────────────

      function setStatus(text, cls) {
        statusText = text;
        statusClass = cls || '';
        if (statusEl) {
          statusEl.textContent = text;
          statusEl.className = 'notes-status' + (cls ? ' ' + cls : '');
        }
        if (text) {
          setTimeout(function () {
            if (!disposed && statusEl && statusEl.textContent === text) {
              statusEl.textContent = '';
              statusEl.className = 'notes-status';
            }
          }, 4000);
        }
      }

      function userFacingError(key, fallback, err) {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          console.warn('[verstak.notes] ' + key, err);
        }
        return tr(key, null, fallback);
      }

      function loadNotes() {
        listContainer.innerHTML = '';
        listContainer.appendChild(el('div', { className: 'notes-empty' }, [tr('ui.loading', null, 'Loading...')]));

        var parent = notesParent();
        listNotes(parent).then(function (result) {
          if (disposed) return;
          notes = result || [];
          renderList();
        }).catch(function (err) {
          if (disposed) return;
          renderEmpty(userFacingError('ui.loadError', 'Could not load notes. Please try again.', err));
        });
      }

      function loadContributionActions() {
        var contributions = api && api.contributions;
        if (!contributions || typeof contributions.list !== 'function') return;
        contributions.list('noteActions').then(function (result) {
          if (disposed) return;
          noteActions = (result || []).filter(function (item) {
            return item && item.pluginId && item.handler && item.label;
          });
          renderList();
        }).catch(function (err) {
          console.error('[notes] contribution actions:', err);
        });
      }

      function isNotesEvent(event) {
        var payload = (event && event.payload) || {};
        var changedPath = cleanPath(payload.path || '');
        if (!changedPath) return true;
        var parent = notesParent();
        return changedPath === parent || changedPath.indexOf(parent + '/') === 0;
      }

      function actionInitial(action) {
        var label = String(action && action.label || '').trim();
        return label ? label.charAt(0).toUpperCase() : '+';
      }

      function executeContributionAction(action, note) {
        if (!action || !note || !api.commands || typeof api.commands.executeFor !== 'function') return;
        setStatus(action.label + '...', 'loading');
        api.commands.executeFor(action.pluginId, action.handler, {
          source: 'notes',
          actionId: action.id,
          path: note.path,
          note: note,
          notesScopePath: notesParent(),
          workspaceRootPath: workspaceRoot
        }).then(function () {
          if (!disposed) setStatus(action.label + ' complete', 'success');
        }).catch(function (err) {
          if (!disposed) setStatus(userFacingError('ui.actionError', 'Could not complete this note action. Please try again.', err), 'error');
        });
      }

      function visibleNotes() {
        var q = filterText.trim().toLowerCase();
        var filtered = (notes || []).filter(function (note) {
          if (!q) return true;
          return String(note.title || '').toLowerCase().indexOf(q) !== -1 ||
            String(note.path || '').toLowerCase().indexOf(q) !== -1;
        });
        return sortNotes(filtered, sortMode);
      }

      function renderList() {
        listContainer.innerHTML = '';
        if (!notes || notes.length === 0) {
          renderEmpty(tr('ui.empty', null, 'No notes yet'));
          return;
        }
        var shown = visibleNotes();
        if (shown.length === 0) {
          renderEmpty(tr('ui.noMatches', null, 'No matching notes'), tr('ui.clearFilterHint', null, 'Clear the filter to show all notes'));
          return;
        }
        shown.forEach(function (note) {
          var actionButtons = [
            el('button', {
              className: 'notes-item-btn',
              title: tr('ui.open', null, 'Open'),
              'aria-label': tr('ui.open', null, 'Open'),
              'data-note-action': 'open',
              innerHTML: iconSvg('open'),
              onClick: function (e) { e.stopPropagation(); openNote(note); }
            }),
            el('button', {
              className: 'notes-item-btn',
              title: tr('ui.rename', null, 'Rename'),
              'aria-label': tr('ui.rename', null, 'Rename'),
              'data-note-action': 'rename',
              innerHTML: iconSvg('rename'),
              onClick: function (e) { e.stopPropagation(); beginRename(note); }
            }),
            el('button', {
              className: 'notes-item-btn',
              title: tr('ui.trash', null, 'Move to Trash'),
              'aria-label': tr('ui.trash', null, 'Move to Trash'),
              'data-note-action': 'trash',
              innerHTML: iconSvg('trash'),
              onClick: function (e) { e.stopPropagation(); confirmTrashNote(note); }
            })
          ];
          noteActions.forEach(function (action) {
            actionButtons.push(el('button', {
              className: 'notes-item-btn',
              title: action.label,
              'aria-label': action.label,
              'data-note-contribution-action': action.id,
              textContent: actionInitial(action),
              onClick: function (e) { e.stopPropagation(); executeContributionAction(action, note); }
            }));
          });
          var row = el('div', {
            className: 'notes-item' + (note.path === selectedPath ? ' selected' : ''),
            'data-note-path': note.path,
            'data-note-title': note.title,
            onClick: function () { selectNote(note); },
            onDblclick: function () { openNote(note); }
          }, [
            el('span', { className: 'notes-item-icon', innerHTML: iconSvg('note') }),
            el('span', { className: 'notes-item-name', textContent: note.title || fileName(note.path), title: note.title || note.path }),
            el('span', { className: 'notes-item-actions' }, actionButtons)
          ]);
          listContainer.appendChild(row);
        });
      }

      function renderEmpty(msg, hint) {
        listContainer.innerHTML = '';
        listContainer.appendChild(el('div', { className: 'notes-empty' }, [
          el('div', { innerHTML: iconSvg('note') }),
          el('div', {}, [msg]),
          el('div', { className: 'notes-empty-hint' }, [hint || tr('ui.emptyHint', null, 'Click "New Note" to create one')])
        ]));
      }

      function selectNote(note) {
        selectedPath = note.path;
        renderList();
      }

      function openNote(note) {
        if (!note) return;
        var ext = '.md';
        api.workbench.openResource({
          kind: 'vault-file',
          path: note.path,
          mode: 'view',
          extension: ext,
          context: {
            sourcePluginId: 'verstak.notes',
            sourceView: 'notes',
            isInsideNotesFolder: true,
            notesMode: true,
            notesScopePath: notesParent()
          }
        }).catch(function (err) { console.error('[notes] openResource:', err); });
      }

      // ─── Create ────────────────────────────────────────────

      function showCreate() {
        createInput.value = '';
        createPanel.style.display = 'flex';
        createInput.focus();
      }

      function hideCreate() {
        createPanel.style.display = 'none';
      }

      function confirmCreate() {
        var title = createInput.value.trim();
        if (!title) return;
        setStatus(tr('ui.creating', null, 'Creating note...'), 'loading');
        var parent = notesParent();
        createNote(parent, title).then(function (data) {
          if (disposed) return;
          data = data || {};
          if (data.conflict) {
            showConflictModal(title, data.path, createInput);
            return;
          }
          hideCreate();
          setStatus(tr('ui.created', null, 'Note created'), 'success');
          loadNotes();
          // Open the newly created note
          if (data.path) {
            api.workbench.openResource({
              kind: 'vault-file',
              path: data.path,
              mode: 'edit',
              extension: '.md',
              context: {
                sourcePluginId: 'verstak.notes',
                sourceView: 'notes',
                isInsideNotesFolder: true,
                notesMode: true,
                notesScopePath: parent
              }
            }).catch(function () {});
          }
        }).catch(function (err) {
          setStatus(userFacingError('ui.createError', 'Could not create the note. Please try again.', err), 'error');
        });
      }

      // ─── Rename ─────────────────────────────────────────────

      function beginRename(note) {
        renameTarget = note;
        renameInput.value = note.title || fileName(note.path);
        renamePanel.style.display = 'flex';
        renameInput.focus();
        renameInput.select();
      }

      function hideRename() {
        renameTarget = null;
        renamePanel.style.display = 'none';
      }

      function confirmRename() {
        if (!renameTarget) return;
        var newTitle = renameInput.value.trim();
        if (!newTitle) return;
        setStatus(tr('ui.renaming', null, 'Renaming...'), 'loading');
        renameNote(renameTarget.path, newTitle).then(function (data) {
          if (disposed) return;
          data = data || {};
          if (data.conflict) {
            showConflictModal(newTitle, data.path, renameInput);
            return;
          }
          hideRename();
          setStatus(tr('ui.renamed', null, 'Note renamed'), 'success');
          loadNotes();
        }).catch(function (err) {
          setStatus(userFacingError('ui.renameError', 'Could not rename the note. Please try again.', err), 'error');
        });
      }

      // ─── Trash ──────────────────────────────────────────────

      function confirmTrashNote(note) {
        if (!note) return;
        showTrashModal(note).then(function (confirmed) {
          if (!confirmed || disposed) return;
          setStatus(tr('ui.trashing', null, 'Moving note to trash...'), 'loading');
          api.files.trash(note.path).then(function () {
            if (disposed) return;
            if (selectedPath === note.path) selectedPath = '';
            setStatus(tr('ui.trashed', null, 'Note moved to trash'), 'success');
            loadNotes();
          }).catch(function (err) {
            setStatus(userFacingError('ui.trashError', 'Could not move the note to trash. Please try again.', err), 'error');
          });
        });
      }

      // ─── Conflict Modal ─────────────────────────────────────

      function showConflictModal(title, existingPath, focusTarget) {
        var overlay = el('div', { className: 'notes-modal-overlay' });
        var modal = el('div', { className: 'notes-modal' }, [
          el('div', { className: 'notes-modal-title' }, [tr('ui.conflictTitle', null, 'Name Conflict')]),
          el('div', { className: 'notes-modal-msg' }, [
            tr('ui.conflictMessage', { title: title }, 'A note with the title "' + title + '" already exists.'),
            existingPath ? tr('ui.existingFile', { path: existingPath }, ' Existing file: ' + existingPath + '.') : '',
            tr('ui.chooseDifferent', null, ' Please choose a different title.')
          ].join('')),
          el('div', { className: 'notes-modal-actions' }, [
            el('button', { className: 'notes-modal-btn confirm', textContent: 'OK', onClick: function () { overlay.remove(); (focusTarget || createInput).focus(); } })
          ])
        ]);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
      }

      function showTrashModal(note) {
        return new Promise(function (resolve) {
          var overlay = el('div', { className: 'notes-modal-overlay' });
          function close(value) {
            overlay.remove();
            resolve(value);
          }
          var modal = el('div', { className: 'notes-modal' }, [
            el('div', { className: 'notes-modal-title' }, [tr('ui.trashTitle', null, 'Move Note to Trash')]),
            el('div', { className: 'notes-modal-msg' }, [
              tr('ui.trashConfirm', { title: note.title || fileName(note.path) }, 'Move "' + (note.title || fileName(note.path)) + '" to trash?')
            ]),
            el('div', { className: 'notes-modal-actions' }, [
              el('button', { className: 'notes-modal-btn cancel', textContent: tr('ui.cancel', null, 'Cancel'), onClick: function () { close(false); } }),
              el('button', { className: 'notes-modal-btn danger', 'data-notes-confirm-trash': '', textContent: tr('ui.trash', null, 'Move to Trash'), onClick: function () { close(true); } })
            ])
          ]);
          overlay.appendChild(modal);
          document.body.appendChild(overlay);
        });
      }

      // ─── Event Wiring ───────────────────────────────────────

      createBtn.addEventListener('click', showCreate);
      filterInput.addEventListener('input', function () {
        filterText = filterInput.value;
        renderList();
      });
      sortSelect.addEventListener('change', function () {
        sortMode = sortSelect.value || 'title-asc';
        renderList();
      });
      createConfirm.addEventListener('click', confirmCreate);
      createCancel.addEventListener('click', hideCreate);
      renameConfirm.addEventListener('click', confirmRename);
      renameCancel.addEventListener('click', hideRename);
      createInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') confirmCreate();
        if (e.key === 'Escape') hideCreate();
      });
      renameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') confirmRename();
        if (e.key === 'Escape') hideRename();
      });

      // ─── Init ───────────────────────────────────────────────

      loadContributionActions();
      loadNotes();

      var localeUnsubscribe = null;
      if (api.i18n && typeof api.i18n.onDidChangeLocale === 'function') {
        localeUnsubscribe = api.i18n.onDidChangeLocale(function () {
          createBtn.innerHTML = iconSvg('add') + ' ' + tr('ui.newNote', null, 'New Note');
          filterInput.setAttribute('placeholder', tr('ui.filter', null, 'Filter notes'));
          titleBar.textContent = tr('ui.title', { workspace: workspaceName }, 'Notes in ' + workspaceName);
          createInput.setAttribute('placeholder', tr('ui.noteTitle', null, 'Note title'));
          renameInput.setAttribute('placeholder', tr('ui.newTitle', null, 'New title'));
          createConfirm.textContent = tr('ui.create', null, 'Create');
          createCancel.textContent = tr('ui.cancel', null, 'Cancel');
          renameConfirm.textContent = tr('ui.rename', null, 'Rename');
          renameCancel.textContent = tr('ui.cancel', null, 'Cancel');
          renderList();
        });
      }

      var fileChangedUnsubscribe = null;
      if (api.events && typeof api.events.subscribe === 'function') {
        api.events.subscribe('file.changed', function (event) {
          if (disposed || !isNotesEvent(event)) return;
          loadNotes();
        }).then(function (unsubscribe) {
          fileChangedUnsubscribe = unsubscribe;
        }).catch(function (err) {
          console.error('[notes] file.changed subscription:', err);
        });
      }

      containerEl.__notesCleanup = function () {
        disposed = true;
        if (typeof localeUnsubscribe === 'function') localeUnsubscribe();
        if (typeof fileChangedUnsubscribe === 'function') fileChangedUnsubscribe();
      };
    },

    unmount: function (containerEl) {
      if (containerEl.__notesCleanup) {
        containerEl.__notesCleanup();
        containerEl.__notesCleanup = null;
      }
      containerEl.innerHTML = '';
    }
  };

  window.VerstakPluginRegister('verstak.notes', {
    components: { NotesView: NotesView }
  });
})();
