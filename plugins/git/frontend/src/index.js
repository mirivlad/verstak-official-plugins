/* Git repository descriptors are syncable; checkout bytes remain device-local. */
(function () {
  'use strict';

  var PLUGIN_ID = 'verstak.git';
  var DATA = 'repositories';
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var SECRET = /^verstak-secret:\/\/[^\s)]+$/;
  var REMOTE = /^(https?:\/\/|ssh:\/\/|[\w.-]+@[\w.-]+:)/;
  var CSS = [
    '.git-root{height:100%;overflow:auto;background:var(--vt-color-background,#101020);color:var(--vt-color-text-primary,#f4f7fb);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '.git-shell{max-width:64rem;margin:0 auto;padding:1.15rem}',
    '.git-header{display:flex;justify-content:space-between;align-items:center;gap:.75rem;margin-bottom:.85rem}',
    '.git-title{font-size:1.15rem;margin:0}',
    '.git-form,.git-card{display:grid;gap:.6rem;padding:.85rem;border:1px solid var(--vt-color-border,#202b46);border-radius:8px;background:var(--vt-color-surface,#15152c);margin-bottom:.7rem}',
    '.git-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:.7rem}',
    '.git-row{display:flex;gap:.45rem;align-items:center;flex-wrap:wrap}',
    '.git-actions{display:flex;gap:.4rem;align-items:center;flex-wrap:wrap}',
    '.git-field{display:grid;gap:.25rem;font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.git-input,.git-select{box-sizing:border-box;width:100%;min-height:2rem;padding:.4rem .5rem;background:var(--vt-color-surface-input,#0f1424);border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:5px;color:inherit;font:inherit;font-size:.8rem}',
    '.git-btn{font:inherit;font-size:.76rem;padding:.4rem .58rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:5px;background:var(--vt-color-surface-hover,#1b2440);color:inherit;cursor:pointer}',
    '.git-btn.primary{background:var(--vt-color-accent,#4ecca3);border-color:var(--vt-color-accent,#4ecca3);color:#101827}',
    '.git-btn.danger{color:var(--vt-color-danger,#ff8e9b)}',
    '.git-btn:disabled{opacity:.55;cursor:default}',
    '.git-meta,.git-empty,.git-error,.git-status,.git-files,.git-commits{font-size:.77rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.git-error{color:#ffc6ce;margin-bottom:.65rem}',
    '.git-status{display:flex;gap:.55rem;flex-wrap:wrap;align-items:center}',
    '.git-badge{display:inline-flex;align-items:center;min-height:1.45rem;padding:0 .42rem;border-radius:999px;background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-secondary,#c9d2e3)}',
    '.git-badge.good{color:var(--vt-color-success,#72d6a0)}',
    '.git-badge.warn{color:var(--vt-color-warning,#f6c56d)}',
    '.git-files{word-break:break-word}',
    '.git-commits{display:grid;gap:.22rem;padding-top:.15rem}',
    '.git-commit{display:grid;grid-template-columns:5.5rem minmax(0,1fr);gap:.45rem}',
    '.git-commit code{color:var(--vt-color-text-secondary,#c9d2e3)}',
    '@media(max-width:600px){.git-shell{padding:.8rem}.git-card-head{display:grid}.git-header{align-items:flex-start}}'
  ].join('');

  function text(value) { return value == null ? '' : String(value); }
  function now() { return new Date().toISOString(); }
  function identifier() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return 'repo-' + globalThis.crypto.randomUUID();
    return 'repo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
  }
  function tr(api, key, fallback) { return api.i18n && api.i18n.t ? api.i18n.t(key, null, fallback) : fallback; }
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (key === 'className') node.className = value;
      else if (key === 'textContent') node.textContent = value;
      else if (key === 'value') node.value = value;
      else if (key === 'disabled') node.disabled = Boolean(value);
      else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2).toLowerCase(), value);
      else node.setAttribute(key, value);
    });
    (children || []).forEach(function (child) {
      if (child != null) node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }
  function styles() {
    if (document.getElementById('git-style')) return;
    var style = document.createElement('style');
    style.id = 'git-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  function safeCheckoutName(name, id) {
    var value = text(name).trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 64);
    if (value) return value;
    return text(id).replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 64) || 'repository';
  }
  function normalize(raw) {
    raw = raw || {};
    var workspaceId = text(raw.workspaceId).trim();
    var id = text(raw.id).trim() || identifier();
    var name = text(raw.name).trim();
    return {
      id: id,
      workspaceId: workspaceId,
      name: name,
      remoteUrl: text(raw.remoteUrl).trim(),
      defaultBranch: text(raw.defaultBranch).trim() || 'main',
      checkoutName: text(raw.checkoutName).trim() || safeCheckoutName(name, id),
      credentialRef: SECRET.test(text(raw.credentialRef).trim()) ? text(raw.credentialRef).trim() : '',
      updatedAt: text(raw.updatedAt).trim() || now()
    };
  }
  function valid(record) {
    return UUID.test(record.workspaceId) && record.name && record.remoteUrl && REMOTE.test(record.remoteUrl)
      && record.checkoutName && !/[\\/]/.test(record.checkoutName);
  }
  function load(api) {
    return api.storage.data.readNDJSON(DATA).then(function (rows) {
      var ids = {};
      return (Array.isArray(rows) ? rows : []).map(normalize).filter(function (row) {
        if (!valid(row) || ids[row.id]) return false;
        ids[row.id] = true;
        return true;
      });
    });
  }
  function persist(api, rows) { return api.storage.data.writeNDJSON(DATA, rows.map(normalize).filter(valid)); }
  function list(api, args) {
    var scope = args && args.scope;
    if (!scope || scope.kind !== 'deal' || !UUID.test(text(scope.workspaceId))) return Promise.reject(new Error('DealScope.workspaceId is required'));
    return load(api).then(function (rows) { return rows.filter(function (row) { return row.workspaceId === scope.workspaceId; }); });
  }
  function add(api, args) {
    var scope = args && args.scope || {};
    var record = normalize(Object.assign({}, args || {}, { workspaceId: scope.workspaceId, updatedAt: now() }));
    if (!valid(record)) return Promise.reject(new Error('valid Deal scope, name and remote URL are required'));
    return load(api).then(function (rows) {
      if (rows.some(function (row) { return row.id === record.id; })) throw new Error('repository id already exists');
      return persist(api, rows.concat([record]));
    }).then(function () { return record; });
  }
  function update(api, args) {
    var record = normalize(args);
    if (!valid(record)) return Promise.reject(new Error('valid repository descriptor is required'));
    return load(api).then(function (rows) {
      var found = false;
      var next = rows.map(function (row) {
        if (row.id !== record.id || row.workspaceId !== record.workspaceId) return row;
        found = true;
        return record;
      });
      if (!found) throw new Error('repository not found');
      return persist(api, next);
    }).then(function () { return record; });
  }
  function remove(api, args) {
    var id = text(args && args.id).trim();
    var scope = args && args.scope || {};
    return list(api, { scope: scope }).then(function (current) {
      if (!current.some(function (row) { return row.id === id; })) throw new Error('repository not found');
      return load(api).then(function (all) { return persist(api, all.filter(function (row) { return row.id !== id; })); });
    }).then(function () { return { id: id, removed: true }; });
  }
  function dealScope(props) {
    var node = props && props.workspaceNode || {};
    var id = text(props && (props.workspaceId || node.id)).trim();
    return UUID.test(id) ? { workspaceId: id, name: text(props && (props.workspaceName || node.name)) } : null;
  }
  function gitRequest(row) {
    return {
      scope: { kind: 'deal', workspaceId: row.workspaceId },
      repositoryId: row.id,
      checkoutName: row.checkoutName,
      remoteUrl: row.remoteUrl,
      credentialRef: row.credentialRef
    };
  }
  function credentialId(reference) {
    if (!SECRET.test(text(reference))) return '';
    try { return decodeURIComponent(text(reference).slice('verstak-secret://'.length)); } catch (_) { return ''; }
  }

  var GitView = {
    mount: function (container, props, api) {
      styles();
      container.classList.add('git-root');
      var deal = dealScope(props);
      var disposed = false;
      var rows = [];
      var statuses = {};
      var busy = {};
      var error = '';
      var editing = null;

      function refreshStatus(row) {
        busy[row.id] = busy[row.id] || false;
        return api.git.status(gitRequest(row)).then(function (status) {
          statuses[row.id] = status;
        }).catch(function () {
          statuses[row.id] = { state: 'error' };
        });
      }
      function refresh() {
        if (!deal) { render(); return Promise.resolve(); }
        return list(api, { scope: { kind: 'deal', workspaceId: deal.workspaceId } }).then(function (next) {
          rows = next;
          error = '';
          render();
          return Promise.all(rows.map(refreshStatus)).then(render);
        });
      }
      function operation(row, name, request) {
        busy[row.id] = true;
        error = '';
        render();
        return api.git[name](request || gitRequest(row)).then(function (result) {
          busy[row.id] = false;
          if (result && Object.prototype.hasOwnProperty.call(result, 'checkoutPath') && !result.checkoutPath) {
            render();
            return;
          }
          return refreshStatus(row).then(render);
        }).catch(function () {
          busy[row.id] = false;
          error = tr(api, 'ui.operationError', 'Git operation failed.');
          render();
        });
      }
      function field(label, input) { return el('label', { className: 'git-field' }, [el('span', { textContent: label }), input]); }
      function renderForm(shell) {
        if (!editing) return;
        var source = editing.record || { id: identifier(), workspaceId: deal.workspaceId, name: '', remoteUrl: '', defaultBranch: 'main', checkoutName: '', credentialRef: '', updatedAt: now() };
        var name = el('input', { className: 'git-input', value: source.name, 'data-git-field': 'name' });
        var remote = el('input', { className: 'git-input', value: source.remoteUrl, 'data-git-field': 'remote' });
        var branch = el('input', { className: 'git-input', value: source.defaultBranch, 'data-git-field': 'branch' });
        var secret = el('select', { className: 'git-select', 'data-git-field': 'credential' });
        secret.appendChild(el('option', { value: '', textContent: tr(api, 'ui.none', 'No credential reference') }));
        var selectedSecret = credentialId(source.credentialRef);
        Promise.resolve(api.secrets.list()).then(function (items) {
          if (disposed || !editing) return;
          (items || []).forEach(function (item) {
            var option = el('option', { value: item.id, textContent: item.title || item.id });
            if (item.id === selectedSecret) option.selected = true;
            secret.appendChild(option);
          });
        }).catch(function () {});
        var form = el('div', { className: 'git-form', 'data-git-form': editing.record ? 'edit' : 'add' }, [
          field(tr(api, 'ui.name', 'Name'), name),
          field(tr(api, 'ui.remote', 'Remote URL'), remote),
          field(tr(api, 'ui.branch', 'Default branch'), branch),
          field(tr(api, 'ui.credential', 'Credential secret'), secret)
        ]);
        var actions = el('div', { className: 'git-actions' });
        actions.appendChild(el('button', { className: 'git-btn primary', type: 'button', textContent: tr(api, 'ui.save', 'Save'), 'data-git-action': 'save', onClick: function () {
          var selected = secret.value;
          var referencePromise = selected ? api.secrets.copyLink(selected).then(function (link) {
            var match = /\((verstak-secret:\/\/[^)]+)\)/.exec(link);
            return match ? match[1] : '';
          }) : Promise.resolve('');
          referencePromise.then(function (credentialRef) {
            var payload = {
              scope: { kind: 'deal', workspaceId: deal.workspaceId },
              workspaceId: deal.workspaceId,
              id: source.id,
              name: name.value,
              remoteUrl: remote.value,
              defaultBranch: branch.value,
              checkoutName: source.checkoutName || safeCheckoutName(name.value, source.id),
              credentialRef: credentialRef,
              updatedAt: now()
            };
            return editing.record ? update(api, payload) : add(api, payload);
          }).then(function () { editing = null; return refresh(); }).catch(function () {
            error = tr(api, 'ui.error', 'Could not save the repository.');
            render();
          });
        } }));
        actions.appendChild(el('button', { className: 'git-btn', type: 'button', textContent: tr(api, 'ui.cancel', 'Cancel'), 'data-git-action': 'cancel', onClick: function () { editing = null; error = ''; render(); } }));
        form.appendChild(actions);
        shell.appendChild(form);
      }
      function renderStatus(card, row) {
        var status = statuses[row.id];
        if (!status) {
          card.appendChild(el('div', { className: 'git-status', textContent: tr(api, 'ui.loadingStatus', 'Reading local checkout status…') }));
          return;
        }
        if (status.state === 'error') {
          card.appendChild(el('div', { className: 'git-status', textContent: tr(api, 'ui.statusError', 'Could not read local checkout status.') }));
          return;
        }
        if (status.state === 'not-cloned') {
          card.appendChild(el('div', { className: 'git-status' }, [el('span', { className: 'git-badge', textContent: tr(api, 'ui.notCloned', 'Not cloned on this device') })]));
          return;
        }
        var statusRow = el('div', { className: 'git-status' });
        statusRow.appendChild(el('span', { className: 'git-badge', textContent: (status.branch || row.defaultBranch) }));
        statusRow.appendChild(el('span', { className: 'git-badge ' + (status.clean ? 'good' : 'warn'), textContent: status.clean ? tr(api, 'ui.clean', 'Clean') : tr(api, 'ui.dirty', 'Changed') }));
        if (status.changedCount) statusRow.appendChild(el('span', { textContent: tr(api, 'ui.changed', 'changed') + ': ' + status.changedCount }));
        if (status.untrackedCount) statusRow.appendChild(el('span', { textContent: tr(api, 'ui.untracked', 'untracked') + ': ' + status.untrackedCount }));
        if (status.ahead) statusRow.appendChild(el('span', { textContent: '↑' + status.ahead }));
        if (status.behind) statusRow.appendChild(el('span', { textContent: '↓' + status.behind }));
        card.appendChild(statusRow);
        if (status.changedFiles && status.changedFiles.length) {
          var shown = status.changedFiles.slice(0, 8);
          var suffix = status.changedFiles.length > shown.length ? ' +' + (status.changedFiles.length - shown.length) : '';
          card.appendChild(el('div', { className: 'git-files', textContent: shown.join(' · ') + suffix }));
        }
        if (status.recentCommits && status.recentCommits.length) {
          var commits = el('div', { className: 'git-commits' });
          status.recentCommits.slice(0, 5).forEach(function (commit) {
            commits.appendChild(el('div', { className: 'git-commit' }, [el('code', { textContent: commit.shortId }), el('span', { textContent: commit.subject })]));
          });
          card.appendChild(commits);
        }
      }
      function renderCard(shell, row) {
        var status = statuses[row.id];
        var card = el('div', { className: 'git-card', 'data-git-repository': row.id });
        var head = el('div', { className: 'git-card-head' });
        head.appendChild(el('div', {}, [el('strong', { textContent: row.name }), el('div', { className: 'git-meta', textContent: row.remoteUrl + ' · ' + row.defaultBranch })]));
        var descriptorActions = el('div', { className: 'git-actions' });
        descriptorActions.appendChild(el('button', { className: 'git-btn', type: 'button', textContent: tr(api, 'ui.edit', 'Edit'), disabled: busy[row.id], 'data-git-action': 'edit', onClick: function () { editing = { record: row }; render(); } }));
        descriptorActions.appendChild(el('button', { className: 'git-btn danger', type: 'button', textContent: tr(api, 'ui.remove', 'Remove descriptor'), disabled: busy[row.id], 'data-git-action': 'remove', onClick: function () {
          remove(api, { id: row.id, scope: { kind: 'deal', workspaceId: deal.workspaceId } }).then(refresh).catch(function () { error = tr(api, 'ui.error', 'Could not save the repository.'); render(); });
        } }));
        head.appendChild(descriptorActions);
        card.appendChild(head);
        renderStatus(card, row);
        var actions = el('div', { className: 'git-actions' });
        if (status && status.state === 'not-cloned') {
          actions.appendChild(el('button', { className: 'git-btn primary', type: 'button', textContent: tr(api, 'ui.clone', 'Clone'), disabled: busy[row.id], 'data-git-action': 'clone', onClick: function () {
            var request = gitRequest(row); request.branch = row.defaultBranch; operation(row, 'clone', request);
          } }));
          actions.appendChild(el('button', { className: 'git-btn', type: 'button', textContent: tr(api, 'ui.useExisting', 'Use existing checkout'), disabled: busy[row.id], 'data-git-action': 'register-existing', onClick: function () { operation(row, 'registerExisting'); } }));
        } else if (status && status.state === 'cloned') {
          ['fetch', 'pull', 'push'].forEach(function (name) {
            actions.appendChild(el('button', { className: 'git-btn', type: 'button', textContent: tr(api, 'ui.' + name, name.charAt(0).toUpperCase() + name.slice(1)), disabled: busy[row.id], 'data-git-action': name, onClick: function () { operation(row, name); } }));
          });
          actions.appendChild(el('button', { className: 'git-btn', type: 'button', textContent: tr(api, 'ui.openDirectory', 'Open folder'), disabled: busy[row.id], 'data-git-action': 'open-directory', onClick: function () { operation(row, 'openDirectory'); } }));
        }
        actions.appendChild(el('button', { className: 'git-btn', type: 'button', textContent: tr(api, 'ui.refresh', 'Refresh'), disabled: busy[row.id], 'data-git-action': 'refresh', onClick: function () { busy[row.id] = true; render(); refreshStatus(row).then(function () { busy[row.id] = false; render(); }); } }));
        card.appendChild(actions);
        shell.appendChild(card);
      }
      function render() {
        if (disposed) return;
        container.innerHTML = '';
        var shell = el('div', { className: 'git-shell', 'data-git-root': '' });
        var header = el('div', { className: 'git-header' }, [el('h1', { className: 'git-title', textContent: tr(api, 'ui.title', 'Git repositories') })]);
        if (deal && !editing) header.appendChild(el('button', { className: 'git-btn primary', type: 'button', textContent: tr(api, 'ui.add', 'Add repository'), 'data-git-action': 'add', onClick: function () { editing = { record: null }; render(); } }));
        shell.appendChild(header);
        if (!deal) {
          shell.appendChild(el('div', { className: 'git-empty', textContent: tr(api, 'ui.missingDeal', 'Select a Deal to manage its repositories.') }));
          container.appendChild(shell);
          return;
        }
        renderForm(shell);
        if (error) shell.appendChild(el('div', { className: 'git-error', textContent: error }));
        if (!rows.length && !editing) shell.appendChild(el('div', { className: 'git-empty', textContent: tr(api, 'ui.empty', 'No Git repositories for this Deal.') }));
        rows.forEach(function (row) { renderCard(shell, row); });
        container.appendChild(shell);
      }

      refresh().catch(function () { error = tr(api, 'ui.error', 'Could not save the repository.'); render(); });
      container.__gitCleanup = function () { disposed = true; };
    },
    unmount: function (container) {
      if (container && container.__gitCleanup) container.__gitCleanup();
      if (container) { container.classList.remove('git-root'); container.innerHTML = ''; }
    }
  };

  window.VerstakPluginRegister(PLUGIN_ID, {
    components: { GitView: GitView },
    activate: function (api) {
      return Promise.all([
        api.commands.register('verstak.git.list', function (args) { return list(api, args); }),
        api.commands.register('verstak.git.add', function (args) { return add(api, args); }),
        api.commands.register('verstak.git.update', function (args) { return update(api, args); }),
        api.commands.register('verstak.git.remove', function (args) { return remove(api, args); })
      ]);
    }
  });
})();
