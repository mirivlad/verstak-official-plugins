/* ===========================================================
   Files Plugin — Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  /* ── Style injection ─────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('files-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'files-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  var STYLES = [
    '.files-root{display:flex;flex-direction:column;height:100%;min-height:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:#e0e0e0;background:#0d0d1a}',
    '.files-toolbar{display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.75rem;border-bottom:1px solid #16213e;flex-shrink:0;background:#12122a}',
    '.files-toolbar-btn{font-size:0.75rem;padding:0.25rem 0.6rem;border:1px solid #333;border-radius:4px;background:#1a1a2e;color:#ccc;cursor:pointer}',
    '.files-toolbar-btn:hover{background:#2a2a4e;border-color:#4ecca3}',
    '.files-toolbar-btn:disabled{opacity:0.4;cursor:default}',
    '.files-breadcrumb{display:flex;align-items:center;gap:0.25rem;font-size:0.8rem;color:#8b8ba8;flex:1;min-width:0;overflow:hidden}',
    '.files-breadcrumb-item{color:#4ecca3;cursor:pointer;padding:0.1rem 0.3rem;border-radius:3px}',
    '.files-breadcrumb-item:hover{background:#1a2a3a}',
    '.files-breadcrumb-sep{color:#555}',
    '.files-list{flex:1;overflow-y:auto;padding:0.5rem 0}',
    '.files-item{display:flex;align-items:center;gap:0.6rem;padding:0.4rem 0.75rem;cursor:pointer;font-size:0.85rem}',
    '.files-item:hover{background:#1a1a2e}',
    '.files-item.selected{background:#1a2a3a}',
    '.files-item-icon{width:1.2rem;height:1.2rem;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:#8b8ba8}',
    '.files-item-icon svg{display:block;width:16px;height:16px}',
    '.files-item-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.files-item-meta{font-size:0.7rem;color:#666;flex-shrink:0}',
    '.files-empty{flex:1;display:flex;align-items:center;justify-content:center;color:#666;font-size:0.9rem}',
    '.files-loading{flex:1;display:flex;align-items:center;justify-content:center;color:#666}',
    '.files-error{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#e74c3c;gap:0.5rem;padding:1rem}',
    '.files-error-msg{font-size:0.85rem;color:#aaa;max-width:400px;text-align:center}',
    '.files-create-bar{display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.75rem;border-top:1px solid #16213e;flex-shrink:0;background:#12122a}',
    '.files-create-input{flex:1;font-size:0.8rem;padding:0.3rem 0.5rem;border:1px solid #333;border-radius:4px;background:#0d0d1a;color:#e0e0e0;outline:none}',
    '.files-create-input:focus{border-color:#4ecca3}',
  ].join('\n');

  /* ── Utilities ──────────────────────────────────────────── */
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

  function fileIcon(entry) {
    if (entry.type === 'folder') {
      return svgIcon('M3 5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v1H3V5Zm0 6h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7Z');
    }
    var ext = (entry.extension || '').toLowerCase();
    if (ext === 'md' || ext === 'markdown') {
      return svgIcon('M5 3h10l4 4v14H5V3Zm9 1.5V8h3.5L14 4.5ZM8 11h8v2H8v-2Zm0 4h8v2H8v-2Z');
    }
    if (ext === 'txt' || ext === 'log') {
      return svgIcon('M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5ZM8 12h8v2H8v-2Zm0 4h8v2H8v-2Z');
    }
    if (ext === 'json') return '{ }';
    if (ext === 'yaml' || ext === 'yml' || ext === 'toml') {
      return svgIcon('M19.14 13l.57-1.43 1.79-.5-1-2.29-1.64.73-.29-.28-.73-1.64 2.29-1-1-2.29-1.79.5-.57 1.43-2.17.17-.57-1.43-1.79-.5-1 2.29 1.64.73-.29.28-.73 1.64-2.29-1-1 2.29 1.79.5.57 1.43-.57 1.43-1.79.5 1 2.29 1.64-.73.29.28.73 1.64-2.29 1 1 2.29 1.79-.5.57-1.43 2.17-.17.57 1.43 1.79.5 1-2.29-1.64-.73.29-.28.73-1.64 2.29 1 1-2.29-1.79-.5-.57-1.43ZM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z');
    }
    return svgIcon('M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5Z');
  }

  function formatSize(bytes) {
    if (bytes == null || bytes === 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function sortEntries(entries) {
    var folders = entries.filter(function (e) { return e.type === 'folder'; });
    var files = entries.filter(function (e) { return e.type !== 'folder'; });
    folders.sort(function (a, b) { return a.name.localeCompare(b.name); });
    files.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return folders.concat(files);
  }

  /* ── FilesView component ─────────────────────────────────── */
  var FilesView = {
    mount: function (containerEl, props, api) {
      injectStyles();
      containerEl.innerHTML = '';
      containerEl.className = 'files-root';

      var workspaceRoot = cleanPath(props && (props.workspaceRootPath || (props.workspaceNode && props.workspaceNode.path)) || '');
      var currentPath = '';
      var entries = [];
      var disposed = false;

      var toolbar = el('div', { className: 'files-toolbar' });
      var breadcrumb = el('div', { className: 'files-breadcrumb' });
      var refreshBtn = el('button', { className: 'files-toolbar-btn' }, ['Refresh']);
      var createFolderBtn = el('button', { className: 'files-toolbar-btn' }, ['+ Folder']);
      var createFileBtn = el('button', { className: 'files-toolbar-btn' }, ['+ File']);
      toolbar.appendChild(breadcrumb);
      toolbar.appendChild(refreshBtn);
      toolbar.appendChild(createFolderBtn);
      toolbar.appendChild(createFileBtn);
      containerEl.appendChild(toolbar);

      var listContainer = el('div', { className: 'files-list' });
      containerEl.appendChild(listContainer);

      var createBar = el('div', { className: 'files-create-bar', style: { display: 'none' } });
      var createInput = el('input', { className: 'files-create-input', placeholder: 'Name...' });
      var createConfirmBtn = el('button', { className: 'files-toolbar-btn' }, ['Create']);
      var createCancelBtn = el('button', { className: 'files-toolbar-btn' }, ['Cancel']);
      createBar.appendChild(createInput);
      createBar.appendChild(createConfirmBtn);
      createBar.appendChild(createCancelBtn);
      containerEl.appendChild(createBar);

      var createMode = ''; // 'folder' | 'file' | ''

      function cleanPath(path) {
        return String(path || '').split('/').filter(Boolean).join('/');
      }

      function scopedPath(localPath) {
        localPath = cleanPath(localPath);
        if (!workspaceRoot) return localPath;
        return localPath ? workspaceRoot + '/' + localPath : workspaceRoot;
      }

      function localPath(fullPath) {
        fullPath = cleanPath(fullPath);
        if (!workspaceRoot) return fullPath;
        if (fullPath === workspaceRoot) return '';
        if (fullPath.indexOf(workspaceRoot + '/') === 0) return fullPath.slice(workspaceRoot.length + 1);
        return fullPath;
      }

      function updateBreadcrumb() {
        breadcrumb.innerHTML = '';
        var rootLabel = props && props.workspaceNode && props.workspaceNode.title ? props.workspaceNode.title : 'Root';
        var rootItem = el('span', { className: 'files-breadcrumb-item', onClick: function () { navigateTo(''); } }, [rootLabel]);
        breadcrumb.appendChild(rootItem);
        if (currentPath) {
          var parts = currentPath.split('/');
          var accumulated = '';
          parts.forEach(function (part, i) {
            breadcrumb.appendChild(el('span', { className: 'files-breadcrumb-sep' }, [' / ']));
            accumulated += (accumulated ? '/' : '') + part;
            (function (path) {
              breadcrumb.appendChild(el('span', { className: 'files-breadcrumb-item', onClick: function () { navigateTo(path); } }, [part]));
            })(accumulated);
          });
        }
      }

      function renderList() {
        listContainer.innerHTML = '';
        if (entries.length === 0) {
          listContainer.appendChild(el('div', { className: 'files-empty' }, ['Empty folder']));
          return;
        }
        var sorted = sortEntries(entries);
        sorted.forEach(function (entry) {
          if (entry.isHidden || entry.isReserved) return;
          var item = el('div', { className: 'files-item' }, [
            el('span', { className: 'files-item-icon', innerHTML: fileIcon(entry) }),
            el('span', { className: 'files-item-name', textContent: entry.name }),
            el('span', { className: 'files-item-meta', textContent: entry.type === 'folder' ? '' : formatSize(entry.size) }),
          ]);
          if (entry.type === 'folder') {
            item.addEventListener('dblclick', function () {
              navigateTo(localPath(entry.relativePath));
            });
          } else {
            item.addEventListener('dblclick', function () {
              openFile(entry);
            });
          }
          listContainer.appendChild(item);
        });
      }

      function navigateTo(path) {
        currentPath = path;
        updateBreadcrumb();
        loadEntries();
      }

      function loadEntries() {
        listContainer.innerHTML = '';
        listContainer.appendChild(el('div', { className: 'files-loading' }, ['Loading...']));
        api.files.list(scopedPath(currentPath)).then(function (result) {
          if (disposed) return;
          entries = result || [];
          renderList();
        }).catch(function (err) {
          if (disposed) return;
          listContainer.innerHTML = '';
          var msg = (err && err.message) ? err.message : String(err);
          listContainer.appendChild(el('div', { className: 'files-error' }, [
            el('div', {}, ['Failed to load files']),
            el('div', { className: 'files-error-msg' }, [msg]),
          ]));
        });
      }

      function openFile(entry) {
        var ext = entry.extension ? '.' + entry.extension : '';
        var isMd = ext === '.md' || ext === '.markdown';
        var entryLocalPath = localPath(entry.relativePath);
        var isNotes = entryLocalPath.split('/')[0] === 'Notes';
        var context = { sourcePluginId: 'verstak.files', sourceView: 'files' };
        if (isMd && isNotes) {
          context.isInsideNotesFolder = true;
          context.notesMode = true;
        }
        api.workbench.openResource({
          kind: 'vault-file',
          path: entry.relativePath,
          mode: 'view',
          extension: ext,
          context: context,
        }).catch(function (err) {
          console.error('[files] openResource error:', err);
        });
      }

      function startCreate(mode) {
        createMode = mode;
        createInput.value = '';
        createInput.placeholder = mode === 'folder' ? 'Folder name...' : 'File name (e.g. note.md)...';
        createBar.style.display = 'flex';
        createInput.focus();
      }

      function cancelCreate() {
        createMode = '';
        createBar.style.display = 'none';
      }

      function confirmCreate() {
        var name = createInput.value.trim();
        if (!name) return;
        var localCreatePath = currentPath ? currentPath + '/' + name : name;
        var path = scopedPath(localCreatePath);
        var promise;
        if (createMode === 'folder') {
          promise = api.files.createFolder(path);
        } else {
          promise = api.files.writeText(path, '', { createIfMissing: true, overwrite: false });
        }
        promise.then(function () {
          cancelCreate();
          loadEntries();
        }).catch(function (err) {
          var msg = (err && err.message) ? err.message : String(err);
          createInput.value = '';
          createInput.placeholder = 'Error: ' + msg;
        });
      }

      refreshBtn.addEventListener('click', loadEntries);
      createFolderBtn.addEventListener('click', function () { startCreate('folder'); });
      createFileBtn.addEventListener('click', function () { startCreate('file'); });
      createConfirmBtn.addEventListener('click', confirmCreate);
      createCancelBtn.addEventListener('click', cancelCreate);
      createInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') confirmCreate();
        if (e.key === 'Escape') cancelCreate();
      });

      loadEntries();

      containerEl.__filesCleanup = function () {
        disposed = true;
      };
    },

    unmount: function (containerEl) {
      if (containerEl.__filesCleanup) {
        containerEl.__filesCleanup();
        containerEl.__filesCleanup = null;
      }
      containerEl.innerHTML = '';
    }
  };

  /* ── Register ────────────────────────────────────────────── */
  window.VerstakPluginRegister('verstak.files', {
    components: {
      FilesView: FilesView
    }
  });

})();
