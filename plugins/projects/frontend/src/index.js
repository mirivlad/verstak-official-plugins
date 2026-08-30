/* Deal-owned Project role and global project list. */
(function () {
  'use strict';

  var PLUGIN_ID = 'verstak.projects';
  var STATUS_VALUES = ['active', 'paused', 'done', 'archived'];
  var PRIORITY_VALUES = ['low', 'normal', 'high'];
  var STYLES = [
    '.project-meta-root{width:100%;height:100%;min-height:0;overflow:auto;background:var(--vt-color-background,#101020);color:var(--vt-color-text-primary,#f4f7fb);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '.project-meta-shell{box-sizing:border-box;width:100%;max-width:72rem;margin:0 auto;padding:1.4rem 1.5rem 2rem}',
    '.project-meta-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;margin-bottom:1rem}.project-meta-title{font-size:1.28rem;font-weight:700;line-height:1.2;margin:0}.project-meta-subtitle{color:var(--vt-color-text-muted,#7f8aa3);font-size:.8rem;line-height:1.45;margin-top:.3rem}',
    '.project-meta-form{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(17rem,.75fr);gap:1rem;align-items:start}.project-meta-panel{display:grid;gap:.85rem;padding:1rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c)}',
    '.project-meta-panel-title{font-size:.74rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--vt-color-text-muted,#7f8aa3);margin-bottom:.05rem}.project-meta-field{display:grid;gap:.34rem}.project-meta-label{font-size:.74rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.project-meta-input,.project-meta-select,.project-meta-textarea{box-sizing:border-box;width:100%;min-height:2.15rem;padding:.42rem .58rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-input,#0f1424);color:var(--vt-color-text-primary,#f4f7fb);font:inherit;font-size:.82rem;outline:none;color-scheme:dark}',
    '.project-meta-textarea{min-height:10rem;resize:vertical;line-height:1.45}.project-meta-input:focus,.project-meta-select:focus,.project-meta-textarea:focus{border-color:var(--vt-color-accent,#4ecca3);box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34))}',
    '.project-meta-select{appearance:none;-webkit-appearance:none;padding-right:2rem;background-image:linear-gradient(45deg,transparent 50%,var(--vt-color-text-muted,#7f8aa3) 50%),linear-gradient(135deg,var(--vt-color-text-muted,#7f8aa3) 50%,transparent 50%);background-position:calc(100% - 13px) 50%,calc(100% - 8px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat}.project-meta-select option{background:var(--vt-color-surface,#15152c);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.project-meta-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}.project-meta-actions{grid-column:1/-1;display:flex;justify-content:flex-end;align-items:center;gap:.7rem;padding-top:.05rem}.project-meta-save{min-width:7rem}.project-meta-error{font-size:.78rem;color:var(--vt-color-danger,#ff8e9b)}.project-meta-saved{font-size:.76rem;color:var(--vt-color-accent,#4ecca3)}',
    '.project-meta-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(17rem,1fr));gap:.85rem}.project-meta-card{display:grid;gap:.5rem;min-height:9rem;padding:1rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c);color:inherit;text-align:left;font:inherit;cursor:pointer}.project-meta-card:hover{border-color:var(--vt-color-accent,#4ecca3);background:var(--vt-color-surface-hover,#1b2440)}.project-meta-card-title{font-size:.98rem;font-weight:700}.project-meta-card-deal,.project-meta-card-description{font-size:.76rem;color:var(--vt-color-text-secondary,#b7c0d4);line-height:1.45}.project-meta-card-deal{color:var(--vt-color-text-muted,#7f8aa3)}.project-meta-badges{display:flex;gap:.35rem;flex-wrap:wrap;margin-top:auto}.project-meta-badge{padding:.16rem .44rem;border:1px solid var(--vt-color-border,#202b46);border-radius:999px;font-size:.68rem;color:var(--vt-color-text-secondary,#b7c0d4)}',
    '.project-meta-empty{padding:3rem 1rem;border:1px dashed var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-lg,8px);color:var(--vt-color-text-muted,#7f8aa3);text-align:center}',
    '@media(max-width:820px){.project-meta-form{grid-template-columns:1fr}.project-meta-pair{grid-template-columns:1fr 1fr}}@media(max-width:560px){.project-meta-shell{padding:1rem}.project-meta-pair{grid-template-columns:1fr}.project-meta-heading{align-items:flex-start;flex-direction:column}}'
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
      else if (key === 'disabled') node.disabled = Boolean(value);
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
  function titleCase(value) { return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''; }
  function choiceTitle(api, group, value) { return translate(api, group + '.' + value, titleCase(value)); }

  function mountDealMeta(container, scope, api) {
    var disposed = false;
    var state = { meta: normalizeMeta(), saving: false, error: '', saved: false };
    var fields = {};
    if (container.classList) container.classList.add('project-meta-root');

    function addField(parent, label, key, tag, attrs) {
      var className = tag === 'textarea' ? 'project-meta-textarea vt-textarea' : (tag === 'select' ? 'project-meta-select vt-select' : 'project-meta-input vt-input');
      var input = el(tag, Object.assign({ className: className, 'data-project-meta-field': key, value: state.meta[key] }, attrs || {}));
      fields[key] = input;
      parent.appendChild(el('label', { className: 'project-meta-field' }, [el('span', { className: 'project-meta-label', textContent: label }), input]));
      return input;
    }

    function addSelect(parent, label, key, values, group) {
      var select = el('select', { className: 'project-meta-select vt-select', 'data-project-meta-field': key });
      values.forEach(function (value) { select.appendChild(el('option', { value: value, textContent: choiceTitle(api, group, value) })); });
      select.value = state.meta[key];
      fields[key] = select;
      parent.appendChild(el('label', { className: 'project-meta-field' }, [el('span', { className: 'project-meta-label', textContent: label }), select]));
    }

    function render() {
      if (disposed) return;
      container.innerHTML = '';
      fields = {};
      var shell = el('div', { className: 'project-meta-shell' });

      var form = el('div', { className: 'project-meta-form' });
      var main = el('section', { className: 'project-meta-panel' });
      main.appendChild(el('div', { className: 'project-meta-panel-title', textContent: translate(api, 'ui.details', 'Project details') }));
      addField(main, translate(api, 'ui.name', 'Name'), 'name', 'input', { placeholder: scope.name || '' });
      addField(main, translate(api, 'ui.description', 'Description'), 'description', 'textarea', { placeholder: translate(api, 'ui.descriptionPlaceholder', 'What is this project about?') });
      addField(main, translate(api, 'ui.tags', 'Tags'), 'tags', 'input', { value: state.meta.tags.join(', '), placeholder: translate(api, 'ui.tagsPlaceholder', 'release, client, backend') });

      var planning = el('section', { className: 'project-meta-panel' });
      planning.appendChild(el('div', { className: 'project-meta-panel-title', textContent: translate(api, 'ui.planning', 'Planning') }));
      var statusPair = el('div', { className: 'project-meta-pair' });
      addSelect(statusPair, translate(api, 'ui.status', 'Status'), 'status', STATUS_VALUES, 'status');
      addSelect(statusPair, translate(api, 'ui.priority', 'Priority'), 'priority', PRIORITY_VALUES, 'priority');
      planning.appendChild(statusPair);
      var datePair = el('div', { className: 'project-meta-pair' });
      addField(datePair, translate(api, 'ui.startDate', 'Start date'), 'startDate', 'input', { type: 'date' });
      addField(datePair, translate(api, 'ui.dueDate', 'Due date'), 'dueDate', 'input', { type: 'date' });
      planning.appendChild(datePair);

      form.appendChild(main);
      form.appendChild(planning);
      var actions = el('div', { className: 'project-meta-actions' });
      if (state.error) actions.appendChild(el('div', { className: 'project-meta-error', textContent: state.error }));
      if (state.saved) actions.appendChild(el('div', { className: 'project-meta-saved', textContent: translate(api, 'ui.saved', 'Saved') }));
      var save = el('button', { className: 'project-meta-save vt-button primary', type: 'button', 'data-project-meta-action': 'save', textContent: state.saving ? translate(api, 'ui.saving', 'Saving…') : translate(api, 'ui.save', 'Save'), disabled: state.saving });
      save.addEventListener('click', function () {
        if (state.saving) return;
        var next = normalizeMeta({ name: fields.name.value, description: fields.description.value, status: fields.status.value, priority: fields.priority.value, startDate: fields.startDate.value, dueDate: fields.dueDate.value, tags: fields.tags.value, updatedAt: new Date().toISOString() });
        state.saving = true; state.error = ''; state.saved = false; render();
        Promise.resolve(api.workspaces.writeToolConfig(scope.id, next)).then(function () { if (disposed) return; state.meta = next; state.saving = false; state.saved = true; render(); }).catch(function () { if (disposed) return; state.saving = false; state.error = translate(api, 'ui.saveError', 'Could not save project settings.'); render(); });
      });
      actions.appendChild(save);
      form.appendChild(actions);
      shell.appendChild(form);
      container.appendChild(shell);
    }

    Promise.resolve(api.workspaces.readToolConfig(scope.id)).then(function (raw) { if (disposed) return; state.meta = normalizeMeta(raw); render(); }).catch(function () { if (disposed) return; state.error = translate(api, 'ui.loadError', 'Could not load project settings.'); render(); });
    container.__projectMetaCleanup = function () { disposed = true; };
  }

  function mountPortfolio(container, api) {
    var disposed = false;
    if (container.classList) container.classList.add('project-meta-root');
    function render(rows) {
      if (disposed) return;
      container.innerHTML = '';
      var shell = el('div', { className: 'project-meta-shell', 'data-project-meta-portfolio': '' });
      var heading = el('div', { className: 'project-meta-heading' });
      heading.appendChild(el('div', {}, [
        el('h1', { className: 'project-meta-title', textContent: translate(api, 'ui.portfolioTitle', 'Projects') }),
        el('div', { className: 'project-meta-subtitle', textContent: translate(api, 'ui.portfolioHint', 'Deals that have the Project role enabled.') })
      ]));
      shell.appendChild(heading);
      if (!rows.length) shell.appendChild(el('div', { className: 'project-meta-empty', textContent: translate(api, 'ui.emptyPortfolio', 'No projects yet.') }));
      else {
        var grid = el('div', { className: 'project-meta-grid' });
        rows.forEach(function (row) {
          var title = row.meta.name || row.workspace.name || row.workspace.path || row.workspace.id;
          var card = el('button', { className: 'project-meta-card', type: 'button', 'data-project-meta-deal': row.workspace.id });
          card.appendChild(el('div', { className: 'project-meta-card-title', textContent: title }));
          if (row.meta.name && row.meta.name !== row.workspace.name) card.appendChild(el('div', { className: 'project-meta-card-deal', textContent: row.workspace.name || row.workspace.path }));
          if (row.meta.description) card.appendChild(el('div', { className: 'project-meta-card-description', textContent: row.meta.description }));
          var badges = el('div', { className: 'project-meta-badges' });
          badges.appendChild(el('span', { className: 'project-meta-badge', textContent: choiceTitle(api, 'status', row.meta.status) }));
          badges.appendChild(el('span', { className: 'project-meta-badge', textContent: choiceTitle(api, 'priority', row.meta.priority) }));
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
    }).then(render).catch(function () { render([]); });
    container.__projectMetaCleanup = function () { disposed = true; };
  }

  var ProjectMetaView = {
    mount: function (container, props, api) { injectStyles(); var scope = scopeFromProps(props); if (scope.id) mountDealMeta(container, scope, api); else mountPortfolio(container, api); },
    unmount: function (container) { if (container.__projectMetaCleanup) container.__projectMetaCleanup(); container.__projectMetaCleanup = null; if (container.classList) container.classList.remove('project-meta-root'); container.innerHTML = ''; }
  };

  window.VerstakPluginRegister(PLUGIN_ID, { components: { ProjectMetaView: ProjectMetaView } });
})();
