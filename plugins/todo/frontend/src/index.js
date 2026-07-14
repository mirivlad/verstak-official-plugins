/* ===========================================================
   Todo Plugin - Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  var PLUGIN_ID = 'verstak.todo';
  var GLOBAL_KEY = 'todos:global';
  var MAX_TODOS = 500;
  var STATUS_VALUES = ['open', 'done', 'cancelled'];
  var PRIORITY_VALUES = ['low', 'normal', 'high'];

  var STYLES = [
    '.todo-root{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--vt-color-background,#101020);color:var(--vt-color-text-primary,#f4f7fb);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '.todo-toolbar{display:flex;align-items:center;gap:.5rem;min-height:2.75rem;padding:.5rem .75rem;border-bottom:1px solid var(--vt-color-border,#202b46);background:var(--vt-color-surface-muted,#111629);flex-wrap:wrap;flex-shrink:0}',
    '.todo-title{font-size:.86rem;font-weight:600}.todo-count,.todo-status,.todo-scope{font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}.todo-spacer{flex:1}',
    '.todo-filters{display:flex;align-items:center;gap:.35rem;min-width:0;flex:1;flex-wrap:wrap}',
    '.todo-input,.todo-select{box-sizing:border-box;min-height:1.9rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-surface,#15152c);color:var(--vt-color-text-primary,#f4f7fb);color-scheme:dark;font:inherit;font-size:.78rem;padding:.32rem .45rem}',
    '.todo-input.search{width:min(15rem,100%)}.todo-input.textarea{min-height:6.5rem;resize:vertical;line-height:1.4}.todo-select{max-width:12rem;appearance:none;background-color:var(--vt-color-surface,#15152c);background-image:linear-gradient(45deg,transparent 50%,var(--vt-color-text-muted,#7f8aa3) 50%),linear-gradient(135deg,var(--vt-color-text-muted,#7f8aa3) 50%,transparent 50%);background-position:calc(100% - 14px) 50%,calc(100% - 9px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;padding-right:1.7rem}.todo-select option{background:var(--vt-color-surface,#15152c);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.todo-btn{min-height:1.9rem;padding:.32rem .62rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-secondary,#b7c0d4);font-size:.78rem;cursor:pointer}.todo-btn:hover{border-color:var(--vt-color-accent,#4ecca3);color:var(--vt-color-text-primary,#f4f7fb)}.todo-btn.primary{background:var(--vt-color-accent,#4ecca3);border-color:var(--vt-color-accent,#4ecca3);color:#101827}.todo-btn.danger{border-color:rgba(233,69,96,.5);color:#ff9a9a}.todo-btn:disabled{opacity:.45;cursor:default}',
    '.todo-list{flex:1;min-height:0;overflow:auto;padding:.5rem .75rem .85rem}.todo-empty{height:100%;display:flex;align-items:center;justify-content:center;padding:2rem;text-align:center;color:var(--vt-color-text-muted,#7f8aa3);font-size:.86rem}',
    '.todo-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.75rem;align-items:start;margin-top:.5rem;padding:.75rem .85rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c)}.todo-row:hover{background:var(--vt-color-surface-hover,#1b2440)}.todo-row.done .todo-row-title{text-decoration:line-through;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.todo-row-main{min-width:0;display:grid;gap:.3rem}.todo-row-head{display:flex;align-items:center;gap:.45rem;min-width:0}.todo-row-title{font-size:.88rem;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.todo-row-description{font-size:.78rem;line-height:1.4;color:var(--vt-color-text-secondary,#b7c0d4);white-space:pre-wrap;overflow-wrap:anywhere}.todo-row-meta{display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;font-size:.71rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.todo-badge{display:inline-flex;align-items:center;min-height:1.2rem;padding:0 .32rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-sm,4px);white-space:nowrap}.todo-badge.high{border-color:rgba(233,69,96,.55);color:#ffadb8}.todo-badge.low{color:#9fb0c8}.todo-badge.overdue,.todo-badge.reminder-due{border-color:rgba(233,69,96,.55);color:#ffadb8}.todo-badge.due-soon{border-color:rgba(255,200,87,.55);color:#ffd77f}',
    '.todo-row-actions{display:flex;gap:.35rem;flex-wrap:wrap;justify-content:flex-end}.todo-row-actions .todo-btn{padding:.25rem .45rem;font-size:.72rem}',
    '.todo-modal-host[hidden]{display:none}.todo-modal-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(0,0,0,.58)}.todo-modal{width:560px;max-width:96vw;display:grid;gap:.75rem;padding:1rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c);box-shadow:0 18px 44px rgba(0,0,0,.38)}.todo-modal-title{font-size:.95rem;font-weight:650}.todo-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:.65rem}.todo-field{display:grid;gap:.3rem;font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}.todo-field.wide{grid-column:1/-1}.todo-modal-actions{display:flex;justify-content:flex-end;gap:.5rem}',
    '@media(max-width:820px){.todo-toolbar{align-items:stretch}.todo-filters{width:100%}.todo-input.search{flex:1}.todo-row{grid-template-columns:1fr}.todo-row-actions{justify-content:flex-start}.todo-form-grid{grid-template-columns:1fr}.todo-field.wide{grid-column:auto}}'
  ].join('\n');

  function injectStyles() {
    if (document.getElementById('todo-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'todo-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  function el(tag, attrs, children) {
    var elem = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (attrs[key] == null) return;
        if (key === 'className') elem.className = attrs[key];
        else if (key === 'textContent') elem.textContent = attrs[key];
        else if (key === 'value') elem.value = attrs[key];
        else if (key === 'checked') elem.checked = attrs[key] === true;
        else if (key === 'disabled') elem.disabled = attrs[key] === true;
        else if (key.slice(0, 2) === 'on') elem.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
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

  function scopeFromProps(props) {
    var workspaceRoot = workspaceFromProps(props || {});
    return workspaceRoot
      ? { mode: 'workspace', workspaceRoot: workspaceRoot, label: workspaceRoot }
      : { mode: 'global', workspaceRoot: '', label: 'All workspaces' };
  }

  function now() {
    return new Date().toISOString();
  }

  function cleanStatus(value) {
    value = text(value).trim().toLowerCase();
    return STATUS_VALUES.indexOf(value) === -1 ? 'open' : value;
  }

  function cleanPriority(value) {
    value = text(value).trim().toLowerCase();
    return PRIORITY_VALUES.indexOf(value) === -1 ? 'normal' : value;
  }

  function cleanDate(value) {
    value = text(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    var match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
    var day;
    var month;
    var year;
    if (match) {
      month = Number(match[1]);
      day = Number(match[2]);
      year = Number(match[3]);
    } else {
      match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);
      if (!match) return '';
      day = Number(match[1]);
      month = Number(match[2]);
      year = Number(match[3]);
    }

    var date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
    return String(year).padStart(4, '0') + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  }

  function cleanDateTime(value) {
    value = text(value).trim();
    if (!value) return '';
    var date = new Date(value);
    return isNaN(date.getTime()) ? '' : value;
  }

  function splitReminderDateTime(value) {
    var match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(cleanDateTime(value));
    return match ? { date: match[1], time: match[2] } : { date: '', time: '' };
  }

  function joinReminderDateTime(date, time) {
    date = cleanDate(date);
    time = text(time).trim();
    if (!date || !/^\d{2}:\d{2}$/.test(time)) return '';
    return cleanDateTime(date + 'T' + time);
  }

  function todoId(workspaceRoot, title) {
    return 'todo:' + (cleanWorkspace(workspaceRoot) || 'global') + ':' + Date.now() + ':' + Math.random().toString(36).slice(2, 8) + ':' + text(title).trim().slice(0, 20).replace(/\s+/g, '-');
  }

  function normalizeTodo(value) {
    value = value || {};
    var status = cleanStatus(value.status);
    var createdAt = text(value.createdAt).trim() || now();
    var completedAt = status === 'done' ? (text(value.completedAt).trim() || createdAt) : '';
    return {
      id: text(value.id || todoId(value.workspaceRootPath, value.title)).trim(),
      title: text(value.title).trim(),
      description: text(value.description || value.body),
      workspaceRootPath: cleanWorkspace(value.workspaceRootPath || value.workspaceName),
      workspaceName: cleanWorkspace(value.workspaceName || value.workspaceRootPath),
      status: status,
      priority: cleanPriority(value.priority),
      dueAt: cleanDate(value.dueAt || value.dueDate),
      reminderAt: cleanDateTime(value.reminderAt || value.reminderDateTime),
      createdAt: createdAt,
      updatedAt: text(value.updatedAt).trim() || createdAt,
      completedAt: completedAt,
      sourceUrl: text(value.sourceUrl),
      linkedJournalEntryId: text(value.linkedJournalEntryId)
    };
  }

  function normalizeTodos(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(function (item) {
      return item && typeof item === 'object';
    }).map(normalizeTodo).filter(function (todo) {
      return todo.id;
    }).slice(0, MAX_TODOS);
  }

  function storageTodos(todoList) {
    return todoList.map(function (todo) {
      return {
        id: todo.id,
        title: todo.title,
        description: todo.description,
        workspaceRootPath: todo.workspaceRootPath,
        workspaceName: todo.workspaceName || todo.workspaceRootPath || '',
        status: todo.status,
        priority: todo.priority,
        dueAt: todo.dueAt,
        reminderAt: todo.reminderAt,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
        completedAt: todo.completedAt,
        sourceUrl: todo.sourceUrl,
        linkedJournalEntryId: todo.linkedJournalEntryId
      };
    });
  }

  function sortTodos(todoList) {
    var seen = {};
    return todoList.filter(function (todo) {
      if (!todo || !todo.id || seen[todo.id]) return false;
      seen[todo.id] = true;
      return true;
    }).slice(0, MAX_TODOS);
  }

  function dateTimeValue(value, endOfDay) {
    if (!value) return 0;
    var date = new Date(endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T23:59:59' : value);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function formatDate(value) {
    if (!value) return '';
    var date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T00:00:00' : value);
    return isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: /^\d{4}-\d{2}-\d{2}$/.test(value) ? undefined : '2-digit', minute: /^\d{4}-\d{2}-\d{2}$/.test(value) ? undefined : '2-digit' });
  }

  function dueState(todo) {
    if (!todo || todo.status !== 'open') return '';
    var current = Date.now();
    var due = dateTimeValue(todo.dueAt, true);
    if (due && due < current) return 'overdue';
    if (due && due - current <= 3 * 24 * 60 * 60 * 1000) return 'due-soon';
    return '';
  }

  function reminderIsDue(todo) {
    return !!(todo && todo.status === 'open' && todo.reminderAt && dateTimeValue(todo.reminderAt, false) <= Date.now());
  }

  function TodoView() {}

  TodoView.mount = function (containerEl, props, api) {
    injectStyles();
    containerEl.innerHTML = '';
    containerEl.className = 'todo-root';
    containerEl.setAttribute('data-plugin-id', PLUGIN_ID);

    var scope = scopeFromProps(props || {});
    var todos = [];
    var workspaceOptions = [];
    var statusFilter = 'all';
    var workspaceFilter = '';
    var sortMode = 'due';
    var searchQuery = '';
    var statusText = '';
    var statusClass = '';

    function tr(key, params, fallback) {
      if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
      return fallback || key;
    }

    var toolbar = el('div', { className: 'todo-toolbar' });
    var titleEl = el('span', { className: 'todo-title', textContent: scope.mode === 'global' ? tr('ui.title', null, 'Todos') : tr('ui.workspaceTitle', { workspace: scope.label }, 'Todos · ' + scope.label) });
    var countEl = el('span', { className: 'todo-count' });
    var statusEl = el('span', { className: 'todo-status' });
    var filtersEl = el('div', { className: 'todo-filters' });
    var statusFilterEl = el('select', {
      className: 'todo-select',
      'data-todo-filter': 'status',
      onChange: function (event) {
        statusFilter = cleanStatusFilter(event.target.value);
        render();
      }
    }, [
      option('all', tr('ui.allStatuses', null, 'All statuses')),
      option('open', tr('ui.status.open', null, 'Open')),
      option('done', tr('ui.status.done', null, 'Done')),
      option('cancelled', tr('ui.status.cancelled', null, 'Cancelled'))
    ]);
    var workspaceFilterEl = el('select', {
      className: 'todo-select',
      'data-todo-filter': 'workspace',
      onChange: function (event) {
        workspaceFilter = cleanWorkspace(event.target.value);
        render();
      }
    });
    var sortEl = el('select', {
      className: 'todo-select',
      'data-todo-filter': 'sort',
      onChange: function (event) {
        sortMode = text(event.target.value) || 'due';
        render();
      }
    }, [
      option('due', tr('ui.sort.due', null, 'Sort by due date')),
      option('reminder', tr('ui.sort.reminder', null, 'Sort by reminder')),
      option('updated', tr('ui.sort.updated', null, 'Sort by updated'))
    ]);
    var searchInput = el('input', {
      className: 'todo-input search',
      type: 'search',
      placeholder: tr('ui.search', null, 'Search todos'),
      'data-todo-filter': 'search',
      onInput: function (event) {
        searchQuery = text(event.target.value).trim().toLowerCase();
        render();
      }
    });
    var addBtn = el('button', {
      className: 'todo-btn primary',
      type: 'button',
      'data-todo-action': 'add',
      textContent: tr('ui.add', null, 'Add Todo'),
      onClick: function () { showTodoModal(null); }
    });
    var listEl = el('div', { className: 'todo-list' });
    var modalHost = el('div', { className: 'todo-modal-host', hidden: 'hidden' });

    toolbar.appendChild(titleEl);
    toolbar.appendChild(countEl);
    filtersEl.appendChild(statusFilterEl);
    if (scope.mode === 'global') filtersEl.appendChild(workspaceFilterEl);
    filtersEl.appendChild(sortEl);
    filtersEl.appendChild(searchInput);
    toolbar.appendChild(filtersEl);
    toolbar.appendChild(el('span', { className: 'todo-spacer' }));
    toolbar.appendChild(statusEl);
    toolbar.appendChild(addBtn);
    containerEl.appendChild(toolbar);
    containerEl.appendChild(listEl);
    containerEl.appendChild(modalHost);

    function option(value, label) {
      return el('option', { value: value, textContent: label });
    }

    function cleanStatusFilter(value) {
      value = text(value).trim().toLowerCase();
      return value === 'all' || STATUS_VALUES.indexOf(value) !== -1 ? value : 'all';
    }

    function workspaceRoots() {
      var roots = workspaceOptions.slice();
      todos.forEach(function (todo) {
        var workspace = cleanWorkspace(todo.workspaceRootPath);
        if (workspace && roots.indexOf(workspace) === -1) roots.push(workspace);
      });
      if (scope.workspaceRoot && roots.indexOf(scope.workspaceRoot) === -1) roots.push(scope.workspaceRoot);
      return roots.sort(function (a, b) { return a.localeCompare(b, undefined, { sensitivity: 'base' }); });
    }

    function renderWorkspaceFilterOptions() {
      if (scope.mode !== 'global') return;
      workspaceFilterEl.innerHTML = '';
      workspaceFilterEl.appendChild(option('', tr('ui.allWorkspaces', null, 'All workspaces')));
      workspaceFilterEl.appendChild(option('__unassigned__', tr('ui.unassigned', null, 'Unassigned')));
      workspaceRoots().forEach(function (workspace) {
        workspaceFilterEl.appendChild(option(workspace, workspace));
      });
      workspaceFilterEl.value = workspaceFilter;
    }

    function visibleTodos() {
      var filtered = todos.filter(function (todo) {
        var workspace = cleanWorkspace(todo.workspaceRootPath);
        if (scope.mode === 'workspace' && workspace !== scope.workspaceRoot) return false;
        if (scope.mode === 'global' && workspaceFilter === '__unassigned__' && workspace) return false;
        if (scope.mode === 'global' && workspaceFilter && workspaceFilter !== '__unassigned__' && workspace !== workspaceFilter) return false;
        if (statusFilter !== 'all' && todo.status !== statusFilter) return false;
        if (!searchQuery) return true;
        return [todo.title, todo.description, todo.workspaceRootPath].join('\n').toLowerCase().indexOf(searchQuery) !== -1;
      });
      return filtered.sort(function (a, b) {
        if (sortMode === 'updated') return text(b.updatedAt).localeCompare(text(a.updatedAt));
        var aValue = dateTimeValue(sortMode === 'reminder' ? a.reminderAt : a.dueAt, sortMode !== 'reminder') || Number.MAX_SAFE_INTEGER;
        var bValue = dateTimeValue(sortMode === 'reminder' ? b.reminderAt : b.dueAt, sortMode !== 'reminder') || Number.MAX_SAFE_INTEGER;
        return aValue - bValue || text(b.updatedAt).localeCompare(text(a.updatedAt));
      });
    }

    function notificationRequests() {
      return sortTodos(todos).filter(function (todo) {
        return todo.status === 'open' && todo.reminderAt;
      }).map(function (todo) {
        var dueAt = new Date(todo.reminderAt);
        if (isNaN(dueAt.getTime())) return null;
        var title = todo.title || tr('ui.untitled', null, 'Untitled todo');
        return {
          id: todo.id,
          dueAt: dueAt.toISOString(),
          title: tr('ui.notificationTitle', null, 'Todo reminder'),
          body: tr('ui.notificationBody', { title: title }, title)
        };
      }).filter(function (item) { return item !== null; });
    }

    function syncNotifications() {
      if (!api || !api.notifications || typeof api.notifications.replace !== 'function') return Promise.resolve();
      return api.notifications.replace(notificationRequests()).catch(function (err) {
        statusText = tr('ui.notificationError', { error: err && err.message ? err.message : String(err) }, 'Could not schedule reminders: ' + (err && err.message ? err.message : String(err)));
        statusClass = 'error';
      });
    }

    function persist() {
      if (!api || !api.settings || typeof api.settings.write !== 'function') return syncNotifications();
      return api.settings.write(GLOBAL_KEY, storageTodos(sortTodos(todos))).then(function () {
        return syncNotifications();
      }).catch(function (err) {
        statusText = tr('ui.saveError', { error: err && err.message ? err.message : String(err) }, 'Could not save todos: ' + (err && err.message ? err.message : String(err)));
        statusClass = 'error';
      });
    }

    function loadStored() {
      if (!api || !api.settings || typeof api.settings.read !== 'function') return syncNotifications();
      return api.settings.read().then(function (settings) {
        todos = sortTodos(normalizeTodos((settings || {})[GLOBAL_KEY]));
        return syncNotifications();
      }).catch(function (err) {
        statusText = tr('ui.loadError', { error: err && err.message ? err.message : String(err) }, 'Could not load todos: ' + (err && err.message ? err.message : String(err)));
        statusClass = 'error';
      });
    }

    function loadWorkspaceOptions() {
      if (!api || !api.files || typeof api.files.list !== 'function') return Promise.resolve();
      return api.files.list('').then(function (entries) {
        workspaceOptions = (Array.isArray(entries) ? entries : []).filter(function (entry) {
          return text(entry && entry.type).toLowerCase() === 'folder';
        }).map(function (entry) {
          return cleanWorkspace(entry.relativePath || entry.name);
        }).filter(function (workspace) {
          return workspace && workspace.indexOf('/') === -1;
        });
      }).catch(function () {
        workspaceOptions = [];
      });
    }

    function closeTodoModal() {
      modalHost.innerHTML = '';
      modalHost.setAttribute('hidden', 'hidden');
    }

    function showTodoModal(existingTodo) {
      var editing = !!existingTodo;
      var titleInput = el('input', { className: 'todo-input', type: 'text', value: editing ? existingTodo.title : '', placeholder: tr('ui.titlePlaceholder', null, 'Todo title'), 'data-todo-input': 'title' });
      var descriptionInput = el('textarea', { className: 'todo-input textarea', placeholder: tr('ui.descriptionPlaceholder', null, 'Optional description'), 'data-todo-input': 'description' });
      descriptionInput.value = editing ? existingTodo.description : '';
      var priorityInput = el('select', { className: 'todo-select', 'data-todo-input': 'priority' }, [option('low', tr('ui.priority.low', null, 'Low')), option('normal', tr('ui.priority.normal', null, 'Normal')), option('high', tr('ui.priority.high', null, 'High'))]);
      priorityInput.value = editing ? existingTodo.priority : 'normal';
      var dueInput = el('input', { className: 'todo-input', type: 'date', value: editing ? existingTodo.dueAt : '', 'data-todo-input': 'dueAt' });
      var reminder = splitReminderDateTime(editing ? existingTodo.reminderAt : '');
      var reminderDateInput = el('input', { className: 'todo-input', type: 'date', value: reminder.date, 'data-todo-input': 'reminderDate' });
      var reminderTimeInput = el('input', { className: 'todo-input', type: 'time', value: reminder.time, 'data-todo-input': 'reminderTime' });
      var workspaceInput = null;
      var workspace = editing ? existingTodo.workspaceRootPath : scope.workspaceRoot;
      if (scope.mode === 'global') {
        workspaceInput = el('select', { className: 'todo-select', 'data-todo-input': 'workspaceRootPath' });
        workspaceInput.appendChild(option('', tr('ui.unassigned', null, 'Unassigned')));
        workspaceRoots().forEach(function (workspaceRoot) {
          workspaceInput.appendChild(option(workspaceRoot, workspaceRoot));
        });
        workspaceInput.value = workspace || '';
      }

      function saveTodo() {
        var title = text(titleInput.value).trim();
        if (!title) {
          statusText = tr('ui.titleRequired', null, 'Title is required');
          statusClass = 'error';
          render();
          return;
        }
        var workspaceRoot = scope.mode === 'workspace' ? scope.workspaceRoot : cleanWorkspace(workspaceInput && workspaceInput.value);
        var timestamp = now();
        var next = normalizeTodo({
          id: editing ? existingTodo.id : todoId(workspaceRoot, title),
          title: title,
          description: descriptionInput.value,
          workspaceRootPath: workspaceRoot,
          workspaceName: workspaceRoot,
          status: editing ? existingTodo.status : 'open',
          priority: priorityInput.value,
          dueAt: dueInput.value,
          reminderAt: joinReminderDateTime(reminderDateInput.value, reminderTimeInput.value),
          createdAt: editing ? existingTodo.createdAt : timestamp,
          updatedAt: timestamp,
          completedAt: editing ? existingTodo.completedAt : '',
          sourceUrl: editing ? existingTodo.sourceUrl : '',
          linkedJournalEntryId: editing ? existingTodo.linkedJournalEntryId : ''
        });
        if (editing) {
          todos = todos.map(function (todo) { return todo.id === existingTodo.id ? next : todo; });
        } else {
          todos = [next].concat(todos);
        }
        todos = sortTodos(todos);
        if (workspaceRoot && workspaceOptions.indexOf(workspaceRoot) === -1) workspaceOptions.push(workspaceRoot);
        closeTodoModal();
        statusText = editing ? tr('ui.updated', null, 'Todo updated') : tr('ui.added', null, 'Todo added');
        statusClass = '';
        persist().then(render);
      }

      var fields = [
        el('label', { className: 'todo-field wide' }, [tr('ui.field.title', null, 'Title'), titleInput]),
        el('label', { className: 'todo-field wide' }, [tr('ui.field.description', null, 'Description'), descriptionInput]),
        el('label', { className: 'todo-field' }, [tr('ui.field.priority', null, 'Priority'), priorityInput]),
        el('label', { className: 'todo-field' }, [tr('ui.field.due', null, 'Due date'), dueInput]),
        el('label', { className: 'todo-field' }, [tr('ui.field.reminderDate', null, 'Reminder date'), reminderDateInput]),
        el('label', { className: 'todo-field' }, [tr('ui.field.reminderTime', null, 'Reminder time'), reminderTimeInput])
      ];
      if (workspaceInput) fields.push(el('label', { className: 'todo-field' }, [tr('ui.field.workspace', null, 'Workspace'), workspaceInput]));
      else fields.push(el('div', { className: 'todo-field', textContent: tr('ui.workspaceValue', { workspace: scope.workspaceRoot }, 'Workspace: ' + scope.workspaceRoot) }));

      modalHost.innerHTML = '';
      if (typeof modalHost.removeAttribute === 'function') modalHost.removeAttribute('hidden');
      modalHost.appendChild(el('div', { className: 'todo-modal-overlay', onClick: function (event) {
        if (event.target === event.currentTarget) closeTodoModal();
      } }, [
        el('div', { className: 'todo-modal' }, [
          el('div', { className: 'todo-modal-title', textContent: editing ? tr('ui.edit', null, 'Edit Todo') : tr('ui.add', null, 'Add Todo') }),
          el('div', { className: 'todo-form-grid' }, fields),
          el('div', { className: 'todo-modal-actions' }, [
            el('button', { className: 'todo-btn', type: 'button', textContent: tr('ui.cancel', null, 'Cancel'), onClick: closeTodoModal }),
            el('button', { className: 'todo-btn primary', type: 'button', 'data-todo-action': 'save', textContent: editing ? tr('ui.saveChanges', null, 'Save changes') : tr('ui.add', null, 'Add Todo'), onClick: saveTodo })
          ])
        ])
      ]));
      titleInput.focus && titleInput.focus();
    }

    function setTodoStatus(todo, nextStatus) {
      var timestamp = now();
      todos = todos.map(function (item) {
        if (item.id !== todo.id) return item;
        return Object.assign({}, item, {
          status: nextStatus,
          completedAt: nextStatus === 'done' ? timestamp : '',
          updatedAt: timestamp
        });
      });
      statusText = nextStatus === 'done' ? tr('ui.markedDone', null, 'Todo marked done') : (nextStatus === 'cancelled' ? tr('ui.cancelled', null, 'Todo cancelled') : tr('ui.reopened', null, 'Todo reopened'));
      statusClass = '';
      persist().then(render);
    }

    function deleteTodo(todo) {
      todos = todos.filter(function (item) { return item.id !== todo.id; });
      statusText = tr('ui.deleted', null, 'Todo deleted');
      statusClass = '';
      persist().then(render);
    }

    function openWorkspace(todo) {
      var workspaceRoot = cleanWorkspace(todo && todo.workspaceRootPath);
      if (!workspaceRoot || typeof window === 'undefined' || typeof window.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return;
      window.dispatchEvent(new CustomEvent('verstak:workspace-selected', { detail: { workspaceName: workspaceRoot } }));
      window.dispatchEvent(new CustomEvent('verstak:workspace-open-tool', { detail: { kind: 'todo' } }));
    }

    function createJournalEntry(todo) {
      if (!todo || todo.status !== 'done' || scope.mode !== 'workspace') return;
      if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return;
      window.dispatchEvent(new CustomEvent('verstak:workspace-open-tool', {
        detail: {
          kind: 'journal',
          toolRequest: {
            type: 'completed-todo',
            todo: {
              id: todo.id,
              title: todo.title,
              description: todo.description,
              workspaceRootPath: scope.workspaceRoot,
              completedAt: todo.completedAt
            }
          }
        }
      }));
    }

    function renderTodoMeta(todo) {
      var meta = [];
      var workspace = cleanWorkspace(todo.workspaceRootPath);
      var due = dueState(todo);
      var reminderDue = reminderIsDue(todo);
      if (scope.mode === 'global') meta.push(el('span', { className: 'todo-badge', textContent: workspace || tr('ui.unassigned', null, 'Unassigned') }));
      meta.push(el('span', { className: 'todo-badge ' + todo.priority, textContent: tr('ui.priorityValue', { priority: tr('ui.priority.' + todo.priority, null, todo.priority) }, todo.priority + ' priority') }));
      meta.push(el('span', { className: 'todo-badge', textContent: tr('ui.status.' + todo.status, null, todo.status) }));
      if (todo.dueAt) meta.push(el('span', { className: 'todo-badge ' + due, textContent: tr('ui.dueValue', { prefix: due === 'overdue' ? tr('ui.overduePrefix', null, 'Overdue · ') : (due === 'due-soon' ? tr('ui.dueSoonPrefix', null, 'Due soon · ') : ''), date: formatDate(todo.dueAt) }, (due === 'overdue' ? 'Overdue · ' : (due === 'due-soon' ? 'Due soon · ' : '')) + 'Due ' + formatDate(todo.dueAt)) }));
      if (todo.reminderAt) meta.push(el('span', { className: 'todo-badge ' + (reminderDue ? 'reminder-due' : ''), textContent: tr(reminderDue ? 'ui.reminderDueValue' : 'ui.reminderValue', { date: formatDate(todo.reminderAt) }, (reminderDue ? 'Reminder due ' : 'Reminder ') + formatDate(todo.reminderAt)) }));
      return el('div', { className: 'todo-row-meta' }, meta);
    }

    function renderList() {
      listEl.innerHTML = '';
      var visible = visibleTodos();
      if (!visible.length) {
        listEl.appendChild(el('div', {
          className: 'todo-empty',
          textContent: todos.length ? tr('ui.noMatches', null, 'No todos match the current filters.') : tr('ui.empty', null, 'No todos yet.')
        }));
        return;
      }
      visible.forEach(function (todo) {
        var actionButtons = [];
        if (scope.mode === 'global' && todo.workspaceRootPath) {
          actionButtons.push(el('button', { className: 'todo-btn', type: 'button', 'data-todo-action': 'open-workspace', textContent: tr('ui.openWorkspace', null, 'Open workspace'), onClick: function () { openWorkspace(todo); } }));
        }
        if (todo.status === 'open') {
          actionButtons.push(el('button', { className: 'todo-btn', type: 'button', 'data-todo-action': 'mark-done', textContent: tr('ui.status.done', null, 'Done'), onClick: function () { setTodoStatus(todo, 'done'); } }));
          actionButtons.push(el('button', { className: 'todo-btn', type: 'button', 'data-todo-action': 'cancel', textContent: tr('ui.cancel', null, 'Cancel'), onClick: function () { setTodoStatus(todo, 'cancelled'); } }));
        } else {
          actionButtons.push(el('button', { className: 'todo-btn', type: 'button', 'data-todo-action': 'reopen', textContent: tr('ui.reopen', null, 'Reopen'), onClick: function () { setTodoStatus(todo, 'open'); } }));
        }
        if (scope.mode === 'workspace' && todo.status === 'done') {
          actionButtons.push(el('button', { className: 'todo-btn', type: 'button', 'data-todo-action': 'create-journal-entry', textContent: tr('ui.createJournal', null, 'Create Journal Entry'), onClick: function () { createJournalEntry(todo); } }));
        }
        actionButtons.push(el('button', { className: 'todo-btn', type: 'button', 'data-todo-action': 'edit', textContent: tr('ui.editAction', null, 'Edit'), onClick: function () { showTodoModal(todo); } }));
        actionButtons.push(el('button', { className: 'todo-btn danger', type: 'button', 'data-todo-action': 'delete', textContent: tr('ui.delete', null, 'Delete'), onClick: function () { deleteTodo(todo); } }));
        listEl.appendChild(el('div', { className: 'todo-row' + (todo.status === 'done' ? ' done' : ''), 'data-todo-id': todo.id }, [
          el('div', { className: 'todo-row-main' }, [
            el('div', { className: 'todo-row-head' }, [
              el('div', { className: 'todo-row-title', textContent: todo.title || tr('ui.untitled', null, 'Untitled todo') })
            ]),
            todo.description ? el('div', { className: 'todo-row-description', textContent: todo.description }) : null,
            renderTodoMeta(todo)
          ]),
          el('div', { className: 'todo-row-actions' }, actionButtons)
        ]));
      });
    }

    function render() {
      var visible = visibleTodos();
      countEl.textContent = visible.length === todos.length
        ? tr('ui.count', { count: todos.length }, todos.length + ' todo' + (todos.length === 1 ? '' : 's'))
        : tr('ui.filteredCount', { visible: visible.length, count: todos.length }, visible.length + ' of ' + todos.length + ' todos');
      statusFilterEl.value = statusFilter;
      sortEl.value = sortMode;
      searchInput.value = searchQuery;
      renderWorkspaceFilterOptions();
      statusEl.textContent = statusText;
      statusEl.className = 'todo-status' + (statusClass ? ' ' + statusClass : '');
      renderList();
    }

    render();
    Promise.all([loadStored(), loadWorkspaceOptions()]).then(function () {
      render();
    });
    if (api && api.i18n && typeof api.i18n.onDidChangeLocale === 'function') {
      api.i18n.onDidChangeLocale(function () {
        titleEl.textContent = scope.mode === 'global' ? tr('ui.title', null, 'Todos') : tr('ui.workspaceTitle', { workspace: scope.label }, 'Todos · ' + scope.label);
        searchInput.setAttribute('placeholder', tr('ui.search', null, 'Search todos'));
        addBtn.textContent = tr('ui.add', null, 'Add Todo');
        render();
        syncNotifications().then(render);
      });
    }
  };

  TodoView.unmount = function (containerEl) {
    if (containerEl) containerEl.innerHTML = '';
  };

  window.VerstakPluginRegister(PLUGIN_ID, {
    components: {
      TodoView: TodoView
    }
  });
})();
