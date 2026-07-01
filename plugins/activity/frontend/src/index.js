/* ===========================================================
   Activity Plugin - Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  var PLUGIN_ID = 'verstak.activity';
  var MAX_EVENTS = 250;
  var MAX_SUGGESTIONS = 12;
  var LEGACY_KEY = 'events';
  var GLOBAL_KEY = 'events:global';
  var WORKSPACE_PREFIX = 'events:workspace:';
  var WORKLOG_COMMAND_ID = 'verstak.activity.suggestWorklog';
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
    'browser.capture.converted'
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
    'browser.capture.converted': 'Capture converted'
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
    '.activity-suggestions{border-bottom:1px solid rgba(32,43,70,.72);background:var(--vt-color-surface-muted,#111629);padding:.65rem .75rem;display:grid;gap:.5rem}',
    '.activity-suggestions-title{font-size:.76rem;font-weight:600;color:var(--vt-color-text-muted,#7f8aa3);text-transform:uppercase;letter-spacing:.04em}',
    '.activity-suggestion{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.65rem;align-items:start;padding:.65rem .75rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c)}',
    '.activity-suggestion-title{font-size:.84rem;color:var(--vt-color-text-primary,#f4f7fb);font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.activity-suggestion-summary{margin-top:.22rem;font-size:.76rem;color:var(--vt-color-text-secondary,#b7c0d4);line-height:1.4;white-space:pre-wrap;overflow-wrap:anywhere}',
    '.activity-suggestion-minutes{font-size:.76rem;color:var(--vt-color-accent,#4ecca3);white-space:nowrap}',
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
    '@media(max-width:760px){.activity-row,.activity-suggestion{grid-template-columns:1fr;gap:.25rem}.activity-toolbar{align-items:stretch}.activity-status{width:100%}}'
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

  function eventDay(activity) {
    var value = activity && (activity.occurredAt || activity.receivedAt);
    var date = value ? new Date(value) : null;
    if (date && !isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    return text(value).slice(0, 10) || 'unknown-date';
  }

  function suggestionWorkspace(activity) {
    return cleanWorkspace(activity && (activity.workspaceRootPath || workspaceFromPayload(activity.payload || {}))) || 'Global';
  }

  function roundUpQuarterHour(minutes) {
    return Math.ceil(minutes / 15) * 15;
  }

  function estimateMinutes(groupEvents) {
    if (!groupEvents.length) return 0;
    if (groupEvents.length === 1) return 15;
    var first = eventTimeMs(groupEvents[0]);
    var last = eventTimeMs(groupEvents[groupEvents.length - 1]);
    if (!first || !last || last <= first) return 15;
    return Math.max(15, Math.min(480, roundUpQuarterHour((last - first) / 60000)));
  }

  function eventLabel(activity) {
    return humanEventTitle(activity);
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

  function summarizeEvents(groupEvents) {
    var labels = [];
    groupEvents.forEach(function (activity) {
      var label = eventLabel(activity);
      if (label && labels.indexOf(label) === -1) labels.push(label);
    });
    var visible = labels.slice(0, 3);
    var suffix = labels.length > 3 ? ' +' + (labels.length - 3) + ' more' : '';
    return (visible.join('; ') || groupEvents.length + ' activity events') + suffix;
  }

  function buildWorklogSuggestions(activityList, workspaceFilter) {
    var filter = cleanWorkspace(workspaceFilter);
    var groups = {};
    sortEvents(activityList || []).filter(isMeaningfulActivity).forEach(function (activity) {
      var workspace = suggestionWorkspace(activity);
      if (filter && workspace !== filter) return;
      var day = eventDay(activity);
      var key = workspace + '|' + day;
      groups[key] = groups[key] || { workspaceRootPath: workspace, date: day, events: [] };
      groups[key].events.push(activity);
    });
    return Object.keys(groups).map(function (key) {
      var group = groups[key];
      var ordered = group.events.slice().sort(function (a, b) {
        return eventTimeMs(a) - eventTimeMs(b);
      });
      var eventIds = ordered.map(function (activity) { return activity.activityId; }).filter(Boolean);
      var suggestionId = 'worklog:' + group.workspaceRootPath + ':' + group.date;
      return {
        suggestionId: suggestionId,
        workspaceRootPath: group.workspaceRootPath,
        date: group.date,
        title: group.workspaceRootPath + ' work on ' + group.date,
        summary: summarizeEvents(ordered),
        minutes: estimateMinutes(ordered),
        eventIds: eventIds
      };
    }).sort(function (a, b) {
      return b.date.localeCompare(a.date) || a.workspaceRootPath.localeCompare(b.workspaceRootPath);
    }).slice(0, MAX_SUGGESTIONS);
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
      return sortEvents(all).filter(isMeaningfulActivity);
    }
    var workspaceKey = WORKSPACE_PREFIX + encodeKey(workspace);
    var scopedEvents = normalizeStoredEvents(settings[workspaceKey], workspaceKey);
    var globalEvents = normalizeStoredEvents(settings[GLOBAL_KEY], GLOBAL_KEY).filter(function (item) {
      return item.workspaceRootPath === workspace;
    });
    var legacyEvents = normalizeStoredEvents(settings[LEGACY_KEY], LEGACY_KEY).filter(function (item) {
      return item.workspaceRootPath === workspace;
    });
    return sortEvents(scopedEvents.concat(globalEvents, legacyEvents)).filter(isMeaningfulActivity);
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
    var suggestions = [];
    var statusText = 'Loading activity...';
    var statusClass = '';
    var disposed = false;
    var unsubscribers = [];

    var toolbar = el('div', { className: 'activity-toolbar' });
    var titleEl = el('span', { className: 'activity-title', textContent: scope.mode === 'global' ? 'Activity' : 'Activity · ' + scope.label });
    var countEl = el('span', { className: 'activity-count' });
    var statusEl = el('span', { className: 'activity-status' });
    var clearBtn = el('button', {
      className: 'activity-btn danger',
      'data-activity-action': 'clear',
      textContent: 'Clear',
      onClick: function () {
        if (scope.mode === 'global') {
          clearGlobal().then(render);
          return;
        }
        events = [];
        updateSuggestions();
        persist().then(render);
      }
    });
    toolbar.appendChild(titleEl);
    toolbar.appendChild(countEl);
    toolbar.appendChild(el('span', { className: 'activity-spacer' }));
    toolbar.appendChild(statusEl);
    toolbar.appendChild(clearBtn);

    var suggestionsEl = el('div', {
      className: 'activity-suggestions',
      'data-activity-section': 'worklog-suggestions'
    });
    var listEl = el('div', { className: 'activity-list' });
    containerEl.appendChild(toolbar);
    containerEl.appendChild(suggestionsEl);
    containerEl.appendChild(listEl);

    function updateSuggestions() {
      suggestions = buildWorklogSuggestions(events, scope.mode === 'workspace' ? scope.workspaceRoot : '');
    }

    function persist() {
      if (!api || !api.settings || typeof api.settings.write !== 'function') return Promise.resolve();
      var toStore = scope.mode === 'global'
        ? events.filter(function (item) { return !item._storageKey || item._storageKey === GLOBAL_KEY; })
        : events;
      return api.settings.write(scope.key, storageEvents(toStore)).catch(function (err) {
        statusText = 'Could not save activity: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
      });
    }

    function clearGlobal() {
      if (!api || !api.settings || typeof api.settings.read !== 'function' || typeof api.settings.write !== 'function') {
        events = [];
        return Promise.resolve();
      }
      return api.settings.read().then(function (settings) {
        var keys = globalEventKeys(settings || {});
        events = [];
        return Promise.all(keys.map(function (key) {
          return api.settings.write(key, []);
        }));
      }).then(function () {
        statusText = 'Activity cleared';
        statusClass = '';
      }).catch(function (err) {
        statusText = 'Could not clear activity: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
      });
    }

    function renderList() {
      listEl.innerHTML = '';
      if (events.length === 0) {
        listEl.appendChild(el('div', { className: 'activity-empty' }, [
          el('div', { className: 'activity-empty-title', textContent: 'No activity events yet' }),
          el('div', { textContent: 'File changes, browser captures, and conversions will appear here.' })
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
              el('summary', {}, ['Details']),
              el('div', { className: 'activity-source', textContent: 'Event: ' + activity.type + (activity.sourcePluginId ? ' · Source: ' + activity.sourcePluginId : '') })
            ])
          ])
        ]));
      });
    }

    function renderSuggestions() {
      suggestionsEl.innerHTML = '';
      if (!suggestions.length) {
        suggestionsEl.setAttribute('hidden', 'hidden');
        return;
      }
      if (typeof suggestionsEl.removeAttribute === 'function') suggestionsEl.removeAttribute('hidden');
      else delete suggestionsEl.attributes.hidden;
      suggestionsEl.appendChild(el('div', { className: 'activity-suggestions-title', textContent: 'Worklog suggestions' }));
      suggestions.forEach(function (suggestion) {
        suggestionsEl.appendChild(el('div', {
          className: 'activity-suggestion',
          'data-worklog-suggestion': suggestion.suggestionId
        }, [
          el('div', {}, [
            el('div', { className: 'activity-suggestion-title', textContent: suggestion.title }),
            el('div', { className: 'activity-suggestion-summary', textContent: suggestion.summary })
          ]),
          el('div', { className: 'activity-suggestion-minutes', textContent: suggestion.minutes + ' min' })
        ]));
      });
    }

    function render() {
      countEl.textContent = events.length + ' event' + (events.length === 1 ? '' : 's');
      clearBtn.disabled = events.length === 0;
      statusEl.textContent = statusText;
      statusEl.className = 'activity-status' + (statusClass ? ' ' + statusClass : '');
      updateSuggestions();
      renderSuggestions();
      renderList();
    }

    function loadStored() {
      if (!api || !api.settings || typeof api.settings.read !== 'function') return Promise.resolve();
      if (scope.mode === 'global') {
        return api.settings.read().then(function (settings) {
          events = eventsFromSettings(settings || {}, '');
        }).catch(function (err) {
          statusText = 'Could not load activity: ' + (err && err.message ? err.message : String(err));
          statusClass = 'error';
        });
      }
      return api.settings.read().then(function (settings) {
        events = eventsFromSettings(settings || {}, scope.workspaceRoot);
      }).catch(function (err) {
        statusText = 'Could not load activity: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
      });
    }

    function suggestWorklog(args) {
      var workspace = cleanWorkspace(args && args.workspaceRootPath);
      if (!api || !api.settings || typeof api.settings.read !== 'function') {
        return Promise.resolve({ suggestions: buildWorklogSuggestions(events, workspace || (scope.mode === 'workspace' ? scope.workspaceRoot : '')) });
      }
      return api.settings.read().then(function (settings) {
        var sourceEvents = eventsFromSettings(settings || {}, workspace);
        return { suggestions: buildWorklogSuggestions(sourceEvents, workspace) };
      }).catch(function () {
        return { suggestions: [] };
      });
    }

    function registerCommands() {
      if (!api || !api.commands || typeof api.commands.register !== 'function') return Promise.resolve();
      return api.commands.register(WORKLOG_COMMAND_ID, suggestWorklog).then(function (unregister) {
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
