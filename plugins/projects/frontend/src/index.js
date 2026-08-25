/* ===========================================================
   Projects Plugin — Verstak Projects UX v2
   Projects owns project structure; optional tools stay providers.
   =========================================================== */
(function () {
  'use strict';

  var PLUGIN_ID = 'verstak.projects';
  var PROJECTS_KEY = 'projects:global';
  var LIST_COMMAND_ID = 'verstak.projects.list';
  var GET_COMMAND_ID = 'verstak.projects.get';
  var OVERVIEW_COMMAND_ID = 'verstak.projects.provideOverview';
  var STATUS_VALUES = ['active', 'paused', 'done', 'archived'];
  var PRIORITY_VALUES = ['low', 'normal', 'high'];
  var TABS = ['overview', 'milestones', 'tasks', 'notes', 'files', 'activity', 'links'];
  var OPTIONAL_TOOLS = {
    tasks: { capability: 'todo.workspace', label: 'Tasks' },
    notes: { capability: 'verstak/notes/v1', label: 'Notes' },
    files: { capability: 'verstak/files/v1', label: 'Files' },
  };

  var STYLES = [
    '.projects-root{display:flex;height:100%;min-height:0;min-width:0;background:var(--vt-color-background,#101020);color:var(--vt-color-text-primary,#f4f7fb);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;container-type:inline-size}',
    '.projects-sidebar{width:20rem;min-width:17.5rem;max-width:21.5rem;display:flex;flex-direction:column;border-right:1px solid var(--vt-color-border,#202b46);background:var(--vt-color-surface-muted,#111629)}',
    '.projects-toolbar{display:flex;align-items:center;gap:.55rem;padding:.72rem .78rem;border-bottom:1px solid var(--vt-color-border,#202b46)}',
    '.projects-title{font-size:.92rem;font-weight:680;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.projects-btn{font:inherit;font-size:.78rem;line-height:1.2;padding:.42rem .7rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-secondary,#b7c0d4);cursor:pointer;outline:none}',
    '.projects-btn:hover{border-color:var(--vt-color-accent,#4ecca3);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.projects-btn:focus-visible,.projects-tab:focus-visible,.projects-card:focus-visible,.projects-picker-button:focus-visible,.projects-picker-row:focus-visible{box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34));outline:none}',
    '.projects-btn.primary{background:var(--vt-color-accent,#4ecca3);border-color:var(--vt-color-accent,#4ecca3);color:#101827;font-weight:650}',
    '.projects-btn:disabled{opacity:.45;cursor:default}',
    '.projects-search,.projects-input,.projects-select,.projects-textarea,.projects-picker-search{box-sizing:border-box;font:inherit;font-size:.8rem;padding:.48rem .58rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-surface-input,#0f1424);color:var(--vt-color-text-primary,#f4f7fb);outline:none;color-scheme:dark}',
    '.projects-search:focus,.projects-input:focus,.projects-select:focus,.projects-textarea:focus,.projects-picker-search:focus{border-color:var(--vt-color-accent,#4ecca3);box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34))}',
    '.projects-select{appearance:none;-webkit-appearance:none;padding-right:1.9rem;background-image:linear-gradient(45deg,transparent 50%,var(--vt-color-text-muted,#7f8aa3) 50%),linear-gradient(135deg,var(--vt-color-text-muted,#7f8aa3) 50%,transparent 50%);background-position:calc(100% - 13px) 50%,calc(100% - 8px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat}',
    '.projects-select option{background:var(--vt-color-surface,#15152c);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.projects-search{margin:.62rem .72rem .55rem;width:calc(100% - 1.44rem)}',
    '.projects-list{flex:1;min-height:0;overflow:auto}',
    '.projects-card{padding:.72rem .78rem;border:0;border-bottom:1px solid rgba(32,43,70,.72);cursor:pointer;display:grid;gap:.28rem;background:transparent;color:inherit;text-align:left;width:100%;font:inherit;outline:none}',
    '.projects-card:hover{background:var(--vt-color-surface-hover,#1b2440)}',
    '.projects-card.selected{background:var(--vt-color-surface-selected,rgba(78,204,163,.14));box-shadow:inset 2px 0 0 var(--vt-color-accent,#4ecca3)}',
    '.projects-card-title{font-size:.86rem;font-weight:620;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.projects-card-meta{display:flex;gap:.35rem;align-items:center;flex-wrap:wrap;font-size:.69rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.projects-card-deal{font-size:.69rem;color:var(--vt-color-text-muted,#7f8aa3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.projects-badge{display:inline-flex;align-items:center;padding:.14rem .4rem;border:1px solid var(--vt-color-border,#202b46);border-radius:999px;font-size:.68rem;color:var(--vt-color-text-secondary,#b7c0d4);white-space:nowrap}',
    '.projects-badge.done{color:var(--vt-color-accent,#4ecca3)}.projects-badge.paused{color:#e6c46a}.projects-badge.archived{opacity:.65}.projects-badge.high{color:#ffc6ce}.projects-badge.low{opacity:.82}',
    '.projects-main{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}',
    '.projects-empty{min-height:10rem;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.75rem;padding:2rem;text-align:center;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.projects-header{padding:1rem 1.15rem .86rem;border-bottom:1px solid var(--vt-color-border,#202b46);display:flex;align-items:flex-start;gap:.9rem}',
    '.projects-header-main{flex:1;min-width:0}.projects-header-name{font-size:1.18rem;font-weight:720;line-height:1.25}.projects-header-description{margin-top:.32rem;color:var(--vt-color-text-secondary,#b7c0d4);font-size:.82rem;line-height:1.48;white-space:pre-wrap;max-width:72rem}',
    '.projects-meta{display:flex;gap:.34rem;align-items:center;flex-wrap:wrap;margin-top:.58rem}',
    '.projects-deal-link{border:0;background:transparent;padding:.12rem .1rem;color:var(--vt-color-accent,#4ecca3);font:inherit;font-size:.73rem;cursor:pointer;max-width:32rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.projects-deal-link.unresolved{color:var(--vt-color-text-muted,#7f8aa3);cursor:default}',
    '.projects-tabs{display:flex;gap:.1rem;padding:.42rem .72rem 0;border-bottom:1px solid var(--vt-color-border,#202b46);overflow-x:auto;background:var(--vt-color-surface-muted,#111629)}',
    '.projects-tab{font:inherit;font-size:.76rem;padding:.46rem .65rem .5rem;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--vt-color-text-muted,#7f8aa3);cursor:pointer;white-space:nowrap;outline:none}',
    '.projects-tab:hover{color:var(--vt-color-text-primary,#f4f7fb)}.projects-tab.active{color:var(--vt-color-accent,#4ecca3);border-bottom-color:var(--vt-color-accent,#4ecca3)}',
    '.projects-pane{flex:1;min-height:0;overflow:auto;padding:1rem 1.15rem 1.5rem}',
    '.projects-section{max-width:72rem;padding:.15rem 0 .9rem}.projects-section+.projects-section{border-top:1px solid rgba(32,43,70,.72);padding-top:1rem}',
    '.projects-section-title{font-size:.78rem;font-weight:680;text-transform:uppercase;letter-spacing:.045em;color:var(--vt-color-text-muted,#7f8aa3);margin-bottom:.6rem}',
    '.projects-section-value{font-size:.88rem;line-height:1.5;color:var(--vt-color-text-secondary,#b7c0d4)}',
    '.projects-progress-row{display:flex;align-items:center;gap:.7rem}.projects-progress{height:.38rem;flex:1;max-width:24rem;border-radius:999px;background:var(--vt-color-surface-hover,#1b2440);overflow:hidden}.projects-progress>span{display:block;height:100%;background:var(--vt-color-accent,#4ecca3)}',
    '.projects-row{display:flex;gap:.6rem;align-items:center;padding:.55rem 0;border-bottom:1px solid rgba(32,43,70,.58)}.projects-row:last-child{border-bottom:0}',
    '.projects-row-main{flex:1;min-width:0}.projects-row-title{font-size:.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.projects-row-meta{font-size:.7rem;color:var(--vt-color-text-muted,#7f8aa3);margin-top:.15rem}',
    '.projects-form-row{display:flex;gap:.55rem;align-items:flex-end;flex-wrap:wrap;margin-bottom:.7rem}.projects-form-row>.projects-field{flex:1;min-width:10rem}',
    '.projects-check{width:1rem;height:1rem;accent-color:var(--vt-color-accent,#4ecca3)}',
    '.projects-history{display:grid;gap:.42rem}.projects-history-item{display:grid;grid-template-columns:9.5rem minmax(0,1fr);gap:.7rem;font-size:.76rem}.projects-history-time{color:var(--vt-color-text-muted,#7f8aa3)}',
    '.projects-tool-card{display:flex;align-items:center;gap:.7rem;padding:.72rem 0;border-bottom:1px solid rgba(32,43,70,.58)}.projects-tool-name{font-size:.85rem;font-weight:600;flex:1}',
    '.projects-error{font-size:.78rem;color:#ffc6ce;border:1px solid rgba(233,69,96,.45);background:rgba(233,69,96,.12);border-radius:var(--vt-radius-sm,4px);padding:.5rem .6rem;margin:.5rem 0}',
    '.projects-modal-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:1rem}',
    '.projects-modal{width:590px;max-width:96vw;max-height:92vh;overflow:auto;display:grid;gap:.72rem;padding:1rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c);box-shadow:0 18px 44px rgba(0,0,0,.4)}',
    '.projects-modal-title{font-size:1rem;font-weight:700}.projects-field{display:grid;gap:.32rem}.projects-label{font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}.projects-textarea{min-height:6.2rem;resize:vertical}.projects-modal-actions{display:flex;justify-content:flex-end;gap:.45rem;margin-top:.3rem}',
    '.projects-picker{position:relative}.projects-picker-button{width:100%;display:flex;align-items:center;gap:.6rem;justify-content:space-between;text-align:left;box-sizing:border-box;font:inherit;font-size:.8rem;padding:.49rem .58rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-surface-input,#0f1424);color:var(--vt-color-text-primary,#f4f7fb);cursor:pointer;outline:none}',
    '.projects-picker-value{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.projects-picker-caret{color:var(--vt-color-text-muted,#7f8aa3)}',
    '.projects-picker-popover{position:relative;z-index:3;margin-top:.3rem;max-height:20rem;display:flex;flex-direction:column;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface,#15152c);box-shadow:0 12px 28px rgba(0,0,0,.36);overflow:hidden}',
    '.projects-picker-search{margin:.55rem;width:calc(100% - 1.1rem)}.projects-picker-list{overflow:auto;padding:.2rem 0 .35rem}',
    '.projects-picker-row{width:100%;box-sizing:border-box;display:flex;align-items:center;gap:.45rem;border:0;background:transparent;color:var(--vt-color-text-secondary,#b7c0d4);padding:.42rem .62rem;font:inherit;font-size:.78rem;text-align:left;cursor:pointer;outline:none}',
    '.projects-picker-row:hover,.projects-picker-row.active{background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-primary,#f4f7fb)}.projects-picker-row.selected{color:var(--vt-color-accent,#4ecca3)}',
    '.projects-picker-indent{display:inline-block;flex:none}.projects-picker-folder{font-weight:620;color:var(--vt-color-text-secondary,#b7c0d4)}.projects-picker-path{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.projects-picker-check{margin-left:auto;color:var(--vt-color-accent,#4ecca3)}',
    '.projects-picker-separator{height:1px;background:var(--vt-color-border,#202b46);margin:.25rem .55rem}',
    '.projects-root.portfolio{display:block;overflow:hidden}.projects-root.portfolio .projects-sidebar{width:100%;max-width:none;min-width:0;height:100%;border-right:0;background:var(--vt-color-background,#101020)}.projects-root.portfolio .projects-main{display:none}.projects-root.portfolio .projects-toolbar{padding:.85rem 1rem}.projects-root.portfolio .projects-search{margin:.7rem 1rem .2rem;width:calc(100% - 2rem);max-width:32rem}.projects-root.portfolio .projects-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr));align-content:start;gap:.75rem;padding:.8rem 1rem 1.2rem}.projects-root.portfolio .projects-card{min-height:8.4rem;padding:.85rem .9rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface-muted,#111629);align-content:start}.projects-root.portfolio .projects-card:hover{border-color:var(--vt-color-border-strong,#2c456a);background:var(--vt-color-surface-hover,#1b2440)}.projects-root.portfolio .projects-card.selected{box-shadow:none}.projects-root.portfolio .projects-card-title{font-size:.95rem}.projects-card-progress{margin-top:.38rem;display:grid;gap:.28rem}.projects-card-progress-line{display:flex;align-items:center;gap:.55rem;font-size:.68rem;color:var(--vt-color-text-muted,#7f8aa3)}.projects-card-progress-track{height:.3rem;flex:1;border-radius:999px;background:var(--vt-color-surface-hover,#1b2440);overflow:hidden}.projects-card-progress-track>span{display:block;height:100%;background:var(--vt-color-accent,#4ecca3)}.projects-card-next{font-size:.72rem;color:var(--vt-color-text-secondary,#b7c0d4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.projects-root.deal .projects-sidebar{display:none}.projects-root.deal .projects-main{width:100%}.projects-project-switcher{display:flex;align-items:center;gap:.55rem;padding:.48rem .9rem;border-bottom:1px solid var(--vt-color-border,#202b46);background:var(--vt-color-surface-muted,#111629)}.projects-project-switcher-label{font-size:.7rem;color:var(--vt-color-text-muted,#7f8aa3)}.projects-project-switcher .projects-select{max-width:22rem;min-width:12rem}.projects-header-actions{display:flex;gap:.45rem;align-items:center}',
    '.projects-root.portfolio .projects-sidebar{width:100%;min-width:0;max-width:none;border-right:0;background:var(--vt-color-background,#101020)}.projects-root.portfolio .projects-main{display:none}.projects-root.portfolio .projects-toolbar{padding:1rem 1.1rem .75rem;background:var(--vt-color-background,#101020)}.projects-root.portfolio .projects-title{font-size:1.05rem}.projects-root.portfolio .projects-search{margin:.1rem 1.1rem .85rem;width:min(34rem,calc(100% - 2.2rem))}.projects-root.portfolio .projects-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr));gap:.75rem;align-content:start;padding:0 1.1rem 1.2rem}.projects-root.portfolio .projects-card{border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface-muted,#111629);padding:.82rem .9rem;min-height:8rem}.projects-root.portfolio .projects-card:hover{border-color:var(--vt-color-border-strong,#2c456a);background:var(--vt-color-surface-hover,#1b2440)}.projects-card-progress{margin-top:.25rem}.projects-card-progress-line{display:flex;align-items:center;gap:.55rem;font-size:.68rem;color:var(--vt-color-text-muted,#7f8aa3)}.projects-card-progress-track{height:.3rem;flex:1;border-radius:999px;background:var(--vt-color-surface-hover,#1b2440);overflow:hidden}.projects-card-progress-track>span{display:block;height:100%;background:var(--vt-color-accent,#4ecca3)}.projects-card-next{font-size:.7rem;color:var(--vt-color-text-secondary,#b7c0d4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '@container(max-width:760px){.projects-root{flex-direction:column}.projects-sidebar{width:100%;max-width:none;min-width:0;height:14rem;border-right:0;border-bottom:1px solid var(--vt-color-border,#202b46)}.projects-main{min-height:0}.projects-header{padding:.78rem}.projects-pane{padding:.8rem}.projects-history-item{grid-template-columns:1fr;gap:.15rem}.projects-modal{width:100%}}'
  ].join('\n');

  function injectStyles() {
    if (document.getElementById('projects-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'projects-style-injected';
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
      else if (key === 'style' && value && typeof value === 'object') Object.assign(node.style, value);
      else if (key === 'checked') { node.checked = value === true || value === 'checked'; if (node.checked) node.setAttribute('checked', 'checked'); }
      else if (key.slice(0, 2) === 'on' && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
      else node.setAttribute(key, value);
    });
    (children || []).forEach(function (child) {
      if (child == null) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function text(value) { return value == null ? '' : String(value); }
  function cleanPath(value) { return text(value).replace(/\\/g, '/').split('/').filter(Boolean).join('/'); }
  function now() { return new Date().toISOString(); }
  function makeId(prefix) { return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  function clampEvents(events) { return (Array.isArray(events) ? events : []).slice(-200); }
  function normalizeTags(tags) {
    var values = Array.isArray(tags) ? tags : text(tags).split(',');
    var seen = {};
    return values.map(function (tag) { return text(tag).trim(); }).filter(function (tag) {
      var key = tag.toLowerCase();
      if (!tag || seen[key]) return false;
      seen[key] = true;
      return true;
    }).slice(0, 20);
  }
  function normalizeStatus(value) { return STATUS_VALUES.indexOf(value) === -1 ? 'active' : value; }
  function normalizePriority(value) { return PRIORITY_VALUES.indexOf(value) === -1 ? 'normal' : value; }
  function normalizeEvent(raw) {
    raw = raw || {};
    return {
      id: text(raw.id) || makeId('event'), type: text(raw.type) || 'project.updated', subject: text(raw.subject),
      at: text(raw.at) || now(), from: text(raw.from), to: text(raw.to)
    };
  }
  function normalizeProject(raw) {
    raw = raw || {};
    return {
      id: text(raw.id) || makeId('project'),
      name: text(raw.name).trim() || 'Untitled project',
      description: text(raw.description),
      status: normalizeStatus(text(raw.status)),
      priority: normalizePriority(text(raw.priority)),
      tags: normalizeTags(raw.tags),
      workspaceId: text(raw.workspaceId),
      workspaceRootPath: cleanPath(raw.workspaceRootPath),
      milestones: (Array.isArray(raw.milestones) ? raw.milestones : []).map(function (item) {
        item = item || {};
        return { id: text(item.id) || makeId('milestone'), title: text(item.title).trim() || 'Milestone', status: item.status === 'done' ? 'done' : 'open', dueAt: text(item.dueAt), createdAt: text(item.createdAt) || now(), completedAt: text(item.completedAt) };
      }).slice(0, 200),
      links: (Array.isArray(raw.links) ? raw.links : []).map(function (item) {
        item = item || {};
        return { id: text(item.id) || makeId('link'), label: text(item.label).trim() || text(item.url), url: text(item.url).trim() };
      }).filter(function (item) { return item.url; }).slice(0, 100),
      events: clampEvents(raw.events).map(normalizeEvent),
      createdAt: text(raw.createdAt) || now(),
      updatedAt: text(raw.updatedAt) || text(raw.createdAt) || now()
    };
  }
  function normalizeProjects(value) {
    return (Array.isArray(value) ? value : []).map(normalizeProject).slice(0, 500).sort(function (a, b) { return text(b.updatedAt).localeCompare(text(a.updatedAt)); });
  }
  function eventRecord(type, subject, from, to) { return { id: makeId('event'), type: type, subject: text(subject), at: now(), from: text(from), to: text(to) }; }
  function addEvent(project, type, subject, from, to) { project.events = clampEvents((project.events || []).concat([eventRecord(type, subject, from, to)])); project.updatedAt = now(); }
  function commandValue(value) { return value && value.status === 'handled' && Object.prototype.hasOwnProperty.call(value, 'result') ? value.result : value; }
  function sameTags(a, b) { return normalizeTags(a).join('\n') === normalizeTags(b).join('\n'); }

  function flattenDealTree(snapshot) {
    var roots = snapshot && Array.isArray(snapshot.roots) ? snapshot.roots : [];
    var rows = [];
    function walk(nodes, depth, parents) {
      (nodes || []).forEach(function (node) {
        if (!node || !node.kind) return;
        var path = cleanPath(node.path || node.rootPath);
        var nextParents = parents.concat([text(node.name)]).filter(Boolean);
        rows.push({ kind: node.kind, id: text(node.id), name: text(node.name), path: path, depth: depth, label: nextParents.join('/') || path, parents: parents.slice(), children: Array.isArray(node.children) ? node.children : [] });
        walk(node.children || [], depth + 1, nextParents);
      });
    }
    walk(roots, 0, []);
    return rows;
  }
  function dealRows(rows) { return (rows || []).filter(function (row) { return row.kind === 'workspace'; }); }

  function loadProjects(api) {
    if (!api || !api.settings || typeof api.settings.read !== 'function') return Promise.resolve([]);
    return api.settings.read().then(function (settings) { return normalizeProjects((settings || {})[PROJECTS_KEY]); });
  }
  function saveProjects(api, projects) { return api.settings.write(PROJECTS_KEY, normalizeProjects(projects)).then(function () { return normalizeProjects(projects); }); }
  function publishProjectEvent(api, type, project, extra) {
    if (!api.events || typeof api.events.publish !== 'function') return Promise.resolve();
    var payload = Object.assign({ projectId: project.id, projectName: project.name, workspaceId: project.workspaceId, workspaceRootPath: project.workspaceRootPath }, extra || {});
    return api.events.publish(type, payload).catch(function () {});
  }
  function contextFromProps(props) {
    var node = props && props.workspaceNode;
    if (!node) return { id: '', path: '', name: '' };
    return { id: text(node.workspaceId || node.id), path: cleanPath(node.rootPath || node.path || node.name), name: text(node.name || node.title) };
  }

  function ProjectsViewMount(container, props, api) {
    injectStyles();
    container.innerHTML = '';
    var contextWorkspace = contextFromProps(props);
    var portfolioMode = !contextWorkspace.id && !contextWorkspace.path;
    container.className = 'projects-root ' + (portfolioMode ? 'portfolio' : 'deal');
    container.setAttribute('data-plugin-id', PLUGIN_ID);

    var projects = [];
    var selectedId = text(props && props.toolRequest && props.toolRequest.projectId);
    var activeTab = 'overview';
    var filterText = '';
    var disposed = false;
    var workspaceTree = { roots: [], currentWorkspaceId: '', revision: 0 };
    var treeRows = [];
    var workspaceOptions = [];
    var capabilityState = {};

    var sidebar = el('aside', { className: 'projects-sidebar' });
    var main = el('main', { className: 'projects-main' });
    container.appendChild(sidebar);
    container.appendChild(main);

    function tr(key, params, fallback) {
      if (api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params || {}, fallback);
      var out = fallback || key;
      Object.keys(params || {}).forEach(function (name) { out = out.replace('{' + name + '}', text(params[name])); });
      return out;
    }
    function userError(key, fallback, error) { if (console && console.warn) console.warn('[verstak.projects] ' + key, error); return tr(key, null, fallback); }
    function selectedProject() { return projects.find(function (project) { return project.id === selectedId; }) || null; }
    function findDeal(project) {
      if (!project) return null;
      if (project.workspaceId) {
        var byId = workspaceOptions.find(function (deal) { return deal.id === project.workspaceId; });
        if (byId) return byId;
      }
      if (project.workspaceRootPath) return workspaceOptions.find(function (deal) { return deal.path === project.workspaceRootPath; }) || null;
      return null;
    }
    function dealLabel(project) {
      var deal = findDeal(project);
      if (deal) return deal.label || deal.path || deal.name;
      if (project && project.workspaceRootPath) return tr('ui.linkedDealUnavailable', { deal: project.workspaceRootPath }, 'Linked Deal unavailable · ' + project.workspaceRootPath);
      return '';
    }
    function projectProgress(project) {
      var milestones = project && Array.isArray(project.milestones) ? project.milestones : [];
      if (!milestones.length) return { percent: 0, done: 0, total: 0 };
      var done = milestones.filter(function (item) { return item.status === 'done'; }).length;
      return { percent: Math.round(done * 100 / milestones.length), done: done, total: milestones.length };
    }
    function nextMilestone(project) {
      return ((project && project.milestones) || []).find(function (item) { return item.status !== 'done'; }) || null;
    }
    function matchesContext(project) {
      if (!contextWorkspace.id && !contextWorkspace.path) return true;
      if (contextWorkspace.id && project.workspaceId) return project.workspaceId === contextWorkspace.id;
      return !!contextWorkspace.path && project.workspaceRootPath === contextWorkspace.path;
    }
    function visibleProjects() {
      var query = filterText.trim().toLowerCase();
      return projects.filter(function (project) {
        if (!matchesContext(project)) return false;
        if (!query) return true;
        return [project.name, project.description, dealLabel(project)].concat(project.tags || []).join(' ').toLowerCase().indexOf(query) !== -1;
      });
    }
    function ensureSelection() {
      if (portfolioMode) { selectedId = ''; return; }
      var visible = visibleProjects();
      if (!visible.some(function (project) { return project.id === selectedId; })) selectedId = visible[0] ? visible[0].id : '';
    }
    function persist(type, project, extra) {
      return saveProjects(api, projects).then(function (saved) {
        projects = saved;
        if (type && project) publishProjectEvent(api, type, project, extra);
        render();
      }).catch(function (error) { renderBanner(userError('ui.saveError', 'Could not save projects. Please try again.', error)); });
    }
    function renderBanner(message) {
      if (!message) return;
      var banner = el('div', { className: 'projects-error', textContent: message });
      main.insertBefore(banner, main.firstChild || null);
      setTimeout(function () { if (!disposed && banner.remove) banner.remove(); }, 5000);
    }

    function migrateWorkspaceLinks() {
      var changed = false;
      projects.forEach(function (project) {
        var deal = findDeal(project);
        if (!deal) return;
        if (project.workspaceId !== deal.id) { project.workspaceId = deal.id; changed = true; }
        if (project.workspaceRootPath !== deal.path) { project.workspaceRootPath = deal.path; changed = true; }
      });
      if (!changed) return Promise.resolve(false);
      return saveProjects(api, projects).then(function (saved) { projects = saved; return true; }).catch(function (error) { console.warn('[verstak.projects] workspace link migration failed', error); return false; });
    }

    function renderSidebar() {
      sidebar.innerHTML = '';
      if (!portfolioMode) return;
      sidebar.appendChild(el('div', { className: 'projects-toolbar' }, [
        el('div', { className: 'projects-title', textContent: tr('ui.title', null, 'Projects') }),
        el('button', { className: 'projects-btn primary', 'data-project-action': 'new', textContent: tr('ui.newProject', null, 'New project'), onClick: function () { showProjectForm(null); } })
      ]));
      var search = el('input', { className: 'projects-search', 'data-project-search': '', placeholder: tr('ui.searchLocal', null, 'Filter projects…') });
      search.value = filterText;
      search.addEventListener('input', function () { filterText = search.value; renderSidebar(); });
      sidebar.appendChild(search);
      var list = el('div', { className: 'projects-list', 'data-project-list': '', 'data-project-portfolio': '' });
      var visible = visibleProjects();
      if (!visible.length) {
        list.appendChild(el('div', { className: 'projects-empty' }, [
          el('div', { textContent: filterText ? tr('ui.noMatches', null, 'No matching projects.') : tr('ui.empty', null, 'No projects yet.') })
        ]));
      } else {
        visible.forEach(function (project) {
          var deal = findDeal(project);
          var meta = [el('span', { className: 'projects-badge ' + project.status, textContent: tr('ui.status.' + project.status, null, project.status) })];
          if (project.priority !== 'normal') meta.push(el('span', { className: 'projects-badge ' + project.priority, textContent: tr('ui.priority.' + project.priority, null, project.priority) }));
          var label = dealLabel(project) || tr('ui.noLinkedDeal', null, 'No linked Deal');
          var progress = projectProgress(project);
          var next = nextMilestone(project);
          var children = [
            el('div', { className: 'projects-card-title', textContent: project.name }),
            el('div', { className: 'projects-card-meta' }, meta),
            el('div', { className: 'projects-card-deal', textContent: label })
          ];
          if (progress.total) {
            children.push(el('div', { className: 'projects-card-progress' }, [
              el('div', { className: 'projects-card-progress-line' }, [
                el('span', { textContent: progress.percent + '%' }),
                el('span', { className: 'projects-card-progress-track' }, [el('span', { style: { width: progress.percent + '%' } })])
              ])
            ]));
          }
          if (next) children.push(el('div', { className: 'projects-card-next', textContent: tr('ui.nextMilestone', { milestone: next.title }, 'Next: ' + next.title) }));
          list.appendChild(el('button', {
            className: 'projects-card', type: 'button', 'data-project-id': project.id, 'data-project-card': '',
            title: deal ? tr('ui.openProjectInDeal', { deal: label }, 'Open in ' + label) : tr('ui.repairProjectDeal', null, 'Repair linked Deal'),
            onClick: function () { if (deal) openProjectInDeal(project); else showProjectForm(project); }
          }, children));
        });
      }
      sidebar.appendChild(list);
    }

    function navigateToDeal(project, includeProject) {
      var deal = findDeal(project);
      if (!deal) return false;
      var request = { workspaceId: deal.id, workspaceRootPath: deal.path };
      if (includeProject) {
        request.workspaceItemId = 'verstak.projects.workspace';
        request.toolRequest = { projectId: project.id };
      }
      if (api.navigation && typeof api.navigation.openWorkspace === 'function') {
        api.navigation.openWorkspace(request);
      } else {
        window.dispatchEvent(new CustomEvent('verstak:workspace-selected', { detail: { workspaceId: deal.id, workspaceName: deal.path } }));
        if (includeProject) setTimeout(function () { window.dispatchEvent(new CustomEvent('verstak:workspace-open-tool', { detail: { workspaceItemId: 'verstak.projects.workspace', toolRequest: { projectId: project.id }, workspaceRootPath: deal.path } })); }, 0);
      }
      return true;
    }
    function openLinkedDeal(project) { navigateToDeal(project, false); }
    function openProjectInDeal(project) { navigateToDeal(project, true); }

    function renderMain() {
      main.innerHTML = '';
      if (portfolioMode) return;
      var visible = visibleProjects();
      var project = selectedProject();
      if (visible.length > 1) {
        var select = el('select', { className: 'projects-select', 'data-project-switcher': '', 'aria-label': tr('ui.project', null, 'Project') });
        visible.forEach(function (item) { select.appendChild(el('option', { value: item.id, textContent: item.name })); });
        select.value = project ? project.id : visible[0].id;
        select.addEventListener('change', function () { selectedId = select.value; activeTab = 'overview'; renderMain(); });
        main.appendChild(el('div', { className: 'projects-project-switcher' }, [
          el('span', { className: 'projects-project-switcher-label', textContent: tr('ui.project', null, 'Project') }), select
        ]));
      }
      if (!project) {
        main.appendChild(el('div', { className: 'projects-empty' }, [
          el('div', { textContent: tr('ui.emptyWorkspace', null, 'No project is linked to this Deal yet.') }),
          el('button', { className: 'projects-btn primary', textContent: tr('ui.createForWorkspace', null, 'Create project for this Deal'), onClick: function () { showProjectForm(null); } })
        ]));
        return;
      }
      var tags = (project.tags || []).map(function (tag) { return el('span', { className: 'projects-badge', textContent: tag }); });
      var meta = [
        el('span', { className: 'projects-badge ' + project.status, textContent: tr('ui.status.' + project.status, null, project.status) }),
        el('span', { className: 'projects-badge ' + project.priority, textContent: tr('ui.priority.' + project.priority, null, project.priority) })
      ].concat(tags);
      main.appendChild(el('div', { className: 'projects-header' }, [
        el('div', { className: 'projects-header-main' }, [
          el('div', { className: 'projects-header-name', textContent: project.name }),
          project.description ? el('div', { className: 'projects-header-description', textContent: project.description }) : null,
          el('div', { className: 'projects-meta' }, meta)
        ]),
        el('div', { className: 'projects-header-actions' }, [
          el('button', { className: 'projects-btn', 'data-project-action': 'new', textContent: tr('ui.newProject', null, 'New project'), onClick: function () { showProjectForm(null); } }),
          el('button', { className: 'projects-btn', 'data-project-action': 'edit', textContent: tr('ui.editProject', null, 'Edit'), onClick: function () { showProjectForm(project); } })
        ])
      ]));
      var tabs = el('div', { className: 'projects-tabs', role: 'tablist' });
      TABS.forEach(function (tab) {
        tabs.appendChild(el('button', { className: 'projects-tab' + (activeTab === tab ? ' active' : ''), type: 'button', role: 'tab', 'aria-selected': activeTab === tab ? 'true' : 'false', 'data-project-tab': tab, textContent: tr('ui.tab.' + tab, null, tab), onClick: function () { activeTab = tab; renderMain(); } }));
      });
      main.appendChild(tabs);
      var pane = el('div', { className: 'projects-pane', 'data-project-pane': activeTab });
      main.appendChild(pane);
      renderTab(pane, project);
    }

    function render() { if (disposed) return; ensureSelection(); renderSidebar(); renderMain(); }

    function defaultDealSelection(project) {
      if (project && (project.workspaceId || project.workspaceRootPath)) return { id: project.workspaceId, path: project.workspaceRootPath };
      if (contextWorkspace.id || contextWorkspace.path) return { id: contextWorkspace.id, path: contextWorkspace.path };
      return { id: '', path: '' };
    }

    function createDealPicker(initial, onChange) {
      var selected = { id: text(initial && initial.id), path: cleanPath(initial && initial.path) };
      var open = false;
      var query = '';
      var activeIndex = 0;
      var expanded = {};
      treeRows.filter(function (row) { return row.kind === 'folder' && row.depth === 0; }).forEach(function (row) { expanded[row.id] = true; });
      var root = el('div', { className: 'projects-picker', 'data-deal-picker': '' });
      var button = el('button', { className: 'projects-picker-button', type: 'button', 'data-deal-picker-toggle': '', 'aria-haspopup': 'listbox' });
      var popover = el('div', { className: 'projects-picker-popover', 'data-deal-picker-popover': '', style: { display: 'none' } });
      var search = el('input', { className: 'projects-picker-search', 'data-deal-picker-search': '', placeholder: tr('ui.dealSearch', null, 'Search Deals…') });
      var list = el('div', { className: 'projects-picker-list', role: 'listbox' });
      popover.appendChild(search); popover.appendChild(list); root.appendChild(button); root.appendChild(popover);

      function selectedDeal() {
        if (selected.id) {
          var byId = workspaceOptions.find(function (deal) { return deal.id === selected.id; });
          if (byId) return byId;
        }
        if (selected.path) return workspaceOptions.find(function (deal) { return deal.path === selected.path; }) || null;
        return null;
      }
      function buttonLabel() {
        var deal = selectedDeal();
        if (deal) return deal.label;
        if (selected.path) return tr('ui.linkedDealUnavailable', { deal: selected.path }, 'Linked Deal unavailable · ' + selected.path);
        return tr('ui.chooseDeal', null, 'Choose a Deal');
      }
      function renderButton() {
        button.innerHTML = '';
        button.appendChild(el('span', { className: 'projects-picker-value', textContent: buttonLabel() }));
        button.appendChild(el('span', { className: 'projects-picker-caret', textContent: '▾' }));
      }
      function selectableRows() { return Array.prototype.slice.call(list.children || []).filter(function (node) { return node.getAttribute && node.getAttribute('data-picker-selectable') === 'true'; }); }
      function focusIndex(index) {
        var rows = selectableRows();
        if (!rows.length) return;
        activeIndex = Math.max(0, Math.min(index, rows.length - 1));
        rows.forEach(function (row, i) { row.className = row.className.replace(/\sactive\b/g, '') + (i === activeIndex ? ' active' : ''); });
        if (rows[activeIndex] && typeof rows[activeIndex].focus === 'function') rows[activeIndex].focus();
      }
      function selectDeal(deal) {
        selected = deal ? { id: deal.id, path: deal.path } : { id: '', path: '' };
        onChange(selected);
        closePicker();
        renderButton();
      }
      function makeDealRow(deal, depth, fullLabel) {
        return el('button', { className: 'projects-picker-row' + ((selected.id && selected.id === deal.id) || (!selected.id && selected.path === deal.path) ? ' selected' : ''), type: 'button', role: 'option', 'data-picker-selectable': 'true', 'data-deal-id': deal.id, 'data-deal-path': deal.path, onClick: function () { selectDeal(deal); } }, [
          el('span', { className: 'projects-picker-indent', style: { width: Math.max(0, depth) * 14 + 'px' } }),
          el('span', { className: 'projects-picker-path', textContent: fullLabel ? deal.label : deal.name }),
          ((selected.id && selected.id === deal.id) || (!selected.id && selected.path === deal.path)) ? el('span', { className: 'projects-picker-check', textContent: '✓' }) : null
        ]);
      }
      function appendTree(nodes, depth) {
        (nodes || []).forEach(function (node) {
          if (node.kind === 'folder') {
            var isOpen = !!expanded[node.id];
            list.appendChild(el('button', { className: 'projects-picker-row projects-picker-folder', type: 'button', 'data-folder-id': node.id, onClick: function () { expanded[node.id] = !isOpen; renderList(); } }, [
              el('span', { className: 'projects-picker-indent', style: { width: depth * 14 + 'px' } }), el('span', { textContent: isOpen ? '▾' : '▸' }), el('span', { className: 'projects-picker-path', textContent: node.name })
            ]));
            if (isOpen) appendTree(node.children || [], depth + 1);
          } else if (node.kind === 'workspace') {
            var deal = workspaceOptions.find(function (item) { return item.id === text(node.id); });
            if (deal) list.appendChild(makeDealRow(deal, depth, false));
          }
        });
      }
      function renderList() {
        list.innerHTML = '';
        var q = query.trim().toLowerCase();
        if (q) {
          workspaceOptions.filter(function (deal) { return (deal.label + ' ' + deal.name).toLowerCase().indexOf(q) !== -1; }).forEach(function (deal) { list.appendChild(makeDealRow(deal, 0, true)); });
        } else {
          appendTree(workspaceTree.roots || [], 0);
        }
        activeIndex = 0;
      }
      function openPicker() { open = true; popover.style.display = ''; button.setAttribute('aria-expanded', 'true'); query = ''; search.value = ''; renderList(); search.focus(); }
      function closePicker() { open = false; popover.style.display = 'none'; button.setAttribute('aria-expanded', 'false'); }
      button.addEventListener('click', function () { if (open) closePicker(); else openPicker(); });
      search.addEventListener('input', function () { query = search.value; renderList(); });
      root.addEventListener('keydown', function (event) {
        if (!open && (event.key === 'Enter' || event.key === 'ArrowDown')) { event.preventDefault(); openPicker(); return; }
        if (!open) return;
        if (event.key === 'Escape') { event.preventDefault(); closePicker(); button.focus(); }
        else if (event.key === 'ArrowDown') { event.preventDefault(); focusIndex(activeIndex + 1); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); focusIndex(activeIndex - 1); }
        else if (event.key === 'Enter' && event.target !== search) { event.preventDefault(); var rows = selectableRows(); if (rows[activeIndex]) rows[activeIndex].click(); }
      });
      renderButton();
      return { node: root, getSelection: function () { return { id: selected.id, path: selected.path }; }, open: openPicker };
    }

    function showProjectForm(project) {
      var editing = !!project;
      var overlay = el('div', { className: 'projects-modal-overlay', 'data-project-modal': '' });
      var name = el('input', { className: 'projects-input', 'data-project-field': 'name' });
      var description = el('textarea', { className: 'projects-textarea', 'data-project-field': 'description' });
      var status = el('select', { className: 'projects-select', 'data-project-field': 'status' });
      STATUS_VALUES.forEach(function (value) { status.appendChild(el('option', { value: value, textContent: tr('ui.status.' + value, null, value) })); });
      var priority = el('select', { className: 'projects-select', 'data-project-field': 'priority' });
      PRIORITY_VALUES.forEach(function (value) { priority.appendChild(el('option', { value: value, textContent: tr('ui.priority.' + value, null, value) })); });
      var tags = el('input', { className: 'projects-input', 'data-project-field': 'tags' });
      var dealSelection = defaultDealSelection(project);
      var picker = createDealPicker(dealSelection, function (next) { dealSelection = next; });
      name.value = project ? project.name : '';
      description.value = project ? project.description : '';
      status.value = project ? project.status : 'active';
      priority.value = project ? project.priority : 'normal';
      tags.value = project ? (project.tags || []).join(', ') : '';
      var error = el('div', { className: 'projects-error', 'data-project-form-error': '', style: { display: 'none' } });
      function field(label, control, hint) { var children = [el('label', { className: 'projects-label', textContent: label }), control]; if (hint) children.push(el('div', { className: 'projects-section-value', textContent: hint })); return el('div', { className: 'projects-field' }, children); }
      function close() { overlay.remove(); }
      function submit() {
        var projectName = name.value.trim();
        if (!projectName) { error.textContent = tr('ui.nameRequired', null, 'Project name is required.'); error.style.display = ''; name.focus(); return; }
        var resolvedDeal = workspaceOptions.find(function (deal) {
          return (dealSelection.id && deal.id === dealSelection.id) || (!dealSelection.id && dealSelection.path && deal.path === dealSelection.path);
        });
        if (!resolvedDeal) { error.textContent = tr('ui.dealRequired', null, 'Choose a Deal for this project.'); error.style.display = ''; picker.open(); return; }
        dealSelection = { id: resolvedDeal.id, path: resolvedDeal.path };
        var next = {
          name: projectName, description: description.value, status: normalizeStatus(status.value), priority: normalizePriority(priority.value), tags: normalizeTags(tags.value),
          workspaceId: text(dealSelection.id), workspaceRootPath: cleanPath(dealSelection.path)
        };
        var target;
        if (!editing) {
          target = normalizeProject({ id: makeId('project'), createdAt: now(), name: next.name, description: next.description, status: next.status, priority: next.priority, tags: next.tags, workspaceId: next.workspaceId, workspaceRootPath: next.workspaceRootPath });
          addEvent(target, 'project.created', target.name);
          if (target.workspaceId || target.workspaceRootPath) addEvent(target, 'project.linked', dealLabel(target));
          projects.unshift(target);
        } else {
          target = project;
          var changes = 0;
          if (target.name !== next.name) { addEvent(target, 'project.renamed', next.name, target.name, next.name); changes++; }
          if (target.status !== next.status) { addEvent(target, 'project.status', '', target.status, next.status); changes++; }
          if (target.priority !== next.priority) { addEvent(target, 'project.priority', '', target.priority, next.priority); changes++; }
          if (!sameTags(target.tags, next.tags)) { addEvent(target, 'project.tags', next.tags.join(', '), target.tags.join(', '), next.tags.join(', ')); changes++; }
          if (target.description !== next.description) { addEvent(target, 'project.description', '', target.description, next.description); changes++; }
          var oldDealId = target.workspaceId; var oldDealPath = target.workspaceRootPath;
          if (oldDealId !== next.workspaceId || oldDealPath !== next.workspaceRootPath) {
            var oldLabel = dealLabel(target) || tr('ui.noLinkedDeal', null, 'No linked Deal');
            var temp = Object.assign({}, target, { workspaceId: next.workspaceId, workspaceRootPath: next.workspaceRootPath });
            var newLabel = dealLabel(temp) || tr('ui.noLinkedDeal', null, 'No linked Deal');
            addEvent(target, 'project.linked', newLabel, oldLabel, newLabel); changes++;
          }
          if (!changes) { close(); return; }
          target.name = next.name; target.description = next.description; target.status = next.status; target.priority = next.priority; target.tags = next.tags; target.workspaceId = next.workspaceId; target.workspaceRootPath = next.workspaceRootPath;
        }
        selectedId = target.id; close(); persist(editing ? 'project.updated' : 'project.created', target);
      }
      overlay.appendChild(el('div', { className: 'projects-modal' }, [
        el('div', { className: 'projects-modal-title', textContent: editing ? tr('ui.editProjectTitle', null, 'Edit project') : tr('ui.newProject', null, 'New project') }), error,
        field(tr('ui.name', null, 'Name'), name), field(tr('ui.description', null, 'Description'), description),
        el('div', { className: 'projects-form-row' }, [field(tr('ui.status', null, 'Status'), status), field(tr('ui.priority', null, 'Priority'), priority)]),
        field(tr('ui.tags', null, 'Tags'), tags), field(tr('ui.linkedDeal', null, 'Linked Deal'), picker.node, tr('ui.linkedDealHint', null, 'Required. This project lives inside the selected Deal; Tasks, Notes and Files created here are scoped to it.')),
        el('div', { className: 'projects-modal-actions' }, [el('button', { className: 'projects-btn', type: 'button', textContent: tr('ui.cancel', null, 'Cancel'), onClick: close }), el('button', { className: 'projects-btn primary', type: 'button', 'data-project-save': '', textContent: tr('ui.save', null, 'Save'), onClick: submit })])
      ]));
      container.appendChild(overlay); name.focus();
    }

    function renderTab(pane, project) {
      if (activeTab === 'overview') renderOverview(pane, project);
      else if (activeTab === 'milestones') renderMilestones(pane, project);
      else if (activeTab === 'tasks') renderTasks(pane, project);
      else if (activeTab === 'notes') renderNotes(pane, project);
      else if (activeTab === 'links') renderLinks(pane, project);
      else if (activeTab === 'files') renderFiles(pane, project);
      else if (activeTab === 'activity') renderProjectActivity(pane, project);
    }

    function section(title, children) { return el('section', { className: 'projects-section' }, [el('div', { className: 'projects-section-title', textContent: title })].concat(children || [])); }
    function renderOverview(pane, project) {
      var progress = projectProgress(project);
      var next = nextMilestone(project);
      var progressChildren = [];
      if (progress.total) {
        progressChildren.push(el('div', { className: 'projects-progress-row' }, [
          el('div', { className: 'projects-section-value', textContent: tr('ui.countMilestones', { done: progress.done, total: progress.total }, progress.done + '/' + progress.total + ' milestones done') }),
          el('div', { className: 'projects-progress' }, [el('span', { style: { width: progress.percent + '%' } })])
        ]));
        if (next) progressChildren.push(el('div', { className: 'projects-row' }, [el('div', { className: 'projects-row-main' }, [
          el('div', { className: 'projects-row-title', textContent: tr('ui.nextMilestone', { milestone: next.title }, 'Next: ' + next.title) }),
          next.dueAt ? el('div', { className: 'projects-row-meta', textContent: next.dueAt }) : null
        ])]));
      } else {
        progressChildren.push(el('div', { className: 'projects-section-value', textContent: tr('ui.noMilestones', null, 'No milestones yet.') }));
      }
      pane.appendChild(section(tr('ui.progress', null, 'Progress'), progressChildren));

      if (project.workspaceRootPath && capabilityState.tasks) {
        var taskValue = el('div', { className: 'projects-section-value', textContent: tr('ui.loading', null, 'Loading…') });
        pane.appendChild(section(tr('ui.nextActions', null, 'Open tasks'), [taskValue]));
        api.capabilities.invoke('todo.workspace', 'list', { workspaceRootPath: project.workspaceRootPath, projectId: project.id, status: 'open' }).then(function (wrapped) {
          var tasks = commandValue(wrapped); tasks = Array.isArray(tasks) ? tasks : [];
          if (!disposed) taskValue.textContent = tr('ui.countTasks', { count: tasks.length }, tasks.length + ' open tasks');
        }).catch(function () { if (!disposed) taskValue.textContent = tr('ui.summaryUnavailable', null, 'Summary unavailable'); });
      }

      var recent = (project.events || []).slice(-4).reverse();
      var history = el('div', { className: 'projects-history' });
      if (!recent.length) history.appendChild(el('div', { className: 'projects-section-value', textContent: tr('ui.noHistory', null, 'No project changes recorded yet.') }));
      recent.forEach(function (item) { history.appendChild(el('div', { className: 'projects-history-item' }, [
        el('div', { className: 'projects-history-time', textContent: item.at ? new Date(item.at).toLocaleString() : '' }),
        el('div', { textContent: historyText(item) })
      ])); });
      pane.appendChild(section(tr('ui.recentActivity', null, 'Recent project history'), [history]));
    }

    function historyText(item) {
      var from = item.from, to = item.to;
      if (item.type === 'project.status') return tr('ui.history.status', { from: tr('ui.status.' + from, null, from), to: tr('ui.status.' + to, null, to) }, 'Status: ' + from + ' → ' + to);
      if (item.type === 'project.priority') return tr('ui.history.priority', { from: tr('ui.priority.' + from, null, from), to: tr('ui.priority.' + to, null, to) }, 'Priority: ' + from + ' → ' + to);
      if (item.type === 'project.renamed') return tr('ui.history.renamed', { from: from, to: to }, 'Renamed: ' + from + ' → ' + to);
      if (item.type === 'project.linked') return tr('ui.history.linked', { deal: item.to || item.subject }, 'Linked to Deal ' + (item.to || item.subject));
      if (item.type === 'project.unlinked') return tr('ui.history.unlinked', { deal: item.from }, 'Unlinked from Deal ' + item.from);
      if (item.type === 'project.tags') return tr('ui.history.tags', null, 'Tags changed');
      if (item.type === 'project.description') return tr('ui.history.description', null, 'Description changed');
      if (item.type === 'milestone.completed') return tr('ui.history.milestoneCompleted', { milestone: item.subject }, 'Milestone completed: ' + item.subject);
      if (item.type === 'milestone.reopened') return tr('ui.history.milestoneReopened', { milestone: item.subject }, 'Milestone reopened: ' + item.subject);
      var label = tr('ui.event.' + item.type, null, item.type);
      return label + (item.subject ? ' · ' + item.subject : '');
    }

    function renderMilestones(pane, project) {
      var title = el('input', { className: 'projects-input', placeholder: tr('ui.milestoneTitle', null, 'Milestone title') });
      var due = el('input', { className: 'projects-input', type: 'date', title: tr('ui.dueDate', null, 'Due date') });
      pane.appendChild(el('div', { className: 'projects-form-row' }, [title, due, el('button', { className: 'projects-btn primary', textContent: tr('ui.addMilestone', null, 'Add milestone'), onClick: function () {
        var value = title.value.trim(); if (!value) return;
        project.milestones.push({ id: makeId('milestone'), title: value, status: 'open', dueAt: due.value, createdAt: now(), completedAt: '' }); addEvent(project, 'milestone.created', value); persist('project.milestone.created', project, { milestoneTitle: value });
      } })]));
      var list = el('div');
      if (!project.milestones.length) list.appendChild(el('div', { className: 'projects-section-value', textContent: tr('ui.noMilestones', null, 'No milestones yet.') }));
      project.milestones.forEach(function (milestone) {
        list.appendChild(el('div', { className: 'projects-row', 'data-milestone-id': milestone.id }, [
          el('input', { className: 'projects-check', type: 'checkbox', checked: milestone.status === 'done' ? 'checked' : null, onChange: function (event) {
            var wasDone = milestone.status === 'done'; milestone.status = event.target.checked ? 'done' : 'open'; milestone.completedAt = milestone.status === 'done' ? now() : '';
            addEvent(project, milestone.status === 'done' ? 'milestone.completed' : 'milestone.reopened', milestone.title); persist('project.milestone.changed', project, { milestoneId: milestone.id, status: milestone.status, previousStatus: wasDone ? 'done' : 'open' });
          } }),
          el('div', { className: 'projects-row-main' }, [el('div', { className: 'projects-row-title', textContent: milestone.title }), el('div', { className: 'projects-row-meta', textContent: milestone.dueAt || '' })]),
          el('button', { className: 'projects-btn', textContent: tr('ui.remove', null, 'Remove'), onClick: function () { project.milestones = project.milestones.filter(function (item) { return item.id !== milestone.id; }); addEvent(project, 'milestone.removed', milestone.title); persist('project.milestone.removed', project, { milestoneId: milestone.id }); } })
        ]));
      }); pane.appendChild(list);
    }

    function requireWorkspace(pane, project) { if (project.workspaceRootPath) return true; pane.appendChild(el('div', { className: 'projects-empty', textContent: tr('ui.workspaceRequired', null, 'Link this project to a Deal to use this tool.') })); return false; }
    function capabilityError(pane, error) { pane.innerHTML = ''; pane.appendChild(el('div', { className: 'projects-error', textContent: userError('ui.capabilityError', 'The optional tool could not complete this request.', error) })); }
    function providerUnavailable(pane, toolKey) { pane.innerHTML = ''; pane.appendChild(el('div', { className: 'projects-empty' }, [el('div', { textContent: tr('ui.providerUnavailableNamed', { tool: tr('ui.tab.' + toolKey, null, OPTIONAL_TOOLS[toolKey] && OPTIONAL_TOOLS[toolKey].label || toolKey) }, 'This tool is not installed or enabled.') })])); }

    function renderTasks(pane, project) {
      if (!requireWorkspace(pane, project)) return;
      if (!capabilityState.tasks) { providerUnavailable(pane, 'tasks'); return; }
      pane.appendChild(el('div', { className: 'projects-section-value', textContent: tr('ui.loading', null, 'Loading…') })); loadTasks(pane, project).catch(function (error) { capabilityError(pane, error); });
    }
    function loadTasks(pane, project) {
      return api.capabilities.invoke('todo.workspace', 'list', { workspaceRootPath: project.workspaceRootPath, projectId: project.id, status: 'all' }).then(function (wrapped) {
        var tasks = commandValue(wrapped); tasks = Array.isArray(tasks) ? tasks : []; pane.innerHTML = '';
        var input = el('input', { className: 'projects-input', placeholder: tr('ui.taskTitle', null, 'Task title') });
        var priority = el('select', { className: 'projects-select' }); PRIORITY_VALUES.forEach(function (value) { priority.appendChild(el('option', { value: value, textContent: tr('ui.priority.' + value, null, value) })); }); priority.value = 'normal';
        pane.appendChild(el('div', { className: 'projects-form-row' }, [input, priority, el('button', { className: 'projects-btn primary', textContent: tr('ui.addTask', null, 'Add task'), onClick: function () { var value = input.value.trim(); if (!value) return; api.capabilities.invoke('todo.workspace', 'create', { workspaceRootPath: project.workspaceRootPath, projectId: project.id, title: value, priority: priority.value }).then(function () { return loadTasks(pane, project); }).catch(function (error) { capabilityError(pane, error); }); } })]));
        var list = el('div'); if (!tasks.length) list.appendChild(el('div', { className: 'projects-section-value', textContent: tr('ui.noTasks', null, 'No tasks for this project.') }));
        tasks.forEach(function (task) { list.appendChild(el('div', { className: 'projects-row', 'data-project-task': task.id }, [el('input', { className: 'projects-check', type: 'checkbox', checked: task.status === 'done' ? 'checked' : null, onChange: function (event) { api.capabilities.invoke('todo.workspace', 'setStatus', { id: task.id, status: event.target.checked ? 'done' : 'open' }).then(function () { return loadTasks(pane, project); }).catch(function (error) { capabilityError(pane, error); }); } }), el('div', { className: 'projects-row-main' }, [el('div', { className: 'projects-row-title', textContent: task.title || '' }), el('div', { className: 'projects-row-meta', textContent: tr('ui.priority.' + (task.priority || 'normal'), null, task.priority || 'normal') + (task.dueAt ? ' · ' + task.dueAt : '') })]) ])); }); pane.appendChild(list);
      });
    }

    function renderNotes(pane, project) {
      if (!requireWorkspace(pane, project)) return;
      if (!capabilityState.notes) { providerUnavailable(pane, 'notes'); return; }
      pane.appendChild(el('div', { className: 'projects-section-value', textContent: tr('ui.loading', null, 'Loading…') })); loadNotes(pane, project).catch(function (error) { capabilityError(pane, error); });
    }
    function loadNotes(pane, project) {
      return api.capabilities.invoke('verstak/notes/v1', 'list', { workspaceRootPath: project.workspaceRootPath, projectId: project.id }).then(function (wrapped) {
        var notes = commandValue(wrapped); notes = Array.isArray(notes) ? notes : []; pane.innerHTML = '';
        var input = el('input', { className: 'projects-input', placeholder: tr('ui.noteTitle', null, 'Note title') });
        pane.appendChild(el('div', { className: 'projects-form-row' }, [input, el('button', { className: 'projects-btn primary', textContent: tr('ui.addNote', null, 'Create note'), onClick: function () { var value = input.value.trim(); if (!value) return; api.capabilities.invoke('verstak/notes/v1', 'create', { workspaceRootPath: project.workspaceRootPath, projectId: project.id, title: value }).then(function (created) { var valueCreated = commandValue(created); if (valueCreated && valueCreated.conflict) throw new Error('note already exists'); return loadNotes(pane, project); }).catch(function (error) { capabilityError(pane, error); }); } })]));
        var list = el('div'); if (!notes.length) list.appendChild(el('div', { className: 'projects-section-value', textContent: tr('ui.noNotes', null, 'No notes for this project.') }));
        notes.forEach(function (note) { list.appendChild(el('div', { className: 'projects-row', 'data-project-note': note.path }, [el('div', { className: 'projects-row-main' }, [el('div', { className: 'projects-row-title', textContent: note.title || note.filename || note.path }), el('div', { className: 'projects-row-meta', textContent: note.path || '' })]), el('button', { className: 'projects-btn', textContent: tr('ui.open', null, 'Open'), onClick: function () { api.capabilities.invoke('verstak/notes/v1', 'open', { workspaceRootPath: project.workspaceRootPath, projectId: project.id, path: note.path }).catch(function (error) { capabilityError(pane, error); }); } })])); }); pane.appendChild(list);
      });
    }

    function renderLinks(pane, project) {
      var label = el('input', { className: 'projects-input', placeholder: tr('ui.linkLabel', null, 'Label') }); var url = el('input', { className: 'projects-input', placeholder: tr('ui.linkUrl', null, 'https://example.com') });
      pane.appendChild(el('div', { className: 'projects-form-row' }, [label, url, el('button', { className: 'projects-btn primary', textContent: tr('ui.addLink', null, 'Add link'), onClick: function () { var value = url.value.trim(); if (!value) return; var linkLabel = label.value.trim() || value; project.links.push({ id: makeId('link'), label: linkLabel, url: value }); addEvent(project, 'link.created', linkLabel); persist('project.link.created', project, { url: value }); } })]));
      var list = el('div'); if (!project.links.length) list.appendChild(el('div', { className: 'projects-section-value', textContent: tr('ui.noLinks', null, 'No links yet.') }));
      project.links.forEach(function (link) { list.appendChild(el('div', { className: 'projects-row', 'data-project-link': link.id }, [el('div', { className: 'projects-row-main' }, [el('div', { className: 'projects-row-title', textContent: link.label }), el('div', { className: 'projects-row-meta', textContent: link.url })]), el('button', { className: 'projects-btn', textContent: tr('ui.open', null, 'Open'), onClick: function () { api.files.openURL(link.url).catch(function (error) { capabilityError(pane, error); }); } }), el('button', { className: 'projects-btn', textContent: tr('ui.remove', null, 'Remove'), onClick: function () { project.links = project.links.filter(function (item) { return item.id !== link.id; }); addEvent(project, 'link.removed', link.label); persist('project.link.removed', project); } })])); }); pane.appendChild(list);
    }

    function renderFiles(pane, project) {
      if (!requireWorkspace(pane, project)) return;
      if (!capabilityState.files) { providerUnavailable(pane, 'files'); return; }
      pane.appendChild(el('div', { className: 'projects-section-value', textContent: tr('ui.loading', null, 'Loading…') }));
      loadFiles(pane, project).catch(function (error) { capabilityError(pane, error); });
    }
    function loadFiles(pane, project) {
      return api.capabilities.invoke('verstak/files/v1', 'list', { workspaceRootPath: project.workspaceRootPath, projectId: project.id }).then(function (wrapped) {
        var files = commandValue(wrapped); files = Array.isArray(files) ? files : []; pane.innerHTML = '';
        var input = el('input', { className: 'projects-input', placeholder: tr('ui.fileName', null, 'File name') });
        pane.appendChild(el('div', { className: 'projects-form-row' }, [input, el('button', { className: 'projects-btn primary', textContent: tr('ui.addFile', null, 'Create file'), onClick: function () {
          var value = input.value.trim(); if (!value) return;
          api.capabilities.invoke('verstak/files/v1', 'create', { workspaceRootPath: project.workspaceRootPath, projectId: project.id, name: value }).then(function (created) {
            var result = commandValue(created); if (result && result.conflict) throw new Error('file already exists'); return loadFiles(pane, project);
          }).catch(function (error) { capabilityError(pane, error); });
        } })]));
        var list = el('div');
        if (!files.length) list.appendChild(el('div', { className: 'projects-section-value', textContent: tr('ui.noFiles', null, 'No files for this project.') }));
        files.forEach(function (file) {
          list.appendChild(el('div', { className: 'projects-row', 'data-project-file': file.path }, [
            el('div', { className: 'projects-row-main' }, [
              el('div', { className: 'projects-row-title', textContent: file.name || file.path }),
              el('div', { className: 'projects-row-meta', textContent: [file.type || '', file.modifiedAt || ''].filter(Boolean).join(' · ') })
            ]),
            el('button', { className: 'projects-btn', textContent: tr('ui.open', null, 'Open'), onClick: function () {
              api.capabilities.invoke('verstak/files/v1', 'open', { workspaceRootPath: project.workspaceRootPath, projectId: project.id, path: file.path }).catch(function (error) { capabilityError(pane, error); });
            } })
          ]));
        });
        pane.appendChild(list);
      });
    }

    function renderProjectActivity(pane, project) {
      var recent = (project.events || []).slice().reverse();
      if (!recent.length) {
        pane.appendChild(el('div', { className: 'projects-section-value', textContent: tr('ui.noHistory', null, 'No project changes recorded yet.') }));
        return;
      }
      var history = el('div', { className: 'projects-history', 'data-project-activity': '' });
      recent.forEach(function (item) {
        history.appendChild(el('div', { className: 'projects-history-item' }, [
          el('div', { className: 'projects-history-time', textContent: item.at ? new Date(item.at).toLocaleString() : '' }),
          el('div', { textContent: historyText(item) })
        ]));
      });
      pane.appendChild(history);
    }

    function discoverCapabilities() { return Promise.all(Object.keys(OPTIONAL_TOOLS).map(function (key) { return api.capabilities.has(OPTIONAL_TOOLS[key].capability).then(function (available) { capabilityState[key] = !!available; }).catch(function () { capabilityState[key] = false; }); })); }
    function discoverWorkspaceTree() {
      if (!api.workspaces || typeof api.workspaces.tree !== 'function') {
        return api.workspaces && typeof api.workspaces.list === 'function' ? api.workspaces.list().then(function (items) {
          var roots = (Array.isArray(items) ? items : []).map(function (item) { return { kind: 'workspace', id: item.id, name: item.name, path: item.rootPath, children: [] }; });
          return { roots: roots, currentWorkspaceId: '', revision: 0 };
        }) : Promise.resolve({ roots: [], currentWorkspaceId: '', revision: 0 });
      }
      return api.workspaces.tree();
    }
    function initialize() {
      return Promise.all([loadProjects(api), discoverCapabilities(), discoverWorkspaceTree()]).then(function (values) {
        if (disposed) return;
        projects = values[0] || []; workspaceTree = values[2] || { roots: [], currentWorkspaceId: '', revision: 0 }; treeRows = flattenDealTree(workspaceTree); workspaceOptions = dealRows(treeRows);
        if (!contextWorkspace.id && workspaceTree.currentWorkspaceId && contextWorkspace.path) contextWorkspace.id = workspaceTree.currentWorkspaceId;
        return migrateWorkspaceLinks().then(function () { ensureSelection(); render(); });
      }).catch(function (error) { if (disposed) return; main.innerHTML = ''; main.appendChild(el('div', { className: 'projects-error', textContent: userError('ui.loadError', 'Could not load projects. Please try again.', error) })); renderSidebar(); });
    }

    var localeUnsubscribe = null;
    if (api.i18n && typeof api.i18n.onDidChangeLocale === 'function') localeUnsubscribe = api.i18n.onDidChangeLocale(render);
    initialize();
    container.__projectsCleanup = function () { disposed = true; if (typeof localeUnsubscribe === 'function') localeUnsubscribe(); };
  }

  var ProjectsView = { mount: ProjectsViewMount, unmount: function (container) { if (container.__projectsCleanup) container.__projectsCleanup(); container.__projectsCleanup = null; container.innerHTML = ''; } };

  function provideOverview(api, args) {
    var workspace = cleanPath(args && args.workspaceRootPath); if (!workspace) return Promise.resolve({});
    return loadProjects(api).then(function (projects) { var linked = projects.filter(function (project) { return project.workspaceRootPath === workspace && project.status !== 'archived'; }); if (!linked.length) return {}; var active = linked.find(function (project) { return project.status === 'active'; }) || linked[0]; var done = (active.milestones || []).filter(function (item) { return item.status === 'done'; }).length; return { summary: [{ id: 'project', label: active.name, count: done, detail: active.status === 'done' ? (api.i18n ? api.i18n.t('overview.done', null, 'Completed project') : 'Completed project') : (api.i18n ? api.i18n.t('overview.active', null, 'Active project') : 'Active project'), order: 5, action: { workspaceItemId: 'verstak.projects.workspace' } }] }; });
  }

  window.VerstakPluginRegister(PLUGIN_ID, {
    components: { ProjectsView: ProjectsView },
    activate: function (api) {
      if (!api || !api.commands || typeof api.commands.register !== 'function') return Promise.resolve();
      return Promise.all([
        api.commands.register(LIST_COMMAND_ID, function (args) { var workspace = cleanPath(args && args.workspaceRootPath); return loadProjects(api).then(function (projects) { return workspace ? projects.filter(function (project) { return project.workspaceRootPath === workspace; }) : projects; }); }),
        api.commands.register(GET_COMMAND_ID, function (args) { var id = text(args && args.id); return loadProjects(api).then(function (projects) { return projects.find(function (project) { return project.id === id; }) || null; }); }),
        api.commands.register(OVERVIEW_COMMAND_ID, function (args) { return provideOverview(api, args); })
      ]);
    }
  });
})();
