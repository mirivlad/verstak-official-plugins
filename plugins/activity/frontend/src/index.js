/* ===========================================================
   Activity Plugin - Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  var PLUGIN_ID = 'verstak.activity';
  var MAX_EVENTS = 250;
  var LEGACY_KEY = 'events';
  var GLOBAL_KEY = 'events:global';
  var WORKSPACE_PREFIX = 'events:workspace:';
  var ACTIVITY_EVENTS = [
    'file.opened',
    'file.changed',
    'note.saved',
    'action.started',
    'browser.capture.received',
    'case.selected',
    'browser.capture.page',
    'browser.capture.selection',
    'browser.capture.link'
  ];

  function injectStyles() {
    if (document.getElementById('activity-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'activity-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  var STYLES = [
    '.activity-root{display:flex;flex-direction:column;height:100%;min-height:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:#e0e0e0;background:#0d0d1a}',
    '.activity-toolbar{display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;border-bottom:1px solid #16213e;background:#12122a;flex-shrink:0;flex-wrap:wrap}',
    '.activity-title{font-size:.84rem;font-weight:600;color:#e0e0e0}',
    '.activity-count{font-size:.72rem;color:#8b8ba8}',
    '.activity-spacer{flex:1}',
    '.activity-btn{font-size:.78rem;padding:.32rem .65rem;border:1px solid #333;border-radius:4px;background:#1a1a2e;color:#ccc;cursor:pointer}',
    '.activity-btn:hover{background:#2a2a4e;border-color:#4ecca3}',
    '.activity-btn:disabled{opacity:.45;cursor:default}',
    '.activity-btn.danger{border-color:#633;color:#ff9a9a}',
    '.activity-status{font-size:.72rem;color:#8b8ba8;white-space:nowrap}',
    '.activity-status.error{color:#e74c3c}',
    '.activity-list{flex:1;min-height:0;overflow:auto;background:#101020}',
    '.activity-empty{height:100%;display:flex;align-items:center;justify-content:center;color:#666;font-size:.86rem;padding:2rem;text-align:center}',
    '.activity-row{display:grid;grid-template-columns:9.5rem minmax(0,1fr);gap:.75rem;padding:.72rem .85rem;border-bottom:1px solid rgba(22,33,62,.6)}',
    '.activity-time{font-size:.72rem;color:#777;white-space:nowrap}',
    '.activity-main{min-width:0}',
    '.activity-row-head{display:flex;align-items:center;gap:.45rem;min-width:0}',
    '.activity-type{font-size:.68rem;color:#4ecca3;text-transform:uppercase;letter-spacing:.04em;flex-shrink:0}',
    '.activity-title-text{font-size:.86rem;color:#e0e0e0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.activity-summary{margin-top:.25rem;font-size:.78rem;line-height:1.4;color:#aaa;white-space:pre-wrap;overflow-wrap:anywhere}',
    '.activity-source{margin-top:.25rem;font-size:.72rem;color:#777}',
    '@media(max-width:760px){.activity-row{grid-template-columns:1fr;gap:.25rem}.activity-toolbar{align-items:stretch}.activity-status{width:100%}}'
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

  function activityId() {
    return 'activity-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  }

  function eventPayload(event) {
    return event && event.payload && typeof event.payload === 'object' ? event.payload : {};
  }

  function firstText(values) {
    for (var i = 0; i < values.length; i += 1) {
      var value = text(values[i]).trim();
      if (value) return value;
    }
    return '';
  }

  function titleFromEvent(event, payload) {
    return firstText([
      payload.title,
      payload.name,
      payload.path,
      payload.url,
      payload.captureId,
      event.name,
      'Activity event'
    ]);
  }

  function summaryFromEvent(event, payload) {
    if (payload.text) return text(payload.text).trim();
    return firstText([
      payload.summary,
      payload.description,
      payload.path,
      payload.url,
      payload.domain,
      event.name
    ]);
  }

  function eventToActivity(event, scope) {
    var payload = eventPayload(event);
    var workspaceRoot = workspaceFromPayload(payload) || (scope && scope.workspaceRoot) || '';
    return {
      activityId: activityId(),
      type: text(event && event.name).trim() || 'activity.event',
      title: titleFromEvent(event || {}, payload),
      summary: summaryFromEvent(event || {}, payload),
      occurredAt: text(payload.occurredAt || payload.capturedAt || (event && event.timestamp) || new Date().toISOString()),
      receivedAt: new Date().toISOString(),
      sourcePluginId: text((event && event.pluginId) || payload.pluginId || payload.sourcePluginId),
      workspaceRootPath: workspaceRoot,
      payload: payload
    };
  }

  function manualActivity(scope) {
    return {
      activityId: activityId(),
      type: 'activity.manual',
      title: 'Manual activity',
      summary: 'Manually recorded activity event',
      occurredAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      sourcePluginId: PLUGIN_ID,
      workspaceRootPath: (scope && scope.workspaceRoot) || '',
      payload: {}
    };
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

  function globalEventKeys(settings) {
    var keys = [LEGACY_KEY, GLOBAL_KEY];
    Object.keys(settings || {}).forEach(function (key) {
      if (key.indexOf(WORKSPACE_PREFIX) === 0 && keys.indexOf(key) === -1) keys.push(key);
    });
    return keys;
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
    var statusText = 'Loading activity...';
    var statusClass = '';
    var disposed = false;
    var unsubscribers = [];

    var toolbar = el('div', { className: 'activity-toolbar' });
    var titleEl = el('span', { className: 'activity-title', textContent: scope.mode === 'global' ? 'Activity' : 'Activity · ' + scope.label });
    var countEl = el('span', { className: 'activity-count' });
    var statusEl = el('span', { className: 'activity-status' });
    var manualBtn = el('button', {
      className: 'activity-btn',
      'data-activity-action': 'manual',
      textContent: 'Record',
      onClick: function () {
        addActivity(manualActivity(scope));
      }
    });
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
        persist().then(render);
      }
    });
    toolbar.appendChild(titleEl);
    toolbar.appendChild(countEl);
    toolbar.appendChild(el('span', { className: 'activity-spacer' }));
    toolbar.appendChild(statusEl);
    toolbar.appendChild(manualBtn);
    toolbar.appendChild(clearBtn);

    var listEl = el('div', { className: 'activity-list' });
    containerEl.appendChild(toolbar);
    containerEl.appendChild(listEl);

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

    function addActivity(activity) {
      activity._storageKey = scope.key;
      events = sortEvents([activity].concat(events));
      statusText = 'Activity recorded';
      statusClass = '';
      return persist().then(render);
    }

    function renderList() {
      listEl.innerHTML = '';
      if (events.length === 0) {
        listEl.appendChild(el('div', { className: 'activity-empty', textContent: 'No activity events yet.' }));
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
              el('span', { className: 'activity-type', textContent: activity.type }),
              el('span', { className: 'activity-title-text', textContent: activity.title || 'Activity event' })
            ]),
            activity.summary ? el('div', { className: 'activity-summary', textContent: activity.summary }) : null,
            activity.sourcePluginId ? el('div', { className: 'activity-source', textContent: activity.sourcePluginId }) : null
          ])
        ]));
      });
    }

    function render() {
      countEl.textContent = events.length + ' event' + (events.length === 1 ? '' : 's');
      clearBtn.disabled = events.length === 0;
      statusEl.textContent = statusText;
      statusEl.className = 'activity-status' + (statusClass ? ' ' + statusClass : '');
      renderList();
    }

    function loadStored() {
      if (!api || !api.settings || typeof api.settings.read !== 'function') return Promise.resolve();
      if (scope.mode === 'global') {
        return api.settings.read().then(function (settings) {
          var all = [];
          globalEventKeys(settings || {}).forEach(function (key) {
            all = all.concat(normalizeStoredEvents((settings || {})[key], key));
          });
          events = sortEvents(all);
        }).catch(function (err) {
          statusText = 'Could not load activity: ' + (err && err.message ? err.message : String(err));
          statusClass = 'error';
        });
      }
      return api.settings.read().then(function (settings) {
        var scopedEvents = normalizeStoredEvents((settings || {})[scope.key], scope.key);
        var globalEvents = normalizeStoredEvents((settings || {})[GLOBAL_KEY], GLOBAL_KEY).filter(function (item) {
          return item.workspaceRootPath === scope.workspaceRoot;
        });
        var legacyEvents = normalizeStoredEvents((settings || {})[LEGACY_KEY], LEGACY_KEY).filter(function (item) {
          return item.workspaceRootPath === scope.workspaceRoot;
        });
        events = sortEvents(scopedEvents.concat(globalEvents, legacyEvents));
      }).catch(function (err) {
        statusText = 'Could not load activity: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
      });
    }

    function subscribeEvents() {
      if (!api || !api.events || typeof api.events.subscribe !== 'function') return Promise.resolve();
      return Promise.all(ACTIVITY_EVENTS.map(function (eventName) {
        return api.events.subscribe(eventName, function (event) {
          var eventWorkspace = workspaceFromPayload(eventPayload(event));
          if (scope.mode === 'workspace' && eventWorkspace && eventWorkspace !== scope.workspaceRoot) return Promise.resolve();
          return addActivity(eventToActivity(event, scope));
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
