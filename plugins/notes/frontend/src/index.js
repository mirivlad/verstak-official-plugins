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
    '.notes-root{display:flex;flex-direction:column;height:100%;min-height:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:#e0e0e0;background:#0d0d1a;outline:none}',
    '.notes-toolbar{display:flex;align-items:center;gap:.45rem;padding:.5rem .75rem;border-bottom:1px solid #16213e;flex-shrink:0;background:#12122a;flex-wrap:wrap}',
    '.notes-btn{font-size:.78rem;padding:.32rem .65rem;border:1px solid #333;border-radius:4px;background:#1a1a2e;color:#ccc;cursor:pointer;display:inline-flex;align-items:center;gap:.35rem}',
    '.notes-btn:hover{background:#2a2a4e;border-color:#4ecca3}',
    '.notes-btn:disabled{opacity:.45;cursor:default}',
    '.notes-btn.primary{background:#1a3a2a;border-color:#4ecca3;color:#4ecca3}',
    '.notes-btn.primary:hover{background:#2a4a3a}',
    '.notes-list{flex:1;overflow:auto;min-height:0}',
    '.notes-item{display:flex;align-items:center;gap:.5rem;padding:.45rem .75rem;border-bottom:1px solid rgba(22,33,62,.55);cursor:pointer;font-size:.85rem}',
    '.notes-item:hover{background:#17172d}',
    '.notes-item.selected{background:#1a2a3a}',
    '.notes-item-icon{width:1.25rem;height:1.25rem;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:#8b8ba8}',
    '.notes-item-icon svg{width:16px;height:16px;display:block;fill:currentColor}',
    '.notes-item-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.notes-item-actions{display:flex;gap:.25rem;opacity:0;transition:opacity .15s}',
    '.notes-item:hover .notes-item-actions{opacity:1}',
    '.notes-item-btn{width:1.5rem;height:1.5rem;display:inline-flex;align-items:center;justify-content:center;border:1px solid #333;border-radius:3px;background:transparent;color:#888;cursor:pointer;padding:0;font-size:.7rem}',
    '.notes-item-btn:hover{background:#2a2a4e;border-color:#4ecca3;color:#4ecca3}',
    '.notes-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#666;font-size:.85rem;padding:2rem;gap:.5rem}',
    '.notes-empty-hint{font-size:.75rem;color:#555}',
    '.notes-error{flex:1;display:flex;align-items:center;justify-content:center;color:#e74c3c;padding:1rem;font-size:.85rem}',
    '.notes-panel{display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;border-top:1px solid #16213e;flex-shrink:0;background:#12122a}',
    '.notes-input{flex:1;font-size:.78rem;padding:.32rem .5rem;border:1px solid #333;border-radius:4px;background:#0d0d1a;color:#e0e0e0;outline:none;min-width:120px}',
    '.notes-input:focus{border-color:#4ecca3}',
    '.notes-title-bar{padding:.4rem .75rem;font-size:.72rem;color:#8b8ba8;background:#101028;border-bottom:1px solid #16213e;text-transform:uppercase;letter-spacing:.04em}',
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
    search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'
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

      function notesParent() {
        return workspaceRoot || '';
      }

      function noteFromEntry(parent, entry) {
        return {
          title: titleFromFilename(entry.name),
          filename: entry.name,
          path: entry.relativePath,
          parentPath: cleanPath(parent)
        };
      }

      function sortNotes(list) {
        return list.sort(function (a, b) {
          return String(a.title || '').toLowerCase().localeCompare(String(b.title || '').toLowerCase());
        });
      }

      function listNotes(parent) {
        return api.files.list(notesFolderPath(parent)).then(function (entries) {
          return sortNotes((entries || []).filter(function (entry) {
            return entry.type === 'file' && /\.(md|markdown)$/i.test(entry.name || '');
          }).map(function (entry) {
            return noteFromEntry(parent, entry);
          }));
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
      var createBtn = el('button', { className: 'notes-btn', 'data-action': 'create', innerHTML: iconSvg('add') + ' New Note' });
      var statusEl = el('span', { className: 'notes-status' });
      toolbar.appendChild(createBtn);
      toolbar.appendChild(el('span', { style: { flex: '1' } }));
      toolbar.appendChild(statusEl);
      containerEl.appendChild(toolbar);

      var titleBar = el('div', { className: 'notes-title-bar' }, ['Notes in ' + workspaceName]);
      containerEl.appendChild(titleBar);

      var listContainer = el('div', { className: 'notes-list', 'data-notes-list': '' });
      containerEl.appendChild(listContainer);

      var createPanel = el('div', { className: 'notes-panel', style: { display: 'none' } });
      var createInput = el('input', { className: 'notes-input', 'data-notes-create-input': '', placeholder: 'Note title' });
      var createConfirm = el('button', { className: 'notes-btn', textContent: 'Create' });
      var createCancel = el('button', { className: 'notes-btn', textContent: 'Cancel' });
      createPanel.appendChild(createInput);
      createPanel.appendChild(createConfirm);
      createPanel.appendChild(createCancel);
      containerEl.appendChild(createPanel);

      var renamePanel = el('div', { className: 'notes-panel', style: { display: 'none' } });
      var renameInput = el('input', { className: 'notes-input', 'data-notes-rename-input': '', placeholder: 'New title' });
      var renameConfirm = el('button', { className: 'notes-btn', textContent: 'Rename' });
      var renameCancel = el('button', { className: 'notes-btn', textContent: 'Cancel' });
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

      function loadNotes() {
        listContainer.innerHTML = '';
        listContainer.appendChild(el('div', { className: 'notes-empty' }, ['Loading...']));

        var parent = notesParent();
        listNotes(parent).then(function (result) {
          if (disposed) return;
          notes = result || [];
          renderList();
        }).catch(function (err) {
          if (disposed) return;
          renderEmpty('Error: ' + (err.message || err));
        });
      }

      function renderList() {
        listContainer.innerHTML = '';
        if (!notes || notes.length === 0) {
          renderEmpty('No notes yet');
          return;
        }
        notes.forEach(function (note) {
          var row = el('div', {
            className: 'notes-item' + (note.path === selectedPath ? ' selected' : ''),
            'data-note-path': note.path,
            'data-note-title': note.title,
            onClick: function () { selectNote(note); },
            onDblclick: function () { openNote(note); }
          }, [
            el('span', { className: 'notes-item-icon', innerHTML: iconSvg('note') }),
            el('span', { className: 'notes-item-name', textContent: note.title || fileName(note.path), title: note.title || note.path }),
            el('span', { className: 'notes-item-actions' }, [
              el('button', {
                className: 'notes-item-btn',
                title: 'Open',
                innerHTML: iconSvg('open'),
                onClick: function (e) { e.stopPropagation(); openNote(note); }
              }),
              el('button', {
                className: 'notes-item-btn',
                title: 'Rename',
                innerHTML: iconSvg('rename'),
                onClick: function (e) { e.stopPropagation(); beginRename(note); }
              })
            ])
          ]);
          listContainer.appendChild(row);
        });
      }

      function renderEmpty(msg) {
        listContainer.innerHTML = '';
        listContainer.appendChild(el('div', { className: 'notes-empty' }, [
          el('div', { innerHTML: iconSvg('note') }),
          el('div', {}, [msg]),
          el('div', { className: 'notes-empty-hint' }, ['Click "New Note" to create one'])
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
        setStatus('Creating note...', 'loading');
        var parent = notesParent();
        createNote(parent, title).then(function (data) {
          if (disposed) return;
          data = data || {};
          if (data.conflict) {
            showConflictModal(title, data.path);
            return;
          }
          hideCreate();
          setStatus('Note created', 'success');
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
          setStatus('Error: ' + (err.message || err), 'error');
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
        setStatus('Renaming...', 'loading');
        renameNote(renameTarget.path, newTitle).then(function (data) {
          if (disposed) return;
          data = data || {};
          if (data.conflict) {
            showConflictModal(newTitle, data.path);
            return;
          }
          hideRename();
          setStatus('Note renamed', 'success');
          loadNotes();
        }).catch(function (err) {
          setStatus('Error: ' + (err.message || err), 'error');
        });
      }

      // ─── Conflict Modal ─────────────────────────────────────

      function showConflictModal(title, existingPath) {
        var overlay = el('div', { className: 'notes-modal-overlay' });
        var modal = el('div', { className: 'notes-modal' }, [
          el('div', { className: 'notes-modal-title' }, ['Name Conflict']),
          el('div', { className: 'notes-modal-msg' }, [
            'A note with the title "' + title + '" already exists.',
            ' Please choose a different title.'
          ].join('')),
          el('div', { className: 'notes-modal-actions' }, [
            el('button', { className: 'notes-modal-btn confirm', textContent: 'OK', onClick: function () { overlay.remove(); createInput.focus(); } })
          ])
        ]);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
      }

      // ─── Event Wiring ───────────────────────────────────────

      createBtn.addEventListener('click', showCreate);
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

      loadNotes();

      containerEl.__notesCleanup = function () {
        disposed = true;
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
