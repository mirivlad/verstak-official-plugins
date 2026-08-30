/* Independent Deal-scoped Milestones provider. */
(function () {
  'use strict';

  var PLUGIN_ID = 'verstak.milestones';
  var DATA_NAME = 'milestones';
  var STATUS_VALUES = ['open', 'done', 'cancelled'];
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var STYLES = [
    '.milestones-root{width:100%;height:100%;min-height:0;overflow:auto;background:var(--vt-color-background,#101020);color:var(--vt-color-text-primary,#f4f7fb);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '.milestones-shell{box-sizing:border-box;width:100%;max-width:72rem;margin:0 auto;padding:1.4rem 1.5rem 2rem}',
    '.milestones-header{display:flex;align-items:center;justify-content:flex-end;gap:1rem;margin-bottom:1rem}',
    '.milestones-editor{display:grid;grid-template-columns:minmax(0,1fr) 12rem auto;gap:.75rem;align-items:end;margin-bottom:1rem;padding:1rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c)}.milestones-field{display:grid;gap:.34rem}.milestones-label{font-size:.74rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.milestones-input,.milestones-select{box-sizing:border-box;width:100%;min-height:2.15rem;padding:.42rem .58rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-input,#0f1424);color:var(--vt-color-text-primary,#f4f7fb);font:inherit;font-size:.82rem;outline:none;color-scheme:dark}.milestones-input:focus,.milestones-select:focus{border-color:var(--vt-color-accent,#4ecca3);box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34))}',
    '.milestones-select{appearance:none;-webkit-appearance:none;padding-right:2rem;background-image:linear-gradient(45deg,transparent 50%,var(--vt-color-text-muted,#7f8aa3) 50%),linear-gradient(135deg,var(--vt-color-text-muted,#7f8aa3) 50%,transparent 50%);background-position:calc(100% - 13px) 50%,calc(100% - 8px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat}.milestones-select option{background:var(--vt-color-surface,#15152c);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.milestones-editor-actions,.milestones-actions{display:flex;align-items:center;gap:.45rem;flex-wrap:wrap}.milestones-list{display:grid;gap:.65rem}.milestones-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1rem;align-items:center;padding:.9rem 1rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c)}.milestones-row:hover{border-color:var(--vt-color-border-strong,#2c456a)}',
    '.milestones-main{display:grid;gap:.3rem;min-width:0}.milestones-name{font-size:.9rem;font-weight:650;overflow-wrap:anywhere}.milestones-meta{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;font-size:.73rem;color:var(--vt-color-text-muted,#7f8aa3)}.milestones-due{display:inline-flex;align-items:center;min-height:1.4rem;padding:0 .4rem;border-radius:999px;background:var(--vt-color-surface-muted,#111629);color:var(--vt-color-text-secondary,#b7c0d4)}',
    '.milestones-empty{padding:3rem 1rem;border:1px dashed var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-lg,8px);color:var(--vt-color-text-muted,#7f8aa3);text-align:center}.milestones-empty-title{color:var(--vt-color-text-secondary,#b7c0d4);font-weight:650;margin-bottom:.3rem}.milestones-error{margin-bottom:.75rem;color:var(--vt-color-danger,#ff8e9b);font-size:.78rem}',
    '@media(max-width:760px){.milestones-editor{grid-template-columns:1fr}.milestones-row{grid-template-columns:1fr}.milestones-actions{justify-content:flex-start}}@media(max-width:560px){.milestones-shell{padding:1rem}.milestones-header{align-items:flex-start;flex-direction:column}}'
  ].join('\n');

  function text(value) { return value == null ? '' : String(value); }
  function validWorkspaceID(value) { return UUID_RE.test(text(value).trim()); }
  function now() { return new Date().toISOString(); }
  function cleanStatus(value) { value = text(value).trim().toLowerCase(); return STATUS_VALUES.indexOf(value) === -1 ? 'open' : value; }
  function cleanDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(text(value).trim()) ? text(value).trim() : ''; }
  function milestoneID(title) { return 'milestone:' + Date.now() + ':' + Math.random().toString(36).slice(2, 10) + ':' + text(title).trim().slice(0, 24).replace(/\s+/g, '-'); }
  function translate(api, key, fallback, params) { return api && api.i18n && typeof api.i18n.t === 'function' ? api.i18n.t(key, params || null, fallback) : fallback; }
  function injectStyles() { if (document.getElementById('milestones-style')) return; var style = document.createElement('style'); style.id = 'milestones-style'; style.textContent = STYLES; document.head.appendChild(style); }
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) { var value = attrs[key]; if (value == null) return; if (key === 'className') node.className = value; else if (key === 'textContent') node.textContent = value; else if (key === 'value') { node.value = value; node.setAttribute('value', value); } else if (key === 'checked' || key === 'disabled') node[key] = value === true; else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2).toLowerCase(), value); else node.setAttribute(key, value); });
    (children || []).forEach(function (child) { if (child != null) node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child); });
    return node;
  }
  function normalizeMilestone(raw) {
    raw = raw || {};
    var status = cleanStatus(raw.status);
    var createdAt = text(raw.createdAt).trim() || now();
    return {
      id: text(raw.id).trim() || milestoneID(raw.title),
      workspaceId: text(raw.workspaceId).trim(),
      title: text(raw.title).trim(),
      status: status,
      dueAt: cleanDate(raw.dueAt),
      createdAt: createdAt,
      updatedAt: text(raw.updatedAt).trim() || createdAt,
      completedAt: status === 'done' ? (text(raw.completedAt).trim() || createdAt) : '',
      migrationProvenance: raw.migrationProvenance && typeof raw.migrationProvenance === 'object' ? raw.migrationProvenance : undefined
    };
  }
  function normalizeRecords(records) {
    var seen = {};
    return (Array.isArray(records) ? records : []).map(normalizeMilestone).filter(function (record) {
      if (!record.id || !record.title || !validWorkspaceID(record.workspaceId) || seen[record.id]) return false;
      seen[record.id] = true;
      return true;
    });
  }
  function loadRecords(api) { return api && api.storage && api.storage.data && typeof api.storage.data.readNDJSON === 'function' ? api.storage.data.readNDJSON(DATA_NAME).then(normalizeRecords) : Promise.resolve([]); }
  function persistRecords(api, records) {
    if (!api || !api.storage || !api.storage.data || typeof api.storage.data.writeNDJSON !== 'function') return Promise.reject(new Error('Milestones storage is unavailable'));
    var normalized = normalizeRecords(records);
    return api.storage.data.writeNDJSON(DATA_NAME, normalized).then(function () { return normalized; });
  }
  function requireScope(args) {
    var scope = args && args.scope;
    if (!scope || scope.kind !== 'deal' || !validWorkspaceID(scope.workspaceId)) return Promise.reject(new Error('DealScope.workspaceId is required'));
    return Promise.resolve(text(scope.workspaceId).trim());
  }
  function listMilestones(api, args) { return requireScope(args || {}).then(function (workspaceId) { return loadRecords(api).then(function (records) { return records.filter(function (record) { return record.workspaceId === workspaceId; }); }); }); }
  function createMilestone(api, args) {
    args = args || {};
    var title = text(args.title).trim();
    if (!title) return Promise.reject(new Error('milestone title must not be empty'));
    return requireScope(args).then(function (workspaceId) {
      var timestamp = now();
      var record = normalizeMilestone({ id: milestoneID(title), workspaceId: workspaceId, title: title, status: args.status, dueAt: args.dueAt, createdAt: timestamp, updatedAt: timestamp });
      return loadRecords(api).then(function (records) { return persistRecords(api, [record].concat(records)); }).then(function () { return record; });
    });
  }
  function updateMilestone(api, args) {
    args = args || {};
    var id = text(args.id).trim();
    if (!id) return Promise.reject(new Error('milestone id must not be empty'));
    return requireScope(args).then(function (workspaceId) { return loadRecords(api).then(function (records) {
      var updated = null;
      var next = records.map(function (record) {
        if (record.id !== id || record.workspaceId !== workspaceId) return record;
        var status = Object.prototype.hasOwnProperty.call(args, 'status') ? cleanStatus(args.status) : record.status;
        var title = Object.prototype.hasOwnProperty.call(args, 'title') ? text(args.title).trim() : record.title;
        if (!title) throw new Error('milestone title must not be empty');
        var timestamp = now();
        updated = Object.assign({}, record, { title: title, status: status, dueAt: Object.prototype.hasOwnProperty.call(args, 'dueAt') ? cleanDate(args.dueAt) : record.dueAt, updatedAt: timestamp, completedAt: status === 'done' ? (record.completedAt || timestamp) : '' });
        return updated;
      });
      if (!updated) throw new Error('milestone not found: ' + id);
      return persistRecords(api, next).then(function () { return updated; });
    }); });
  }
  function deleteMilestone(api, args) {
    args = args || {};
    var id = text(args.id).trim();
    if (!id) return Promise.reject(new Error('milestone id must not be empty'));
    return requireScope(args).then(function (workspaceId) { return loadRecords(api).then(function (records) {
      var found = false;
      var next = records.filter(function (record) { if (record.id === id && record.workspaceId === workspaceId) { found = true; return false; } return true; });
      if (!found) throw new Error('milestone not found: ' + id);
      return persistRecords(api, next).then(function () { return { id: id, deleted: true }; });
    }); });
  }
  function scopeFromProps(props) {
    var node = (props && props.workspaceNode) || {};
    var workspaceId = text((props && props.workspaceId) || node.workspaceId || node.id).trim();
    return validWorkspaceID(workspaceId) ? { workspaceId: workspaceId, name: text((props && props.workspaceName) || node.name).trim() } : null;
  }

  function MilestonesView() {}
  MilestonesView.mount = function (container, props, api) {
    injectStyles();
    if (container.classList) container.classList.add('milestones-root');
    var scope = scopeFromProps(props || {}); var disposed = false; var records = []; var editing = false; var error = '';

    function render() {
      if (disposed) return;
      container.innerHTML = '';
      var shell = el('div', { className: 'milestones-shell' });
      var header = el('div', { className: 'milestones-header' });
      if (scope && !editing) header.appendChild(el('button', { className: 'vt-button primary', type: 'button', 'data-milestone-action': 'add', textContent: translate(api, 'ui.add', 'Add milestone'), onClick: function () { editing = true; error = ''; render(); } }));
      if (scope && !editing) shell.appendChild(header);

      if (!scope) {
        shell.appendChild(el('div', { className: 'milestones-empty' }, [
          el('div', { className: 'milestones-empty-title', textContent: translate(api, 'ui.noDealTitle', 'Choose a Deal') }),
          el('div', { textContent: translate(api, 'ui.noDeal', 'Select a Deal to create milestones.') })
        ]));
        container.appendChild(shell); return;
      }

      if (editing) {
        var title = el('input', { className: 'milestones-input vt-input', 'data-milestone-input': 'title', placeholder: translate(api, 'ui.titlePlaceholder', 'For example: v1.0 release') });
        var due = el('input', { className: 'milestones-input vt-input', type: 'date', 'data-milestone-input': 'dueAt' });
        var editorActions = el('div', { className: 'milestones-editor-actions' });
        editorActions.appendChild(el('button', { className: 'vt-button primary', type: 'button', 'data-milestone-action': 'save', textContent: translate(api, 'ui.save', 'Save'), onClick: function () { createMilestone(api, { scope: { kind: 'deal', workspaceId: scope.workspaceId }, title: title.value, dueAt: due.value }).then(function () { editing = false; return refresh(); }).catch(function () { error = translate(api, 'ui.saveError', 'Could not save milestone.'); render(); }); } }));
        editorActions.appendChild(el('button', { className: 'vt-button secondary', type: 'button', 'data-milestone-action': 'cancel', textContent: translate(api, 'ui.cancel', 'Cancel'), onClick: function () { editing = false; render(); } }));
        shell.appendChild(el('div', { className: 'milestones-editor' }, [
          el('label', { className: 'milestones-field' }, [el('span', { className: 'milestones-label', textContent: translate(api, 'ui.titleLabel', 'Title') }), title]),
          el('label', { className: 'milestones-field' }, [el('span', { className: 'milestones-label', textContent: translate(api, 'ui.dueDate', 'Due') }), due]),
          editorActions
        ]));
      }

      if (error) shell.appendChild(el('div', { className: 'milestones-error', textContent: error }));
      var list = el('div', { className: 'milestones-list' });
      if (!records.length) list.appendChild(el('div', { className: 'milestones-empty' }, [
        el('div', { className: 'milestones-empty-title', textContent: translate(api, 'ui.emptyTitle', 'No milestones yet') }),
        el('div', { textContent: translate(api, 'ui.emptyHint', 'Add the first checkpoint when the project has something worth tracking.') })
      ]));
      records.forEach(function (record) {
        var status = el('select', { className: 'milestones-select vt-select', 'data-milestone-status': record.id, value: record.status, onChange: function (event) { updateMilestone(api, { scope: { kind: 'deal', workspaceId: scope.workspaceId }, id: record.id, status: event.target.value }).then(refresh).catch(function () { error = translate(api, 'ui.saveError', 'Could not save milestone.'); render(); }); } });
        STATUS_VALUES.forEach(function (value) { status.appendChild(el('option', { value: value, textContent: translate(api, 'status.' + value, value) })); }); status.value = record.status;
        var actions = el('div', { className: 'milestones-actions' }, [status, el('button', { className: 'vt-button ghost', type: 'button', 'data-milestone-action': 'delete', 'data-milestone-id': record.id, textContent: translate(api, 'ui.delete', 'Delete'), onClick: function () { deleteMilestone(api, { scope: { kind: 'deal', workspaceId: scope.workspaceId }, id: record.id }).then(refresh).catch(function () { error = translate(api, 'ui.saveError', 'Could not save milestone.'); render(); }); } })]);
        var meta = el('div', { className: 'milestones-meta' });
        if (record.dueAt) meta.appendChild(el('span', { className: 'milestones-due', textContent: translate(api, 'ui.duePrefix', 'Due') + ': ' + record.dueAt }));
        list.appendChild(el('div', { className: 'milestones-row', 'data-milestone-id': record.id }, [el('div', { className: 'milestones-main' }, [el('div', { className: 'milestones-name', textContent: record.title }), meta]), actions]));
      });
      shell.appendChild(list); container.appendChild(shell);
    }
    function refresh() { return scope ? listMilestones(api, { scope: { kind: 'deal', workspaceId: scope.workspaceId } }).then(function (next) { records = next; error = ''; render(); }) : Promise.resolve(render()); }
    refresh().catch(function () { error = translate(api, 'ui.saveError', 'Could not save milestone.'); render(); });
    container.__milestonesCleanup = function () { disposed = true; };
  };
  MilestonesView.unmount = function (container) { if (container && container.__milestonesCleanup) container.__milestonesCleanup(); if (container) { container.__milestonesCleanup = null; if (container.classList) container.classList.remove('milestones-root'); container.innerHTML = ''; } };
  window.VerstakPluginRegister(PLUGIN_ID, { components: { MilestonesView: MilestonesView }, activate: function (api) {
    if (!api || !api.commands || typeof api.commands.register !== 'function') return Promise.resolve();
    return Promise.all([
      api.commands.register('verstak.milestones.list', function (args) { return listMilestones(api, args); }),
      api.commands.register('verstak.milestones.create', function (args) { return createMilestone(api, args); }),
      api.commands.register('verstak.milestones.update', function (args) { return updateMilestone(api, args); }),
      api.commands.register('verstak.milestones.delete', function (args) { return deleteMilestone(api, args); })
    ]);
  } });
})();
