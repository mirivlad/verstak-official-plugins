/* Git repository descriptors are syncable; checkout bytes remain device-local. */
(function () {
  'use strict';

  var PLUGIN_ID = 'verstak.git';
  var DATA = 'repositories';
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var SECRET = /^verstak-secret:\/\/[^\s)]+$/;
  var REMOTE = /^(https?:\/\/|ssh:\/\/|[\w.-]+@[\w.-]+:)/;
  var CSS = [
    '.git-root{width:100%;height:100%;min-height:0;overflow:auto;background:var(--vt-color-background,#101020);color:var(--vt-color-text-primary,#f4f7fb);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '.git-shell{box-sizing:border-box;width:100%;max-width:72rem;margin:0 auto;padding:1.4rem 1.5rem 2rem}',
    '.git-header{display:flex;justify-content:flex-end;align-items:center;gap:1rem;margin-bottom:1rem}',
    '.git-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem;padding:1rem;margin-bottom:1rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c)}.git-form-title{grid-column:1/-1;font-size:.9rem;font-weight:700;margin-bottom:.05rem}.git-form-wide{grid-column:1/-1}.git-form-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:.45rem;padding-top:.1rem}',
    '.git-field{display:grid;gap:.34rem;font-size:.74rem;color:var(--vt-color-text-muted,#7f8aa3)}.git-input,.git-select{box-sizing:border-box;width:100%;min-height:2.15rem;padding:.42rem .58rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-input,#0f1424);color:var(--vt-color-text-primary,#f4f7fb);font:inherit;font-size:.82rem;outline:none;color-scheme:dark}.git-input:focus,.git-select:focus{border-color:var(--vt-color-accent,#4ecca3);box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34))}',
    '.git-select{appearance:none;-webkit-appearance:none;padding-right:2rem;background-image:linear-gradient(45deg,transparent 50%,var(--vt-color-text-muted,#7f8aa3) 50%),linear-gradient(135deg,var(--vt-color-text-muted,#7f8aa3) 50%,transparent 50%);background-position:calc(100% - 13px) 50%,calc(100% - 8px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat}.git-select option{background:var(--vt-color-surface,#15152c);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.git-card{display:grid;gap:.8rem;padding:1rem;margin-bottom:.75rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c)}.git-card:hover{border-color:var(--vt-color-border-strong,#2c456a)}.git-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.git-card-title{font-size:.96rem;font-weight:700}.git-meta{font-size:.75rem;color:var(--vt-color-text-muted,#7f8aa3);line-height:1.45;overflow-wrap:anywhere}.git-path{display:inline-flex;align-items:center;min-height:1.45rem;padding:0 .42rem;margin-top:.35rem;border-radius:999px;background:var(--vt-color-surface-muted,#111629);color:var(--vt-color-text-secondary,#b7c0d4);font-size:.69rem}',
    '.git-actions{display:flex;gap:.42rem;align-items:center;flex-wrap:wrap}.git-remove{color:var(--vt-color-danger,#ff8e9b)!important}.git-error{margin-bottom:.75rem;color:var(--vt-color-danger,#ff8e9b);font-size:.78rem}.git-operation{display:flex;align-items:center;gap:.4rem;font-size:.76rem;color:var(--vt-color-text-secondary,#c9d2e3)}.git-operation.success{color:var(--vt-color-success,#72d6a0)}.git-operation.error{color:var(--vt-color-danger,#ff8e9b)}.git-operation-spinner{width:.75rem;height:.75rem;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:git-operation-spin .8s linear infinite}@keyframes git-operation-spin{to{transform:rotate(360deg)}}.git-empty{padding:3rem 1rem;border:1px dashed var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-lg,8px);color:var(--vt-color-text-muted,#7f8aa3);text-align:center}',
    '.git-status{display:flex;gap:.55rem;flex-wrap:wrap;align-items:center;font-size:.76rem;color:var(--vt-color-text-muted,#7f8aa3)}.git-badge{display:inline-flex;align-items:center;min-height:1.45rem;padding:0 .45rem;border-radius:999px;background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-secondary,#c9d2e3)}.git-badge.good{color:var(--vt-color-success,#72d6a0)}.git-badge.warn{color:var(--vt-color-warning,#f6c56d)}',
    '.git-files{padding:.55rem .65rem;border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-surface-muted,#111629);font-size:.74rem;color:var(--vt-color-text-muted,#7f8aa3);word-break:break-word}.git-commits{display:grid;gap:.1rem;padding:.55rem .65rem;border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-surface-muted,#111629);font-size:.75rem;color:var(--vt-color-text-muted,#7f8aa3)}.git-commit{display:grid;grid-template-columns:5.5rem minmax(0,1fr);gap:.5rem;padding:.18rem 0}.git-commit code{color:var(--vt-color-text-secondary,#c9d2e3)}',
    '@media(max-width:720px){.git-form{grid-template-columns:1fr}.git-form-wide,.git-form-title,.git-form-actions{grid-column:1}.git-card-head{display:grid}.git-header{align-items:flex-start;flex-direction:column}}@media(max-width:560px){.git-shell{padding:1rem}}'
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
  function safeCheckoutSegment(value) {
    value = text(value).trim().replace(/[<>:"/\\|?*\x00-\x1f]+/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-');
    value = value.replace(/^[. -]+|[. ]+$/g, '').slice(0, 64);
    return value;
  }
  function remoteRepositoryName(remoteUrl) {
    var value = text(remoteUrl).trim().replace(/[?#].*$/, '').replace(/[\\/]+$/, '');
    if (!value) return '';
    var slash = value.lastIndexOf('/');
    var colon = value.lastIndexOf(':');
    var index = Math.max(slash, colon);
    var name = index >= 0 ? value.slice(index + 1) : value;
    try { name = decodeURIComponent(name); } catch (_) {}
    name = name.replace(/\.git$/i, '');
    return safeCheckoutSegment(name);
  }
  function preferredCheckoutName(remoteUrl, name, id) {
    return remoteRepositoryName(remoteUrl) || safeCheckoutSegment(name) || safeCheckoutSegment(id) || 'repository';
  }
  function isGeneratedCheckoutName(checkoutName, id) {
    return checkoutName === id && /^repo-(?:[0-9a-f]{8}-[0-9a-f-]{27,}|\d{8,}-[a-z0-9]+)$/i.test(text(id));
  }
  function uniqueCheckoutName(base, rows, workspaceId, repositoryId) {
    base = safeCheckoutSegment(base) || 'repository';
    var used = {};
    (rows || []).forEach(function (row) {
      if (row.workspaceId === workspaceId && row.id !== repositoryId) used[text(row.checkoutName).toLowerCase()] = true;
    });
    if (!used[base.toLowerCase()]) return base;
    var index = 2;
    while (used[(base + '-' + index).toLowerCase()]) index += 1;
    return (base + '-' + index).slice(0, 64);
  }
  function normalize(raw) {
    raw = raw || {};
    var workspaceId = text(raw.workspaceId).trim();
    var id = text(raw.id).trim() || identifier();
    var name = text(raw.name).trim();
    var remoteUrl = text(raw.remoteUrl).trim();
    return {
      id: id,
      workspaceId: workspaceId,
      name: name,
      remoteUrl: remoteUrl,
      defaultBranch: text(raw.defaultBranch).trim() || 'main',
      checkoutName: text(raw.checkoutName).trim() || preferredCheckoutName(remoteUrl, name, id),
      credentialRef: SECRET.test(text(raw.credentialRef).trim()) ? text(raw.credentialRef).trim() : '',
      updatedAt: text(raw.updatedAt).trim() || now()
    };
  }
  function valid(record) {
    return UUID.test(record.workspaceId) && record.name && record.remoteUrl && REMOTE.test(record.remoteUrl)
      && record.checkoutName && !/[\\/]/.test(record.checkoutName);
  }
  function load(api) {
    return api.storage.data.readNDJSON(DATA).then(function (rawRows) {
      var ids = {};
      var rows = (Array.isArray(rawRows) ? rawRows : []).map(normalize).filter(function (row) {
        if (!valid(row) || ids[row.id]) return false;
        ids[row.id] = true;
        return true;
      });
      var migrated = false;
      rows.forEach(function (row) {
        if (!isGeneratedCheckoutName(row.checkoutName, row.id)) return;
        var nextName = uniqueCheckoutName(preferredCheckoutName(row.remoteUrl, row.name, row.id), rows, row.workspaceId, row.id);
        if (nextName && nextName !== row.checkoutName) {
          row.checkoutName = nextName;
          row.updatedAt = now();
          migrated = true;
        }
      });
      return migrated ? api.storage.data.writeNDJSON(DATA, rows).then(function () { return rows; }) : rows;
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
    var suppliedCheckout = text(args && args.checkoutName).trim();
    var record = normalize(Object.assign({}, args || {}, { workspaceId: scope.workspaceId, updatedAt: now() }));
    if (!valid(record)) return Promise.reject(new Error('valid Deal scope, name and remote URL are required'));
    return load(api).then(function (rows) {
      if (rows.some(function (row) { return row.id === record.id; })) throw new Error('repository id already exists');
      var base = suppliedCheckout || preferredCheckoutName(record.remoteUrl, record.name, record.id);
      record.checkoutName = uniqueCheckoutName(base, rows, record.workspaceId, record.id);
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
      var operations = {};
      var outcomes = {};
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
      function operationLabel(operation) {
        var labels = {
          clone: ['ui.clone', 'Clone'],
          registerExisting: ['ui.useExisting', 'Use existing checkout'],
          fetch: ['ui.fetch', 'Fetch'],
          pull: ['ui.pull', 'Pull'],
          push: ['ui.push', 'Push'],
          openDirectory: ['ui.openDirectory', 'Open folder']
        };
        var label = labels[operation.kind] || ['ui.operation', 'Git operation'];
        return tr(api, label[0], label[1]);
      }
      function operation(row, nextOperation, request) {
        var activeOperation = { repoId: row.id, kind: nextOperation.kind, startedAt: now() };
        busy[row.id] = true;
        operations[row.id] = activeOperation;
        delete outcomes[row.id];
        error = '';
        render();
        return api.git[activeOperation.kind](request || gitRequest(row)).then(function (result) {
          busy[row.id] = false;
          delete operations[row.id];
          outcomes[row.id] = { kind: activeOperation.kind, state: 'success' };
          if (result && Object.prototype.hasOwnProperty.call(result, 'checkoutPath') && !result.checkoutPath) {
            render();
            return;
          }
          return refreshStatus(row).then(render);
        }).catch(function () {
          busy[row.id] = false;
          delete operations[row.id];
          outcomes[row.id] = { kind: activeOperation.kind, state: 'error' };
          render();
        });
      }
      function field(label, input, wide) { return el('label', { className: 'git-field' + (wide ? ' git-form-wide' : '') }, [el('span', { textContent: label }), input]); }
      function renderForm(shell) {
        if (!editing) return;
        var source = editing.record || { id: identifier(), workspaceId: deal.workspaceId, name: '', remoteUrl: '', defaultBranch: 'main', checkoutName: '', credentialRef: '', updatedAt: now() };
        var name = el('input', { className: 'git-input vt-input', value: source.name, 'data-git-field': 'name', placeholder: tr(api, 'ui.namePlaceholder', 'Repository name') });
        var remote = el('input', { className: 'git-input vt-input', value: source.remoteUrl, 'data-git-field': 'remote', placeholder: 'git@github.com:owner/repository.git' });
        var branch = el('input', { className: 'git-input vt-input', value: source.defaultBranch, 'data-git-field': 'branch' });
        var secret = el('select', { className: 'git-select vt-select', 'data-git-field': 'credential' });
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
        var form = el('div', { className: 'git-form', 'data-git-form': editing.record ? 'edit' : 'add' });
        form.appendChild(el('div', { className: 'git-form-title', textContent: editing.record ? tr(api, 'ui.editRepository', 'Edit repository') : tr(api, 'ui.newRepository', 'New repository') }));
        form.appendChild(field(tr(api, 'ui.name', 'Name'), name));
        form.appendChild(field(tr(api, 'ui.branch', 'Default branch'), branch));
        form.appendChild(field(tr(api, 'ui.remote', 'Repository address'), remote, true));
        form.appendChild(field(tr(api, 'ui.credential', 'Credential secret'), secret, true));
        var actions = el('div', { className: 'git-form-actions' });
        actions.appendChild(el('button', { className: 'vt-button primary', type: 'button', textContent: tr(api, 'ui.save', 'Save'), 'data-git-action': 'save', onClick: function () {
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
              checkoutName: editing.record ? source.checkoutName : '',
              credentialRef: credentialRef,
              updatedAt: now()
            };
            return editing.record ? update(api, payload) : add(api, payload);
          }).then(function () { editing = null; return refresh(); }).catch(function () {
            error = tr(api, 'ui.error', 'Could not save the repository.');
            render();
          });
        } }));
        actions.appendChild(el('button', { className: 'vt-button secondary', type: 'button', textContent: tr(api, 'ui.cancel', 'Cancel'), 'data-git-action': 'cancel', onClick: function () { editing = null; error = ''; render(); } }));
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
        var activeOperation = operations[row.id];
        var outcome = outcomes[row.id];
        var card = el('div', { className: 'git-card', 'data-git-repository': row.id });
        var head = el('div', { className: 'git-card-head' });
        var identity = el('div', {});
        identity.appendChild(el('div', { className: 'git-card-title', textContent: row.name }));
        identity.appendChild(el('div', { className: 'git-meta', textContent: row.remoteUrl + ' · ' + row.defaultBranch }));
        identity.appendChild(el('div', { className: 'git-path', textContent: tr(api, 'ui.localFolder', 'Local folder') + ': Repositories/' + row.checkoutName }));
        head.appendChild(identity);
        var descriptorActions = el('div', { className: 'git-actions' });
        descriptorActions.appendChild(el('button', { className: 'vt-button secondary compact', type: 'button', textContent: tr(api, 'ui.edit', 'Edit'), disabled: busy[row.id], 'data-git-action': 'edit', onClick: function () { editing = { record: row }; render(); } }));
        descriptorActions.appendChild(el('button', { className: 'vt-button ghost compact git-remove', type: 'button', textContent: tr(api, 'ui.remove', 'Remove from Verstak'), disabled: busy[row.id], 'data-git-action': 'remove', onClick: function () {
          remove(api, { id: row.id, scope: { kind: 'deal', workspaceId: deal.workspaceId } }).then(refresh).catch(function () { error = tr(api, 'ui.error', 'Could not save the repository.'); render(); });
        } }));
        head.appendChild(descriptorActions);
        card.appendChild(head);
        if (activeOperation) {
          card.appendChild(el('div', { className: 'git-operation', 'data-git-operation': activeOperation.kind }, [
            el('span', { className: 'git-operation-spinner', 'aria-hidden': 'true' }),
            el('span', { textContent: operationLabel(activeOperation) + '…' })
          ]));
        } else if (outcome) {
          card.appendChild(el('div', { className: 'git-operation ' + outcome.state, 'data-git-operation-result': outcome.state, textContent: operationLabel(outcome) + (outcome.state === 'success' ? ' ' + tr(api, 'ui.operationComplete', 'completed.') : ' ' + tr(api, 'ui.operationError', 'failed.')) }));
        }
        renderStatus(card, row);
        var actions = el('div', { className: 'git-actions' });
        if (status && status.state === 'not-cloned') {
          actions.appendChild(el('button', { className: 'vt-button primary compact', type: 'button', textContent: tr(api, 'ui.clone', 'Clone'), disabled: busy[row.id], 'data-git-action': 'clone', onClick: function () {
            var request = gitRequest(row); request.branch = row.defaultBranch; operation(row, { kind: 'clone' }, request);
          } }));
          actions.appendChild(el('button', { className: 'vt-button secondary compact', type: 'button', textContent: tr(api, 'ui.useExisting', 'Use existing checkout'), disabled: busy[row.id], 'data-git-action': 'register-existing', onClick: function () { operation(row, { kind: 'registerExisting' }); } }));
        } else if (status && status.state === 'cloned') {
          [{ kind: 'fetch' }, { kind: 'pull' }, { kind: 'push' }].forEach(function (nextOperation) {
            var name = nextOperation.kind;
            actions.appendChild(el('button', { className: 'vt-button secondary compact', type: 'button', textContent: tr(api, 'ui.' + name, name.charAt(0).toUpperCase() + name.slice(1)), disabled: busy[row.id], 'data-git-action': name, onClick: function () { operation(row, nextOperation); } }));
          });
          actions.appendChild(el('button', { className: 'vt-button secondary compact', type: 'button', textContent: tr(api, 'ui.openDirectory', 'Open folder'), disabled: busy[row.id], 'data-git-action': 'open-directory', onClick: function () { operation(row, { kind: 'openDirectory' }); } }));
        }
        actions.appendChild(el('button', { className: 'vt-button ghost compact', type: 'button', textContent: tr(api, 'ui.refresh', 'Refresh'), disabled: busy[row.id], 'data-git-action': 'refresh', onClick: function () { busy[row.id] = true; render(); refreshStatus(row).then(function () { busy[row.id] = false; render(); }); } }));
        card.appendChild(actions);
        shell.appendChild(card);
      }
      function render() {
        if (disposed) return;
        container.innerHTML = '';
        var shell = el('div', { className: 'git-shell', 'data-git-root': '' });
        var header = el('div', { className: 'git-header' });
        if (deal && !editing) header.appendChild(el('button', { className: 'vt-button primary', type: 'button', textContent: tr(api, 'ui.add', 'Add repository'), 'data-git-action': 'add', onClick: function () { editing = { record: null }; render(); } }));
        if (deal && !editing) shell.appendChild(header);
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
