/* ===========================================================
   Projects Plugin — Verstak v2 Frontend Bundle
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
    activity: { capability: 'activity.log', label: 'Activity' }
  };

  var STYLES = [
    '.projects-root{display:flex;height:100%;min-height:0;background:var(--vt-color-background,#101020);color:var(--vt-color-text-primary,#f4f7fb);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '.projects-sidebar{width:19rem;min-width:15rem;display:flex;flex-direction:column;border-right:1px solid var(--vt-color-border,#202b46);background:var(--vt-color-surface-muted,#111629)}',
    '.projects-toolbar{display:flex;align-items:center;gap:.5rem;padding:.65rem;border-bottom:1px solid var(--vt-color-border,#202b46);flex-wrap:wrap}',
    '.projects-title{font-size:.88rem;font-weight:650;flex:1}',
    '.projects-btn{font:inherit;font-size:.78rem;padding:.38rem .68rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-secondary,#b7c0d4);cursor:pointer}',
    '.projects-btn:hover{border-color:var(--vt-color-accent,#4ecca3);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.projects-btn.primary{background:var(--vt-color-accent,#4ecca3);border-color:var(--vt-color-accent,#4ecca3);color:#101827}',
    '.projects-btn:disabled{opacity:.45;cursor:default}',
    '.projects-search,.projects-input,.projects-select,.projects-textarea{font:inherit;font-size:.8rem;padding:.43rem .55rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:#0f1424;color:var(--vt-color-text-primary,#f4f7fb);outline:none}',
    '.projects-search:focus,.projects-input:focus,.projects-select:focus,.projects-textarea:focus{border-color:var(--vt-color-accent,#4ecca3);box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34))}',
    '.projects-search{margin:.55rem;width:calc(100% - 1.1rem)}',
    '.projects-list{flex:1;min-height:0;overflow:auto}',
    '.projects-card{padding:.7rem .75rem;border-bottom:1px solid rgba(32,43,70,.72);cursor:pointer;display:grid;gap:.28rem}',
    '.projects-card:hover{background:var(--vt-color-surface-hover,#1b2440)}',
    '.projects-card.selected{background:var(--vt-color-surface-selected,rgba(78,204,163,.14));box-shadow:inset 2px 0 0 var(--vt-color-accent,#4ecca3)}',
    '.projects-card-title{font-size:.86rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.projects-card-meta{display:flex;gap:.35rem;align-items:center;flex-wrap:wrap;font-size:.7rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.projects-badge{display:inline-flex;padding:.12rem .38rem;border:1px solid var(--vt-color-border,#202b46);border-radius:999px;font-size:.68rem;color:var(--vt-color-text-secondary,#b7c0d4)}',
    '.projects-badge.done{color:var(--vt-color-accent,#4ecca3)}.projects-badge.paused{color:#e6c46a}.projects-badge.archived{opacity:.65}',
    '.projects-main{flex:1;min-width:0;display:flex;flex-direction:column}',
    '.projects-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.75rem;padding:2rem;text-align:center;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.projects-header{padding:.85rem 1rem;border-bottom:1px solid var(--vt-color-border,#202b46);display:flex;align-items:flex-start;gap:.75rem}',
    '.projects-header-main{flex:1;min-width:0}.projects-header-name{font-size:1.05rem;font-weight:700}.projects-header-description{margin-top:.28rem;color:var(--vt-color-text-secondary,#b7c0d4);font-size:.82rem;line-height:1.45;white-space:pre-wrap}',
    '.projects-tags{display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.5rem}',
    '.projects-tabs{display:flex;gap:.15rem;padding:.45rem .7rem;border-bottom:1px solid var(--vt-color-border,#202b46);overflow:auto;background:var(--vt-color-surface-muted,#111629)}',
    '.projects-tab{font:inherit;font-size:.76rem;padding:.4rem .62rem;border:0;border-radius:var(--vt-radius-sm,4px);background:transparent;color:var(--vt-color-text-muted,#7f8aa3);cursor:pointer;white-space:nowrap}',
    '.projects-tab.active{background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-accent,#4ecca3)}',
    '.projects-pane{flex:1;min-height:0;overflow:auto;padding:1rem}',
    '.projects-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:.75rem}',
    '.projects-panel{border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c);padding:.8rem;min-width:0}',
    '.projects-panel-title{font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;color:var(--vt-color-text-muted,#7f8aa3);margin-bottom:.55rem}',
    '.projects-stat{font-size:1rem;font-weight:650}.projects-muted{font-size:.78rem;color:var(--vt-color-text-muted,#7f8aa3);line-height:1.45}',
    '.projects-row{display:flex;gap:.55rem;align-items:center;padding:.5rem 0;border-bottom:1px solid rgba(32,43,70,.62)}.projects-row:last-child{border-bottom:0}',
    '.projects-row-main{flex:1;min-width:0}.projects-row-title{font-size:.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.projects-row-meta{font-size:.7rem;color:var(--vt-color-text-muted,#7f8aa3);margin-top:.15rem}',
    '.projects-form-row{display:flex;gap:.45rem;align-items:center;flex-wrap:wrap;margin-bottom:.7rem}.projects-form-row .projects-input{flex:1;min-width:10rem}',
    '.projects-check{width:1rem;height:1rem;accent-color:var(--vt-color-accent,#4ecca3)}',
    '.projects-history{display:grid;gap:.45rem}.projects-history-item{display:grid;grid-template-columns:9rem minmax(0,1fr);gap:.6rem;font-size:.76rem}.projects-history-time{color:var(--vt-color-text-muted,#7f8aa3)}',
    '.projects-tool-card{display:flex;align-items:center;gap:.7rem;padding:.75rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface,#15152c)}.projects-tool-card+.projects-tool-card{margin-top:.55rem}.projects-tool-name{font-size:.85rem;font-weight:600;flex:1}',
    '.projects-error{font-size:.78rem;color:#ffc6ce;border:1px solid rgba(233,69,96,.45);background:rgba(233,69,96,.12);border-radius:var(--vt-radius-sm,4px);padding:.5rem .6rem;margin:.5rem 0}',
    '.projects-modal-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:1rem}',
    '.projects-modal{width:560px;max-width:96vw;max-height:92vh;overflow:auto;display:grid;gap:.65rem;padding:1rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-lg,8px);background:#15152c;box-shadow:0 18px 44px rgba(0,0,0,.4)}',
    '.projects-modal-title{font-size:.98rem;font-weight:700}.projects-field{display:grid;gap:.3rem}.projects-label{font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}.projects-textarea{min-height:6rem;resize:vertical}.projects-modal-actions{display:flex;justify-content:flex-end;gap:.45rem;margin-top:.3rem}',
    '@container(max-width:760px){.projects-root{flex-direction:column}.projects-sidebar{width:100%;height:13rem;min-width:0;border-right:0;border-bottom:1px solid var(--vt-color-border,#202b46)}.projects-main{min-height:0}.projects-history-item{grid-template-columns:1fr}}'
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
  function cleanPath(value) { return text(value).split('/').filter(Boolean).join('/'); }
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
  function normalizeProject(raw) {
    raw = raw || {};
    return {
      id: text(raw.id) || makeId('project'),
      name: text(raw.name).trim() || 'Untitled project',
      description: text(raw.description),
      status: normalizeStatus(text(raw.status)),
      priority: normalizePriority(text(raw.priority)),
      tags: normalizeTags(raw.tags),
      workspaceRootPath: cleanPath(raw.workspaceRootPath),
      milestones: (Array.isArray(raw.milestones) ? raw.milestones : []).map(function (item) {
        item = item || {};
        return {
          id: text(item.id) || makeId('milestone'),
          title: text(item.title).trim() || 'Milestone',
          status: item.status === 'done' ? 'done' : 'open',
          dueAt: text(item.dueAt),
          createdAt: text(item.createdAt) || now(),
          completedAt: text(item.completedAt)
        };
      }).slice(0, 200),
      links: (Array.isArray(raw.links) ? raw.links : []).map(function (item) {
        item = item || {};
        return { id: text(item.id) || makeId('link'), label: text(item.label).trim() || text(item.url), url: text(item.url).trim() };
      }).filter(function (item) { return item.url; }).slice(0, 100),
      events: clampEvents(raw.events),
      createdAt: text(raw.createdAt) || now(),
      updatedAt: text(raw.updatedAt) || text(raw.createdAt) || now()
    };
  }
  function normalizeProjects(value) {
    return (Array.isArray(value) ? value : []).map(normalizeProject).slice(0, 500).sort(function (a, b) {
      return text(b.updatedAt).localeCompare(text(a.updatedAt));
    });
  }
  function eventRecord(type, subject) { return { id: makeId('event'), type: type, subject: text(subject), at: now() }; }
  function withEvent(project, type, subject) {
    project.events = clampEvents((project.events || []).concat([eventRecord(type, subject)]));
    project.updatedAt = now();
    return project;
  }

  function loadProjects(api) {
    if (!api || !api.settings || typeof api.settings.read !== 'function') return Promise.resolve([]);
    return api.settings.read().then(function (settings) { return normalizeProjects((settings || {})[PROJECTS_KEY]); });
  }
  function saveProjects(api, projects) {
    return api.settings.write(PROJECTS_KEY, normalizeProjects(projects)).then(function () { return normalizeProjects(projects); });
  }
  function publishProjectEvent(api, type, project, extra) {
    if (!api.events || typeof api.events.publish !== 'function') return Promise.resolve();
    var payload = Object.assign({ projectId: project.id, projectName: project.name, workspaceRootPath: project.workspaceRootPath }, extra || {});
    return api.events.publish(type, payload).catch(function () {});
  }
  function workspaceFromProps(props) {
    var node = props && props.workspaceNode;
    if (!node) return '';
    return cleanPath(node.rootPath || node.path || node.name || node.id);
  }

  function ProjectsViewMount(container, props, api) {
    injectStyles();
    container.innerHTML = '';
    container.className = 'projects-root';
    container.setAttribute('data-plugin-id', PLUGIN_ID);

    var contextWorkspace = workspaceFromProps(props);
    var projects = [];
    var selectedId = '';
    var activeTab = 'overview';
    var filterText = '';
    var disposed = false;
    var renderGeneration = 0;
    var capabilityState = {};
    var workspaceOptions = [];

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
    function userError(key, fallback, error) {
      if (console && console.warn) console.warn('[verstak.projects] ' + key, error);
      return tr(key, null, fallback);
    }
    function selectedProject() { return projects.find(function (project) { return project.id === selectedId; }) || null; }
    function visibleProjects() {
      var query = filterText.trim().toLowerCase();
      return projects.filter(function (project) {
        if (contextWorkspace && project.workspaceRootPath !== contextWorkspace) return false;
        if (!query) return true;
        return [project.name, project.description, project.workspaceRootPath].concat(project.tags || []).join(' ').toLowerCase().indexOf(query) !== -1;
      });
    }
    function ensureSelection() {
      var visible = visibleProjects();
      if (!visible.some(function (project) { return project.id === selectedId; })) selectedId = visible[0] ? visible[0].id : '';
    }
    function persist(type, project, extra) {
      return saveProjects(api, projects).then(function (saved) {
        projects = saved;
        if (type && project) publishProjectEvent(api, type, project, extra);
        render();
      }).catch(function (error) {
        renderBanner(userError('ui.saveError', 'Could not save projects. Please try again.', error));
      });
    }
    function renderBanner(message) {
      if (!message) return;
      var banner = el('div', { className: 'projects-error', textContent: message });
      main.insertBefore(banner, main.firstChild || null);
      setTimeout(function () { if (!disposed && banner.remove) banner.remove(); }, 5000);
    }

    function renderSidebar() {
      sidebar.innerHTML = '';
      var toolbar = el('div', { className: 'projects-toolbar' }, [
        el('div', { className: 'projects-title', textContent: contextWorkspace ? tr('ui.workspaceTitle', { workspace: contextWorkspace }, 'Project · ' + contextWorkspace) : tr('ui.title', null, 'Projects') }),
        el('button', { className: 'projects-btn primary', 'data-project-action': 'new', textContent: '+', title: tr('ui.newProject', null, 'New Project'), onClick: function () { showProjectForm(null); } })
      ]);
      sidebar.appendChild(toolbar);
      var search = el('input', { className: 'projects-search', 'data-project-search': '', placeholder: tr('ui.search', null, 'Search projects') });
      search.value = filterText;
      search.addEventListener('input', function () { filterText = search.value; renderSidebar(); ensureSelection(); renderMain(); });
      sidebar.appendChild(search);
      var list = el('div', { className: 'projects-list', 'data-project-list': '' });
      var visible = visibleProjects();
      if (!visible.length) {
        list.appendChild(el('div', { className: 'projects-empty' }, [
          el('div', { textContent: contextWorkspace ? tr('ui.emptyWorkspace', null, 'No project is linked to this Deal yet.') : tr('ui.empty', null, 'No projects yet.') }),
          contextWorkspace ? el('button', { className: 'projects-btn primary', textContent: tr('ui.createForWorkspace', null, 'Create project for this Deal'), onClick: function () { showProjectForm(null); } }) : null
        ]));
      } else {
        visible.forEach(function (project) {
          var card = el('div', {
            className: 'projects-card' + (project.id === selectedId ? ' selected' : ''),
            'data-project-id': project.id,
            onClick: function () { selectedId = project.id; activeTab = 'overview'; render(); }
          }, [
            el('div', { className: 'projects-card-title', textContent: project.name }),
            el('div', { className: 'projects-card-meta' }, [
              el('span', { className: 'projects-badge ' + project.status, textContent: tr('ui.status.' + project.status, null, project.status) }),
              el('span', { textContent: tr('ui.priority.' + project.priority, null, project.priority) }),
              project.workspaceRootPath ? el('span', { textContent: project.workspaceRootPath }) : null
            ])
          ]);
          list.appendChild(card);
        });
      }
      sidebar.appendChild(list);
    }

    function renderMain() {
      main.innerHTML = '';
      var project = selectedProject();
      if (!project) {
        main.appendChild(el('div', { className: 'projects-empty' }, [el('div', { textContent: contextWorkspace ? tr('ui.emptyWorkspace', null, 'No project is linked to this Deal yet.') : tr('ui.empty', null, 'No projects yet.') })]));
        return;
      }
      main.appendChild(el('div', { className: 'projects-header' }, [
        el('div', { className: 'projects-header-main' }, [
          el('div', { className: 'projects-header-name', textContent: project.name }),
          el('div', { className: 'projects-header-description', textContent: project.description || tr('ui.noDescription', null, 'No description.') }),
          el('div', { className: 'projects-tags' }, (project.tags || []).map(function (tag) { return el('span', { className: 'projects-badge', textContent: tag }); }))
        ]),
        el('button', { className: 'projects-btn', 'data-project-action': 'edit', textContent: tr('ui.editProject', null, 'Edit'), onClick: function () { showProjectForm(project); } })
      ]));
      var tabs = el('div', { className: 'projects-tabs' });
      TABS.forEach(function (tab) {
        tabs.appendChild(el('button', {
          className: 'projects-tab' + (activeTab === tab ? ' active' : ''),
          'data-project-tab': tab,
          textContent: tr('ui.tab.' + tab, null, tab),
          onClick: function () { activeTab = tab; renderMain(); }
        }));
      });
      main.appendChild(tabs);
      var pane = el('div', { className: 'projects-pane', 'data-project-pane': activeTab });
      main.appendChild(pane);
      renderTab(pane, project);
    }

    function render() {
      if (disposed) return;
      ensureSelection();
      renderGeneration += 1;
      renderSidebar();
      renderMain();
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
      var workspace = el('input', { className: 'projects-input', 'data-project-field': 'workspace', list: 'projects-workspaces' });
      var datalist = el('datalist', { id: 'projects-workspaces' });
      workspaceOptions.forEach(function (item) { datalist.appendChild(el('option', { value: item.rootPath || item.name || '' })); });
      name.value = project ? project.name : '';
      description.value = project ? project.description : '';
      status.value = project ? project.status : 'active';
      priority.value = project ? project.priority : 'normal';
      tags.value = project ? (project.tags || []).join(', ') : '';
      workspace.value = project ? project.workspaceRootPath : contextWorkspace;
      var error = el('div', { className: 'projects-error', 'data-project-form-error': '', style: { display: 'none' } });
      function field(label, control, hint) {
        var children = [el('label', { className: 'projects-label', textContent: label }), control];
        if (hint) children.push(el('div', { className: 'projects-muted', textContent: hint }));
        return el('div', { className: 'projects-field' }, children);
      }
      function close() { overlay.remove(); }
      function submit() {
        var projectName = name.value.trim();
        if (!projectName) { error.textContent = tr('ui.nameRequired', null, 'Project name is required.'); error.style.display = ''; name.focus(); return; }
        var oldStatus = project && project.status;
        var target = project || normalizeProject({ id: makeId('project'), createdAt: now() });
        target.name = projectName;
        target.description = description.value;
        target.status = normalizeStatus(status.value);
        target.priority = normalizePriority(priority.value);
        target.tags = normalizeTags(tags.value);
        target.workspaceRootPath = cleanPath(workspace.value);
        if (!editing) withEvent(target, 'project.created', target.name);
        else if (oldStatus !== target.status) withEvent(target, 'project.status', target.status);
        else withEvent(target, 'project.updated', target.name);
        if (!editing) projects.unshift(target);
        selectedId = target.id;
        close();
        persist(editing ? 'project.updated' : 'project.created', target);
      }
      overlay.appendChild(el('div', { className: 'projects-modal' }, [
        el('div', { className: 'projects-modal-title', textContent: editing ? tr('ui.editProject', null, 'Edit') : tr('ui.newProject', null, 'New Project') }),
        error,
        field(tr('ui.name', null, 'Name'), name),
        field(tr('ui.description', null, 'Description'), description),
        el('div', { className: 'projects-form-row' }, [field(tr('ui.status', null, 'Status'), status), field(tr('ui.priority', null, 'Priority'), priority)]),
        field(tr('ui.tags', null, 'Tags'), tags),
        field(tr('ui.workspace', null, 'Linked Deal path'), workspace, tr('ui.workspaceHint', null, 'Optional. Notes and Todos use this Deal as their context.')),
        datalist,
        el('div', { className: 'projects-modal-actions' }, [
          el('button', { className: 'projects-btn', textContent: tr('ui.cancel', null, 'Cancel'), onClick: close }),
          el('button', { className: 'projects-btn primary', 'data-project-save': '', textContent: tr('ui.save', null, 'Save'), onClick: submit })
        ])
      ]));
      container.appendChild(overlay);
      name.focus();
    }

    function renderTab(pane, project) {
      if (activeTab === 'overview') renderOverview(pane, project);
      else if (activeTab === 'milestones') renderMilestones(pane, project);
      else if (activeTab === 'tasks') renderTasks(pane, project);
      else if (activeTab === 'notes') renderNotes(pane, project);
      else if (activeTab === 'links') renderLinks(pane, project);
      else if (activeTab === 'files') renderProviderTool(pane, project, 'files');
      else if (activeTab === 'activity') renderProviderTool(pane, project, 'activity');
    }

    function renderOverview(pane, project) {
      var milestones = project.milestones || [];
      var done = milestones.filter(function (item) { return item.status === 'done'; }).length;
      var taskCount = el('div', { className: 'projects-stat', textContent: '—' });
      var noteCount = el('div', { className: 'projects-stat', textContent: '—' });
      pane.appendChild(el('div', { className: 'projects-grid' }, [
        el('div', { className: 'projects-panel' }, [el('div', { className: 'projects-panel-title', textContent: tr('ui.status', null, 'Status') }), el('div', { className: 'projects-stat', textContent: tr('ui.status.' + project.status, null, project.status) }), el('div', { className: 'projects-muted', textContent: tr('ui.priority.' + project.priority, null, project.priority) })]),
        el('div', { className: 'projects-panel' }, [el('div', { className: 'projects-panel-title', textContent: tr('ui.tab.milestones', null, 'Milestones') }), el('div', { className: 'projects-stat', textContent: tr('ui.countMilestones', { done: done, total: milestones.length }, done + '/' + milestones.length + ' milestones done') })]),
        el('div', { className: 'projects-panel' }, [el('div', { className: 'projects-panel-title', textContent: tr('ui.tab.tasks', null, 'Tasks') }), taskCount]),
        el('div', { className: 'projects-panel' }, [el('div', { className: 'projects-panel-title', textContent: tr('ui.tab.notes', null, 'Notes') }), noteCount]),
        el('div', { className: 'projects-panel' }, [el('div', { className: 'projects-panel-title', textContent: tr('ui.workspace', null, 'Linked Deal path') }), el('div', { className: 'projects-stat', textContent: project.workspaceRootPath || tr('ui.noWorkspace', null, 'No Deal linked') })])
      ]));
      var historyPanel = el('div', { className: 'projects-panel', style: { marginTop: '.75rem' } }, [el('div', { className: 'projects-panel-title', textContent: tr('ui.recentActivity', null, 'Recent project history') })]);
      var recent = (project.events || []).slice(-8).reverse();
      var history = el('div', { className: 'projects-history' });
      if (!recent.length) history.appendChild(el('div', { className: 'projects-muted', textContent: tr('ui.noHistory', null, 'No project changes recorded yet.') }));
      recent.forEach(function (item) {
        history.appendChild(el('div', { className: 'projects-history-item' }, [
          el('div', { className: 'projects-history-time', textContent: item.at ? new Date(item.at).toLocaleString() : '' }),
          el('div', { textContent: tr('ui.event.' + item.type, null, item.type) + (item.subject ? ' · ' + item.subject : '') })
        ]));
      });
      historyPanel.appendChild(history);
      pane.appendChild(historyPanel);
      if (!project.workspaceRootPath) {
        taskCount.textContent = '—'; noteCount.textContent = '—'; return;
      }
      api.capabilities.has('todo.workspace').then(function (available) {
        if (!available || disposed) { taskCount.textContent = tr('ui.unavailable', null, 'Unavailable'); return; }
        return api.capabilities.invoke('todo.workspace', 'list', { workspaceRootPath: project.workspaceRootPath, status: 'open' }).then(function (result) {
          if (!disposed) taskCount.textContent = tr('ui.countTasks', { count: (result || []).length }, (result || []).length + ' open tasks');
        });
      }).catch(function () { taskCount.textContent = tr('ui.unavailable', null, 'Unavailable'); });
      api.capabilities.has('verstak/notes/v1').then(function (available) {
        if (!available || disposed) { noteCount.textContent = tr('ui.unavailable', null, 'Unavailable'); return; }
        return api.capabilities.invoke('verstak/notes/v1', 'list', { workspaceRootPath: project.workspaceRootPath }).then(function (result) {
          if (!disposed) noteCount.textContent = tr('ui.countNotes', { count: (result || []).length }, (result || []).length + ' notes');
        });
      }).catch(function () { noteCount.textContent = tr('ui.unavailable', null, 'Unavailable'); });
    }

    function renderMilestones(pane, project) {
      var title = el('input', { className: 'projects-input', placeholder: tr('ui.milestoneTitle', null, 'Milestone title') });
      var due = el('input', { className: 'projects-input', type: 'date', title: tr('ui.dueDate', null, 'Due date') });
      pane.appendChild(el('div', { className: 'projects-form-row' }, [title, due, el('button', { className: 'projects-btn primary', textContent: tr('ui.addMilestone', null, 'Add milestone'), onClick: function () {
        var value = title.value.trim(); if (!value) return;
        project.milestones.push({ id: makeId('milestone'), title: value, status: 'open', dueAt: due.value, createdAt: now(), completedAt: '' });
        withEvent(project, 'milestone.created', value); persist('project.milestone.created', project, { milestoneTitle: value });
      } })]));
      var list = el('div', { className: 'projects-panel' });
      if (!project.milestones.length) list.appendChild(el('div', { className: 'projects-muted', textContent: tr('ui.noMilestones', null, 'No milestones yet.') }));
      project.milestones.forEach(function (milestone) {
        list.appendChild(el('div', { className: 'projects-row', 'data-milestone-id': milestone.id }, [
          el('input', { className: 'projects-check', type: 'checkbox', checked: milestone.status === 'done' ? 'checked' : null, onChange: function (event) {
            milestone.status = event.target.checked ? 'done' : 'open'; milestone.completedAt = milestone.status === 'done' ? now() : '';
            withEvent(project, 'milestone.updated', milestone.title); persist('project.milestone.changed', project, { milestoneId: milestone.id });
          } }),
          el('div', { className: 'projects-row-main' }, [el('div', { className: 'projects-row-title', textContent: milestone.title }), el('div', { className: 'projects-row-meta', textContent: milestone.dueAt || '' })]),
          el('button', { className: 'projects-btn', textContent: tr('ui.remove', null, 'Remove'), onClick: function () {
            project.milestones = project.milestones.filter(function (item) { return item.id !== milestone.id; });
            withEvent(project, 'milestone.removed', milestone.title); persist('project.milestone.removed', project, { milestoneId: milestone.id });
          } })
        ]));
      });
      pane.appendChild(list);
    }

    function requireWorkspace(pane, project) {
      if (project.workspaceRootPath) return true;
      pane.appendChild(el('div', { className: 'projects-empty', textContent: tr('ui.workspaceRequired', null, 'Link this project to a Deal to use this tool.') }));
      return false;
    }
    function capabilityError(pane, error) {
      pane.innerHTML = '';
      pane.appendChild(el('div', { className: 'projects-error', textContent: userError('ui.capabilityError', 'The optional tool could not complete this request.', error) }));
    }

    function renderTasks(pane, project) {
      if (!requireWorkspace(pane, project)) return;
      pane.appendChild(el('div', { className: 'projects-muted', textContent: tr('ui.loading', null, 'Loading…') }));
      api.capabilities.has('todo.workspace').then(function (available) {
        if (!available) { pane.innerHTML = ''; pane.appendChild(el('div', { className: 'projects-empty', textContent: tr('ui.providerUnavailable', null, 'This optional tool is not installed or enabled.') })); return; }
        return loadTasks(pane, project);
      }).catch(function (error) { capabilityError(pane, error); });
    }
    function loadTasks(pane, project) {
      return api.capabilities.invoke('todo.workspace', 'list', { workspaceRootPath: project.workspaceRootPath, status: 'all' }).then(function (tasks) {
        pane.innerHTML = '';
        var input = el('input', { className: 'projects-input', placeholder: tr('ui.taskTitle', null, 'Task title') });
        var priority = el('select', { className: 'projects-select' }); PRIORITY_VALUES.forEach(function (value) { priority.appendChild(el('option', { value: value, textContent: tr('ui.priority.' + value, null, value) })); }); priority.value = 'normal';
        pane.appendChild(el('div', { className: 'projects-form-row' }, [input, priority, el('button', { className: 'projects-btn primary', textContent: tr('ui.addTask', null, 'Add task'), onClick: function () {
          var value = input.value.trim(); if (!value) return;
          api.capabilities.invoke('todo.workspace', 'create', { workspaceRootPath: project.workspaceRootPath, title: value, priority: priority.value }).then(function () { loadTasks(pane, project); }).catch(function (error) { capabilityError(pane, error); });
        } })]));
        var list = el('div', { className: 'projects-panel' });
        tasks = Array.isArray(tasks) ? tasks : [];
        if (!tasks.length) list.appendChild(el('div', { className: 'projects-muted', textContent: tr('ui.noTasks', null, 'No tasks for this project.') }));
        tasks.forEach(function (task) {
          list.appendChild(el('div', { className: 'projects-row', 'data-project-task': task.id }, [
            el('input', { className: 'projects-check', type: 'checkbox', checked: task.status === 'done' ? 'checked' : null, onChange: function (event) {
              api.capabilities.invoke('todo.workspace', 'setStatus', { id: task.id, status: event.target.checked ? 'done' : 'open' }).then(function () { loadTasks(pane, project); }).catch(function (error) { capabilityError(pane, error); });
            } }),
            el('div', { className: 'projects-row-main' }, [el('div', { className: 'projects-row-title', textContent: task.title || '' }), el('div', { className: 'projects-row-meta', textContent: tr('ui.priority.' + (task.priority || 'normal'), null, task.priority || 'normal') + (task.dueAt ? ' · ' + task.dueAt : '') })])
          ]));
        });
        pane.appendChild(list);
      });
    }

    function renderNotes(pane, project) {
      if (!requireWorkspace(pane, project)) return;
      pane.appendChild(el('div', { className: 'projects-muted', textContent: tr('ui.loading', null, 'Loading…') }));
      api.capabilities.has('verstak/notes/v1').then(function (available) {
        if (!available) { pane.innerHTML = ''; pane.appendChild(el('div', { className: 'projects-empty', textContent: tr('ui.providerUnavailable', null, 'This optional tool is not installed or enabled.') })); return; }
        return loadNotes(pane, project);
      }).catch(function (error) { capabilityError(pane, error); });
    }
    function loadNotes(pane, project) {
      return api.capabilities.invoke('verstak/notes/v1', 'list', { workspaceRootPath: project.workspaceRootPath }).then(function (notes) {
        pane.innerHTML = '';
        var input = el('input', { className: 'projects-input', placeholder: tr('ui.noteTitle', null, 'Note title') });
        pane.appendChild(el('div', { className: 'projects-form-row' }, [input, el('button', { className: 'projects-btn primary', textContent: tr('ui.addNote', null, 'Create note'), onClick: function () {
          var value = input.value.trim(); if (!value) return;
          api.capabilities.invoke('verstak/notes/v1', 'create', { workspaceRootPath: project.workspaceRootPath, title: value }).then(function (created) {
            if (created && created.conflict) throw new Error('note already exists');
            return loadNotes(pane, project);
          }).catch(function (error) { capabilityError(pane, error); });
        } })]));
        var list = el('div', { className: 'projects-panel' });
        notes = Array.isArray(notes) ? notes : [];
        if (!notes.length) list.appendChild(el('div', { className: 'projects-muted', textContent: tr('ui.noNotes', null, 'No notes for this project.') }));
        notes.forEach(function (note) {
          list.appendChild(el('div', { className: 'projects-row', 'data-project-note': note.path }, [
            el('div', { className: 'projects-row-main' }, [el('div', { className: 'projects-row-title', textContent: note.title || note.filename || note.path }), el('div', { className: 'projects-row-meta', textContent: note.path || '' })]),
            el('button', { className: 'projects-btn', textContent: tr('ui.open', null, 'Open'), onClick: function () { api.capabilities.invoke('verstak/notes/v1', 'open', { workspaceRootPath: project.workspaceRootPath, path: note.path }).catch(function (error) { capabilityError(pane, error); }); } })
          ]));
        });
        pane.appendChild(list);
      });
    }

    function renderLinks(pane, project) {
      var label = el('input', { className: 'projects-input', placeholder: tr('ui.linkLabel', null, 'Label') });
      var url = el('input', { className: 'projects-input', placeholder: tr('ui.linkUrl', null, 'https://example.com') });
      pane.appendChild(el('div', { className: 'projects-form-row' }, [label, url, el('button', { className: 'projects-btn primary', textContent: tr('ui.addLink', null, 'Add link'), onClick: function () {
        var value = url.value.trim(); if (!value) return;
        project.links.push({ id: makeId('link'), label: label.value.trim() || value, url: value });
        withEvent(project, 'link.created', label.value.trim() || value); persist('project.link.created', project, { url: value });
      } })]));
      var list = el('div', { className: 'projects-panel' });
      if (!project.links.length) list.appendChild(el('div', { className: 'projects-muted', textContent: tr('ui.noLinks', null, 'No links yet.') }));
      project.links.forEach(function (link) {
        list.appendChild(el('div', { className: 'projects-row', 'data-project-link': link.id }, [
          el('div', { className: 'projects-row-main' }, [el('div', { className: 'projects-row-title', textContent: link.label }), el('div', { className: 'projects-row-meta', textContent: link.url })]),
          el('button', { className: 'projects-btn', textContent: tr('ui.open', null, 'Open'), onClick: function () { api.files.openURL(link.url).catch(function (error) { capabilityError(pane, error); }); } }),
          el('button', { className: 'projects-btn', textContent: tr('ui.remove', null, 'Remove'), onClick: function () { project.links = project.links.filter(function (item) { return item.id !== link.id; }); withEvent(project, 'link.removed', link.label); persist('project.link.removed', project); } })
        ]));
      });
      pane.appendChild(list);
    }

    function renderProviderTool(pane, project, toolKey) {
      if (!requireWorkspace(pane, project)) return;
      var definition = OPTIONAL_TOOLS[toolKey];
      pane.appendChild(el('div', { className: 'projects-muted', textContent: tr('ui.loading', null, 'Loading…') }));
      resolveWorkspaceTool(definition.capability).then(function (tool) {
        pane.innerHTML = '';
        if (!tool) { pane.appendChild(el('div', { className: 'projects-empty', textContent: tr('ui.providerUnavailable', null, 'This optional tool is not installed or enabled.') })); return; }
        pane.appendChild(el('div', { className: 'projects-tool-card' }, [
          el('div', { className: 'projects-tool-name', textContent: tool.title || definition.label }),
          el('span', { className: 'projects-badge done', textContent: tr('ui.available', null, 'Available') }),
          el('button', { className: 'projects-btn primary', textContent: tr('ui.openTool', { tool: tool.title || definition.label }, 'Open ' + (tool.title || definition.label)), onClick: function () { openWorkspaceTool(project.workspaceRootPath, tool.id); } })
        ]));
      }).catch(function (error) { capabilityError(pane, error); });
    }
    function resolveWorkspaceTool(capability) {
      return api.capabilities.get(capability).then(function (info) {
        if (!info || !info.available || !info.pluginId) return null;
        return api.contributions.list('workspaceItems').then(function (items) {
          return (items || []).find(function (item) { return item.pluginId === info.pluginId; }) || null;
        });
      });
    }
    function openWorkspaceTool(rootPath, workspaceItemId) {
      window.dispatchEvent(new CustomEvent('verstak:workspace-selected', { detail: { workspaceName: rootPath } }));
      setTimeout(function () { window.dispatchEvent(new CustomEvent('verstak:workspace-open-tool', { detail: { workspaceItemId: workspaceItemId } })); }, 0);
    }

    function discoverCapabilities() {
      return Promise.all(Object.keys(OPTIONAL_TOOLS).map(function (key) {
        return api.capabilities.has(OPTIONAL_TOOLS[key].capability).then(function (available) { capabilityState[key] = !!available; }).catch(function () { capabilityState[key] = false; });
      }));
    }
    function discoverWorkspaces() {
      if (!api.workspaces || typeof api.workspaces.list !== 'function') return Promise.resolve();
      return api.workspaces.list().then(function (items) { workspaceOptions = Array.isArray(items) ? items : []; }).catch(function () { workspaceOptions = []; });
    }

    function initialize() {
      return Promise.all([loadProjects(api), discoverCapabilities(), discoverWorkspaces()]).then(function (values) {
        if (disposed) return;
        projects = values[0] || [];
        ensureSelection();
        render();
      }).catch(function (error) {
        if (disposed) return;
        main.innerHTML = '';
        main.appendChild(el('div', { className: 'projects-error', textContent: userError('ui.loadError', 'Could not load projects. Please try again.', error) }));
        renderSidebar();
      });
    }

    var localeUnsubscribe = null;
    if (api.i18n && typeof api.i18n.onDidChangeLocale === 'function') localeUnsubscribe = api.i18n.onDidChangeLocale(render);
    initialize();
    container.__projectsCleanup = function () { disposed = true; renderGeneration += 1; if (typeof localeUnsubscribe === 'function') localeUnsubscribe(); };
  }

  var ProjectsView = {
    mount: ProjectsViewMount,
    unmount: function (container) { if (container.__projectsCleanup) container.__projectsCleanup(); container.__projectsCleanup = null; container.innerHTML = ''; }
  };

  function provideOverview(api, args) {
    var workspace = cleanPath(args && args.workspaceRootPath);
    if (!workspace) return Promise.resolve({});
    return loadProjects(api).then(function (projects) {
      var linked = projects.filter(function (project) { return project.workspaceRootPath === workspace && project.status !== 'archived'; });
      if (!linked.length) return {};
      var active = linked.find(function (project) { return project.status === 'active'; }) || linked[0];
      var done = (active.milestones || []).filter(function (item) { return item.status === 'done'; }).length;
      return {
        summary: [{
          id: 'project',
          label: active.name,
          count: done,
          detail: active.status === 'done' ? (api.i18n ? api.i18n.t('overview.done', null, 'Completed project') : 'Completed project') : (api.i18n ? api.i18n.t('overview.active', null, 'Active project') : 'Active project'),
          order: 5,
          action: { workspaceItemId: 'verstak.projects.workspace' }
        }]
      };
    });
  }

  window.VerstakPluginRegister(PLUGIN_ID, {
    components: { ProjectsView: ProjectsView },
    activate: function (api) {
      if (!api || !api.commands || typeof api.commands.register !== 'function') return Promise.resolve();
      return Promise.all([
        api.commands.register(LIST_COMMAND_ID, function (args) {
          var workspace = cleanPath(args && args.workspaceRootPath);
          return loadProjects(api).then(function (projects) { return workspace ? projects.filter(function (project) { return project.workspaceRootPath === workspace; }) : projects; });
        }),
        api.commands.register(GET_COMMAND_ID, function (args) {
          var id = text(args && args.id);
          return loadProjects(api).then(function (projects) { return projects.find(function (project) { return project.id === id; }) || null; });
        }),
        api.commands.register(OVERVIEW_COMMAND_ID, function (args) { return provideOverview(api, args); })
      ]);
    }
  });
})();
