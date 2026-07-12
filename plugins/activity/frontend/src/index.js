/* ===========================================================
   Activity Plugin - Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  var PLUGIN_ID = 'verstak.activity';
  var MAX_EVENTS = 250;
  var RAW_DATA_NAME = 'activity-events';
  var MAX_CANDIDATES = 12;
  var LEGACY_KEY = 'events';
  var GLOBAL_KEY = 'events:global';
  var WORKSPACE_PREFIX = 'events:workspace:';
  var CANDIDATE_PREFIX = 'work-session-candidates:workspace:';
  var DISMISSAL_PREFIX = 'work-session-dismissals:workspace:';
  var WORKLOG_COMMAND_ID = 'verstak.activity.suggestWorklog';
  var MIN_SESSION_DURATION_MINUTES = 10;
  var MIN_SESSION_ACTIVITY_COUNT = 2;
  var MAX_IDLE_GAP_MINUTES = 20;
  var MAX_SESSION_DURATION_MINUTES = 120;
  var ACTIVITY_EVENTS = [
    'file.opened',
    'file.changed',
    'note.saved',
    'action.started',
    'browser.capture.received',
    'case.selected',
    'browser.capture.page',
    'browser.capture.selection',
    'browser.capture.link',
    'browser.capture.file',
    'browser.capture.converted',
    'browser.activity.batch'
  ];
  var EVENT_LABELS = {
    'workspace.selected': 'Workspace selected',
    'case.selected': 'Workspace selected',
    'file.opened': 'File opened',
    'file.changed': 'File changed',
    'note.saved': 'Note edited',
    'action.started': 'Work session detected',
    'browser.capture.received': 'Browser capture received',
    'browser.capture.page': 'Page captured',
    'browser.capture.selection': 'Selection captured',
    'browser.capture.link': 'Link captured',
    'browser.capture.file': 'File captured',
    'browser.capture.converted': 'Capture converted',
    'browser.activity.domain': 'Browser domain activity'
  };
  var LOW_VALUE_EVENT_TYPES = {
    'workspace.selected': true,
    'case.selected': true,
    'file.selected': true,
    'file.opened': true,
    'note.opened': true
  };

  function injectStyles() {
    if (document.getElementById('activity-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'activity-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  var STYLES = [
    '.activity-root{display:flex;flex-direction:column;height:100%;min-height:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:var(--vt-color-text-primary,#f4f7fb);background:var(--vt-color-background,#101020)}',
    '.activity-toolbar{display:flex;align-items:center;gap:.5rem;min-height:2.75rem;padding:.5rem .75rem;border-bottom:1px solid var(--vt-color-border,#202b46);background:var(--vt-color-surface-muted,#111629);flex-shrink:0;flex-wrap:wrap}',
    '.activity-title{font-size:.84rem;font-weight:600;color:var(--vt-color-text-primary,#f4f7fb)}',
    '.activity-count{font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.activity-spacer{flex:1}',
    '.activity-btn{font-size:.78rem;padding:.32rem .65rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-secondary,#b7c0d4);cursor:pointer}',
    '.activity-btn:hover{background:var(--vt-color-surface-hover,#1b2440);border-color:var(--vt-color-accent,#4ecca3);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.activity-btn:disabled{opacity:.45;cursor:default}',
    '.activity-btn.danger{border-color:rgba(233,69,96,.42);color:#ff9a9a}',
    '.activity-status{font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3);white-space:nowrap}',
    '.activity-status.error{display:inline-flex;border:1px solid rgba(233,69,96,.45);border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-danger-muted,rgba(233,69,96,.14));color:#ffc6ce;padding:.18rem .4rem}',
    '.activity-candidates{border-bottom:1px solid rgba(32,43,70,.72);background:var(--vt-color-surface-muted,#111629);padding:.65rem .75rem;display:grid;gap:.5rem}',
    '.activity-candidates-title{font-size:.76rem;font-weight:600;color:var(--vt-color-text-muted,#7f8aa3);text-transform:uppercase;letter-spacing:.04em}',
    '.activity-candidate{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.65rem;align-items:start;padding:.65rem .75rem;border:1px solid rgba(78,204,163,.34);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c)}',
    '.activity-candidate-title{font-size:.84rem;color:var(--vt-color-text-primary,#f4f7fb);font-weight:600}',
    '.activity-candidate-facts{margin-top:.28rem;display:grid;gap:.16rem;font-size:.76rem;color:var(--vt-color-text-secondary,#b7c0d4)}',
    '.activity-candidate-activities{margin-top:.38rem;font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}.activity-candidate-activities summary{cursor:pointer}.activity-candidate-activity{margin-top:.2rem;overflow-wrap:anywhere}',
    '.activity-candidate-actions{display:flex;gap:.35rem;align-items:center;flex-wrap:wrap;justify-content:flex-end}',
    '.activity-candidate-duration{font-size:.76rem;color:var(--vt-color-accent,#4ecca3);white-space:nowrap}',
    '.activity-list{flex:1;min-height:0;overflow:auto;background:var(--vt-color-background,#101020)}',
    '.activity-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.35rem;color:var(--vt-color-text-muted,#7f8aa3);font-size:.86rem;padding:2rem;text-align:center}',
    '.activity-empty-title{color:var(--vt-color-text-secondary,#b7c0d4);font-weight:650}',
    '.activity-row{display:grid;grid-template-columns:9.5rem minmax(0,1fr);gap:.75rem;padding:.72rem .85rem;border-bottom:1px solid rgba(32,43,70,.72)}',
    '.activity-row:hover{background:var(--vt-color-surface-hover,#1b2440)}',
    '.activity-time{font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3);white-space:nowrap}',
    '.activity-main{min-width:0}',
    '.activity-row-head{display:flex;align-items:center;gap:.45rem;min-width:0}',
    '.activity-type{font-size:.68rem;color:var(--vt-color-accent,#4ecca3);text-transform:uppercase;letter-spacing:.04em;flex-shrink:0}',
    '.activity-title-text{font-size:.86rem;color:var(--vt-color-text-primary,#f4f7fb);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.activity-summary{margin-top:.25rem;font-size:.78rem;line-height:1.4;color:var(--vt-color-text-secondary,#b7c0d4);white-space:pre-wrap;overflow-wrap:anywhere}',
    '.activity-source{margin-top:.25rem;font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.activity-details{margin-top:.25rem;font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}.activity-details summary{cursor:pointer}',
    '@media(max-width:760px){.activity-row,.activity-candidate{grid-template-columns:1fr;gap:.25rem}.activity-candidate-actions{justify-content:flex-start}.activity-toolbar{align-items:stretch}.activity-status{width:100%}}'
  ].join('\n');

  function el(tag, attrs, children) {
    var elem = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] == null) return;
        if (k === 'className') elem.className = attrs[k];
        else if (k.slice(0, 2) === 'on') elem.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (k === 'textContent') elem.textContent = attrs[k];
        else elem.setAttribute(k, attrs[k]);
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

  function encodeKey(value) {
    return encodeURIComponent(text(value).trim());
  }

  function cleanWorkspace(value) {
    return text(value).trim().replace(/^\/+|\/+$/g, '');
  }

  function workspaceFromProps(props) {
    var node = props && props.workspaceNode;
    return cleanWorkspace((props && (props.workspaceRootPath || props.workspaceName || props.workspaceNodeId))
      || (node && (node.rootPath || node.name || node.id)));
  }

  function workspaceFromPayload(payload) {
    var explicit = cleanWorkspace(payload && (payload.workspaceRootPath || payload.workspaceName || payload.workspaceNodeId));
    if (explicit) return explicit;
    var path = cleanWorkspace(payload && payload.path);
    if (!path || path.indexOf('/') === -1) return '';
    return cleanWorkspace(path.split('/')[0]);
  }

  function scopeFromProps(props) {
    var workspaceRoot = workspaceFromProps(props);
    if (!workspaceRoot) {
      return { mode: 'global', key: GLOBAL_KEY, label: 'All workspaces', workspaceRoot: '' };
    }
    return {
      mode: 'workspace',
      key: WORKSPACE_PREFIX + encodeKey(workspaceRoot),
      label: workspaceRoot,
      workspaceRoot: workspaceRoot
    };
  }

  function eventPayload(event) {
    return event && event.payload && typeof event.payload === 'object' ? event.payload : {};
  }

  function normalizeStoredEvents(value, storageKey) {
    if (!Array.isArray(value)) return [];
    return value.filter(function (item) {
      return item && typeof item === 'object' && item.activityId;
    }).map(function (item) {
      return {
        activityId: text(item.activityId),
        type: text(item.type || item.name || 'activity.event'),
        title: text(item.title || item.type || 'Activity event'),
        summary: text(item.summary),
        occurredAt: text(item.occurredAt || item.timestamp || item.receivedAt),
        receivedAt: text(item.receivedAt),
        sourcePluginId: text(item.sourcePluginId || item.pluginId),
        workspaceRootPath: cleanWorkspace(item.workspaceRootPath || workspaceFromPayload(item.payload || {})),
        _storageKey: storageKey || '',
        payload: item.payload && typeof item.payload === 'object' ? item.payload : {}
      };
    }).slice(0, MAX_EVENTS);
  }

  function storageEvents(activityList) {
    return activityList.map(function (item) {
      return {
        activityId: item.activityId,
        type: item.type,
        title: item.title,
        summary: item.summary,
        occurredAt: item.occurredAt,
        receivedAt: item.receivedAt,
        sourcePluginId: item.sourcePluginId,
        workspaceRootPath: item.workspaceRootPath,
        payload: item.payload || {}
      };
    });
  }

  function sortEvents(activityList) {
    var seen = {};
    return activityList.filter(function (item) {
      var key = item && item.activityId;
      if (!key) return false;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).slice().sort(function (a, b) {
      return text(b.occurredAt || b.receivedAt).localeCompare(text(a.occurredAt || a.receivedAt));
    }).slice(0, MAX_EVENTS);
  }

  function isMeaningfulActivity(activity) {
    var type = text(activity && activity.type).toLowerCase();
    return !LOW_VALUE_EVENT_TYPES[type];
  }

  function eventTimeMs(activity) {
    var value = activity && (activity.occurredAt || activity.receivedAt);
    var date = value ? new Date(value) : null;
    return date && !isNaN(date.getTime()) ? date.getTime() : 0;
  }

  function candidateWorkspace(activity) {
    return cleanWorkspace(activity && (activity.workspaceRootPath || workspaceFromPayload(activity.payload || {})));
  }

  function toISOTime(time) {
    var date = new Date(time);
    return isNaN(date.getTime()) ? '' : date.toISOString();
  }

  function candidateId(workspaceRootPath, firstActivity, lastActivity) {
    return 'work-session:' + encodeKey(workspaceRootPath) + ':' + encodeKey(firstActivity.activityId) + ':' + encodeKey(lastActivity.activityId);
  }

  function candidateActivity(activity) {
    return {
      activityId: text(activity.activityId),
      type: text(activity.type),
      occurredAt: toISOTime(eventTimeMs(activity)),
      sourcePluginId: text(activity.sourcePluginId),
      workspaceRootPath: candidateWorkspace(activity)
    };
  }

  function buildCandidate(session) {
    var first = session.activities[0];
    var last = session.activities[session.activities.length - 1];
    var duration = Math.round((eventTimeMs(last) - eventTimeMs(first)) / 60000);
    if (session.activities.length < MIN_SESSION_ACTIVITY_COUNT || duration < MIN_SESSION_DURATION_MINUTES) return null;
    return {
      candidateId: candidateId(session.workspaceRootPath, first, last),
      workspaceRootPath: session.workspaceRootPath,
      startedAt: toISOTime(eventTimeMs(first)),
      endedAt: toISOTime(eventTimeMs(last)),
      estimatedMinutes: duration,
      activityCount: session.activities.length,
      activityIds: session.activities.map(function (activity) { return activity.activityId; }).filter(Boolean),
      activities: session.activities.map(candidateActivity)
    };
  }

  function buildWorkSessionCandidates(activityList, workspaceFilter) {
    var filter = cleanWorkspace(workspaceFilter);
    var ordered = sortEvents(activityList || []).filter(function (activity) {
      return isMeaningfulActivity(activity) && candidateWorkspace(activity) && eventTimeMs(activity);
    }).slice().sort(function (a, b) {
      return eventTimeMs(a) - eventTimeMs(b);
    });
    var sessions = [];
    var current = null;
    ordered.forEach(function (activity) {
      var workspace = candidateWorkspace(activity);
      var time = eventTimeMs(activity);
      if (!current) {
        current = { workspaceRootPath: workspace, activities: [activity] };
        return;
      }
      var firstTime = eventTimeMs(current.activities[0]);
      var lastTime = eventTimeMs(current.activities[current.activities.length - 1]);
      var switchedWorkspace = current.workspaceRootPath !== workspace;
      var idleGap = time - lastTime > MAX_IDLE_GAP_MINUTES * 60 * 1000;
      var exceededMaximum = time - firstTime > MAX_SESSION_DURATION_MINUTES * 60 * 1000;
      if (switchedWorkspace || idleGap || exceededMaximum) {
        sessions.push(current);
        current = { workspaceRootPath: workspace, activities: [activity] };
        return;
      }
      current.activities.push(activity);
    });
    if (current) sessions.push(current);
    return sessions.map(buildCandidate).filter(function (candidate) {
      return candidate && (!filter || candidate.workspaceRootPath === filter);
    }).sort(function (a, b) {
      return b.endedAt.localeCompare(a.endedAt) || a.workspaceRootPath.localeCompare(b.workspaceRootPath);
    }).slice(0, MAX_CANDIDATES);
  }

  function humanEventType(type) {
    return EVENT_LABELS[text(type).toLowerCase()] || '';
  }

  function humanEventTitle(activity) {
    var explicit = text(activity && activity.title).trim();
    var type = text(activity && activity.type).trim();
    if (explicit && explicit.toLowerCase() !== type.toLowerCase()) return explicit;
    return humanEventType(type) || text(activity && (activity.summary || activity.activityId)).trim() || 'Activity event';
  }

  function eventKind(activity) {
    var type = text(activity && activity.type).toLowerCase();
    if (type.indexOf('browser.capture') === 0) return 'Capture';
    if (type.indexOf('file.') === 0) return 'File';
    if (type.indexOf('note.') === 0) return 'Note';
    if (type.indexOf('workspace') !== -1 || type.indexOf('case.') === 0) return 'Workspace';
    if (type.indexOf('action.') === 0) return 'Work';
    return 'Activity';
  }

  function globalEventKeys(settings) {
    var keys = [LEGACY_KEY, GLOBAL_KEY];
    Object.keys(settings || {}).forEach(function (key) {
      if (key.indexOf(WORKSPACE_PREFIX) === 0 && keys.indexOf(key) === -1) keys.push(key);
    });
    return keys;
  }

  function eventsFromSettings(settings, workspaceRoot) {
    settings = settings || {};
    var workspace = cleanWorkspace(workspaceRoot);
    if (!workspace) {
      var all = [];
      globalEventKeys(settings).forEach(function (key) {
        all = all.concat(normalizeStoredEvents(settings[key], key));
      });
      return sortEvents(all);
    }
    var workspaceKey = WORKSPACE_PREFIX + encodeKey(workspace);
    var scopedEvents = normalizeStoredEvents(settings[workspaceKey], workspaceKey);
    var globalEvents = normalizeStoredEvents(settings[GLOBAL_KEY], GLOBAL_KEY).filter(function (item) {
      return item.workspaceRootPath === workspace;
    });
    var legacyEvents = normalizeStoredEvents(settings[LEGACY_KEY], LEGACY_KEY).filter(function (item) {
      return item.workspaceRootPath === workspace;
    });
    return sortEvents(scopedEvents.concat(globalEvents, legacyEvents));
  }

  function eventsFromRecords(records, workspaceRoot) {
    var normalized = normalizeStoredEvents(records, RAW_DATA_NAME);
    var workspace = cleanWorkspace(workspaceRoot);
    if (!workspace) return sortEvents(normalized);
    return sortEvents(normalized.filter(function (item) {
      return item.workspaceRootPath === workspace;
    }));
  }

  function candidateStorageKey(workspaceRoot) {
    return CANDIDATE_PREFIX + encodeKey(workspaceRoot);
  }

  function dismissalStorageKey(workspaceRoot) {
    return DISMISSAL_PREFIX + encodeKey(workspaceRoot);
  }

  function decodeStoredWorkspace(key, prefix) {
    if (key.indexOf(prefix) !== 0) return '';
    try {
      return cleanWorkspace(decodeURIComponent(key.slice(prefix.length)));
    } catch (err) {
      return cleanWorkspace(key.slice(prefix.length));
    }
  }

  function dismissedCandidatesFromSettings(settings) {
    var dismissed = {};
    Object.keys(settings || {}).forEach(function (key) {
      if (key.indexOf(DISMISSAL_PREFIX) !== 0 || !Array.isArray(settings[key])) return;
      var workspace = decodeStoredWorkspace(key, DISMISSAL_PREFIX);
      if (!workspace) return;
      dismissed[workspace] = {};
      settings[key].forEach(function (candidateId) {
        candidateId = text(candidateId).trim();
        if (candidateId) dismissed[workspace][candidateId] = true;
      });
    });
    return dismissed;
  }

  function isCandidateDismissed(candidate, dismissedByWorkspace) {
    return !!(candidate && dismissedByWorkspace && dismissedByWorkspace[candidate.workspaceRootPath] && dismissedByWorkspace[candidate.workspaceRootPath][candidate.candidateId]);
  }

  function visibleCandidates(activityList, workspaceFilter, dismissedByWorkspace) {
    return buildWorkSessionCandidates(activityList, workspaceFilter).filter(function (candidate) {
      return !isCandidateDismissed(candidate, dismissedByWorkspace);
    });
  }

  function formatDate(value) {
    if (!value) return '';
    var date = new Date(value);
    if (isNaN(date.getTime())) return text(value);
    return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function ActivityView() {}

  ActivityView.mount = function (containerEl, props, api) {
    injectStyles();
    containerEl.innerHTML = '';
    containerEl.className = 'activity-root';
    containerEl.setAttribute('data-plugin-id', PLUGIN_ID);

    var scope = scopeFromProps(props || {});
    var events = [];
    var candidateSourceEvents = [];
    var candidates = [];
    var dismissedByWorkspace = {};
    function tr(key, params, fallback) {
      if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
      return fallback || key;
    }
    var statusText = tr('ui.loading', null, 'Loading activity...');
    var statusClass = '';
    var disposed = false;
    var unsubscribers = [];

    var toolbar = el('div', { className: 'activity-toolbar' });
    var titleEl = el('span', { className: 'activity-title', textContent: scope.mode === 'global' ? tr('ui.title', null, 'Activity') : tr('ui.workspaceTitle', { workspace: scope.label }, 'Activity · ' + scope.label) });
    var countEl = el('span', { className: 'activity-count' });
    var statusEl = el('span', { className: 'activity-status' });
    var clearBtn = el('button', {
      className: 'activity-btn danger',
      'data-activity-action': 'clear',
      textContent: tr('ui.clear', null, 'Clear'),
      onClick: function () {
        if (scope.mode === 'global') {
          clearGlobal().then(render);
          return;
        }
        events = [];
        candidateSourceEvents = candidateSourceEvents.filter(function (activity) {
          return candidateWorkspace(activity) !== scope.workspaceRoot;
        });
        updateCandidates();
        clearWorkspaceRaw(scope.workspaceRoot).then(persist).then(render);
      }
    });
    toolbar.appendChild(titleEl);
    toolbar.appendChild(countEl);
    toolbar.appendChild(el('span', { className: 'activity-spacer' }));
    toolbar.appendChild(statusEl);
    toolbar.appendChild(clearBtn);

    var candidatesEl = el('div', {
      className: 'activity-candidates',
      'data-activity-section': 'work-session-candidates'
    });
    var listEl = el('div', { className: 'activity-list' });
    containerEl.appendChild(toolbar);
    containerEl.appendChild(candidatesEl);
    containerEl.appendChild(listEl);

    function candidatesForWorkspace(workspaceRoot) {
      return visibleCandidates(candidateSourceEvents, workspaceRoot, dismissedByWorkspace);
    }

    function updateCandidates() {
      candidates = candidatesForWorkspace(scope.mode === 'workspace' ? scope.workspaceRoot : '');
    }

    function candidateWorkspaces() {
      var workspaces = {};
      candidateSourceEvents.forEach(function (activity) {
        var workspace = candidateWorkspace(activity);
        if (workspace) workspaces[workspace] = true;
      });
      if (scope.mode === 'workspace' && scope.workspaceRoot) workspaces[scope.workspaceRoot] = true;
      return Object.keys(workspaces);
    }

    function persistCandidateCache(workspaceRoot) {
      if (!workspaceRoot || !api || !api.settings || typeof api.settings.write !== 'function') return Promise.resolve();
      return api.settings.write(candidateStorageKey(workspaceRoot), candidatesForWorkspace(workspaceRoot));
    }

    function persistCandidateCaches() {
      return Promise.all(candidateWorkspaces().map(persistCandidateCache));
    }

    function persistDismissals(workspaceRoot) {
      if (!workspaceRoot || !api || !api.settings || typeof api.settings.write !== 'function') return Promise.resolve();
      var dismissed = dismissedByWorkspace[workspaceRoot] || {};
      return api.settings.write(dismissalStorageKey(workspaceRoot), Object.keys(dismissed));
    }

    function persist() {
      if (!api || !api.settings || typeof api.settings.write !== 'function') return Promise.resolve();
      var toStore = scope.mode === 'global'
        ? events.filter(function (item) { return !item._storageKey || item._storageKey === GLOBAL_KEY; })
        : events;
      return api.settings.write(scope.key, storageEvents(toStore)).then(persistCandidateCaches).catch(function (err) {
        statusText = tr('ui.saveError', { error: err && err.message ? err.message : String(err) }, 'Could not save activity: ' + (err && err.message ? err.message : String(err)));
        statusClass = 'error';
      });
    }

    function clearGlobal() {
      if (!api || !api.settings || typeof api.settings.read !== 'function' || typeof api.settings.write !== 'function') {
        events = [];
        return Promise.resolve();
      }
      var clearRaw = api.storage && api.storage.data && typeof api.storage.data.writeNDJSON === 'function'
        ? api.storage.data.writeNDJSON(RAW_DATA_NAME, [])
        : Promise.resolve();
      return clearRaw.then(function () {
        return api.settings.read();
      }).then(function (settings) {
        var keys = globalEventKeys(settings || {}).concat(Object.keys(settings || {}).filter(function (key) {
          return key.indexOf(CANDIDATE_PREFIX) === 0 || key.indexOf(DISMISSAL_PREFIX) === 0;
        }));
        events = [];
        candidateSourceEvents = [];
        candidates = [];
        dismissedByWorkspace = {};
        return Promise.all(keys.filter(function (key, index, all) {
          return all.indexOf(key) === index;
        }).map(function (key) {
          return api.settings.write(key, []);
        }));
      }).then(function () {
        statusText = tr('ui.cleared', null, 'Activity cleared');
        statusClass = '';
      }).catch(function (err) {
        statusText = tr('ui.clearError', { error: err && err.message ? err.message : String(err) }, 'Could not clear activity: ' + (err && err.message ? err.message : String(err)));
        statusClass = 'error';
      });
    }

    function clearWorkspaceRaw(workspaceRoot) {
      if (!api || !api.storage || !api.storage.data || typeof api.storage.data.readNDJSON !== 'function' || typeof api.storage.data.writeNDJSON !== 'function') {
        return Promise.resolve();
      }
      return api.storage.data.readNDJSON(RAW_DATA_NAME).then(function (records) {
        var workspace = cleanWorkspace(workspaceRoot);
        var kept = (Array.isArray(records) ? records : []).filter(function (record) {
          return cleanWorkspace(record && (record.workspaceRootPath || workspaceFromPayload(record.payload || {}))) !== workspace;
        });
        return api.storage.data.writeNDJSON(RAW_DATA_NAME, kept);
      });
    }

    function renderList() {
      listEl.innerHTML = '';
      if (events.length === 0) {
        listEl.appendChild(el('div', { className: 'activity-empty' }, [
          el('div', { className: 'activity-empty-title', textContent: tr('ui.empty', null, 'No activity events yet') }),
          el('div', { textContent: tr('ui.emptyHint', null, 'File changes, browser captures, and conversions will appear here.') })
        ]));
        return;
      }
      events.forEach(function (activity) {
        listEl.appendChild(el('div', {
          className: 'activity-row',
          'data-activity-id': activity.activityId
        }, [
          el('div', { className: 'activity-time', textContent: formatDate(activity.occurredAt) || '-' }),
          el('div', { className: 'activity-main' }, [
            el('div', { className: 'activity-row-head' }, [
              el('span', { className: 'activity-type', textContent: eventKind(activity) }),
              el('span', { className: 'activity-title-text', textContent: humanEventTitle(activity) })
            ]),
            activity.summary ? el('div', { className: 'activity-summary', textContent: activity.summary }) : null,
            el('details', { className: 'activity-details' }, [
              el('summary', {}, [tr('ui.details', null, 'Details')]),
              el('div', { className: 'activity-source', textContent: tr('ui.eventSource', { event: activity.type, source: activity.sourcePluginId ? ' · ' + activity.sourcePluginId : '' }, 'Event: ' + activity.type + (activity.sourcePluginId ? ' · Source: ' + activity.sourcePluginId : '')) })
            ])
          ])
        ]));
      });
    }

    function candidateTimeRange(candidate) {
      return formatDate(candidate.startedAt) + ' - ' + formatDate(candidate.endedAt);
    }

    function reviewCandidate(candidate) {
      if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function' || typeof CustomEvent !== 'function') return;
      window.dispatchEvent(new CustomEvent('verstak:workspace-open-tool', {
        detail: {
          kind: 'journal',
          toolRequest: { type: 'work-session-candidate', candidate: candidate }
        }
      }));
    }

    function dismissCandidate(candidate) {
      if (!candidate || !candidate.workspaceRootPath || !candidate.candidateId) return;
      dismissedByWorkspace[candidate.workspaceRootPath] = dismissedByWorkspace[candidate.workspaceRootPath] || {};
      dismissedByWorkspace[candidate.workspaceRootPath][candidate.candidateId] = true;
      updateCandidates();
      Promise.all([
        persistDismissals(candidate.workspaceRootPath),
        persistCandidateCache(candidate.workspaceRootPath)
      ]).then(function () {
        statusText = tr('ui.dismissed', null, 'Candidate dismissed');
        statusClass = '';
      }).catch(function (err) {
        statusText = 'Could not dismiss candidate: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
      }).then(render);
    }

    function renderCandidates() {
      candidatesEl.innerHTML = '';
      if (!candidates.length) {
        candidatesEl.setAttribute('hidden', 'hidden');
        return;
      }
      if (typeof candidatesEl.removeAttribute === 'function') candidatesEl.removeAttribute('hidden');
      else delete candidatesEl.attributes.hidden;
      candidatesEl.appendChild(el('div', { className: 'activity-candidates-title', textContent: tr('ui.candidates', null, 'Possible journal entries') }));
      candidates.forEach(function (candidate) {
        candidatesEl.appendChild(el('div', {
          className: 'activity-candidate',
          'data-work-session-candidate': candidate.candidateId
        }, [
          el('div', {}, [
            el('div', { className: 'activity-candidate-title', textContent: tr('ui.candidate', null, 'Possible journal entry') }),
            el('div', { className: 'activity-candidate-facts' }, [
              el('div', { textContent: 'Workspace: ' + candidate.workspaceRootPath }),
              el('div', { textContent: 'Time: ' + candidateTimeRange(candidate) }),
              el('div', { textContent: 'Estimated duration: ' + candidate.estimatedMinutes + ' min' }),
              el('div', { textContent: 'Activities: ' + candidate.activityCount })
            ]),
            el('details', { className: 'activity-candidate-activities' }, [
              el('summary', { textContent: 'Included activities (' + candidate.activityCount + ')' })
            ].concat(candidate.activities.map(function (activity) {
                return el('div', { className: 'activity-candidate-activity', textContent: activity.occurredAt + ' · ' + activity.type + ' · ' + activity.activityId });
            })))
          ]),
          el('div', { className: 'activity-candidate-actions' }, [
            el('div', { className: 'activity-candidate-duration', textContent: candidate.estimatedMinutes + ' min' }),
            el('button', { className: 'activity-btn', type: 'button', 'data-work-session-action': 'review', textContent: tr('ui.review', null, 'Review'), onClick: function () { reviewCandidate(candidate); } }),
            el('button', { className: 'activity-btn', type: 'button', 'data-work-session-action': 'dismiss', textContent: tr('ui.dismiss', null, 'Dismiss'), onClick: function () { dismissCandidate(candidate); } })
          ])
        ]));
      });
    }

    function render() {
      countEl.textContent = events.length + ' event' + (events.length === 1 ? '' : 's');
      clearBtn.disabled = events.length === 0;
      statusEl.textContent = statusText;
      statusEl.className = 'activity-status' + (statusClass ? ' ' + statusClass : '');
      renderCandidates();
      renderList();
    }

    function loadStored() {
      if (!api || !api.settings || typeof api.settings.read !== 'function') return Promise.resolve();
      var readRaw = api.storage && api.storage.data && typeof api.storage.data.readNDJSON === 'function'
        ? api.storage.data.readNDJSON(RAW_DATA_NAME)
        : Promise.resolve([]);
      return Promise.all([api.settings.read(), readRaw]).then(function (results) {
        var settings = results[0] || {};
        var rawRecords = Array.isArray(results[1]) ? results[1] : [];
        settings = settings || {};
        candidateSourceEvents = rawRecords.length ? eventsFromRecords(rawRecords, '') : eventsFromSettings(settings, '');
        events = rawRecords.length
          ? eventsFromRecords(rawRecords, scope.mode === 'workspace' ? scope.workspaceRoot : '')
          : eventsFromSettings(settings, scope.mode === 'workspace' ? scope.workspaceRoot : '');
        dismissedByWorkspace = dismissedCandidatesFromSettings(settings);
        updateCandidates();
        return persistCandidateCaches();
      }).catch(function (err) {
        statusText = 'Could not load activity: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
      });
    }

    function listWorkSessionCandidates(args) {
      var workspace = cleanWorkspace(args && args.workspaceRootPath);
      if (!api || !api.settings || typeof api.settings.read !== 'function') {
        return Promise.resolve({ candidates: visibleCandidates(candidateSourceEvents, workspace || (scope.mode === 'workspace' ? scope.workspaceRoot : ''), dismissedByWorkspace) });
      }
      var readRaw = api.storage && api.storage.data && typeof api.storage.data.readNDJSON === 'function'
        ? api.storage.data.readNDJSON(RAW_DATA_NAME)
        : Promise.resolve([]);
      return Promise.all([api.settings.read(), readRaw]).then(function (results) {
        var settings = results[0] || {};
        var rawRecords = Array.isArray(results[1]) ? results[1] : [];
        var source = rawRecords.length ? eventsFromRecords(rawRecords, '') : eventsFromSettings(settings, '');
        return { candidates: visibleCandidates(source, workspace, dismissedCandidatesFromSettings(settings)) };
      }).catch(function () {
        return { candidates: [] };
      });
    }

    function registerCommands() {
      if (!api || !api.commands || typeof api.commands.register !== 'function') return Promise.resolve();
      return api.commands.register(WORKLOG_COMMAND_ID, listWorkSessionCandidates).then(function (unregister) {
        if (typeof unregister === 'function') unsubscribers.push(unregister);
      }).catch(function (err) {
        statusText = 'Activity commands unavailable: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
      });
    }

    function subscribeEvents() {
      if (!api || !api.events || typeof api.events.subscribe !== 'function') return Promise.resolve();
      return Promise.all(ACTIVITY_EVENTS.map(function (eventName) {
        return api.events.subscribe(eventName, function (event) {
          var eventWorkspace = workspaceFromPayload(eventPayload(event));
          if (scope.mode === 'workspace' && eventWorkspace && eventWorkspace !== scope.workspaceRoot) return Promise.resolve();
          return loadStored().then(render);
        }).then(function (unsubscribe) {
          if (typeof unsubscribe === 'function') unsubscribers.push(unsubscribe);
        });
      })).then(function () {
        statusText = scope.mode === 'global' ? 'Listening for all activity' : 'Listening for workspace activity';
        statusClass = '';
      }).catch(function (err) {
        statusText = 'Activity subscriptions unavailable: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
      });
    }

    render();
    loadStored().then(function () {
      if (disposed) return;
      render();
      return registerCommands();
    }).then(function () {
      if (disposed) return;
      return subscribeEvents();
    }).then(function () {
      if (!disposed) render();
    });
    if (api && api.i18n && typeof api.i18n.onDidChangeLocale === 'function') {
      api.i18n.onDidChangeLocale(function () {
        titleEl.textContent = scope.mode === 'global' ? tr('ui.title', null, 'Activity') : tr('ui.workspaceTitle', { workspace: scope.label }, 'Activity · ' + scope.label);
        clearBtn.textContent = tr('ui.clear', null, 'Clear');
        render();
      });
    }

    containerEl.__activityUnmount = function () {
      disposed = true;
      while (unsubscribers.length > 0) {
        try {
          unsubscribers.pop()();
        } catch (err) {
          console.error('[Activity] unsubscribe error:', err);
        }
      }
    };
  };

  ActivityView.unmount = function (containerEl) {
    if (containerEl && typeof containerEl.__activityUnmount === 'function') {
      containerEl.__activityUnmount();
      delete containerEl.__activityUnmount;
    }
  };

  window.VerstakPluginRegister(PLUGIN_ID, {
    components: {
      ActivityView: ActivityView
    }
  });
})();
