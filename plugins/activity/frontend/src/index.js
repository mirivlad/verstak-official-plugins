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
  var SESSION_REGISTRY_KEY = 'activity-session-registry-v2';
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
    'browser.activity.batch',
    'activity.session.handled'
  ];
  var EVENT_LABELS = {
    'workspace.selected': { key: 'ui.event.workspaceSelected', fallback: 'Deal selected' },
    'case.selected': { key: 'ui.event.workspaceSelected', fallback: 'Deal selected' },
    'file.opened': { key: 'ui.event.fileOpened', fallback: 'File opened' },
    'file.changed': { key: 'ui.event.fileChanged', fallback: 'File changed' },
    'note.saved': { key: 'ui.event.noteEdited', fallback: 'Note edited' },
    'action.started': { key: 'ui.event.workSessionDetected', fallback: 'Work session detected' },
    'browser.capture.received': { key: 'ui.event.browserCaptureReceived', fallback: 'Browser capture received' },
    'browser.capture.page': { key: 'ui.event.pageCaptured', fallback: 'Page captured' },
    'browser.capture.selection': { key: 'ui.event.selectionCaptured', fallback: 'Selection captured' },
    'browser.capture.link': { key: 'ui.event.linkCaptured', fallback: 'Link captured' },
    'browser.capture.file': { key: 'ui.event.fileCaptured', fallback: 'File captured' },
    'browser.capture.converted': { key: 'ui.event.captureConverted', fallback: 'Capture converted' },
    'browser.activity.domain': { key: 'ui.event.browserDomainActivity', fallback: 'Browser domain activity' }
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
    '.activity-modal-host[hidden]{display:none}.activity-modal-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(0,0,0,.58)}.activity-modal{width:440px;max-width:96vw;display:grid;gap:.75rem;padding:1rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c);box-shadow:0 18px 44px rgba(0,0,0,.38)}.activity-modal-title{font-size:.95rem;font-weight:650}.activity-modal-copy{color:var(--vt-color-text-secondary,#b7c0d4);font-size:.84rem;line-height:1.45}.activity-modal-actions{display:flex;justify-content:flex-end;gap:.5rem}.activity-btn.destructive{background:var(--vt-color-danger,#e94560);border-color:var(--vt-color-danger,#e94560);color:#fff}',
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
    var workspaceId = text(props && (props.workspaceId || (props.workspaceNode && props.workspaceNode.workspaceId))).trim();
    if (!workspaceRoot) {
      return { mode: 'global', key: GLOBAL_KEY, label: 'All Deals', workspaceRoot: '', workspaceId: '' };
    }
    return {
      mode: 'workspace',
      key: WORKSPACE_PREFIX + encodeKey(workspaceRoot),
      label: workspaceRoot,
      workspaceRoot: workspaceRoot,
      workspaceId: workspaceId
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
        workspaceId: text(item.workspaceId || (item.sessionScope && item.sessionScope.workspaceId) || (item.payload && item.payload.workspaceId)),
        sessionScope: item.sessionScope && typeof item.sessionScope === 'object' ? item.sessionScope : {},
        durationSeconds: Math.max(0, Number(item.durationSeconds || (item.payload && item.payload.durationSeconds) || 0)),
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
        workspaceId: item.workspaceId,
        sessionScope: item.sessionScope || {},
        durationSeconds: item.durationSeconds || 0,
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

  function candidateScope(activity) {
    var workspaceId = text(activity && (activity.workspaceId || (activity.sessionScope && activity.sessionScope.workspaceId) || (activity.payload && activity.payload.workspaceId))).trim();
    if (workspaceId) return 'workspace:' + workspaceId;
    var workspaceRoot = candidateWorkspace(activity);
    if (workspaceRoot) return 'legacy-workspace:' + workspaceRoot;
    return 'unassigned';
  }

  function toISOTime(time) {
    var date = new Date(time);
    return isNaN(date.getTime()) ? '' : date.toISOString();
  }

  function newSessionId() {
    if (typeof crypto !== 'undefined' && crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'session-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  function candidateActivity(activity) {
    return {
      activityId: text(activity.activityId),
      type: text(activity.type),
      occurredAt: toISOTime(eventTimeMs(activity)),
      sourcePluginId: text(activity.sourcePluginId),
      workspaceRootPath: candidateWorkspace(activity),
      workspaceId: text(activity.workspaceId)
    };
  }

  function normalizeSessionRegistry(value) {
    value = value && typeof value === 'object' ? value : {};
    return {
      sessions: value.sessions && typeof value.sessions === 'object' ? value.sessions : {},
      eventSessionIds: value.eventSessionIds && typeof value.eventSessionIds === 'object' ? value.eventSessionIds : {}
    };
  }

  function pruneSessionRegistry(registry, activityList) {
    var present = {};
    (activityList || []).forEach(function (activity) { present[text(activity && activity.activityId)] = true; });
    Object.keys(registry.eventSessionIds).forEach(function (activityId) {
      if (!present[activityId]) delete registry.eventSessionIds[activityId];
    });
    var referenced = {};
    Object.keys(registry.eventSessionIds).forEach(function (activityId) {
      referenced[registry.eventSessionIds[activityId]] = true;
    });
    Object.keys(registry.sessions).forEach(function (sessionId) {
      if (!referenced[sessionId]) delete registry.sessions[sessionId];
    });
    return registry;
  }

  function sessionDurationMinutes(session) {
    var events = session.activities.slice().sort(function (a, b) { return eventTimeMs(a) - eventTimeMs(b); });
    var durationMs = 0;
    for (var index = 0; index < events.length; index += 1) {
      var explicit = Math.max(0, Number(events[index].durationSeconds || 0)) * 1000;
      durationMs += explicit;
      if (index === 0 || explicit > 0 || Number(events[index - 1].durationSeconds || 0) > 0) continue;
      var gap = eventTimeMs(events[index]) - eventTimeMs(events[index - 1]);
      if (gap > 0 && gap <= MAX_IDLE_GAP_MINUTES * 60 * 1000) durationMs += Math.min(gap, 10 * 60 * 1000);
    }
    return Math.min(MAX_SESSION_DURATION_MINUTES, Math.floor(durationMs / 60000));
  }

  function findCompatibleSession(sessions, scope, time) {
    var nearest = null;
    sessions.forEach(function (session) {
      if (session.scope !== scope) return;
      var before = session.firstTime - time;
      var after = time - session.lastTime;
      var distance = time < session.firstTime ? before : after;
      if (distance < 0 || distance > MAX_IDLE_GAP_MINUTES * 60 * 1000) return;
      if (Math.max(session.lastTime, time) - Math.min(session.firstTime, time) > MAX_SESSION_DURATION_MINUTES * 60 * 1000) return;
      if (!nearest || distance < nearest.distance) nearest = { session: session, distance: distance };
    });
    return nearest && nearest.session;
  }

  function logicalSessions(activityList, registry) {
    var sessionsById = {};
    var sessions = [];
    var lastScope = '';
    var ordered = sortEvents(activityList || []).filter(function (activity) {
      return isMeaningfulActivity(activity) && eventTimeMs(activity);
    }).slice().sort(function (a, b) { return eventTimeMs(a) - eventTimeMs(b); });
    ordered.forEach(function (activity) {
      var scope = candidateScope(activity);
      var activityId = text(activity.activityId);
      var sessionId = text(registry.eventSessionIds[activityId]);
      var session = sessionId && sessionsById[sessionId];
      if (!session && sessionId && registry.sessions[sessionId]) {
        var persisted = registry.sessions[sessionId];
        session = {
          sessionId: sessionId,
          scope: text(persisted.scope || scope),
          workspaceRootPath: cleanWorkspace(persisted.workspaceRootPath || candidateWorkspace(activity)),
          workspaceId: text(persisted.workspaceId || activity.workspaceId),
          anchor: text(persisted.anchor),
          firstTime: eventTimeMs(activity),
          lastTime: eventTimeMs(activity),
          activities: []
        };
        sessionsById[sessionId] = session;
        sessions.push(session);
      }
      if (!session && (!lastScope || lastScope === scope)) {
        session = findCompatibleSession(sessions, scope, eventTimeMs(activity));
      }
      if (!session) {
        sessionId = newSessionId();
        session = {
          sessionId: sessionId,
          scope: scope,
          workspaceRootPath: candidateWorkspace(activity),
          workspaceId: text(activity.workspaceId),
          anchor: new Date().toISOString(),
          firstTime: eventTimeMs(activity),
          lastTime: eventTimeMs(activity),
          activities: []
        };
        sessionsById[sessionId] = session;
        sessions.push(session);
        registry.sessions[sessionId] = {
          scope: session.scope,
          workspaceRootPath: session.workspaceRootPath,
          workspaceId: session.workspaceId,
          anchor: session.anchor
        };
      }
      registry.eventSessionIds[activityId] = session.sessionId;
      session.activities.push(activity);
      session.firstTime = Math.min(session.firstTime, eventTimeMs(activity));
      session.lastTime = Math.max(session.lastTime, eventTimeMs(activity));
      if (candidateWorkspace(activity)) session.workspaceRootPath = candidateWorkspace(activity);
      if (activity.workspaceId) session.workspaceId = text(activity.workspaceId);
      lastScope = scope;
    });
    return sessions;
  }

  function buildCandidate(session) {
    var activities = session.activities.slice().sort(function (a, b) { return eventTimeMs(a) - eventTimeMs(b); });
    var first = activities[0];
    var last = activities[activities.length - 1];
    var duration = sessionDurationMinutes(session);
    if (session.scope === 'unassigned' || !session.workspaceRootPath || activities.length < MIN_SESSION_ACTIVITY_COUNT || duration < MIN_SESSION_DURATION_MINUTES) return null;
    return {
      candidateId: 'work-session:' + encodeKey(session.sessionId) + ':' + encodeKey(last.activityId),
      sessionId: session.sessionId,
      handledThrough: toISOTime(eventTimeMs(last)),
      workspaceRootPath: session.workspaceRootPath,
      workspaceId: session.workspaceId,
      startedAt: toISOTime(eventTimeMs(first)),
      endedAt: toISOTime(eventTimeMs(last)),
      estimatedMinutes: duration,
      activityCount: activities.length,
      activityIds: activities.map(function (activity) { return activity.activityId; }).filter(Boolean),
      activities: activities.map(candidateActivity)
    };
  }

  function buildWorkSessionCandidates(activityList, workspaceFilter, registry) {
    var filter = cleanWorkspace(workspaceFilter);
    registry = normalizeSessionRegistry(registry);
    return logicalSessions(activityList, registry).map(buildCandidate).filter(function (candidate) {
      return candidate && (!filter || candidate.workspaceRootPath === filter);
    }).sort(function (a, b) {
      return b.endedAt.localeCompare(a.endedAt) || a.workspaceRootPath.localeCompare(b.workspaceRootPath);
    }).slice(0, MAX_CANDIDATES);
  }

  function humanEventType(type, translate) {
    var label = EVENT_LABELS[text(type).toLowerCase()];
    return label ? translate(label.key, null, label.fallback) : '';
  }

  function humanEventTitle(activity, translate) {
    var explicit = text(activity && activity.title).trim();
    var type = text(activity && activity.type).trim();
    var label = humanEventType(type, translate);
    if (explicit && explicit.toLowerCase() !== type.toLowerCase()) return label ? label + ' — ' + explicit : explicit;
    return label || text(activity && (activity.summary || activity.activityId)).trim() || translate('ui.event.activity', null, 'Activity event');
  }

  function eventKind(activity, translate) {
    var type = text(activity && activity.type).toLowerCase();
    if (type.indexOf('browser.capture') === 0) return translate('ui.kind.capture', null, 'Capture');
    if (type.indexOf('file.') === 0) return translate('ui.kind.file', null, 'File');
    if (type.indexOf('note.') === 0) return translate('ui.kind.note', null, 'Note');
    if (type.indexOf('workspace') !== -1 || type.indexOf('case.') === 0) return translate('ui.kind.deal', null, 'Deal');
    if (type.indexOf('action.') === 0) return translate('ui.kind.work', null, 'Work');
    return translate('ui.kind.activity', null, 'Activity');
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
      if (key.indexOf(DISMISSAL_PREFIX) !== 0) return;
      var workspace = decodeStoredWorkspace(key, DISMISSAL_PREFIX);
      if (!workspace) return;
      dismissed[workspace] = {};
      if (Array.isArray(settings[key])) {
        settings[key].forEach(function (candidateId) {
          candidateId = text(candidateId).trim();
          if (candidateId) dismissed[workspace][candidateId] = true;
        });
        return;
      }
      if (settings[key] && typeof settings[key] === 'object') dismissed[workspace] = settings[key];
    });
    return dismissed;
  }

  function candidateAfterWatermark(candidate, watermark) {
    if (!watermark || watermark === true) return watermark === true ? null : candidate;
    var handledTime = Date.parse(watermark.handledThrough || '');
    if (!Number.isFinite(handledTime)) return candidate;
    var additions = candidate.activities.filter(function (activity) { return eventTimeMs(activity) > handledTime; });
    if (eventTimeMs({ occurredAt: candidate.endedAt }) <= handledTime || additions.length < MIN_SESSION_ACTIVITY_COUNT || eventTimeMs(additions[additions.length - 1]) - handledTime < MIN_SESSION_DURATION_MINUTES * 60 * 1000) return null;
    var duration = sessionDurationMinutes({ activities: additions });
    if (duration < MIN_SESSION_DURATION_MINUTES) return null;
    return Object.assign({}, candidate, {
      startedAt: toISOTime(eventTimeMs(additions[0])),
      estimatedMinutes: duration,
      activityCount: additions.length,
      activityIds: additions.map(function (activity) { return activity.activityId; }),
      activities: additions.map(candidateActivity)
    });
  }

  function visibleCandidates(activityList, workspaceFilter, sessionRegistry, dismissedByWorkspace, handledSessions) {
    return buildWorkSessionCandidates(activityList, workspaceFilter, sessionRegistry).map(function (candidate) {
      var dismissed = dismissedByWorkspace && dismissedByWorkspace[candidate.workspaceRootPath];
      var watermark = handledSessions && handledSessions[candidate.sessionId];
      return candidateAfterWatermark(candidate, watermark || (dismissed && (dismissed[candidate.sessionId] || dismissed[candidate.candidateId])));
    }).filter(Boolean);
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
    var handledSessions = {};
    var sessionRegistry = normalizeSessionRegistry({});
    function tr(key, params, fallback) {
      if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
      return fallback || key;
    }
    var statusText = tr('ui.loading', null, 'Loading activity...');
    var statusClass = '';
    var disposed = false;
    var unsubscribers = [];

    function reportError(key, fallback, err) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('[verstak.activity] ' + key, err);
      }
      statusText = tr(key, null, fallback);
      statusClass = 'error';
    }

    var toolbar = el('div', { className: 'activity-toolbar' });
    var titleEl = el('span', { className: 'activity-title', textContent: scope.mode === 'global' ? tr('ui.title', null, 'Activity') : tr('ui.workspaceTitle', { workspace: scope.label }, 'Activity · ' + scope.label) });
    var countEl = el('span', { className: 'activity-count' });
    var statusEl = el('span', { className: 'activity-status' });
    var clearBtn = el('button', {
      className: 'activity-btn danger',
      'data-activity-action': 'clear',
      textContent: tr('ui.clear', null, 'Clear'),
      onClick: showClearConfirmation
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
    var modalHost = el('div', { className: 'activity-modal-host', hidden: 'hidden' });
    containerEl.appendChild(toolbar);
    containerEl.appendChild(candidatesEl);
    containerEl.appendChild(listEl);
    containerEl.appendChild(modalHost);

    function candidatesForWorkspace(workspaceRoot) {
      return visibleCandidates(candidateSourceEvents, workspaceRoot, sessionRegistry, dismissedByWorkspace, handledSessions);
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
      return api.settings.write(dismissalStorageKey(workspaceRoot), dismissed);
    }

    function persistSessionRegistry() {
      if (!api || !api.settings || typeof api.settings.write !== 'function') return Promise.resolve();
      return api.settings.write(SESSION_REGISTRY_KEY, sessionRegistry);
    }

    function persist() {
      if (!api || !api.settings || typeof api.settings.write !== 'function') return Promise.resolve();
      var toStore = scope.mode === 'global'
        ? events.filter(function (item) { return !item._storageKey || item._storageKey === GLOBAL_KEY; })
        : events;
      return api.settings.write(scope.key, storageEvents(toStore)).then(persistSessionRegistry).then(persistCandidateCaches).catch(function (err) {
        reportError('ui.saveError', 'Could not save activity. Please try again.', err);
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
        handledSessions = {};
        sessionRegistry = normalizeSessionRegistry({});
        return Promise.all(keys.filter(function (key, index, all) {
          return all.indexOf(key) === index;
        }).map(function (key) {
          return api.settings.write(key, []);
        }));
      }).then(function () {
        statusText = tr('ui.cleared', null, 'Activity cleared');
        statusClass = '';
      }).catch(function (err) {
        reportError('ui.clearError', 'Could not clear activity. Please try again.', err);
      });
    }

    function closeClearConfirmation() {
      modalHost.innerHTML = '';
      modalHost.setAttribute('hidden', 'hidden');
    }

    function clearCurrentScope() {
      if (scope.mode === 'global') {
        return clearGlobal().then(render);
      }
      events = [];
      candidateSourceEvents = candidateSourceEvents.filter(function (activity) {
        return candidateWorkspace(activity) !== scope.workspaceRoot;
      });
      updateCandidates();
      return clearWorkspaceRaw(scope.workspaceRoot).then(persist).then(render);
    }

    function showClearConfirmation() {
      var scopeMessage = scope.mode === 'global'
        ? tr('ui.clearGlobalWarning', null, 'This permanently deletes all recorded activity and journal suggestions in every case.')
        : tr('ui.clearWorkspaceWarning', { workspace: scope.label }, 'This permanently deletes recorded activity for ' + scope.label + '. Activity in other cases remains.');
      var confirmBtn = el('button', {
        className: 'activity-btn danger destructive',
        type: 'button',
        'data-activity-clear-confirm': '',
        textContent: tr('ui.confirmClear', null, 'Clear activity'),
        onClick: function () {
          confirmBtn.disabled = true;
          clearCurrentScope().then(closeClearConfirmation);
        }
      });
      modalHost.innerHTML = '';
      if (typeof modalHost.removeAttribute === 'function') modalHost.removeAttribute('hidden');
      else delete modalHost.attributes.hidden;
      modalHost.appendChild(el('div', {
        className: 'activity-modal-overlay',
        onClick: function (event) {
          if (event.target === event.currentTarget) closeClearConfirmation();
        }
      }, [
        el('div', { className: 'activity-modal', role: 'dialog', 'aria-modal': 'true', 'data-activity-clear-confirmation': '' }, [
          el('div', { className: 'activity-modal-title', textContent: tr('ui.clearConfirmTitle', null, 'Clear activity?') }),
          el('div', { className: 'activity-modal-copy', textContent: scopeMessage }),
          el('div', { className: 'activity-modal-actions' }, [
            el('button', { className: 'activity-btn', type: 'button', 'data-activity-clear-cancel': '', textContent: tr('ui.cancel', null, 'Cancel'), onClick: closeClearConfirmation }),
            confirmBtn
          ])
        ])
      ]));
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
              el('span', { className: 'activity-type', textContent: eventKind(activity, tr) }),
              el('span', { className: 'activity-title-text', textContent: humanEventTitle(activity, tr) })
            ]),
            activity.summary ? el('div', { className: 'activity-summary', textContent: activity.summary }) : null
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
      dismissedByWorkspace[candidate.workspaceRootPath][candidate.sessionId || candidate.candidateId] = {
        handledThrough: candidate.handledThrough || candidate.endedAt,
        handledAt: new Date().toISOString(),
        status: 'dismissed'
      };
      updateCandidates();
      Promise.all([
        persistDismissals(candidate.workspaceRootPath),
        persistCandidateCache(candidate.workspaceRootPath)
      ]).then(function () {
        statusText = tr('ui.dismissed', null, 'Candidate dismissed');
        statusClass = '';
      }).catch(function (err) {
        reportError('ui.dismissError', 'Could not dismiss the suggestion. Please try again.', err);
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
              el('div', { textContent: tr('ui.candidateDeal', { deal: candidate.workspaceRootPath }, 'Deal: ' + candidate.workspaceRootPath) }),
              el('div', { textContent: tr('ui.candidateTime', { time: candidateTimeRange(candidate) }, 'Time: ' + candidateTimeRange(candidate)) }),
              el('div', { textContent: tr('ui.candidateDuration', { minutes: candidate.estimatedMinutes }, 'Estimated duration: ' + candidate.estimatedMinutes + ' min') }),
              el('div', { textContent: tr('ui.candidateActivities', { count: candidate.activityCount }, 'Activities: ' + candidate.activityCount) })
            ]),
            el('details', { className: 'activity-candidate-activities' }, [
              el('summary', { textContent: tr('ui.includedActivities', { count: candidate.activityCount }, 'Included activities (' + candidate.activityCount + ')') })
            ].concat(candidate.activities.map(function (activity) {
                return el('div', { className: 'activity-candidate-activity', textContent: activity.occurredAt + ' · ' + humanEventTitle(activity, tr) });
            })))
          ]),
          el('div', { className: 'activity-candidate-actions' }, [
            el('div', { className: 'activity-candidate-duration', textContent: tr('ui.minutes', { count: candidate.estimatedMinutes }, candidate.estimatedMinutes + ' min') }),
            el('button', { className: 'activity-btn', type: 'button', 'data-work-session-action': 'review', textContent: tr('ui.review', null, 'Review'), onClick: function () { reviewCandidate(candidate); } }),
            el('button', { className: 'activity-btn', type: 'button', 'data-work-session-action': 'dismiss', textContent: tr('ui.dismiss', null, 'Dismiss'), onClick: function () { dismissCandidate(candidate); } })
          ])
        ]));
      });
    }

    function render() {
      countEl.textContent = tr(events.length === 1 ? 'ui.eventCount.one' : 'ui.eventCount.many', { count: events.length }, events.length + ' event' + (events.length === 1 ? '' : 's'));
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
        sessionRegistry = normalizeSessionRegistry(settings[SESSION_REGISTRY_KEY]);
        handledSessions = settings["activity-session-handling-v2"] && typeof settings["activity-session-handling-v2"] === 'object'
          ? settings["activity-session-handling-v2"]
          : {};
        candidateSourceEvents = rawRecords.length ? eventsFromRecords(rawRecords, '') : eventsFromSettings(settings, '');
        sessionRegistry = pruneSessionRegistry(sessionRegistry, candidateSourceEvents);
        events = rawRecords.length
          ? eventsFromRecords(rawRecords, scope.mode === 'workspace' ? scope.workspaceRoot : '')
          : eventsFromSettings(settings, scope.mode === 'workspace' ? scope.workspaceRoot : '');
        dismissedByWorkspace = dismissedCandidatesFromSettings(settings);
        updateCandidates();
        return persistSessionRegistry().then(persistCandidateCaches);
      }).catch(function (err) {
        reportError('ui.loadError', 'Could not load activity. Please try again.', err);
      });
    }

    function listWorkSessionCandidates(args) {
      var workspace = cleanWorkspace(args && args.workspaceRootPath);
      if (!api || !api.settings || typeof api.settings.read !== 'function') {
        return Promise.resolve({ candidates: visibleCandidates(candidateSourceEvents, workspace || (scope.mode === 'workspace' ? scope.workspaceRoot : ''), sessionRegistry, dismissedByWorkspace, handledSessions) });
      }
      var readRaw = api.storage && api.storage.data && typeof api.storage.data.readNDJSON === 'function'
        ? api.storage.data.readNDJSON(RAW_DATA_NAME)
        : Promise.resolve([]);
      return Promise.all([api.settings.read(), readRaw]).then(function (results) {
        var settings = results[0] || {};
        var rawRecords = Array.isArray(results[1]) ? results[1] : [];
        var source = rawRecords.length ? eventsFromRecords(rawRecords, '') : eventsFromSettings(settings, '');
        return { candidates: visibleCandidates(source, workspace, sessionRegistry, dismissedCandidatesFromSettings(settings), settings["activity-session-handling-v2"] || {}) };
      }).catch(function () {
        return { candidates: [] };
      });
    }

    function registerCommands() {
      if (!api || !api.commands || typeof api.commands.register !== 'function') return Promise.resolve();
      return api.commands.register(WORKLOG_COMMAND_ID, listWorkSessionCandidates).then(function (unregister) {
        if (typeof unregister === 'function') unsubscribers.push(unregister);
      }).catch(function (err) {
        reportError('ui.commandsUnavailable', 'Activity actions are unavailable. Please try again.', err);
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
        statusText = scope.mode === 'global'
          ? tr('ui.listeningGlobal', null, 'Listening for all activity')
          : tr('ui.listeningDeal', null, 'Listening for Deal activity');
        statusClass = '';
      }).catch(function (err) {
        reportError('ui.subscriptionsUnavailable', 'Activity updates are unavailable. Please try again.', err);
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
