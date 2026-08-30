/* Deal-owned Project Meta and global portfolio. */
(function () {
  'use strict';

  var PLUGIN_ID = 'verstak.projects';
  var STATUS_VALUES = ['active', 'paused', 'done', 'archived'];
  var PRIORITY_VALUES = ['low', 'normal', 'high'];
  var STYLES = [
    '.project-meta-root{height:100%;min-height:0;overflow:auto;background:var(--vt-color-background,#101020);color:var(--vt-color-text-primary,#f4f7fb);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '.project-meta-shell{max-width:52rem;margin:0 auto;padding:1.15rem}',
    '.project-meta-title{font-size:1.15rem;font-weight:700;margin:0 0 .2rem}.project-meta-subtitle{color:var(--vt-color-text-muted,#7f8aa3);font-size:.8rem;margin-bottom:1rem}',
    '.project-meta-form{display:grid;gap:.8rem;padding:1rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c)}',
    '.project-meta-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}.project-meta-field{display:grid;gap:.32rem}.project-meta-label{font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.project-meta-input,.project-meta-select,.project-meta-textarea{box-sizing:border-box;width:100%;font:inherit;font-size:.82rem;padding:.5rem .6rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-surface-input,#0f1424);color:var(--vt-color-text-primary,#f4f7fb);outline:none;color-scheme:dark}',
    '.project-meta-select{appearance:none;-webkit-appearance:none;padding-right:1.9rem;background-image:linear-gradient(45deg,transparent 50%,var(--vt-color-text-muted,#7f8aa3) 50%),linear-gradient(135deg,var(--vt-color-text-muted,#7f8aa3) 50%,transparent 50%);background-position:calc(100% - 13px) 50%,calc(100% - 8px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat}.project-meta-select option{background:var(--vt-color-surface,#15152c);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.project-meta-textarea{min-height:7rem;resize:vertical}.project-meta-input:focus,.project-meta-select:focus,.project-meta-textarea:focus{border-color:var(--vt-color-accent,#4ecca3);box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34))}',
    '.project-meta-actions{display:flex;justify-content:flex-end;gap:.6rem;align-items:center}.project-meta-save{font:inherit;font-size:.8rem;padding:.5rem .8rem;border:1px solid var(--vt-color-accent,#4ecca3);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-accent,#4ecca3);color:#101827;font-weight:650;cursor:pointer}.project-meta-save:disabled{opacity:.5;cursor:default}',
    '.project-meta-error{font-size:.78rem;color:#ffc6ce}.project-meta-saved{font-size:.76rem;color:var(--vt-color-accent,#4ecca3)}',
    '.project-meta-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:.75rem}.project-meta-card{display:grid;gap:.4rem;min-height:8rem;padding:.85rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c);color:inherit;text-align:left;font:inherit;cursor:pointer}.project-meta-card:hover{border-color:var(--vt-color-accent,#4ecca3);background:var(--vt-color-surface-hover,#1b2440)}.project-meta-card-title{font-size:.95rem;font-weight:650}.project-meta-card-deal,.project-meta-card-description{font-size:.76rem;color:var(--vt-color-text-secondary,#b7c0d4);line-height:1.45}.project-meta-card-deal{color:var(--vt-color-text-muted,#7f8aa3)}.project-meta-badges{display:flex;gap:.35rem;flex-wrap:wrap}.project-meta-badge{padding:.13rem .38rem;border:1px solid var(--vt-color-border,#202b46);border-radius:999px;font-size:.67rem;color:var(--vt-color-text-secondary,#b7c0d4)}',
    '.project-meta-empty{padding:2rem 0;color:var(--vt-color-text-muted,#7f8aa3);text-align:center}',
    '@media(max-width:620px){.project-meta-shell{padding:.8rem}.project-meta-row{grid-template-columns:1fr}}'
  ].join('\n');

  function injectStyles() {
    if (document.getElementById('project-meta-style')) return;
    var style = document.createElement('style');
    style.id = 'project-meta-style';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value == null) return;
      if (key === 'className') node.className = value;
      else if (key === 'textContent') node.textContent = value;
      else if (key === 'value') { node.value = value; node.setAttribute('value', value); }
      else if (key.slice(0, 2) === 'on' && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
      else node.setAttribute(key, value);
    });
    (children || []).forEach(function (child) { if (child != null) node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child); });
    return node;
  }

  function text(value) { return value == null ? '' : String(value); }
  function cleanPath(value) { return text(value).replace(/\\/g, '/').split('/').filter(Boolean).join('/'); }
  function normalizeTags(value) {
    var seen = {};
    return (Array.isArray(value) ? value : text(value).split(',')).map(function (tag) { return text(tag).trim(); }).filter(function (tag) {
      var key = tag.toLowerCase(); if (!tag || seen[key]) return false; seen[key] = true; return true;
    }).slice(0, 20);
  }
  function normalizeMeta(raw) {
    raw = raw || {};
    return {
      schemaVersion: 1,
      name: text(raw.name).trim(),
      description: text(raw.description).trim(),
      status: STATUS_VALUES.indexOf(raw.status) >= 0 ? raw.status : 'active',
      priority: PRIORITY_VALUES.indexOf(raw.priority) >= 0 ? raw.priority : 'normal',
      tags: normalizeTags(raw.tags),
      startDate: text(raw.startDate).trim(),
      dueDate: text(raw.dueDate).trim(),
      updatedAt: text(raw.updatedAt)
    };
  }
  function scopeFromProps(props) {
    var node = (props && props.workspaceNode) || {};
    return { id: text((props && props.workspaceId) || node.workspaceId || node.id), name: text((props && props.workspaceName) || node.name), path: cleanPath(node.rootPath || node.path) };
  }
  function translate(api, key, fallback) { return api && api.i18n && typeof api.i18n.t === 'function' ? api.i18n.t(key, null, fallback) : fallback; }
  function statusTitle(value) { return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''; }

  function mountDealMeta(container, scope, api) {
    var disposed = false;
    var state = { meta: normalizeMeta(), saving: false, error: '', saved: false };
    var fields = {};
    function render() {
      if (disposed) return;
      container.innerHTML = '';
      var shell = el('div', { className: 'project-meta-shell' });
      shell.appendChild(el('h1', { className: 'project-meta-title', textContent: translate(api, 'ui.title', 'Project Meta') }));
      shell.appendChild(el('div', { className: 'project-meta-subtitle', textContent: scope.name || scope.path || scope.id }));
      var form = el('div', { className: 'project-meta-form' });
      function field(label, key, tag, attrs) {
        var input = el(tag, Object.assign({ className: tag === 'textarea' ? 'project-meta-textarea' : (tag === 'select' ? 'project-meta-select' : 'project-meta-input'), 'data-project-meta-field': key, value: state.meta[key] }, attrs || {}));
        fields[key] = input;
        form.appendChild(el('label', { className: 'project-meta-field' }, [el('span', { className: 'project-meta-label', textContent: label }), input]));
      }
      field(translate(api, 'ui.name', 'Name'), 'name', 'input');
      field(translate(api, 'ui.description', 'Description'), 'description', 'textarea');
      var row = el('div', { className: 'project-meta-row' });
      form.appendChild(row);
      function selectField(label, key, values) {
        var select = el('select', { className: 'project-meta-select', 'data-project-meta-field': key, value: state.meta[key] });
        values.forEach(function (value) { select.appendChild(el('option', { value: value, textContent: statusTitle(value) })); });
        select.value = state.meta[key]; fields[key] = select;
        row.appendChild(el('label', { className: 'project-meta-field' }, [el('span', { className: 'project-meta-label', textContent: label }), select]));
      }
      selectField(translate(api, 'ui.status', 'Status'), 'status', STATUS_VALUES);
      selectField(translate(api, 'ui.priority', 'Priority'), 'priority', PRIORITY_VALUES);
      var dates = el('div', { className: 'project-meta-row' });
      form.appendChild(dates);
      function dateField(label, key) {
        var input = el('input', { className: 'project-meta-input', type: 'date', 'data-project-meta-field': key, value: state.meta[key] });
        fields[key] = input;
        dates.appendChild(el('label', { className: 'project-meta-field' }, [el('span', { className: 'project-meta-label', textContent: label }), input]));
      }
      dateField(translate(api, 'ui.startDate', 'Start date'), 'startDate');
      dateField(translate(api, 'ui.dueDate', 'Due date'), 'dueDate');
      field(translate(api, 'ui.tags', 'Tags'), 'tags', 'input', { value: state.meta.tags.join(', ') });
      var save = el('button', { className: 'project-meta-save', type: 'button', 'data-project-meta-action': 'save', textContent: state.saving ? translate(api, 'ui.saving', 'Saving…') : translate(api, 'ui.save', 'Save') });
      save.disabled = state.saving;
      save.addEventListener('click', function () {
        if (state.saving) return;
        var next = normalizeMeta({ name: fields.name.value, description: fields.description.value, status: fields.status.value, priority: fields.priority.value, startDate: fields.startDate.value, dueDate: fields.dueDate.value, tags: fields.tags.value, updatedAt: new Date().toISOString() });
        state.saving = true; state.error = ''; state.saved = false; render();
        Promise.resolve(api.workspaces.writeToolConfig(scope.id, next)).then(function () { if (disposed) return; state.meta = next; state.saving = false; state.saved = true; render(); }).catch(function () { if (disposed) return; state.saving = false; state.error = translate(api, 'ui.saveError', 'Could not save Project Meta.'); render(); });
      });
      var actions = el('div', { className: 'project-meta-actions' });
      if (state.error) actions.appendChild(el('div', { className: 'project-meta-error', textContent: state.error }));
      if (state.saved) actions.appendChild(el('div', { className: 'project-meta-saved', textContent: translate(api, 'ui.saved', 'Saved') }));
      actions.appendChild(save); form.appendChild(actions); shell.appendChild(form); container.appendChild(shell);
    }
    Promise.resolve(api.workspaces.readToolConfig(scope.id)).then(function (raw) { if (disposed) return; state.meta = normalizeMeta(raw); render(); }).catch(function () { if (disposed) return; state.error = translate(api, 'ui.loadError', 'Could not load Project Meta.'); render(); });
    container.__projectMetaCleanup = function () { disposed = true; };
  }

  function mountPortfolio(container, api) {
    var disposed = false;
    function render(rows) {
      if (disposed) return;
      container.innerHTML = '';
      var shell = el('div', { className: 'project-meta-shell', 'data-project-meta-portfolio': '' });
      shell.appendChild(el('h1', { className: 'project-meta-title', textContent: translate(api, 'ui.portfolioTitle', 'Project portfolio') }));
      shell.appendChild(el('div', { className: 'project-meta-subtitle', textContent: translate(api, 'ui.portfolioHint', 'Project Meta is stored directly on each Deal.') }));
      if (!rows.length) shell.appendChild(el('div', { className: 'project-meta-empty', textContent: translate(api, 'ui.emptyPortfolio', 'No Deals yet.') }));
      else {
        var grid = el('div', { className: 'project-meta-grid' });
        rows.forEach(function (row) {
          var title = row.meta.name || row.workspace.name || row.workspace.path || row.workspace.id;
          var card = el('button', { className: 'project-meta-card', type: 'button', 'data-project-meta-deal': row.workspace.id });
          card.appendChild(el('div', { className: 'project-meta-card-title', textContent: title }));
          card.appendChild(el('div', { className: 'project-meta-card-deal', textContent: row.workspace.name || row.workspace.path }));
          if (row.meta.description) card.appendChild(el('div', { className: 'project-meta-card-description', textContent: row.meta.description }));
          var badges = el('div', { className: 'project-meta-badges' });
          badges.appendChild(el('span', { className: 'project-meta-badge', textContent: statusTitle(row.meta.status) }));
          badges.appendChild(el('span', { className: 'project-meta-badge', textContent: statusTitle(row.meta.priority) }));
          row.meta.tags.forEach(function (tag) { badges.appendChild(el('span', { className: 'project-meta-badge', textContent: tag })); });
          card.appendChild(badges);
          card.addEventListener('click', function () { api.navigation.openWorkspace({ workspaceId: row.workspace.id, workspaceItemId: 'verstak.projects.workspace' }); });
          grid.appendChild(card);
        });
        shell.appendChild(grid);
      }
      container.appendChild(shell);
    }
    Promise.resolve(api.workspaces.list()).then(function (items) {
      var workspaces = (Array.isArray(items) ? items : []).map(function (workspace) {
        return { id: text(workspace && workspace.id), name: text(workspace && workspace.name), path: cleanPath(workspace && workspace.rootPath) };
      }).filter(function (workspace) { return workspace.id; });
      return Promise.all(workspaces.map(function (workspace) { return Promise.resolve(api.workspaces.readToolConfig(workspace.id)).then(function (raw) { return { workspace: workspace, meta: normalizeMeta(raw) }; }); }));
    }).then(render).catch(function (error) { render([]); });
    container.__projectMetaCleanup = function () { disposed = true; };
  }

  var ProjectMetaView = {
    mount: function (container, props, api) { injectStyles(); var scope = scopeFromProps(props); if (scope.id) mountDealMeta(container, scope, api); else mountPortfolio(container, api); },
    unmount: function (container) { if (container.__projectMetaCleanup) container.__projectMetaCleanup(); container.__projectMetaCleanup = null; container.innerHTML = ''; }
  };

  window.VerstakPluginRegister(PLUGIN_ID, { components: { ProjectMetaView: ProjectMetaView } });
})();
