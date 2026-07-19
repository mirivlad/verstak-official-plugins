/* ===========================================================
   Trash Plugin - Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  var PLUGIN_ID = 'verstak.trash';

  var STYLES = [
    '.trash-root{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--vt-color-background,#101020);color:var(--vt-color-text-primary,#f4f7fb);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '.trash-toolbar{display:flex;align-items:center;gap:.5rem;min-height:2.75rem;padding:.5rem .75rem;border-bottom:1px solid var(--vt-color-border,#202b46);background:var(--vt-color-surface-muted,#111629);flex-shrink:0;flex-wrap:wrap}',
    '.trash-title{font-size:.88rem;font-weight:650;color:var(--vt-color-text-primary,#f4f7fb)}',
    '.trash-count{font-size:.74rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.trash-spacer{flex:1}',
    '.trash-control{min-height:2rem;box-sizing:border-box;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-surface,#15152c);color:var(--vt-color-text-primary,#f4f7fb);font:inherit;font-size:.78rem;padding:.35rem .5rem}',
    '.trash-search{min-width:12rem;flex:1 1 14rem}',
    '.trash-select{max-width:11rem;appearance:none;background-color:var(--vt-color-surface,#15152c);background-image:linear-gradient(45deg,transparent 50%,var(--vt-color-text-muted,#7f8aa3) 50%),linear-gradient(135deg,var(--vt-color-text-muted,#7f8aa3) 50%,transparent 50%);background-position:calc(100% - 14px) 50%,calc(100% - 9px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;padding-right:1.7rem}.trash-select option{background:var(--vt-color-surface,#15152c);color:var(--vt-color-text-primary,#f4f7fb)}.trash-control:focus{outline:none;border-color:var(--vt-color-accent,#4ecca3);box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34))}',
    '.trash-btn{min-height:2rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-secondary,#b7c0d4);font:inherit;font-size:.78rem;padding:.35rem .6rem;cursor:pointer;white-space:nowrap}',
    '.trash-btn:hover:not(:disabled){border-color:var(--vt-color-accent,#4ecca3);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.trash-btn:disabled{opacity:.48;cursor:default}',
    '.trash-btn-danger{border-color:rgba(233,69,96,.52);color:#ffb4bf;background:var(--vt-color-danger-muted,rgba(233,69,96,.14))}',
    '.trash-status{min-height:1.25rem;padding:.4rem .75rem;border-bottom:1px solid rgba(32,43,70,.7);font-size:.76rem;color:var(--vt-color-text-muted,#7f8aa3);flex-shrink:0}',
    '.trash-status.error{color:#ffc6ce;background:rgba(233,69,96,.08)}',
    '.trash-list{flex:1;min-height:0;overflow:auto}',
    '.trash-header,.trash-row{display:grid;grid-template-columns:minmax(12rem,1.4fr) minmax(7rem,.75fr) minmax(14rem,1.6fr) minmax(8rem,.8fr) minmax(7rem,.65fr) auto;gap:.65rem;align-items:center;padding:.5rem .75rem;border-bottom:1px solid rgba(32,43,70,.72)}',
    '.trash-header{position:sticky;top:0;z-index:1;background:var(--vt-color-surface-muted,#111629);color:var(--vt-color-text-muted,#7f8aa3);font-size:.68rem;font-weight:650;letter-spacing:.02em;text-transform:uppercase}',
    '.trash-row:hover{background:var(--vt-color-surface-hover,#1b2440)}',
    '.trash-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.84rem;font-weight:600}',
    '.trash-meta{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--vt-color-text-secondary,#b7c0d4);font-size:.76rem}',
    '.trash-path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.trash-type{display:inline-flex;align-items:center;gap:.3rem;font-size:.72rem;color:var(--vt-color-text-secondary,#b7c0d4)}',
    '.trash-actions{display:flex;justify-content:flex-end;gap:.35rem}',
    '.trash-empty{height:100%;min-height:12rem;display:flex;align-items:center;justify-content:center;padding:2rem;color:var(--vt-color-text-muted,#7f8aa3);font-size:.88rem;text-align:center}',
    '.trash-confirm-backdrop{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(5,7,16,.7)}',
    '.trash-confirm{width:min(31rem,100%);border:1px solid rgba(233,69,96,.5);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface,#15152c);box-shadow:var(--vt-elevation-modal,0 16px 40px rgba(0,0,0,.45));padding:1rem}',
    '.trash-confirm h3{margin:0;font-size:1rem;font-weight:650}',
    '.trash-confirm p{margin:.55rem 0;color:var(--vt-color-text-secondary,#b7c0d4);font-size:.82rem;line-height:1.45;overflow-wrap:anywhere}',
    '.trash-confirm-path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.trash-confirm-actions{display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem}',
    '@media(max-width:900px){.trash-header{display:none}.trash-row{grid-template-columns:minmax(0,1fr) auto;gap:.45rem .75rem;padding:.7rem .75rem}.trash-row>span:nth-child(2),.trash-row>span:nth-child(3),.trash-row>span:nth-child(4),.trash-row>span:nth-child(5){grid-column:1}.trash-actions{grid-column:2;grid-row:1 / span 5;align-self:center;flex-direction:column}.trash-search{order:5;flex-basis:100%}.trash-select{max-width:none;flex:1 1 8rem}}'
  ].join('\n');

  function injectStyles() {
    if (document.getElementById('trash-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'trash-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      var value = attrs[key];
      if (value == null) return;
      if (key === 'className') node.className = value;
      else if (key === 'textContent') node.textContent = value;
      else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
      else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key === 'value') node.value = value;
      else if (key === 'disabled') node.disabled = !!value;
      else node.setAttribute(key, value);
    });
    (Array.isArray(children) ? children : [children]).forEach(function (child) {
      if (child == null) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function text(value) {
    return String(value == null ? '' : value);
  }

  function cleanPath(value) {
    return text(value).split('/').filter(Boolean).join('/');
  }

  function nameFor(entry) {
    var path = cleanPath(entry && entry.originalPath);
    return text(entry && entry.basename).trim() || path.split('/').pop() || 'Untitled item';
  }

  function workspaceFor(entry) {
    return cleanPath(entry && entry.originalPath).split('/')[0] || 'Vault root';
  }

  function directoryFor(entry) {
    var path = cleanPath(entry && entry.originalPath);
    var parts = path.split('/');
    parts.pop();
    return parts.join('/') || '/';
  }

  function typeLabel(entry) {
    var t = entry && entry.originalType;
    if (t === 'workspace') return 'Deal';
    if (t === 'folder') return 'Folder';
    return 'File';
  }

  function formatSize(value) {
    var size = Number(value);
    if (!Number.isFinite(size) || size <= 0) return '';
    var units = ['B', 'KB', 'MB', 'GB'];
    var unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return (unit === 0 ? String(Math.round(size)) : size.toFixed(size >= 10 ? 0 : 1)) + ' ' + units[unit];
  }

  function formatDate(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return text(value);
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  function errorText(error) {
    return error && error.message ? error.message : text(error);
  }

  function isConflict(error) {
    return /conflict:/i.test(errorText(error));
  }

  function sortEntries(entries, mode) {
    return entries.slice().sort(function (left, right) {
      if (mode === 'date-asc') return text(left.deletedAt).localeCompare(text(right.deletedAt)) || text(left.trashId).localeCompare(text(right.trashId));
      if (mode === 'name-asc') return nameFor(left).localeCompare(nameFor(right), undefined, { sensitivity: 'base' });
      if (mode === 'type-asc') return typeLabel(left).localeCompare(typeLabel(right)) || nameFor(left).localeCompare(nameFor(right));
      return text(right.deletedAt).localeCompare(text(left.deletedAt)) || text(right.trashId).localeCompare(text(left.trashId));
    });
  }

  var TrashView = {
    mount: function (containerEl, props, api) {
      injectStyles();
      var state = {
        entries: [],
        workspace: '',
        query: '',
        type: '',
        sort: 'date-desc',
        loading: true,
        busyId: '',
        confirmingId: '',
        status: '',
        statusError: false,
        disposed: false
      };
      function tr(key, params, fallback) {
        if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
        return fallback || key;
      }

      function workspaceOptions() {
        var values = {};
        state.entries.forEach(function (entry) { values[workspaceFor(entry)] = true; });
        return Object.keys(values).sort(function (left, right) { return left.localeCompare(right); });
      }

      function visibleEntries() {
        var query = state.query.trim().toLowerCase();
        return sortEntries(state.entries.filter(function (entry) {
          if (state.workspace && workspaceFor(entry) !== state.workspace) return false;
          if (state.type && text(entry.originalType) !== state.type) return false;
          if (!query) return true;
          return [nameFor(entry), entry.originalPath, directoryFor(entry), workspaceFor(entry)].join(' ').toLowerCase().indexOf(query) !== -1;
        }), state.sort);
      }

      function statusText(entries) {
        if (state.loading) return tr('ui.loading', null, 'Loading deleted items...');
        if (state.status) return state.status;
        return tr('ui.count', { count: entries.length }, entries.length === 1 ? '1 deleted item' : entries.length + ' deleted items');
      }

      function renderConfirmation() {
        var entry = state.entries.find(function (item) { return item.trashId === state.confirmingId; });
        if (!entry) return null;
        return el('div', { className: 'trash-confirm-backdrop', 'data-trash-confirm': entry.trashId }, [
          el('section', { className: 'trash-confirm', role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('ui.deletePermanently', null, 'Delete permanently') }, [
            el('h3', {}, [tr('ui.deleteQuestion', null, 'Delete permanently?')]),
            el('p', {}, [tr('ui.cannotUndo', null, 'This cannot be undone.')]),
            el('p', { className: 'trash-confirm-path' }, [entry.originalPath || nameFor(entry)]),
            el('div', { className: 'trash-confirm-actions' }, [
              el('button', {
                className: 'trash-btn',
                type: 'button',
                'data-trash-confirm-cancel': entry.trashId,
                onClick: function () { state.confirmingId = ''; render(); }
              }, [tr('ui.cancel', null, 'Cancel')]),
              el('button', {
                className: 'trash-btn trash-btn-danger',
                type: 'button',
                disabled: state.busyId === entry.trashId,
                'data-trash-confirm-delete': entry.trashId,
                onClick: function () { deletePermanently(entry); }
              }, [state.busyId === entry.trashId ? tr('ui.deleting', null, 'Deleting...') : tr('ui.deletePermanently', null, 'Delete permanently')])
            ])
          ])
        ]);
      }

      function render() {
        var rows = visibleEntries();
        containerEl.innerHTML = '';
        containerEl.className = 'trash-root';
        containerEl.setAttribute('data-plugin-id', PLUGIN_ID);

        var workspaceSelect = el('select', {
          className: 'trash-control trash-select',
          value: state.workspace,
          'data-trash-filter-workspace': '',
          onChange: function (event) { state.workspace = event.target.value; render(); }
        }, [el('option', { value: '' }, [tr('ui.allWorkspaces', null, 'All Deals')])]);
        workspaceOptions().forEach(function (workspace) {
          workspaceSelect.appendChild(el('option', { value: workspace }, [workspace]));
        });

        var typeSelect = el('select', {
          className: 'trash-control trash-select',
          value: state.type,
          'data-trash-filter-type': '',
          onChange: function (event) { state.type = event.target.value; render(); }
        }, [
          el('option', { value: '' }, [tr('ui.allTypes', null, 'All types')]),
          el('option', { value: 'file' }, [tr('ui.files', null, 'Files')]),
          el('option', { value: 'folder' }, [tr('ui.folders', null, 'Folders')]),
          el('option', { value: 'workspace' }, [tr('ui.workspaces', null, 'Deals')])
        ]);

        var sortSelect = el('select', {
          className: 'trash-control trash-select',
          value: state.sort,
          'data-trash-sort': '',
          onChange: function (event) { state.sort = event.target.value; render(); }
        }, [
          el('option', { value: 'date-desc' }, [tr('ui.newest', null, 'Deleted: newest')]),
          el('option', { value: 'date-asc' }, [tr('ui.oldest', null, 'Deleted: oldest')]),
          el('option', { value: 'name-asc' }, [tr('ui.name', null, 'Name')]),
          el('option', { value: 'type-asc' }, [tr('ui.type', null, 'Type')])
        ]);

        containerEl.appendChild(el('div', { className: 'trash-toolbar' }, [
          el('span', { className: 'trash-title' }, [tr('ui.title', null, 'Trash')]),
          el('span', { className: 'trash-count' }, [tr('ui.total', { count: state.entries.length }, state.entries.length + ' total')]),
          el('span', { className: 'trash-spacer' }),
          el('input', {
            className: 'trash-control trash-search',
            type: 'search',
            value: state.query,
            placeholder: tr('ui.filter', null, 'Filter name or path'),
            'data-trash-filter-search': '',
            onInput: function (event) { state.query = event.target.value; render(); }
          }),
          workspaceSelect,
          typeSelect,
          sortSelect,
          el('button', { className: 'trash-btn', type: 'button', onClick: loadEntries }, [tr('ui.refresh', null, 'Refresh')])
        ]));
        containerEl.appendChild(el('div', {
          className: 'trash-status' + (state.statusError ? ' error' : ''),
          'data-trash-status': ''
        }, [statusText(rows)]));

        var list = el('div', { className: 'trash-list', 'data-trash-list': '' });
        list.appendChild(el('div', { className: 'trash-header' }, [
          el('span', {}, [tr('ui.name', null, 'Name')]),
          el('span', {}, [tr('ui.workspace', null, 'Deal')]),
          el('span', {}, [tr('ui.originalPath', null, 'Original path')]),
          el('span', {}, [tr('ui.deleted', null, 'Deleted')]),
          el('span', {}, [tr('ui.typeSize', null, 'Type / size')]),
          el('span', {}, [tr('ui.actions', null, 'Actions')])
        ]));
        if (state.loading) {
          list.appendChild(el('div', { className: 'trash-empty' }, [tr('ui.loading', null, 'Loading deleted items...')]));
        } else if (!rows.length) {
          list.appendChild(el('div', { className: 'trash-empty' }, [state.entries.length ? tr('ui.noMatches', null, 'No deleted items match the current filters.') : tr('ui.empty', null, 'Trash is empty.')]));
        } else {
          rows.forEach(function (entry) {
            var size = formatSize(entry.size);
            list.appendChild(el('div', {
              className: 'trash-row',
              'data-trash-row': entry.trashId,
              'data-trash-workspace': workspaceFor(entry)
            }, [
              el('span', { className: 'trash-name', title: nameFor(entry) }, [nameFor(entry)]),
              el('span', { className: 'trash-meta', title: workspaceFor(entry) }, [workspaceFor(entry)]),
              el('span', { className: 'trash-meta trash-path', title: entry.originalPath || '' }, [entry.originalPath || directoryFor(entry)]),
              el('span', { className: 'trash-meta' }, [formatDate(entry.deletedAt)]),
              el('span', { className: 'trash-type' }, [typeLabel(entry) + (size ? ' - ' + size : '')]),
              el('div', { className: 'trash-actions' }, [
                el('button', {
                  className: 'trash-btn',
                  type: 'button',
                  disabled: state.busyId === entry.trashId,
                  'data-trash-restore': entry.trashId,
                  onClick: function () { restoreEntry(entry); }
                }, [state.busyId === entry.trashId ? tr('ui.restoring', null, 'Restoring...') : tr('ui.restore', null, 'Restore')]),
                el('button', {
                  className: 'trash-btn trash-btn-danger',
                  type: 'button',
                  disabled: state.busyId === entry.trashId,
                  'data-trash-delete': entry.trashId,
                  onClick: function () { state.confirmingId = entry.trashId; render(); }
                }, [tr('ui.deletePermanently', null, 'Delete permanently')])
              ])
            ]));
          });
        }
        containerEl.appendChild(list);
        var confirmation = renderConfirmation();
        if (confirmation) containerEl.appendChild(confirmation);
      }

      function restoreEntry(entry) {
        if (!entry || !entry.trashId || !api.files || typeof api.files.restoreTrash !== 'function') return;
        state.busyId = entry.trashId;
        state.status = '';
        state.statusError = false;
        render();
        api.files.restoreTrash(entry.trashId, { overwrite: false }).then(function () {
          if (state.disposed) return;
          state.entries = state.entries.filter(function (item) { return item.trashId !== entry.trashId; });
          state.busyId = '';
          state.status = 'Restored ' + nameFor(entry) + '.';
          window.dispatchEvent(new CustomEvent('verstak:workspace-tree-changed'));
          render();
        }).catch(function (error) {
          if (state.disposed) return;
          state.busyId = '';
          state.statusError = true;
          state.status = isConflict(error)
            ? 'Restore blocked: an item already exists at the original path. Nothing was overwritten.'
            : 'Restore failed: ' + errorText(error);
          render();
        });
      }

      function deletePermanently(entry) {
        if (!entry || !entry.trashId || !api.files || typeof api.files.deleteTrash !== 'function') return;
        state.busyId = entry.trashId;
        state.status = '';
        state.statusError = false;
        render();
        api.files.deleteTrash(entry.trashId).then(function () {
          if (state.disposed) return;
          state.entries = state.entries.filter(function (item) { return item.trashId !== entry.trashId; });
          state.busyId = '';
          state.confirmingId = '';
          state.status = 'Permanently deleted ' + nameFor(entry) + '.';
          render();
        }).catch(function (error) {
          if (state.disposed) return;
          state.busyId = '';
          state.statusError = true;
          state.status = 'Permanent delete failed: ' + errorText(error);
          render();
        });
      }

      function loadEntries() {
        if (!api.files || typeof api.files.listTrash !== 'function') {
          state.loading = false;
          state.statusError = true;
          state.status = 'Trash is unavailable for this plugin configuration.';
          render();
          return;
        }
        state.loading = true;
        state.status = '';
        state.statusError = false;
        render();
        api.files.listTrash().then(function (entries) {
          if (state.disposed) return;
          state.entries = Array.isArray(entries) ? entries : [];
          state.loading = false;
          render();
        }).catch(function (error) {
          if (state.disposed) return;
          state.entries = [];
          state.loading = false;
          state.statusError = true;
          state.status = 'Could not load Trash: ' + errorText(error);
          render();
        });
      }

      loadEntries();
      var localeUnsubscribe = api.i18n && typeof api.i18n.onDidChangeLocale === 'function'
        ? api.i18n.onDidChangeLocale(render)
        : null;
      containerEl.__trashCleanup = function () {
        state.disposed = true;
        if (typeof localeUnsubscribe === 'function') localeUnsubscribe();
        containerEl.innerHTML = '';
      };
    },
    unmount: function (containerEl) {
      if (containerEl && typeof containerEl.__trashCleanup === 'function') containerEl.__trashCleanup();
    }
  };

  window.VerstakPluginRegister(PLUGIN_ID, { components: { TrashView: TrashView } });
})();
