/* ===========================================================
   Secrets Plugin - Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  var PLUGIN_ID = 'verstak.secrets';
  var ScopeGlobal = 'global';
  var ScopeWorkspace = 'workspace';

  function injectStyles() {
    if (document.getElementById('secrets-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'secrets-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  var STYLES = [
    '.secrets-root{display:grid;grid-template-columns:minmax(17rem,20rem) minmax(0,1fr);height:100%;min-height:0;background:var(--vt-color-background,#101020);color:var(--vt-color-text-primary,#f4f7fb);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '.secrets-panel{min-height:0;overflow:auto;border-right:1px solid var(--vt-color-border,#202b46);background:var(--vt-color-surface-muted,#111629)}',
    '.secrets-main{min-width:0;min-height:0;overflow:auto;padding:1rem;background:var(--vt-color-background,#101020)}',
    '.secrets-toolbar{display:flex;align-items:center;gap:.5rem;min-height:2.75rem;padding:.65rem .75rem;border-bottom:1px solid var(--vt-color-border,#202b46)}',
    '.secrets-filters{display:grid;grid-template-columns:minmax(0,1fr) minmax(8rem,.8fr);gap:.4rem;padding:.5rem .55rem;border-bottom:1px solid var(--vt-color-border,#202b46)}',
    '.secrets-title{font-weight:600;font-size:.88rem}',
    '.secrets-count{color:var(--vt-color-text-muted,#7f8aa3);font-size:.76rem}',
    '.secrets-spacer{flex:1}',
    '.secrets-btn{height:2rem;padding:0 .65rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-secondary,#b7c0d4);font:inherit;font-size:.78rem;cursor:pointer}',
    '.secrets-btn:hover{border-color:var(--vt-color-accent,#4ecca3);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.secrets-btn.primary{background:var(--vt-color-accent,#4ecca3);border-color:var(--vt-color-accent,#4ecca3);color:#101827}',
    '.secrets-btn.danger{border-color:rgba(233,69,96,.5);color:#ff9aaa;background:var(--vt-color-danger-muted,rgba(233,69,96,.14))}',
    '.secrets-btn:disabled{opacity:.45;cursor:default}',
    '.secrets-group{padding:.6rem .55rem .25rem;color:var(--vt-color-text-muted,#7f8aa3);font-size:.72rem;text-transform:uppercase;letter-spacing:.04em}',
    '.secrets-list{display:grid;gap:.25rem;padding:.2rem .45rem .75rem}',
    '.secrets-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.45rem;align-items:center;text-align:left;border:1px solid transparent;border-radius:var(--vt-radius-md,6px);background:transparent;color:var(--vt-color-text-secondary,#b7c0d4);padding:.5rem .55rem;cursor:pointer}',
    '.secrets-item:hover{background:var(--vt-color-surface-hover,#1b2440);border-color:var(--vt-color-border,#202b46)}',
    '.secrets-item.active{background:var(--vt-color-surface-selected,rgba(78,204,163,.14));border-color:rgba(78,204,163,.45);box-shadow:inset 2px 0 0 var(--vt-color-accent,#4ecca3)}',
    '.secrets-item-title{font-size:.82rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.secrets-item-meta{font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3);margin-top:.12rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.secrets-empty{padding:1.5rem;color:var(--vt-color-text-muted,#7f8aa3);font-size:.84rem;text-align:center}',
    '.secrets-card{max-width:46rem;display:grid;gap:.8rem}',
    '.secrets-card h2{font-size:1rem;margin:0;color:var(--vt-color-text-primary,#f4f7fb)}',
    '.secrets-form{display:grid;gap:.65rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);padding:.9rem;background:var(--vt-color-surface,#15152c)}',
    '.secrets-row{display:grid;grid-template-columns:8rem minmax(0,1fr);gap:.65rem;align-items:center}',
    '.secrets-label{font-size:.78rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.secrets-input,.secrets-textarea,.secrets-select,.secrets-search{width:100%;box-sizing:border-box;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:#0f1424;color:var(--vt-color-text-primary,#f4f7fb);font:inherit;font-size:.84rem;padding:.45rem .55rem;outline:none}',
    '.secrets-search{font-size:.76rem}',
    '.secrets-select{appearance:none;background-color:#0d1117;background-image:linear-gradient(45deg,transparent 50%,#8b949e 50%),linear-gradient(135deg,#8b949e 50%,transparent 50%);background-position:calc(100% - 16px) 50%,calc(100% - 11px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;padding-right:2rem}.secrets-select option{background:#0d1117;color:var(--vt-color-text-primary,#f4f7fb)}',
    '.secrets-textarea{min-height:6rem;resize:vertical;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}',
    '.secrets-input:focus,.secrets-textarea:focus,.secrets-select:focus,.secrets-search:focus{border-color:var(--vt-color-accent,#4ecca3);box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34))}',
    '.secrets-actions{display:flex;gap:.5rem;flex-wrap:wrap}',
    '.secrets-status{font-size:.78rem;color:var(--vt-color-text-muted,#7f8aa3);min-height:1rem}',
    '.secrets-status.error{color:#ffc6ce}',
    '.secrets-secret-value{white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid var(--vt-color-border-strong,#2c456a);background:#0f1424;border-radius:var(--vt-radius-sm,4px);padding:.7rem;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.82rem}',
    '.secrets-hidden-value{display:inline-flex;align-items:center;min-height:2rem;width:100%;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:#0f1424;color:var(--vt-color-text-muted,#7f8aa3);padding:.35rem .55rem;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.08em}',
    '.secrets-table{width:100%;border-collapse:collapse;border:1px solid var(--vt-color-border,#202b46);background:var(--vt-color-surface,#15152c);border-radius:var(--vt-radius-lg,8px);overflow:hidden}',
    '.secrets-table th,.secrets-table td{border-bottom:1px solid var(--vt-color-border,#202b46);padding:.55rem .65rem;text-align:left;vertical-align:top;font-size:.84rem}',
    '.secrets-table th{width:9rem;color:var(--vt-color-text-muted,#7f8aa3);font-weight:500;background:var(--vt-color-surface-muted,#111629)}',
    '.secrets-table td{color:var(--vt-color-text-primary,#f4f7fb);overflow-wrap:anywhere}',
    '.secrets-table tr:last-child th,.secrets-table tr:last-child td{border-bottom:0}',
    '@media(max-width:780px){.secrets-root{grid-template-columns:1fr}.secrets-panel{border-right:0;border-bottom:1px solid #252b36;max-height:45vh}.secrets-row,.secrets-filters{grid-template-columns:1fr}}'
  ].join('\n');

  function el(tag, attrs, children) {
    var elem = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (attrs[key] == null) return;
        if (key === 'className') elem.className = attrs[key];
        else if (key.slice(0, 2) === 'on') elem.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
        else if (key === 'textContent') elem.textContent = attrs[key];
        else elem.setAttribute(key, attrs[key]);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (child) {
        if (child == null) return;
        elem.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
      });
    }
    return elem;
  }

  function text(value) {
    return String(value == null ? '' : value);
  }

  function cleanWorkspace(value) {
    return text(value).trim().replace(/^\/+|\/+$/g, '');
  }

  function workspaceFromProps(props) {
    var node = props && props.workspaceNode;
    return cleanWorkspace((props && (props.workspaceRootPath || props.workspaceName || props.workspaceNodeId))
      || (node && (node.rootPath || node.name || node.id)));
  }

  function scopeLabel(record) {
    var scope = record && record.scope || {};
    if (scope.kind === ScopeWorkspace) return cleanWorkspace(scope.workspaceRootPath) || 'Deal';
    return 'Global';
  }

  function selectedIDFromProps(props) {
    var resource = props && props.resource || {};
    var request = props && props.request || {};
    var path = text(resource.path || request.path || props && props.secretId);
    if (path.indexOf('verstak-secret://') === 0) return decodeURIComponent(path.slice('verstak-secret://'.length));
    return decodeURIComponent(path.replace(/^\/+/, ''));
  }

  function groupRecords(records) {
    var groups = {};
    records.forEach(function (record) {
      var label = scopeLabel(record);
      groups[label] = groups[label] || [];
      groups[label].push(record);
    });
    return Object.keys(groups).sort(function (a, b) {
      if (a === 'Global') return -1;
      if (b === 'Global') return 1;
      return a.localeCompare(b);
    }).map(function (label) {
      groups[label].sort(function (a, b) {
        return text(a.title || a.id).localeCompare(text(b.title || b.id));
      });
      return { label: label, records: groups[label] };
    });
  }

  function writeClipboard(api, value) {
    if (api && api.clipboard && typeof api.clipboard.writeText === 'function') return api.clipboard.writeText(value);
    if (window.navigator && window.navigator.clipboard && typeof window.navigator.clipboard.writeText === 'function') {
      return window.navigator.clipboard.writeText(value);
    }
    return Promise.reject(new Error('clipboard API unavailable'));
  }

  var SecretsView = {
    mount: function (containerEl, props, api) {
      injectStyles();
      containerEl.innerHTML = '';

      var disposed = false;
      var workspaceRoot = workspaceFromProps(props || {});
      var selectedID = selectedIDFromProps(props || {});
      var records = [];
      var workspaceOptions = [];
      var scopeFilter = 'all';
      var searchQuery = '';
      var selectedRecord = null;
      var selectedValue = '';
      var initialized = false;
      var unlocked = false;
      var statusText = '';
      var statusError = false;
      function tr(key, params, fallback) {
        if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
        return fallback || key;
      }

      function setStatus(message, isError) {
        statusText = message || '';
        statusError = !!isError;
        render();
      }

      function recordWorkspaceRoot(record) {
        var scope = record && record.scope || {};
        return scope.kind === ScopeWorkspace ? cleanWorkspace(scope.workspaceRootPath) : '';
      }

      function workspaceRoots() {
        var seen = {};
        var values = [];
        workspaceOptions.concat(records.map(recordWorkspaceRoot)).forEach(function (value) {
          value = cleanWorkspace(value);
          if (!value || seen[value]) return;
          seen[value] = true;
          values.push(value);
        });
        return values.sort(function (a, b) { return a.localeCompare(b); });
      }

      function filteredRecords() {
        var query = text(searchQuery).trim().toLowerCase();
        return records.filter(function (record) {
          var recordWorkspace = recordWorkspaceRoot(record);
          if (scopeFilter === ScopeGlobal && recordWorkspace) return false;
          if (scopeFilter.indexOf(ScopeWorkspace + ':') === 0 && recordWorkspace !== scopeFilter.slice((ScopeWorkspace + ':').length)) return false;
          if (!query) return true;
          return [record.title, record.id, record.username, recordWorkspace].some(function (value) {
            return text(value).toLowerCase().indexOf(query) !== -1;
          });
        });
      }

      function clearHiddenSelection() {
        if (!selectedRecord) return;
        var visible = filteredRecords();
        if (visible.some(function (record) { return record.id === selectedRecord.id; })) return;
        selectedRecord = null;
        selectedValue = '';
      }

      function loadWorkspaceOptions() {
        if (!api || !api.files || typeof api.files.list !== 'function') return Promise.resolve();
        return api.files.list('').then(function (items) {
          workspaceOptions = (Array.isArray(items) ? items : []).filter(function (item) {
            return text(item && item.type).toLowerCase() === 'folder';
          }).map(function (item) {
            return cleanWorkspace(item.relativePath || item.name);
          }).filter(function (value) {
            return value && value.indexOf('/') === -1;
          });
        }).catch(function () {
          workspaceOptions = [];
        });
      }

      function renderLocked() {
        var passwordInput = el('input', {
          className: 'secrets-input',
          type: 'password',
          'data-secret-master-password': '',
          placeholder: tr('ui.masterPassword', null, 'Master password')
        });
        var confirmInput = initialized ? null : el('input', {
          className: 'secrets-input',
          type: 'password',
          'data-secret-master-password-confirm': '',
          placeholder: tr('ui.repeatPassword', null, 'Repeat master password')
        });
        var unlockBtn = el('button', {
          className: 'secrets-btn primary',
          type: 'button',
          'data-secret-unlock': '',
          onClick: function () {
            if (!initialized && passwordInput.value !== confirmInput.value) {
              setStatus(tr('ui.passwordMismatch', null, 'Master passwords do not match'), true);
              return;
            }
            unlockBtn.disabled = true;
            api.secrets.unlock(passwordInput.value).then(function () {
              initialized = true;
              unlocked = true;
              return loadRecords();
            }).catch(function (err) {
              unlockBtn.disabled = false;
              setStatus((err && err.message) ? err.message : String(err), true);
            });
          }
        }, [tr('ui.unlock', null, 'Unlock')]);
        if (!initialized) unlockBtn.textContent = tr('ui.createMaster', null, 'Create master password');
        var rows = [
          el('div', { className: 'secrets-row' }, [
            el('label', { className: 'secrets-label' }, [tr('ui.password', null, 'Password')]),
            passwordInput
          ])
        ];
        if (confirmInput) {
          rows.push(el('div', { className: 'secrets-row' }, [
            el('label', { className: 'secrets-label' }, [tr('ui.repeat', null, 'Repeat')]),
            confirmInput
          ]));
        }
        rows.push(el('div', { className: 'secrets-actions' }, [unlockBtn]));
        rows.push(el('div', { className: statusError ? 'secrets-status error' : 'secrets-status' }, [statusText]));
        containerEl.innerHTML = '';
        containerEl.appendChild(el('div', { className: 'secrets-root' }, [
          el('div', { className: 'secrets-panel' }, [
            el('div', { className: 'secrets-toolbar' }, [
              el('span', { className: 'secrets-title' }, [tr('ui.title', null, 'Secrets')])
            ])
          ]),
          el('div', { className: 'secrets-main' }, [
            el('div', { className: 'secrets-card' }, [
              el('h2', {}, [initialized ? tr('ui.unlockSecrets', null, 'Unlock secrets') : tr('ui.createMaster', null, 'Create master password')]),
              el('div', { className: 'secrets-form' }, rows)
            ])
          ])
        ]));
      }

      function renderList() {
        var visibleRecords = filteredRecords();
        var scopeSelect = el('select', {
          className: 'secrets-select',
          'data-secret-scope-filter': '',
          onChange: function (event) {
            scopeFilter = text(event.target.value) || 'all';
            clearHiddenSelection();
            render();
          }
        }, [
          el('option', { value: 'all' }, [tr('ui.scopeAll', null, 'All scopes')]),
          el('option', { value: ScopeGlobal }, [tr('ui.global', null, 'Global')])
        ].concat(workspaceRoots().map(function (workspace) {
          return el('option', { value: ScopeWorkspace + ':' + workspace }, [workspace]);
        })));
        scopeSelect.value = scopeFilter;
        var searchInput = el('input', {
          className: 'secrets-search',
          type: 'search',
          'data-secret-search': '',
          placeholder: tr('ui.search', null, 'Search secrets'),
          value: searchQuery,
          onInput: function (event) {
            searchQuery = text(event.target.value);
            clearHiddenSelection();
            render();
          }
        });
        var children = [
          el('div', { className: 'secrets-toolbar' }, [
            el('span', { className: 'secrets-title' }, [tr('ui.title', null, 'Secrets')]),
            el('span', { className: 'secrets-count' }, [String(visibleRecords.length)]),
            el('span', { className: 'secrets-spacer' }),
            el('button', { className: 'secrets-btn', type: 'button', onClick: showNewSecret }, [tr('ui.new', null, 'New')])
          ]),
          el('div', { className: 'secrets-filters' }, [searchInput, scopeSelect])
        ];
        if (!visibleRecords.length) {
          children.push(el('div', { className: 'secrets-empty' }, [tr('ui.empty', null, 'No secrets')]));
          return children;
        }
        groupRecords(visibleRecords).forEach(function (group) {
          children.push(el('div', { className: 'secrets-group' }, [group.label]));
          children.push(el('div', { className: 'secrets-list' }, group.records.map(function (record) {
            var active = selectedRecord && selectedRecord.id === record.id;
            return el('button', {
              className: active ? 'secrets-item active' : 'secrets-item',
              type: 'button',
              onClick: function () { selectRecord(record.id); }
            }, [
              el('span', {}, [
                el('span', { className: 'secrets-item-title' }, [record.title || record.id]),
                el('span', { className: 'secrets-item-meta' }, [record.username ? record.username + ' · ' + record.id : record.id])
              ])
            ]);
          })));
        });
        return children;
      }

      function renderSelected() {
        if (!selectedRecord) return el('div', { className: 'secrets-card' }, [
          el('h2', {}, [tr('ui.select', null, 'Select a secret')]),
          el('div', { className: statusError ? 'secrets-status error' : 'secrets-status' }, [statusText])
        ]);
        return el('div', { className: 'secrets-card' }, [
          el('h2', {}, [selectedRecord.title || selectedRecord.id]),
          el('table', { className: 'secrets-table' }, [
            el('tbody', {}, [
              fieldRow(tr('ui.group', null, 'Group'), scopeLabel(selectedRecord)),
              fieldRow('ID', selectedRecord.id),
              fieldRow(tr('ui.username', null, 'Username'), selectedRecord.username || ''),
              fieldRow(tr('ui.password', null, 'Password'), selectedValue ? selectedValue : '••••••••••••', selectedValue ? '' : 'secrets-hidden-value'),
              fieldRow(tr('ui.updated', null, 'Updated'), selectedRecord.updatedAt || '')
            ])
          ]),
          el('div', { className: 'secrets-actions' }, [
            el('button', {
              className: 'secrets-btn',
              type: 'button',
              'data-secret-copy-link': selectedRecord.id,
              onClick: function () { copySecretLink(selectedRecord.id); }
            }, [tr('ui.copyLink', null, 'Copy secret link')]),
            el('button', {
              className: 'secrets-btn',
              type: 'button',
              'data-secret-edit': selectedRecord.id,
              onClick: function () { showEditSecret(); }
            }, [tr('ui.edit', null, 'Edit')]),
            el('button', {
              className: 'secrets-btn danger',
              type: 'button',
              'data-secret-delete': selectedRecord.id,
              onClick: function () { deleteSecret(selectedRecord.id); }
            }, [tr('ui.delete', null, 'Delete')])
          ]),
          el('div', { className: statusError ? 'secrets-status error' : 'secrets-status' }, [statusText])
        ]);
      }

      function fieldRow(label, value, valueClass) {
        return el('tr', {}, [
          el('th', {}, [label]),
          el('td', {}, [valueClass ? el('span', { className: valueClass }, [value || '']) : (value || '')])
        ]);
      }

      function renderSecretForm(existing) {
        var isEdit = !!existing;
        var title = el('input', { className: 'secrets-input', type: 'text', 'data-secret-title': '', placeholder: tr('ui.fieldTitle', null, 'Title') });
        title.value = existing ? text(existing.title) : '';
        var id = el('input', { className: 'secrets-input', type: 'text', placeholder: 'stable.id' });
        id.value = existing ? text(existing.id) : '';
        id.disabled = isEdit;
        var username = el('input', { className: 'secrets-input', type: 'text', placeholder: tr('ui.optionalUsername', null, 'optional username') });
        username.value = existing ? text(existing.username) : '';
        var value = el('textarea', { className: 'secrets-textarea', 'data-secret-value': '', placeholder: tr('ui.secretValue', null, 'Secret value') });
        value.value = isEdit ? selectedValue : '';
        var scope = el('select', { className: 'secrets-select' }, [
          el('option', { value: ScopeGlobal }, [tr('ui.global', null, 'Global')]),
          el('option', { value: ScopeWorkspace }, [tr('ui.deal', null, 'Deal')])
        ]);
        scope.setAttribute('data-secret-scope', '');
        var existingWorkspace = existing ? recordWorkspaceRoot(existing) : '';
        var defaultWorkspace = existingWorkspace || workspaceRoot || workspaceRoots()[0] || '';
        var workspace = el('select', { className: 'secrets-select', 'data-secret-workspace': '' }, [
          el('option', { value: '' }, [tr('ui.chooseWorkspace', null, 'Choose a Deal')])
        ].concat(workspaceRoots().map(function (item) {
          return el('option', { value: item }, [item]);
        })));
        workspace.value = defaultWorkspace;
        var workspaceRow = el('div', { className: 'secrets-row' }, [
          el('label', { className: 'secrets-label' }, [tr('ui.deal', null, 'Deal')]), workspace
        ]);
        function updateWorkspaceVisibility() {
          workspaceRow.hidden = scope.value !== ScopeWorkspace;
        }
        scope.addEventListener('change', updateWorkspaceVisibility);
        scope.value = existing && existing.scope && existing.scope.kind ? existing.scope.kind : (workspaceRoot ? ScopeWorkspace : ScopeGlobal);
        updateWorkspaceVisibility();
        return el('div', { className: 'secrets-card' }, [
          el('h2', {}, [isEdit ? tr('ui.editSecret', null, 'Edit secret') : tr('ui.newSecret', null, 'New secret')]),
          el('div', { className: 'secrets-form' }, [
            el('div', { className: 'secrets-row' }, [el('label', { className: 'secrets-label' }, [tr('ui.fieldTitle', null, 'Title')]), title]),
            el('div', { className: 'secrets-row' }, [el('label', { className: 'secrets-label' }, ['ID']), id]),
            el('div', { className: 'secrets-row' }, [el('label', { className: 'secrets-label' }, [tr('ui.username', null, 'Username')]), username]),
            el('div', { className: 'secrets-row' }, [el('label', { className: 'secrets-label' }, [tr('ui.scope', null, 'Scope')]), scope]),
            workspaceRow,
            el('div', { className: 'secrets-row' }, [el('label', { className: 'secrets-label' }, [tr('ui.value', null, 'Value')]), value]),
            el('div', { className: 'secrets-actions' }, [
              el('button', {
                className: 'secrets-btn primary',
                type: 'button',
                'data-secret-save': '',
                onClick: function () {
                  var nextID = text(id.value).trim() || text(title.value).trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '.').replace(/^\.+|\.+$/g, '');
                  var targetWorkspace = cleanWorkspace(workspace.value);
                  if (scope.value === ScopeWorkspace && !targetWorkspace) {
                    setStatus(tr('ui.workspaceRequired', null, 'Choose a Deal for this secret.'), true);
                    return;
                  }
                  api.secrets.write({
                    id: nextID,
                    title: text(title.value).trim() || nextID,
                    username: text(username.value).trim(),
                    value: text(value.value),
                    scope: scope.value === ScopeWorkspace ? { kind: ScopeWorkspace, workspaceRootPath: targetWorkspace } : { kind: ScopeGlobal }
                  }).then(function (record) {
                    selectedID = record.id;
                    selectedRecord = record;
                    selectedValue = '';
                    return loadRecords();
                  }).catch(function (err) {
                    setStatus((err && err.message) ? err.message : String(err), true);
                  });
                }
              }, [tr('ui.save', null, 'Save')]),
              el('button', { className: 'secrets-btn', type: 'button', onClick: function () { mode = 'selected'; render(); } }, [tr('ui.cancel', null, 'Cancel')])
            ]),
            el('div', { className: statusError ? 'secrets-status error' : 'secrets-status' }, [statusText])
          ])
        ]);
      }

      var mode = 'selected';

      function render() {
        if (disposed) return;
        if (!unlocked) {
          renderLocked();
          return;
        }
        containerEl.innerHTML = '';
        containerEl.appendChild(el('div', { className: 'secrets-root' }, [
          el('div', { className: 'secrets-panel' }, renderList()),
          el('div', { className: 'secrets-main' }, [
            mode === 'new' ? renderSecretForm(null) : mode === 'edit' ? renderSecretForm(selectedRecord) : renderSelected()
          ])
        ]));
      }

      function loadRecords() {
        return api.secrets.list().then(function (items) {
          records = Array.isArray(items) ? items : [];
          var wanted = selectedID || (selectedRecord && selectedRecord.id) || '';
          if (wanted) {
            var found = records.find(function (record) { return record.id === wanted; });
            if (found) return selectRecord(found.id);
            selectedRecord = null;
            selectedValue = '';
            mode = 'selected';
            statusText = tr('ui.requestedUnavailable', null, 'The requested secret is unavailable.');
            statusError = true;
            render();
            return;
          }
          selectedRecord = records[0] || null;
          selectedValue = '';
          mode = 'selected';
          render();
        });
      }

      function selectRecord(id) {
        mode = 'selected';
        selectedID = id;
        selectedRecord = records.find(function (record) { return record.id === id; }) || null;
        selectedValue = '';
        render();
        if (!id) return Promise.resolve();
        return api.secrets.read(id).then(function (record) {
          if (disposed) return;
          selectedRecord = record;
          selectedValue = text(record.value);
          render();
        }).catch(function (err) {
          if (disposed) return;
          setStatus((err && err.message) ? err.message : String(err), true);
        });
      }

      function showNewSecret() {
        mode = 'new';
        statusText = '';
        statusError = false;
        render();
      }

      function showEditSecret() {
        if (!selectedRecord) return;
        mode = 'edit';
        statusText = '';
        statusError = false;
        render();
      }

      function deleteSecret(id) {
        if (!id || !window.confirm(tr('ui.deleteConfirm', null, 'Delete this secret?'))) return;
        api.secrets.delete(id).then(function () {
          selectedID = '';
          selectedRecord = null;
          selectedValue = '';
          return loadRecords();
        }).catch(function (err) {
          setStatus((err && err.message) ? err.message : String(err), true);
        });
      }

      function copySecretLink(id) {
        api.secrets.copyLink(id).then(function (link) {
          return writeClipboard(api, link).then(function () {
            setStatus(tr('ui.linkCopied', null, 'Secret link copied'), false);
          });
        }).catch(function (err) {
          setStatus((err && err.message) ? err.message : String(err), true);
        });
      }

      api.secrets.status().then(function (status) {
        initialized = !!(status && status.initialized);
        unlocked = !!(status && status.unlocked);
        if (unlocked) return loadWorkspaceOptions().then(loadRecords);
        render();
      }).catch(function (err) {
        statusText = (err && err.message) ? err.message : String(err);
        statusError = true;
        renderLocked();
      });

      var localeUnsubscribe = api.i18n && typeof api.i18n.onDidChangeLocale === 'function'
        ? api.i18n.onDidChangeLocale(render)
        : null;

      containerEl.__secretsCleanup = function () {
        disposed = true;
        if (typeof localeUnsubscribe === 'function') localeUnsubscribe();
      };
    },

    unmount: function (containerEl) {
      if (containerEl.__secretsCleanup) {
        containerEl.__secretsCleanup();
        containerEl.__secretsCleanup = null;
      }
      containerEl.innerHTML = '';
    }
  };

  window.VerstakPluginRegister(PLUGIN_ID, {
    components: { SecretsView: SecretsView }
  });
})();
