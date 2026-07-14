/* ===========================================================
   Journal Plugin - Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  var PLUGIN_ID = 'verstak.journal';
  var WORKLOG_PREFIX = 'worklog:workspace:';

  function injectStyles() {
    if (document.getElementById('journal-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'journal-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  var STYLES = [
    '.journal-root{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--vt-color-background,#101020);color:var(--vt-color-text-primary,#f4f7fb);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '.journal-toolbar{display:flex;align-items:center;gap:.5rem;min-height:2.75rem;padding:.55rem .75rem;border-bottom:1px solid var(--vt-color-border,#202b46);background:var(--vt-color-surface-muted,#111629);flex-shrink:0;flex-wrap:wrap}',
    '.journal-title{font-size:.86rem;font-weight:600}',
    '.journal-count{font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.journal-spacer{flex:1}',
    '.journal-btn{font-size:.78rem;padding:.36rem .65rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-secondary,#b7c0d4);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:.35rem}',
    '.journal-btn svg{width:14px;height:14px;display:block;fill:currentColor}',
    '.journal-btn:hover{border-color:var(--vt-color-accent,#4ecca3);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.journal-btn:disabled{opacity:.45;cursor:default}',
    '.journal-status{font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.journal-status.error{display:inline-flex;border:1px solid rgba(233,69,96,.45);border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-danger-muted,rgba(233,69,96,.14));color:#ffc6ce;padding:.18rem .4rem}',
    '.journal-input{font-size:.8rem;padding:.38rem .5rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:#0f1424;color:var(--vt-color-text-primary,#f4f7fb);min-width:0;font-family:inherit}',
    '.journal-input.textarea{min-height:7rem;resize:vertical;line-height:1.4}',
    '.journal-input.journal-select{appearance:none;background-color:#0f1424;background-image:linear-gradient(45deg,transparent 50%,var(--vt-color-text-muted,#7f8aa3) 50%),linear-gradient(135deg,var(--vt-color-text-muted,#7f8aa3) 50%,transparent 50%);background-position:calc(100% - 14px) 50%,calc(100% - 9px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;padding-right:1.7rem}.journal-input.journal-select option{background:#0f1424;color:var(--vt-color-text-primary,#f4f7fb)}',
    '.journal-input:focus{outline:none;border-color:var(--vt-color-accent,#4ecca3);box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34))}',
    '.journal-billable{display:flex;align-items:center;gap:.25rem;font-size:.74rem;color:var(--vt-color-text-secondary,#b7c0d4);white-space:nowrap}',
    '.journal-list{flex:1;min-height:0;overflow:auto;background:var(--vt-color-background,#101020)}',
    '.journal-empty{height:100%;display:flex;align-items:center;justify-content:center;color:var(--vt-color-text-muted,#7f8aa3);font-size:.86rem;padding:2rem;text-align:center}',
    '.journal-row{display:grid;grid-template-columns:8rem minmax(0,1fr) auto auto;gap:.7rem;margin:.5rem .75rem 0;padding:.75rem .85rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c);align-items:start}',
    '.journal-row:hover{background:var(--vt-color-surface-hover,#1b2440)}',
    '.journal-date{font-size:.75rem;color:var(--vt-color-text-muted,#7f8aa3);white-space:nowrap}',
    '.journal-main{min-width:0}',
    '.journal-entry-title{font-size:.88rem;color:var(--vt-color-text-primary,#f4f7fb);font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.journal-summary{margin-top:.25rem;font-size:.78rem;line-height:1.4;color:var(--vt-color-text-secondary,#b7c0d4);white-space:pre-wrap;overflow-wrap:anywhere}',
    '.journal-meta{margin-top:.25rem;font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.journal-minutes{font-size:.78rem;color:var(--vt-color-accent,#4ecca3);white-space:nowrap}',
    '.journal-row-actions{display:flex;gap:.25rem}',
    '.journal-icon-btn{width:1.65rem;height:1.65rem;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-sm,4px);background:transparent;color:var(--vt-color-text-muted,#7f8aa3);cursor:pointer;padding:0}',
    '.journal-icon-btn:hover{background:var(--vt-color-surface-hover,#1b2440);border-color:var(--vt-color-accent,#4ecca3);color:var(--vt-color-accent,#4ecca3)}',
    '.journal-icon-btn.danger:hover{border-color:rgba(233,69,96,.65);color:var(--vt-color-danger,#e94560)}',
    '.journal-icon-btn svg{width:14px;height:14px;display:block;fill:currentColor}',
    '.journal-modal-host[hidden]{display:none}',
    '.journal-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.58);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem}',
    '.journal-modal{width:520px;max-width:96vw;display:grid;gap:.75rem;padding:1rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c);box-shadow:0 18px 44px rgba(0,0,0,.38)}',
    '.journal-modal-title{font-size:.95rem;font-weight:650;color:var(--vt-color-text-primary,#f4f7fb)}',
    '.journal-modal-grid{display:grid;grid-template-columns:1fr 8rem;gap:.6rem}',
    '.journal-field{display:grid;gap:.3rem;font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.journal-field.wide{grid-column:1/-1}',
    '.journal-candidate-context{display:grid;gap:.22rem;padding:.65rem .7rem;border:1px solid rgba(78,204,163,.34);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface-muted,#111629);font-size:.76rem;color:var(--vt-color-text-secondary,#b7c0d4)}',
    '.journal-candidate-context strong{color:var(--vt-color-text-primary,#f4f7fb)}',
    '.journal-candidate-activities{display:grid;gap:.35rem;margin:0;padding:.65rem .7rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-md,6px);font-size:.74rem;color:var(--vt-color-text-secondary,#b7c0d4)}',
    '.journal-candidate-activities legend{padding:0 .2rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.journal-candidate-activity{display:flex;align-items:flex-start;gap:.45rem;line-height:1.35;overflow-wrap:anywhere}',
    '.journal-modal-actions{display:flex;justify-content:flex-end;gap:.5rem}',
    '.journal-btn.primary{background:var(--vt-color-accent,#4ecca3);border-color:var(--vt-color-accent,#4ecca3);color:#101827}',
    '.journal-btn.ghost{background:transparent}',
    '@media(max-width:820px){.journal-row{grid-template-columns:1fr}.journal-btn{width:100%}.journal-toolbar{align-items:stretch}.journal-status{width:100%}.journal-modal-grid{grid-template-columns:1fr}}'
  ].join('\n');

  function el(tag, attrs, children) {
    var elem = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (attrs[key] == null) return;
        if (key === 'className') elem.className = attrs[key];
        else if (key === 'innerHTML') elem.innerHTML = attrs[key];
        else if (key === 'textContent') elem.textContent = attrs[key];
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

  function encodeKey(value) {
    return encodeURIComponent(text(value).trim());
  }

  function workspaceFromProps(props) {
    var node = props && props.workspaceNode;
    return cleanWorkspace((props && (props.workspaceRootPath || props.workspaceName || props.workspaceNodeId))
      || (node && (node.rootPath || node.name || node.id)));
  }

  function scopeFromProps(props) {
    var workspaceRoot = workspaceFromProps(props || {});
    if (!workspaceRoot) return { mode: 'global', key: '', label: 'All Deals', workspaceRoot: '' };
    return {
      mode: 'workspace',
      key: WORKLOG_PREFIX + encodeKey(workspaceRoot),
      label: workspaceRoot,
      workspaceRoot: workspaceRoot
    };
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function normalizeEntry(value, storageKey) {
    value = value || {};
    return {
      entryId: text(value.entryId || ('entry:' + Date.now())),
      workspaceRootPath: cleanWorkspace(value.workspaceRootPath || decodeWorkspaceKey(storageKey)),
      date: text(value.date || today()).slice(0, 10),
      title: text(value.title || 'Worklog entry'),
      summary: text(value.summary),
      minutes: Math.max(0, Number(value.minutes || 0)),
      billable: value.billable === true,
      sourceCandidateId: text(value.sourceCandidateId || value.sourceSuggestionId),
      sourceTodoId: text(value.sourceTodoId),
      activityIds: Array.isArray(value.activityIds)
        ? value.activityIds.map(text)
        : (Array.isArray(value.eventIds) ? value.eventIds.map(text) : [])
    };
  }

  function decodeWorkspaceKey(key) {
    if (!key || key.indexOf(WORKLOG_PREFIX) !== 0) return '';
    try {
      return decodeURIComponent(key.slice(WORKLOG_PREFIX.length));
    } catch (err) {
      return key.slice(WORKLOG_PREFIX.length);
    }
  }

  function normalizeEntries(value, storageKey) {
    if (!Array.isArray(value)) return [];
    return value.map(function (item) { return normalizeEntry(item, storageKey); });
  }

  function storageEntries(entryList) {
    return entryList.map(function (entry) {
      return {
        entryId: entry.entryId,
        workspaceRootPath: entry.workspaceRootPath,
        date: entry.date,
        title: entry.title,
        summary: entry.summary,
        minutes: entry.minutes,
        billable: entry.billable,
        sourceCandidateId: entry.sourceCandidateId,
        sourceTodoId: entry.sourceTodoId,
        activityIds: entry.activityIds || []
      };
    });
  }

  function sortEntries(entryList) {
    var seen = {};
    return entryList.filter(function (entry) {
      var key = entry.sourceCandidateId
        ? 'candidate:' + entry.sourceCandidateId
        : (entry.sourceTodoId ? 'todo:' + entry.sourceTodoId : 'entry:' + entry.entryId);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    }).slice().sort(function (a, b) {
      return text(b.date).localeCompare(text(a.date)) || text(b.entryId).localeCompare(text(a.entryId));
    });
  }

  function worklogKeys(settings) {
    return Object.keys(settings || {}).filter(function (key) {
      return key.indexOf(WORKLOG_PREFIX) === 0;
    });
  }

  function entryId(workspaceRoot, date, title) {
    return 'journal:' + cleanWorkspace(workspaceRoot || 'Global') + ':' + text(date) + ':' + encodeKey(title).slice(0, 48) + ':' + Date.now();
  }

  function candidateDate(value) {
    var date = new Date(value || '');
    return isNaN(date.getTime()) ? today() : date.toISOString().slice(0, 10);
  }

  function candidateTime(value) {
    var date = new Date(value || '');
    if (isNaN(date.getTime())) return text(value);
    return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function candidateFromRequest(request, workspaceRoot) {
    var value = request && request.type === 'work-session-candidate' ? request.candidate : null;
    if (!value || typeof value !== 'object') return null;
    var workspace = cleanWorkspace(value.workspaceRootPath);
    if (!workspace || workspace !== cleanWorkspace(workspaceRoot) || !text(value.candidateId).trim()) return null;
    var activities = Array.isArray(value.activities) ? value.activities.filter(function (activity) {
      return activity && text(activity.activityId).trim();
    }).map(function (activity) {
      return {
        activityId: text(activity.activityId),
        type: text(activity.type || 'activity.event'),
        occurredAt: text(activity.occurredAt),
        sourcePluginId: text(activity.sourcePluginId)
      };
    }) : [];
    var activityIds = Array.isArray(value.activityIds) ? value.activityIds.map(text).filter(Boolean) : activities.map(function (activity) { return activity.activityId; });
    if (!activities.length) {
      activities = activityIds.map(function (activityId) {
        return { activityId: activityId, type: 'activity.event', occurredAt: '', sourcePluginId: '' };
      });
    }
    return {
      candidateId: text(value.candidateId),
      sessionId: text(value.sessionId),
      handledThrough: text(value.handledThrough || value.endedAt),
      workspaceRootPath: workspace,
      startedAt: text(value.startedAt),
      endedAt: text(value.endedAt),
      estimatedMinutes: Math.max(0, Number(value.estimatedMinutes || 0)),
      activityCount: Math.max(0, Number(value.activityCount || activities.length)),
      activityIds: activityIds,
      activities: activities
    };
  }

  function completedTodoFromRequest(request, workspaceRoot) {
    var value = request && request.type === 'completed-todo' ? request.todo : null;
    if (!value || typeof value !== 'object') return null;
    var workspace = cleanWorkspace(value.workspaceRootPath);
    var todoId = text(value.id).trim();
    var title = text(value.title).trim();
    if (!todoId || !title || !workspace || workspace !== cleanWorkspace(workspaceRoot)) return null;
    return {
      id: todoId,
      title: title,
      description: text(value.description || value.body),
      workspaceRootPath: workspace,
      completedAt: text(value.completedAt)
    };
  }

  var ICONS = {
    add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5-1-1h-5l-1 1H5v2h14V4z'
  };

  function iconSvg(name) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (ICONS[name] || ICONS.edit) + '" fill="currentColor"/></svg>';
  }

  function JournalView() {}

  JournalView.mount = function (containerEl, props, api) {
    injectStyles();
    containerEl.innerHTML = '';
    containerEl.className = 'journal-root';
    containerEl.setAttribute('data-plugin-id', PLUGIN_ID);

    var scope = scopeFromProps(props || {});
    var entries = [];
    var workspaceOptions = [];
    function tr(key, params, fallback) {
      if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
      return fallback || key;
    }
    var statusText = tr('ui.loading', null, 'Loading journal...');
    var statusClass = '';
    var modalHost = el('div', { className: 'journal-modal-host', hidden: 'hidden' });

    function reportError(key, fallback, err) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('[verstak.journal] ' + key, err);
      }
      statusText = tr(key, null, fallback);
      statusClass = 'error';
    }

    var toolbar = el('div', { className: 'journal-toolbar' });
    var titleEl = el('span', { className: 'journal-title', textContent: scope.mode === 'global' ? tr('ui.title', null, 'Journal') : tr('ui.workspaceTitle', { workspace: scope.label }, 'Journal · ' + scope.label) });
    var countEl = el('span', { className: 'journal-count' });
    var statusEl = el('span', { className: 'journal-status' });
    var addBtn = el('button', {
      className: 'journal-btn primary',
      'data-journal-action': 'add',
      innerHTML: iconSvg('add') + '<span>' + tr('ui.add', null, 'Add') + '</span>',
      onClick: function () { showEntryModal(); }
    });
    toolbar.appendChild(titleEl);
    toolbar.appendChild(countEl);
    toolbar.appendChild(el('span', { className: 'journal-spacer' }));
    toolbar.appendChild(statusEl);
    toolbar.appendChild(addBtn);

    var listEl = el('div', { className: 'journal-list' });
    containerEl.appendChild(toolbar);
    containerEl.appendChild(listEl);
    containerEl.appendChild(modalHost);

    function persist(workspaceRoot, values) {
      if (!api || !api.settings || typeof api.settings.write !== 'function') return Promise.resolve();
      var target = cleanWorkspace(workspaceRoot || scope.workspaceRoot);
      if (!target) return Promise.resolve();
      return api.settings.write(WORKLOG_PREFIX + encodeKey(target), storageEntries(values || entries)).catch(function (err) {
        reportError('ui.saveError', 'Could not save journal. Please try again.', err);
      });
    }

    function loadWorkspaceOptions() {
      if (!api || !api.files || typeof api.files.list !== 'function') return Promise.resolve();
      return api.files.list('').then(function (items) {
        workspaceOptions = (Array.isArray(items) ? items : []).filter(function (item) {
          return text(item && item.type).toLowerCase() === 'folder';
        }).map(function (item) { return cleanWorkspace(item.relativePath || item.name); }).filter(function (value) {
          return value && value.indexOf('/') === -1;
        });
      });
    }

    function loadStored() {
      if (!api || !api.settings || typeof api.settings.read !== 'function') return Promise.resolve();
      if (scope.mode === 'global') {
        return api.settings.read().then(function (settings) {
          var all = [];
          worklogKeys(settings || {}).forEach(function (key) {
            all = all.concat(normalizeEntries((settings || {})[key], key));
          });
          entries = sortEntries(all);
          statusText = tr('ui.aggregating', null, 'Aggregating worklogs');
          statusClass = '';
        }).catch(function (err) {
          reportError('ui.loadError', 'Could not load journal. Please try again.', err);
        });
      }
      return api.settings.read(scope.key).then(function (stored) {
        entries = sortEntries(normalizeEntries(stored, scope.key));
        statusText = tr('ui.ready', null, 'Ready');
        statusClass = '';
      }).catch(function (err) {
        reportError('ui.loadError', 'Could not load journal. Please try again.', err);
      });
    }

    function closeEntryModal() {
      modalHost.innerHTML = '';
      modalHost.setAttribute('hidden', 'hidden');
    }

    function activityLabel(activity) {
      var type = text(activity && activity.type);
      var labels = {
        'browser.capture.link': ['ui.activity.captureLink', 'Link captured'],
        'browser.capture.selection': ['ui.activity.captureSelection', 'Selection captured'],
        'browser.capture.page': ['ui.activity.capturePage', 'Page captured'],
        'file.created': ['ui.activity.fileCreated', 'File created'],
        'file.updated': ['ui.activity.fileUpdated', 'File updated'],
        'file.deleted': ['ui.activity.fileDeleted', 'File deleted'],
        'note.saved': ['ui.activity.noteSaved', 'Note saved'],
        'workspace.created': ['ui.activity.dealCreated', 'Deal created'],
        'workspace.renamed': ['ui.activity.dealRenamed', 'Deal renamed']
      };
      var label = labels[type] || ['ui.activity.generic', 'Activity'];
      return tr(label[0], null, label[1]);
    }

    function entryMeta(entry) {
      var facts = [entry.workspaceRootPath, entry.billable ? tr('ui.meta.billable', null, 'billable') : tr('ui.meta.nonBillable', null, 'non-billable')];
      if (entry.activityIds.length) {
        facts.push(tr(entry.activityIds.length === 1 ? 'ui.meta.activities.one' : 'ui.meta.activities.many', { count: entry.activityIds.length }, entry.activityIds.length + ' linked activities'));
      }
      if (entry.sourceTodoId) facts.push(tr('ui.meta.todo', null, 'linked todo'));
      return facts.join(' · ');
    }

    function showEntryModal(existingEntry, candidate, completedTodo) {
      var editing = !!existingEntry;
      var reviewingCandidate = !editing && !!candidate;
      var reviewingTodo = !editing && !!completedTodo;
      var dateInput = el('input', { className: 'journal-input', type: 'date', value: editing ? existingEntry.date : (reviewingCandidate ? candidateDate(candidate.startedAt) : (reviewingTodo ? candidateDate(completedTodo.completedAt) : today())), 'data-journal-input': 'date' });
      var titleInput = el('input', { className: 'journal-input', type: 'text', placeholder: tr('ui.workItem', null, 'Work item'), value: editing ? existingEntry.title : (reviewingTodo ? completedTodo.title : ''), 'data-journal-input': 'title' });
      var summaryInput = el('textarea', { className: 'journal-input textarea', placeholder: tr('ui.body', null, 'Body'), 'data-journal-input': 'summary' });
      summaryInput.value = editing ? existingEntry.summary : (reviewingTodo ? completedTodo.description : '');
      var minutesInput = el('input', { className: 'journal-input', type: 'number', min: '0', step: '1', value: editing ? existingEntry.minutes : (reviewingCandidate ? candidate.estimatedMinutes : (reviewingTodo ? '0' : '30')), 'data-journal-input': 'minutes' });
      var billableInput = el('input', { type: 'checkbox', 'data-journal-input': 'billable' });
      billableInput.checked = editing ? existingEntry.billable === true : false;
      var workspaceInput = null;
      if (scope.mode === 'global') {
        workspaceInput = el('select', { className: 'journal-input journal-select', 'data-journal-input': 'workspaceRootPath' });
        workspaceOptions.forEach(function (workspace) {
          workspaceInput.appendChild(el('option', { value: workspace, textContent: workspace }));
        });
      }
      var activityInputs = reviewingCandidate ? candidate.activities.map(function (activity) {
        var input = el('input', { type: 'checkbox', value: activity.activityId, checked: 'checked', 'data-journal-candidate-activity': activity.activityId });
        input.checked = true;
        return { input: input, activity: activity };
      }) : [];

      function saveEntry() {
        addOrUpdateEntry(existingEntry, {
          date: dateInput.value || today(),
          title: titleInput.value,
          summary: summaryInput.value,
          minutes: minutesInput.value,
          billable: billableInput.checked === true,
          workspaceRootPath: workspaceInput ? workspaceInput.value : scope.workspaceRoot,
          sourceCandidateId: reviewingCandidate ? candidate.candidateId : (existingEntry ? existingEntry.sourceCandidateId : ''),
          sessionId: reviewingCandidate ? candidate.sessionId : '',
          handledThrough: reviewingCandidate ? candidate.handledThrough : '',
          sourceTodoId: reviewingTodo ? completedTodo.id : (existingEntry ? existingEntry.sourceTodoId : ''),
          activityIds: reviewingCandidate
            ? activityInputs.filter(function (item) { return item.input.checked === true; }).map(function (item) { return item.activity.activityId; })
            : (existingEntry ? existingEntry.activityIds : [])
        });
      }

      var candidateContext = reviewingCandidate ? el('div', { className: 'journal-candidate-context', 'data-journal-candidate': candidate.candidateId }, [
        el('strong', { textContent: tr('ui.candidate.title', null, 'Possible journal entry') }),
        el('div', { textContent: tr('ui.candidate.deal', { deal: candidate.workspaceRootPath }, 'Deal: ' + candidate.workspaceRootPath) }),
        el('div', { textContent: tr('ui.candidate.time', { start: candidateTime(candidate.startedAt), end: candidateTime(candidate.endedAt) }, 'Time: ' + candidateTime(candidate.startedAt) + ' – ' + candidateTime(candidate.endedAt)) }),
        el('div', { textContent: tr('ui.candidate.duration', { minutes: candidate.estimatedMinutes }, 'Estimated duration: ' + candidate.estimatedMinutes + ' min') }),
        el('div', { textContent: tr('ui.candidate.activities', { count: candidate.activityCount }, 'Activities: ' + candidate.activityCount) })
      ]) : null;
      var candidateActivities = reviewingCandidate ? el('fieldset', { className: 'journal-candidate-activities' }, [
        el('legend', { textContent: tr('ui.candidate.linkedActivities', null, 'Linked activities') })
      ].concat(activityInputs.map(function (item) {
        var detail = (item.activity.occurredAt ? candidateTime(item.activity.occurredAt) + ' · ' : '') + activityLabel(item.activity);
        return el('label', { className: 'journal-candidate-activity' }, [item.input, detail]);
      }))) : null;
      var todoContext = reviewingTodo ? el('div', { className: 'journal-candidate-context', 'data-journal-todo': completedTodo.id }, [
        el('strong', { textContent: tr('ui.todo.title', null, 'Completed todo') }),
        el('div', { textContent: tr('ui.candidate.deal', { deal: completedTodo.workspaceRootPath }, 'Deal: ' + completedTodo.workspaceRootPath) }),
        completedTodo.completedAt ? el('div', { textContent: tr('ui.todo.completed', { time: candidateTime(completedTodo.completedAt) }, 'Completed: ' + candidateTime(completedTodo.completedAt)) }) : null
      ]) : null;

      modalHost.innerHTML = '';
      if (typeof modalHost.removeAttribute === 'function') modalHost.removeAttribute('hidden');
      else delete modalHost.attributes.hidden;
      modalHost.appendChild(el('div', { className: 'journal-modal-overlay', onClick: function (event) {
        if (event.target === event.currentTarget) closeEntryModal();
      } }, [
        el('div', { className: 'journal-modal' }, [
          el('div', { className: 'journal-modal-title', textContent: editing ? tr('ui.editEntry', null, 'Edit journal entry') : (reviewingCandidate ? tr('ui.reviewCandidate', null, 'Review possible journal entry') : (reviewingTodo ? tr('ui.fromTodo', null, 'Create journal entry from completed todo') : tr('ui.addEntry', null, 'Add journal entry'))) }),
          candidateContext,
          todoContext,
          el('div', { className: 'journal-modal-grid' }, [
            el('label', { className: 'journal-field' }, [tr('ui.date', null, 'Date'), dateInput]),
            el('label', { className: 'journal-field' }, [tr('ui.minutes', null, 'Minutes'), minutesInput]),
            workspaceInput ? el('label', { className: 'journal-field wide' }, [tr('ui.workspace', null, 'Deal'), workspaceInput]) : null,
            el('label', { className: 'journal-field wide' }, [tr('ui.fieldTitle', null, 'Title'), titleInput]),
            el('label', { className: 'journal-field wide' }, [tr('ui.body', null, 'Body'), summaryInput]),
            el('label', { className: 'journal-billable' }, [billableInput, tr('ui.billable', null, 'Billable')])
          ]),
          candidateActivities,
          el('div', { className: 'journal-modal-actions' }, [
            el('button', { className: 'journal-btn ghost', type: 'button', textContent: tr('ui.cancel', null, 'Cancel'), onClick: closeEntryModal }),
            el('button', { className: 'journal-btn primary', type: 'button', 'data-journal-action': 'save-entry', textContent: editing ? tr('ui.saveChanges', null, 'Save changes') : tr('ui.addEntryShort', null, 'Add entry'), onClick: saveEntry })
          ])
        ])
      ]));
      titleInput.focus && titleInput.focus();
    }

    function addOrUpdateEntry(existingEntry, formValue) {
      var title = text(formValue && formValue.title).trim();
      if (!title) {
        statusText = tr('ui.titleRequired', null, 'Title is required');
        statusClass = 'error';
        render();
        return;
      }
      var workspaceRoot = cleanWorkspace(formValue && formValue.workspaceRootPath || scope.workspaceRoot);
      if (!workspaceRoot) return;
      var sourceCandidateId = text(formValue && formValue.sourceCandidateId || (existingEntry && existingEntry.sourceCandidateId)).trim();
      var sessionID = text(formValue && formValue.sessionId).trim();
      var handledThrough = text(formValue && formValue.handledThrough).trim();
      var sourceTodoId = text(formValue && formValue.sourceTodoId || (existingEntry && existingEntry.sourceTodoId)).trim();
      if (!existingEntry && sourceCandidateId && entries.some(function (entry) { return entry.sourceCandidateId === sourceCandidateId; })) {
        statusText = tr('ui.candidate.duplicate', null, 'A journal entry already references this candidate');
        statusClass = 'error';
        render();
        return;
      }
      if (!existingEntry && sourceTodoId && entries.some(function (entry) { return entry.sourceTodoId === sourceTodoId; })) {
        statusText = tr('ui.todo.duplicate', null, 'A journal entry already references this todo');
        statusClass = 'error';
        render();
        return;
      }
      var entry = normalizeEntry({
        entryId: existingEntry ? existingEntry.entryId : entryId(workspaceRoot, formValue.date || today(), title),
        workspaceRootPath: workspaceRoot,
        date: formValue.date || today(),
        title: title,
        summary: formValue.summary,
        minutes: Number(formValue.minutes || 0),
        billable: formValue.billable === true,
        sourceCandidateId: sourceCandidateId,
        sourceTodoId: sourceTodoId,
        activityIds: Array.isArray(formValue.activityIds) ? formValue.activityIds : (existingEntry ? existingEntry.activityIds : [])
      }, scope.key);
      if (existingEntry) {
        entries = entries.map(function (item) {
          return item.entryId === existingEntry.entryId ? entry : item;
        });
      } else {
        entries = [entry].concat(entries);
      }
      entries = sortEntries(entries);
      var targetEntries = entries.filter(function (item) { return item.workspaceRootPath === workspaceRoot; });
      closeEntryModal();
      statusText = existingEntry ? tr('ui.updated', null, 'Entry updated') : tr('ui.added', null, 'Entry added');
      statusClass = '';
      persist(workspaceRoot, targetEntries).then(function () {
        if (!sessionID || !handledThrough || !api || !api.events || typeof api.events.publish !== 'function') return undefined;
        return api.events.publish('activity.session.handled', {
          sessionId: sessionID,
          handledThrough: handledThrough,
          status: 'accepted'
        });
      }).then(render);
    }

    function deleteEntry(entry) {
      if (scope.mode !== 'workspace' || !entry) return;
      entries = entries.filter(function (item) { return item.entryId !== entry.entryId; });
      statusText = tr('ui.deleted', null, 'Entry deleted');
      statusClass = '';
      persist().then(render);
    }

    function renderList() {
      listEl.innerHTML = '';
      if (!entries.length) {
        listEl.appendChild(el('div', { className: 'journal-empty', textContent: tr('ui.empty', null, 'No worklog entries yet.') }));
        return;
      }
      entries.forEach(function (entry) {
        listEl.appendChild(el('div', {
          className: 'journal-row',
          'data-journal-entry': entry.entryId
        }, [
          el('div', { className: 'journal-date', textContent: entry.date }),
          el('div', { className: 'journal-main' }, [
            el('div', { className: 'journal-entry-title', textContent: entry.title }),
            entry.summary ? el('div', { className: 'journal-summary', textContent: entry.summary }) : null,
            el('div', { className: 'journal-meta', textContent: entryMeta(entry) })
          ]),
          el('div', { className: 'journal-minutes', textContent: tr('ui.minutesValue', { minutes: entry.minutes }, entry.minutes + ' min') }),
          scope.mode === 'workspace' ? el('div', { className: 'journal-row-actions' }, [
            el('button', { className: 'journal-icon-btn', type: 'button', title: tr('ui.edit', null, 'Edit'), 'aria-label': tr('ui.edit', null, 'Edit'), 'data-journal-action': 'edit', innerHTML: iconSvg('edit'), onClick: function () { showEntryModal(entry); } }),
            el('button', { className: 'journal-icon-btn danger', type: 'button', title: tr('ui.delete', null, 'Delete'), 'aria-label': tr('ui.delete', null, 'Delete'), 'data-journal-action': 'delete', innerHTML: iconSvg('trash'), onClick: function () { deleteEntry(entry); } })
          ]) : null
        ]));
      });
    }

    function render() {
      countEl.textContent = tr(
        entries.length === 1 ? 'ui.entryCount.one' : 'ui.entryCount.many',
        { count: entries.length },
        entries.length === 1 ? '{count} entry' : '{count} entries'
      );
      statusEl.textContent = statusText;
      statusEl.className = 'journal-status' + (statusClass ? ' ' + statusClass : '');
      addBtn.disabled = false;
      renderList();
    }

    render();
    Promise.all([loadStored(), loadWorkspaceOptions()]).then(function () {
      render();
      var candidate = candidateFromRequest(props && props.toolRequest, scope.workspaceRoot);
      var completedTodo = completedTodoFromRequest(props && props.toolRequest, scope.workspaceRoot);
      if (candidate) showEntryModal(null, candidate);
      else if (completedTodo) showEntryModal(null, null, completedTodo);
    });
    if (api && api.i18n && typeof api.i18n.onDidChangeLocale === 'function') {
      api.i18n.onDidChangeLocale(function () {
        titleEl.textContent = scope.mode === 'global' ? tr('ui.title', null, 'Journal') : tr('ui.workspaceTitle', { workspace: scope.label }, 'Journal · ' + scope.label);
        addBtn.innerHTML = iconSvg('add') + '<span>' + tr('ui.add', null, 'Add') + '</span>';
        render();
      });
    }
  };

  JournalView.unmount = function (containerEl) {
    if (containerEl) containerEl.innerHTML = '';
  };

  window.VerstakPluginRegister(PLUGIN_ID, {
    components: {
      JournalView: JournalView
    }
  });
})();
