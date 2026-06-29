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
    '.secrets-root{display:grid;grid-template-columns:minmax(17rem,20rem) minmax(0,1fr);height:100%;min-height:0;background:#0d0f14;color:#e6edf3;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '.secrets-panel{min-height:0;overflow:auto;border-right:1px solid #252b36;background:#11151d}',
    '.secrets-main{min-width:0;min-height:0;overflow:auto;padding:1rem;background:#0d0f14}',
    '.secrets-toolbar{display:flex;align-items:center;gap:.5rem;padding:.65rem .75rem;border-bottom:1px solid #252b36}',
    '.secrets-title{font-weight:600;font-size:.88rem}',
    '.secrets-count{color:#8b949e;font-size:.76rem}',
    '.secrets-spacer{flex:1}',
    '.secrets-btn{height:2rem;padding:0 .65rem;border:1px solid #303844;border-radius:4px;background:#1b222d;color:#d8dee9;font:inherit;font-size:.78rem;cursor:pointer}',
    '.secrets-btn:hover{border-color:#56b6c2;background:#222b38}',
    '.secrets-btn.primary{background:#176b5f;border-color:#248879;color:white}',
    '.secrets-btn:disabled{opacity:.45;cursor:default}',
    '.secrets-group{padding:.6rem .55rem .25rem;color:#8b949e;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em}',
    '.secrets-list{display:grid;gap:.25rem;padding:.2rem .45rem .75rem}',
    '.secrets-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.45rem;align-items:center;text-align:left;border:1px solid transparent;border-radius:5px;background:transparent;color:#d8dee9;padding:.5rem .55rem;cursor:pointer}',
    '.secrets-item:hover{background:#171d27;border-color:#293241}',
    '.secrets-item.active{background:#18232f;border-color:#56b6c2}',
    '.secrets-item-title{font-size:.82rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.secrets-item-meta{font-size:.72rem;color:#8b949e;margin-top:.12rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.secrets-empty{padding:1.5rem;color:#8b949e;font-size:.84rem;text-align:center}',
    '.secrets-card{max-width:46rem;display:grid;gap:.8rem}',
    '.secrets-card h2{font-size:1rem;margin:0;color:#f0f6fc}',
    '.secrets-form{display:grid;gap:.65rem;border:1px solid #252b36;border-radius:6px;padding:.9rem;background:#11151d}',
    '.secrets-row{display:grid;grid-template-columns:8rem minmax(0,1fr);gap:.65rem;align-items:center}',
    '.secrets-label{font-size:.78rem;color:#8b949e}',
    '.secrets-input,.secrets-textarea,.secrets-select{width:100%;box-sizing:border-box;border:1px solid #303844;border-radius:4px;background:#0d1117;color:#e6edf3;font:inherit;font-size:.84rem;padding:.45rem .55rem;outline:none}',
    '.secrets-textarea{min-height:6rem;resize:vertical;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}',
    '.secrets-input:focus,.secrets-textarea:focus,.secrets-select:focus{border-color:#56b6c2}',
    '.secrets-actions{display:flex;gap:.5rem;flex-wrap:wrap}',
    '.secrets-status{font-size:.78rem;color:#8b949e;min-height:1rem}',
    '.secrets-status.error{color:#ff8f8f}',
    '.secrets-secret-value{white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #303844;background:#0d1117;border-radius:4px;padding:.7rem;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.82rem}',
    '.secrets-table{width:100%;border-collapse:collapse;border:1px solid #252b36;background:#11151d;border-radius:6px;overflow:hidden}',
    '.secrets-table th,.secrets-table td{border-bottom:1px solid #252b36;padding:.55rem .65rem;text-align:left;vertical-align:top;font-size:.84rem}',
    '.secrets-table th{width:9rem;color:#8b949e;font-weight:500;background:#151a23}',
    '.secrets-table td{color:#e6edf3;overflow-wrap:anywhere}',
    '.secrets-table tr:last-child th,.secrets-table tr:last-child td{border-bottom:0}',
    '@media(max-width:780px){.secrets-root{grid-template-columns:1fr}.secrets-panel{border-right:0;border-bottom:1px solid #252b36;max-height:45vh}.secrets-row{grid-template-columns:1fr}}'
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
    if (scope.kind === ScopeWorkspace) return cleanWorkspace(scope.workspaceRootPath) || 'Workspace';
    return 'Global';
  }

  function selectedIDFromProps(props) {
    var resource = props && props.resource || {};
    var path = text(resource.path || props && props.secretId);
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
      var selectedRecord = null;
      var selectedValue = '';
      var initialized = false;
      var unlocked = false;
      var statusText = '';
      var statusError = false;

      function setStatus(message, isError) {
        statusText = message || '';
        statusError = !!isError;
        render();
      }

      function renderLocked() {
        var passwordInput = el('input', {
          className: 'secrets-input',
          type: 'password',
          'data-secret-master-password': '',
          placeholder: 'Master password'
        });
        var confirmInput = initialized ? null : el('input', {
          className: 'secrets-input',
          type: 'password',
          'data-secret-master-password-confirm': '',
          placeholder: 'Repeat master password'
        });
        var unlockBtn = el('button', {
          className: 'secrets-btn primary',
          type: 'button',
          'data-secret-unlock': '',
          onClick: function () {
            if (!initialized && passwordInput.value !== confirmInput.value) {
              setStatus('Master passwords do not match', true);
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
        }, ['Unlock']);
        if (!initialized) unlockBtn.textContent = 'Create master password';
        var rows = [
          el('div', { className: 'secrets-row' }, [
            el('label', { className: 'secrets-label' }, ['Password']),
            passwordInput
          ])
        ];
        if (confirmInput) {
          rows.push(el('div', { className: 'secrets-row' }, [
            el('label', { className: 'secrets-label' }, ['Repeat']),
            confirmInput
          ]));
        }
        rows.push(el('div', { className: 'secrets-actions' }, [unlockBtn]));
        rows.push(el('div', { className: statusError ? 'secrets-status error' : 'secrets-status' }, [statusText]));
        containerEl.innerHTML = '';
        containerEl.appendChild(el('div', { className: 'secrets-root' }, [
          el('div', { className: 'secrets-panel' }, [
            el('div', { className: 'secrets-toolbar' }, [
              el('span', { className: 'secrets-title' }, ['Secrets'])
            ])
          ]),
          el('div', { className: 'secrets-main' }, [
            el('div', { className: 'secrets-card' }, [
              el('h2', {}, [initialized ? 'Unlock secrets' : 'Create master password']),
              el('div', { className: 'secrets-form' }, rows)
            ])
          ])
        ]));
      }

      function renderList() {
        var children = [
          el('div', { className: 'secrets-toolbar' }, [
            el('span', { className: 'secrets-title' }, ['Secrets']),
            el('span', { className: 'secrets-count' }, [String(records.length)]),
            el('span', { className: 'secrets-spacer' }),
            el('button', { className: 'secrets-btn', type: 'button', onClick: showNewSecret }, ['New'])
          ])
        ];
        if (!records.length) {
          children.push(el('div', { className: 'secrets-empty' }, ['No secrets']));
          return children;
        }
        groupRecords(records).forEach(function (group) {
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
          el('h2', {}, ['Select a secret'])
        ]);
        return el('div', { className: 'secrets-card' }, [
          el('h2', {}, [selectedRecord.title || selectedRecord.id]),
          el('table', { className: 'secrets-table' }, [
            el('tbody', {}, [
              fieldRow('Group', scopeLabel(selectedRecord)),
              fieldRow('ID', selectedRecord.id),
              fieldRow('Username', selectedRecord.username || ''),
              fieldRow('Password', selectedValue ? selectedValue : 'Value hidden'),
              fieldRow('Updated', selectedRecord.updatedAt || '')
            ])
          ]),
          el('div', { className: 'secrets-actions' }, [
            el('button', {
              className: 'secrets-btn',
              type: 'button',
              'data-secret-copy-link': selectedRecord.id,
              onClick: function () { copySecretLink(selectedRecord.id); }
            }, ['Copy secret link']),
            el('button', {
              className: 'secrets-btn',
              type: 'button',
              'data-secret-edit': selectedRecord.id,
              onClick: function () { showEditSecret(); }
            }, ['Edit']),
            el('button', {
              className: 'secrets-btn',
              type: 'button',
              'data-secret-delete': selectedRecord.id,
              onClick: function () { deleteSecret(selectedRecord.id); }
            }, ['Delete'])
          ]),
          el('div', { className: statusError ? 'secrets-status error' : 'secrets-status' }, [statusText])
        ]);
      }

      function fieldRow(label, value) {
        return el('tr', {}, [
          el('th', {}, [label]),
          el('td', {}, [value || ''])
        ]);
      }

      function renderSecretForm(existing) {
        var isEdit = !!existing;
        var title = el('input', { className: 'secrets-input', type: 'text', 'data-secret-title': '', placeholder: 'Title' });
        title.value = existing ? text(existing.title) : '';
        var id = el('input', { className: 'secrets-input', type: 'text', placeholder: 'stable.id' });
        id.value = existing ? text(existing.id) : '';
        id.disabled = isEdit;
        var username = el('input', { className: 'secrets-input', type: 'text', placeholder: 'optional username' });
        username.value = existing ? text(existing.username) : '';
        var value = el('textarea', { className: 'secrets-textarea', 'data-secret-value': '', placeholder: 'Secret value' });
        value.value = isEdit ? selectedValue : '';
        var scope = el('select', { className: 'secrets-select' }, [
          el('option', { value: ScopeGlobal }, ['Global']),
          el('option', { value: ScopeWorkspace }, [workspaceRoot || 'Workspace'])
        ]);
        scope.value = existing && existing.scope && existing.scope.kind ? existing.scope.kind : (workspaceRoot ? ScopeWorkspace : ScopeGlobal);
        return el('div', { className: 'secrets-card' }, [
          el('h2', {}, [isEdit ? 'Edit secret' : 'New secret']),
          el('div', { className: 'secrets-form' }, [
            el('div', { className: 'secrets-row' }, [el('label', { className: 'secrets-label' }, ['Title']), title]),
            el('div', { className: 'secrets-row' }, [el('label', { className: 'secrets-label' }, ['ID']), id]),
            el('div', { className: 'secrets-row' }, [el('label', { className: 'secrets-label' }, ['Username']), username]),
            el('div', { className: 'secrets-row' }, [el('label', { className: 'secrets-label' }, ['Scope']), scope]),
            el('div', { className: 'secrets-row' }, [el('label', { className: 'secrets-label' }, ['Value']), value]),
            el('div', { className: 'secrets-actions' }, [
              el('button', {
                className: 'secrets-btn primary',
                type: 'button',
                'data-secret-save': '',
                onClick: function () {
                  var nextID = text(id.value).trim() || text(title.value).trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '.').replace(/^\.+|\.+$/g, '');
                  api.secrets.write({
                    id: nextID,
                    title: text(title.value).trim() || nextID,
                    username: text(username.value).trim(),
                    value: text(value.value),
                    scope: scope.value === ScopeWorkspace ? { kind: ScopeWorkspace, workspaceRootPath: workspaceRoot } : { kind: ScopeGlobal }
                  }).then(function (record) {
                    selectedID = record.id;
                    selectedRecord = record;
                    selectedValue = '';
                    return loadRecords();
                  }).catch(function (err) {
                    setStatus((err && err.message) ? err.message : String(err), true);
                  });
                }
              }, ['Save']),
              el('button', { className: 'secrets-btn', type: 'button', onClick: function () { mode = 'selected'; render(); } }, ['Cancel'])
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
        if (!id || !window.confirm('Delete this secret?')) return;
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
            setStatus('Secret link copied', false);
          });
        }).catch(function (err) {
          setStatus((err && err.message) ? err.message : String(err), true);
        });
      }

      api.secrets.status().then(function (status) {
        initialized = !!(status && status.initialized);
        unlocked = !!(status && status.unlocked);
        if (unlocked) return loadRecords();
        render();
      }).catch(function (err) {
        statusText = (err && err.message) ? err.message : String(err);
        statusError = true;
        renderLocked();
      });

      containerEl.__secretsCleanup = function () {
        disposed = true;
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
