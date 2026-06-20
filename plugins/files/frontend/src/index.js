/* ===========================================================
   Files Plugin — Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  function injectStyles() {
    if (document.getElementById('files-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'files-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  var STYLES = [
    '.files-root{display:flex;flex-direction:column;height:100%;min-height:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:#e0e0e0;background:#0d0d1a;outline:none}',
    '.files-toolbar{display:flex;align-items:center;gap:.45rem;padding:.5rem .75rem;border-bottom:1px solid #16213e;flex-shrink:0;background:#12122a;flex-wrap:wrap}',
    '.files-toolbar-btn,.files-row-btn{font-size:.75rem;padding:.28rem .58rem;border:1px solid #333;border-radius:4px;background:#1a1a2e;color:#ccc;cursor:pointer}',
    '.files-toolbar-btn:hover,.files-row-btn:hover{background:#2a2a4e;border-color:#4ecca3}',
    '.files-toolbar-btn:disabled,.files-row-btn:disabled{opacity:.45;cursor:default;border-color:#333}',
    '.files-breadcrumb{display:flex;align-items:center;gap:.25rem;font-size:.8rem;color:#8b8ba8;min-width:160px;flex:1;overflow:hidden}',
    '.files-breadcrumb-item{color:#4ecca3;cursor:pointer;padding:.1rem .3rem;border-radius:3px;white-space:nowrap}',
    '.files-breadcrumb-item:hover{background:#1a2a3a}',
    '.files-breadcrumb-current{color:#ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.files-breadcrumb-sep{color:#555}',
    '.files-filter,.files-sort,.files-create-input,.files-rename-input{font-size:.78rem;padding:.32rem .5rem;border:1px solid #333;border-radius:4px;background:#0d0d1a;color:#e0e0e0;outline:none}',
    '.files-filter{width:11rem}',
    '.files-sort{width:9.5rem}',
    '.files-filter:focus,.files-sort:focus,.files-create-input:focus,.files-rename-input:focus{border-color:#4ecca3}',
    '.files-list{flex:1;overflow:auto;min-height:0}',
    '.files-header,.files-item{display:grid;grid-template-columns:minmax(160px,1fr) 90px 90px 150px 220px;align-items:center;gap:.5rem;padding:.38rem .75rem;border-bottom:1px solid rgba(22,33,62,.55)}',
    '.files-header{position:sticky;top:0;background:#101028;color:#8b8ba8;font-size:.7rem;text-transform:uppercase;letter-spacing:.04em;z-index:1}',
    '.files-item{font-size:.84rem;cursor:pointer}',
    '.files-item:hover{background:#17172d}',
    '.files-item.selected{background:#1a2a3a}',
    '.files-namecell{display:flex;align-items:center;gap:.55rem;min-width:0}',
    '.files-item-icon{width:1.25rem;height:1.25rem;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:#8b8ba8}',
    '.files-item-icon svg{display:block;width:16px;height:16px}',
    '.files-item-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.files-item-meta{font-size:.74rem;color:#777;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.files-row-actions{display:flex;align-items:center;justify-content:flex-end;gap:.35rem;white-space:nowrap}',
    '.files-empty,.files-loading{flex:1;display:flex;align-items:center;justify-content:center;color:#666;font-size:.9rem;padding:2rem}',
    '.files-error{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#e74c3c;gap:.5rem;padding:1rem}',
    '.files-error-msg{font-size:.85rem;color:#aaa;max-width:420px;text-align:center}',
    '.files-panel{display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;border-top:1px solid #16213e;flex-shrink:0;background:#12122a}',
    '.files-create-input,.files-rename-input{flex:1;min-width:160px}',
    '@media(max-width:760px){.files-header,.files-item{grid-template-columns:minmax(130px,1fr) 70px 0 0 150px}.files-header span:nth-child(3),.files-header span:nth-child(4),.files-item-meta.hide-narrow{display:none}.files-toolbar{align-items:stretch}.files-filter,.files-sort{width:100%}}'
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

  function cleanPath(path) {
    return String(path || '').split('/').filter(Boolean).join('/');
  }

  function parentPath(path) {
    path = cleanPath(path);
    var idx = path.lastIndexOf('/');
    return idx === -1 ? '' : path.slice(0, idx);
  }

  function baseName(path) {
    path = cleanPath(path);
    var idx = path.lastIndexOf('/');
    return idx === -1 ? path : path.slice(idx + 1);
  }

  function extension(name) {
    var dot = String(name || '').lastIndexOf('.');
    return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
  }

  function fileIcon(entry) {
    if (entry.type === 'folder') return svgIcon('M3 5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v1H3V5Zm0 6h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7Z');
    var ext = (entry.extension || extension(entry.name)).toLowerCase();
    if (ext === 'md' || ext === 'markdown') return svgIcon('M5 3h10l4 4v14H5V3Zm9 1.5V8h3.5L14 4.5ZM8 11h8v2H8v-2Zm0 4h8v2H8v-2Z');
    if (ext === 'json' || ext === 'yaml' || ext === 'yml' || ext === 'toml') return '{ }';
    return svgIcon('M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5Z');
  }

  function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function formatDate(value) {
    if (!value) return '';
    var date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function typeLabel(entry) {
    if (entry.type === 'folder') return 'folder';
    return (entry.extension || extension(entry.name) || 'file').toLowerCase();
  }

  var FilesView = {
    mount: function (containerEl, props, api) {
      injectStyles();
      containerEl.innerHTML = '';
      containerEl.className = 'files-root';
      containerEl.setAttribute('tabindex', '0');
      containerEl.setAttribute('data-plugin-id', 'verstak.files');

      var workspaceNode = props && props.workspaceNode;
      var workspaceRoot = cleanPath(props && (props.workspaceRootPath || (workspaceNode && (workspaceNode.rootPath || workspaceNode.name || workspaceNode.id))) || '');
      var workspaceName = workspaceRoot || (workspaceNode && (workspaceNode.name || workspaceNode.title || workspaceNode.id)) || 'Workspace';
      var currentPath = '';
      var entries = [];
      var selectedPath = '';
      var filterText = '';
      var sortMode = 'folder-name';
      var createMode = '';
      var renameTarget = null;
      var disposed = false;

      function scopedPath(local) {
        local = cleanPath(local);
        return workspaceRoot ? (local ? workspaceRoot + '/' + local : workspaceRoot) : local;
      }

      function localPath(full) {
        full = cleanPath(full);
        if (!workspaceRoot) return full;
        if (full === workspaceRoot) return '';
        return full.indexOf(workspaceRoot + '/') === 0 ? full.slice(workspaceRoot.length + 1) : full;
      }

      var toolbar = el('div', { className: 'files-toolbar' });
      var breadcrumb = el('div', { className: 'files-breadcrumb' });
      var upBtn = el('button', { className: 'files-toolbar-btn', 'data-files-action': 'up', title: 'Up' }, ['Up']);
      var refreshBtn = el('button', { className: 'files-toolbar-btn', 'data-files-action': 'refresh', title: 'Refresh' }, ['Refresh']);
      var newFolderBtn = el('button', { className: 'files-toolbar-btn', 'data-files-action': 'new-folder' }, ['+ Folder']);
      var newMdBtn = el('button', { className: 'files-toolbar-btn', 'data-files-action': 'new-markdown' }, ['+ Markdown']);
      var newTextBtn = el('button', { className: 'files-toolbar-btn', 'data-files-action': 'new-text' }, ['+ Text']);
      var openBtn = el('button', { className: 'files-toolbar-btn', 'data-files-action': 'open' }, ['Open']);
      var renameBtn = el('button', { className: 'files-toolbar-btn', 'data-files-action': 'rename' }, ['Rename']);
      var trashBtn = el('button', { className: 'files-toolbar-btn', 'data-files-action': 'trash' }, ['Trash']);
      var filterInput = el('input', { className: 'files-filter', 'data-files-filter': '', placeholder: 'Filter current folder' });
      var sortSelect = el('select', { className: 'files-sort', 'data-files-sort': '' }, [
        el('option', { value: 'folder-name' }, ['Folders + name']),
        el('option', { value: 'name-asc' }, ['Name']),
        el('option', { value: 'type' }, ['Type']),
        el('option', { value: 'modified-desc' }, ['Modified']),
        el('option', { value: 'size-desc' }, ['Size'])
      ]);
      toolbar.appendChild(breadcrumb);
      [upBtn, refreshBtn, newFolderBtn, newMdBtn, newTextBtn, openBtn, renameBtn, trashBtn, filterInput, sortSelect].forEach(function (node) { toolbar.appendChild(node); });
      containerEl.appendChild(toolbar);

      var listContainer = el('div', { className: 'files-list', 'data-files-list': '' });
      containerEl.appendChild(listContainer);

      var createPanel = el('div', { className: 'files-panel', style: { display: 'none' } });
      var createInput = el('input', { className: 'files-create-input', 'data-files-create-input': '' });
      var createConfirm = el('button', { className: 'files-toolbar-btn', 'data-files-create-confirm': '' }, ['Create']);
      var createCancel = el('button', { className: 'files-toolbar-btn' }, ['Cancel']);
      createPanel.appendChild(createInput);
      createPanel.appendChild(createConfirm);
      createPanel.appendChild(createCancel);
      containerEl.appendChild(createPanel);

      var renamePanel = el('div', { className: 'files-panel', style: { display: 'none' } });
      var renameInput = el('input', { className: 'files-rename-input', 'data-files-rename-input': '' });
      var renameConfirm = el('button', { className: 'files-toolbar-btn', 'data-files-rename-confirm': '' }, ['Rename']);
      var renameCancel = el('button', { className: 'files-toolbar-btn' }, ['Cancel']);
      renamePanel.appendChild(renameInput);
      renamePanel.appendChild(renameConfirm);
      renamePanel.appendChild(renameCancel);
      containerEl.appendChild(renamePanel);

      function selectedEntry() {
        return entries.find(function (entry) { return entry.relativePath === selectedPath; }) || null;
      }

      function updateButtons() {
        var sel = selectedEntry();
        upBtn.disabled = !currentPath;
        openBtn.disabled = !sel;
        renameBtn.disabled = !sel;
        trashBtn.disabled = !sel;
      }

      function updateBreadcrumb() {
        breadcrumb.innerHTML = '';
        var root = el('span', { className: currentPath ? 'files-breadcrumb-item' : 'files-breadcrumb-current', onClick: function () { navigateTo(''); } }, [workspaceName]);
        breadcrumb.appendChild(root);
        if (!currentPath) {
          updateButtons();
          return;
        }
        var parts = currentPath.split('/');
        var acc = '';
        parts.forEach(function (part, index) {
          breadcrumb.appendChild(el('span', { className: 'files-breadcrumb-sep' }, ['/']));
          acc += (acc ? '/' : '') + part;
          var cls = index === parts.length - 1 ? 'files-breadcrumb-current' : 'files-breadcrumb-item';
          (function (path) {
            breadcrumb.appendChild(el('span', { className: cls, onClick: function () { if (cls !== 'files-breadcrumb-current') navigateTo(path); } }, [part]));
          })(acc);
        });
        updateButtons();
      }

      function visibleEntries() {
        var q = filterText.trim().toLowerCase();
        var out = entries.filter(function (entry) {
          if (entry.isHidden || entry.isReserved || entry.name === '.verstak') return false;
          return !q || entry.name.toLowerCase().indexOf(q) !== -1;
        });
        out.sort(function (a, b) {
          if (sortMode === 'folder-name') {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
          }
          if (sortMode === 'type') {
            var typeCmp = typeLabel(a).localeCompare(typeLabel(b));
            if (typeCmp) return typeCmp;
          }
          if (sortMode === 'modified-desc') {
            var timeCmp = new Date(b.modifiedAt || 0).getTime() - new Date(a.modifiedAt || 0).getTime();
            if (timeCmp) return timeCmp;
          }
          if (sortMode === 'size-desc') {
            var sizeCmp = (b.size || 0) - (a.size || 0);
            if (sizeCmp) return sizeCmp;
          }
          return a.name.localeCompare(b.name);
        });
        return out;
      }

      function selectEntry(entry) {
        selectedPath = entry ? entry.relativePath : '';
        renderList();
      }

      function renderList() {
        listContainer.innerHTML = '';
        var header = el('div', { className: 'files-header' }, [
          el('span', {}, ['Name']),
          el('span', {}, ['Type']),
          el('span', {}, ['Size']),
          el('span', {}, ['Modified']),
          el('span', {}, ['Actions'])
        ]);
        listContainer.appendChild(header);

        var shown = visibleEntries();
        if (shown.length === 0) {
          listContainer.appendChild(el('div', { className: 'files-empty' }, [filterText ? 'No matches' : 'Empty folder']));
          updateButtons();
          return;
        }

        shown.forEach(function (entry) {
          var row = el('div', {
            className: 'files-item' + (entry.relativePath === selectedPath ? ' selected' : ''),
            'data-file-name': entry.name,
            'data-file-type': entry.type,
            'data-file-path': entry.relativePath,
            tabindex: '0',
            onClick: function () { selectEntry(entry); },
            onDblclick: function () { openEntry(entry); }
          }, [
            el('div', { className: 'files-namecell' }, [
              el('span', { className: 'files-item-icon', innerHTML: fileIcon(entry) }),
              el('span', { className: 'files-item-name', textContent: entry.name, title: entry.name })
            ]),
            el('span', { className: 'files-item-meta' }, [typeLabel(entry)]),
            el('span', { className: 'files-item-meta hide-narrow' }, [entry.type === 'folder' ? '' : formatSize(entry.size)]),
            el('span', { className: 'files-item-meta hide-narrow' }, [formatDate(entry.modifiedAt)]),
            el('div', { className: 'files-row-actions' }, [
              el('button', { className: 'files-row-btn', onClick: function (event) { event.stopPropagation(); openEntry(entry); } }, ['Open']),
              el('button', { className: 'files-row-btn', onClick: function (event) { event.stopPropagation(); beginRename(entry); } }, ['Rename']),
              el('button', { className: 'files-row-btn', onClick: function (event) { event.stopPropagation(); trashEntry(entry); } }, ['Trash']),
              entry.type === 'folder' ? el('button', { className: 'files-row-btn', onClick: function (event) { event.stopPropagation(); navigateTo(localPath(entry.relativePath)); startCreate('markdown'); } }, ['New here']) : null
            ])
          ]);
          listContainer.appendChild(row);
        });
        updateButtons();
      }

      function loadEntries() {
        selectedPath = '';
        listContainer.innerHTML = '';
        listContainer.appendChild(el('div', { className: 'files-loading' }, ['Loading...']));
        updateBreadcrumb();
        api.files.list(scopedPath(currentPath)).then(function (result) {
          if (disposed) return;
          entries = result || [];
          renderList();
        }).catch(function (err) {
          if (disposed) return;
          listContainer.innerHTML = '';
          listContainer.appendChild(el('div', { className: 'files-error' }, [
            el('div', {}, ['Failed to load files']),
            el('div', { className: 'files-error-msg' }, [(err && err.message) ? err.message : String(err)])
          ]));
        });
      }

      function navigateTo(path) {
        currentPath = cleanPath(path);
        cancelCreate();
        cancelRename();
        loadEntries();
      }

      function goUp() {
        if (currentPath) navigateTo(parentPath(currentPath));
      }

      function openEntry(entry) {
        if (!entry) return;
        if (entry.type === 'folder') {
          navigateTo(localPath(entry.relativePath));
          return;
        }
        var ext = entry.extension ? '.' + entry.extension : (extension(entry.name) ? '.' + extension(entry.name) : '');
        var entryLocalPath = localPath(entry.relativePath);
        var isMd = ext === '.md' || ext === '.markdown';
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
          context: context
        }).catch(function (err) { console.error('[files] openResource error:', err); });
      }

      function startCreate(mode) {
        createMode = mode;
        createInput.value = '';
        createInput.placeholder = mode === 'folder' ? 'Folder name' : (mode === 'markdown' ? 'Markdown file name' : 'Text file name');
        createPanel.style.display = 'flex';
        createInput.focus();
      }

      function cancelCreate() {
        createMode = '';
        createPanel.style.display = 'none';
      }

      function confirmCreate() {
        var name = createInput.value.trim();
        if (!name) return;
        var mode = createMode;
        if (createMode === 'markdown' && !/\.(md|markdown)$/i.test(name)) name += '.md';
        if (createMode === 'text' && !/\.[^/.]+$/.test(name)) name += '.txt';
        var full = scopedPath(currentPath ? currentPath + '/' + name : name);
        var promise = mode === 'folder'
          ? api.files.createFolder(full)
          : api.files.writeText(full, '', { createIfMissing: true, overwrite: false });
        promise.then(function () {
          cancelCreate();
          loadEntries();
          if (mode !== 'folder') {
            var ext = extension(name);
            api.workbench.openResource({ kind: 'vault-file', path: full, mode: 'edit', extension: ext ? '.' + ext : '', context: { sourcePluginId: 'verstak.files', sourceView: 'files' } }).catch(function () {});
          }
        }).catch(function (err) {
          createInput.value = '';
          createInput.placeholder = 'Error: ' + ((err && err.message) ? err.message : String(err));
        });
      }

      function beginRename(entry) {
        entry = entry || selectedEntry();
        if (!entry) return;
        renameTarget = entry;
        renameInput.value = entry.name;
        renamePanel.style.display = 'flex';
        renameInput.focus();
        renameInput.select();
      }

      function cancelRename() {
        renameTarget = null;
        renamePanel.style.display = 'none';
      }

      function confirmRename() {
        if (!renameTarget) return;
        var newName = renameInput.value.trim();
        if (!newName || newName === renameTarget.name) {
          cancelRename();
          return;
        }
        var from = renameTarget.relativePath;
        var targetParent = parentPath(from);
        var to = targetParent ? targetParent + '/' + newName : newName;
        api.files.move(from, to, { overwrite: false }).then(function () {
          cancelRename();
          loadEntries();
        }).catch(function (err) {
          renameInput.value = renameTarget.name;
          renameInput.placeholder = 'Error: ' + ((err && err.message) ? err.message : String(err));
        });
      }

      function trashEntry(entry) {
        entry = entry || selectedEntry();
        if (!entry) return;
        if (!window.confirm('Move "' + entry.name + '" to trash?')) return;
        api.files.trash(entry.relativePath).then(function () {
          loadEntries();
        }).catch(function (err) { window.alert((err && err.message) ? err.message : String(err)); });
      }

      refreshBtn.addEventListener('click', loadEntries);
      upBtn.addEventListener('click', goUp);
      newFolderBtn.addEventListener('click', function () { startCreate('folder'); });
      newMdBtn.addEventListener('click', function () { startCreate('markdown'); });
      newTextBtn.addEventListener('click', function () { startCreate('text'); });
      openBtn.addEventListener('click', function () { openEntry(selectedEntry()); });
      renameBtn.addEventListener('click', function () { beginRename(); });
      trashBtn.addEventListener('click', function () { trashEntry(); });
      filterInput.addEventListener('input', function () { filterText = filterInput.value; renderList(); });
      sortSelect.addEventListener('change', function () { sortMode = sortSelect.value; renderList(); });
      createConfirm.addEventListener('click', confirmCreate);
      createCancel.addEventListener('click', cancelCreate);
      renameConfirm.addEventListener('click', confirmRename);
      renameCancel.addEventListener('click', cancelRename);
      createInput.addEventListener('keydown', function (event) { if (event.key === 'Enter') confirmCreate(); if (event.key === 'Escape') cancelCreate(); });
      renameInput.addEventListener('keydown', function (event) { if (event.key === 'Enter') confirmRename(); if (event.key === 'Escape') cancelRename(); });
      containerEl.addEventListener('keydown', function (event) {
        if (event.target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].indexOf(event.target.tagName) !== -1) return;
        if (event.key === 'Enter') openEntry(selectedEntry());
        if (event.key === 'Delete' || event.key === 'Backspace') trashEntry();
        if (event.key === 'F2') beginRename();
      });

      loadEntries();

      containerEl.__filesCleanup = function () { disposed = true; };
    },

    unmount: function (containerEl) {
      if (containerEl.__filesCleanup) {
        containerEl.__filesCleanup();
        containerEl.__filesCleanup = null;
      }
      containerEl.innerHTML = '';
    }
  };

  window.VerstakPluginRegister('verstak.files', {
    components: { FilesView: FilesView }
  });
})();
