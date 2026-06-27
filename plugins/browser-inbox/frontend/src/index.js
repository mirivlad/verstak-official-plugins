/* ===========================================================
   Browser Inbox Plugin — Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  var PLUGIN_ID = 'verstak.browser-inbox';
  var CAPTURE_EVENTS = ['browser.capture.page', 'browser.capture.selection', 'browser.capture.link'];
  var MAX_CAPTURES = 100;
  var LEGACY_KEY = 'captures';
  var GLOBAL_KEY = 'captures:global';
  var WORKSPACE_PREFIX = 'captures:workspace:';

  function injectStyles() {
    if (document.getElementById('browser-inbox-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'browser-inbox-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  var STYLES = [
    '.browser-inbox-root{display:flex;flex-direction:column;height:100%;min-height:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:#e0e0e0;background:#0d0d1a}',
    '.browser-inbox-toolbar{display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;border-bottom:1px solid #16213e;background:#12122a;flex-shrink:0;flex-wrap:wrap}',
    '.browser-inbox-title{font-size:.82rem;font-weight:600;color:#e0e0e0}',
    '.browser-inbox-count{font-size:.72rem;color:#8b8ba8}',
    '.browser-inbox-spacer{flex:1}',
    '.browser-inbox-btn{font-size:.78rem;padding:.32rem .65rem;border:1px solid #333;border-radius:4px;background:#1a1a2e;color:#ccc;cursor:pointer}',
    '.browser-inbox-btn:hover{background:#2a2a4e;border-color:#4ecca3}',
    '.browser-inbox-btn:disabled{opacity:.45;cursor:default}',
    '.browser-inbox-btn.danger{border-color:#633;color:#ff9a9a}',
    '.browser-inbox-status{font-size:.72rem;color:#8b8ba8;white-space:nowrap}',
    '.browser-inbox-status.error{color:#e74c3c}',
    '.browser-inbox-body{display:grid;grid-template-columns:minmax(260px,360px) minmax(0,1fr);flex:1;min-height:0}',
    '.browser-inbox-list{min-height:0;overflow:auto;border-right:1px solid #16213e;background:#101020}',
    '.browser-inbox-empty{height:100%;display:flex;align-items:center;justify-content:center;color:#666;font-size:.86rem;padding:2rem;text-align:center}',
    '.browser-inbox-row{display:flex;flex-direction:column;gap:.22rem;padding:.65rem .75rem;border-bottom:1px solid rgba(22,33,62,.6);cursor:pointer}',
    '.browser-inbox-row:hover{background:#17172d}',
    '.browser-inbox-row.selected{background:#1a2a3a}',
    '.browser-inbox-row-head{display:flex;align-items:center;gap:.45rem;min-width:0}',
    '.browser-inbox-kind{font-size:.68rem;color:#4ecca3;text-transform:uppercase;letter-spacing:.04em;flex-shrink:0}',
    '.browser-inbox-row-title{font-size:.86rem;color:#e0e0e0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.browser-inbox-row-url{font-size:.72rem;color:#8b8ba8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.browser-inbox-row-text{font-size:.76rem;color:#aaa;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.browser-inbox-detail{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:auto;padding:1rem;gap:.75rem}',
    '.browser-inbox-detail-empty{margin:auto;color:#666;font-size:.86rem}',
    '.browser-inbox-detail-title{font-size:1rem;font-weight:600;color:#f0f0f0;word-break:break-word}',
    '.browser-inbox-meta{display:grid;grid-template-columns:7rem minmax(0,1fr);gap:.35rem .75rem;font-size:.78rem}',
    '.browser-inbox-meta-label{color:#777}',
    '.browser-inbox-meta-value{color:#ccc;min-width:0;overflow-wrap:anywhere}',
    '.browser-inbox-text{border:1px solid #24304f;background:#101020;border-radius:6px;padding:.75rem;font-size:.85rem;line-height:1.5;color:#ddd;white-space:pre-wrap;overflow-wrap:anywhere}',
    '.browser-inbox-detail-actions{display:flex;gap:.5rem;flex-wrap:wrap}',
    '@media(max-width:760px){.browser-inbox-body{grid-template-columns:1fr}.browser-inbox-list{border-right:0;border-bottom:1px solid #16213e;max-height:45vh}.browser-inbox-meta{grid-template-columns:1fr}}'
  ].join('\n');

  function el(tag, attrs, children) {
    var elem = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') elem.className = attrs[k];
        else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(elem.style, attrs[k]);
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
    return cleanWorkspace(payload && (payload.workspaceRootPath || payload.workspaceName || payload.workspaceNodeId));
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

  function cleanKind(value) {
    value = text(value).trim();
    return value === 'selection' || value === 'link' || value === 'page' ? value : 'page';
  }

  function displayTitle(capture) {
    return capture.title || capture.url || capture.captureId || 'Untitled capture';
  }

  function eventPayload(event) {
    if (!event || !event.payload) return {};
    return event.payload;
  }

  function captureFromEvent(event, scope) {
    var payload = eventPayload(event);
    var captureId = text(payload.captureId).trim();
    if (!captureId) {
      captureId = 'capture-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    }
    return {
      captureId: captureId,
      capturedAt: text(payload.capturedAt || event.timestamp || new Date().toISOString()),
      receivedAt: new Date().toISOString(),
      kind: cleanKind(payload.kind || text(event.name).replace('browser.capture.', '')),
      url: text(payload.url).trim(),
      title: text(payload.title).trim(),
      domain: text(payload.domain).trim(),
      text: text(payload.text).trim(),
      source: text(payload.source).trim(),
      browserName: text(payload.browserName).trim(),
      workspaceRootPath: workspaceFromPayload(payload) || (scope && scope.workspaceRoot) || ''
    };
  }

  function normalizeStoredCaptures(value, storageKey) {
    if (!Array.isArray(value)) return [];
    return value.filter(function (item) {
      return item && typeof item === 'object' && item.captureId;
    }).map(function (item) {
      return {
        captureId: text(item.captureId),
        capturedAt: text(item.capturedAt),
        receivedAt: text(item.receivedAt),
        kind: cleanKind(item.kind),
        url: text(item.url),
        title: text(item.title),
        domain: text(item.domain),
        text: text(item.text),
        source: text(item.source),
        browserName: text(item.browserName),
        workspaceRootPath: cleanWorkspace(item.workspaceRootPath),
        _storageKey: storageKey || ''
      };
    }).slice(0, MAX_CAPTURES);
  }

  function storageCaptures(captureList) {
    return captureList.map(function (item) {
      return {
        captureId: item.captureId,
        capturedAt: item.capturedAt,
        receivedAt: item.receivedAt,
        kind: item.kind,
        url: item.url,
        title: item.title,
        domain: item.domain,
        text: item.text,
        source: item.source,
        browserName: item.browserName,
        workspaceRootPath: item.workspaceRootPath
      };
    });
  }

  function sortCaptures(captureList) {
    var seen = {};
    return captureList.filter(function (item) {
      var key = item && item.captureId;
      if (!key) return false;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).slice().sort(function (a, b) {
      return text(b.capturedAt || b.receivedAt).localeCompare(text(a.capturedAt || a.receivedAt));
    }).slice(0, MAX_CAPTURES);
  }

  function globalCaptureKeys(settings) {
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

  function BrowserInboxView() {}

  BrowserInboxView.mount = function (containerEl, props, api) {
    injectStyles();
    containerEl.innerHTML = '';
    containerEl.className = 'browser-inbox-root';
    containerEl.setAttribute('data-plugin-id', PLUGIN_ID);

    var scope = scopeFromProps(props || {});
    var captures = [];
    var selectedId = '';
    var statusText = 'Connecting to receiver events...';
    var statusClass = '';
    var disposed = false;
    var unsubscribers = [];

    var toolbar = el('div', { className: 'browser-inbox-toolbar' });
    var titleEl = el('span', { className: 'browser-inbox-title', textContent: scope.mode === 'global' ? 'Browser Inbox' : 'Browser Inbox · ' + scope.label });
    var countEl = el('span', { className: 'browser-inbox-count' });
    var statusEl = el('span', { className: 'browser-inbox-status' });
    var clearBtn = el('button', {
      className: 'browser-inbox-btn danger',
      'data-browser-inbox-action': 'clear',
      textContent: 'Clear',
      onClick: function () {
        if (scope.mode === 'global') {
          clearGlobal().then(render);
          return;
        }
        captures = [];
        selectedId = '';
        persist().then(render);
      }
    });
    toolbar.appendChild(titleEl);
    toolbar.appendChild(countEl);
    toolbar.appendChild(el('span', { className: 'browser-inbox-spacer' }));
    toolbar.appendChild(statusEl);
    toolbar.appendChild(clearBtn);

    var body = el('div', { className: 'browser-inbox-body' });
    var listEl = el('div', { className: 'browser-inbox-list' });
    var detailEl = el('div', { className: 'browser-inbox-detail' });
    body.appendChild(listEl);
    body.appendChild(detailEl);
    containerEl.appendChild(toolbar);
    containerEl.appendChild(body);

    function persist() {
      if (!api || !api.settings || typeof api.settings.write !== 'function') return Promise.resolve();
      var toStore = scope.mode === 'global'
        ? captures.filter(function (item) { return !item._storageKey || item._storageKey === GLOBAL_KEY; })
        : captures;
      return api.settings.write(scope.key, storageCaptures(toStore)).catch(function (err) {
        statusText = 'Could not save inbox: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
      });
    }

    function clearGlobal() {
      if (!api || !api.settings || typeof api.settings.read !== 'function' || typeof api.settings.write !== 'function') {
        captures = [];
        selectedId = '';
        return Promise.resolve();
      }
      return api.settings.read().then(function (settings) {
        var keys = globalCaptureKeys(settings || {});
        captures = [];
        selectedId = '';
        return Promise.all(keys.map(function (key) {
          return api.settings.write(key, []);
        }));
      }).then(function () {
        statusText = 'Inbox cleared';
        statusClass = '';
      }).catch(function (err) {
        statusText = 'Could not clear inbox: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
      });
    }

    function selectedCapture() {
      for (var i = 0; i < captures.length; i += 1) {
        if (captures[i].captureId === selectedId) return captures[i];
      }
      return captures[0] || null;
    }

    function addCapture(capture) {
      var existing = captures.some(function (item) {
        return item.captureId === capture.captureId;
      });
      if (existing) return Promise.resolve();
      capture._storageKey = scope.key;
      captures = sortCaptures([capture].concat(captures));
      selectedId = capture.captureId;
      statusText = 'Capture received';
      statusClass = '';
      return persist().then(render);
    }

    function removeCapture(captureId) {
      captures = captures.filter(function (item) {
        return item.captureId !== captureId;
      });
      if (selectedId === captureId) selectedId = captures[0] ? captures[0].captureId : '';
      if (scope.mode !== 'global') return persist().then(render);
      if (!api || !api.settings || typeof api.settings.read !== 'function' || typeof api.settings.write !== 'function') return persist().then(render);
      return api.settings.read().then(function (settings) {
        return Promise.all(globalCaptureKeys(settings || {}).map(function (key) {
          var next = normalizeStoredCaptures((settings || {})[key], key).filter(function (item) {
            return item.captureId !== captureId;
          });
          return api.settings.write(key, storageCaptures(next));
        }));
      }).then(render);
    }

    function renderList() {
      listEl.innerHTML = '';
      if (captures.length === 0) {
        listEl.appendChild(el('div', { className: 'browser-inbox-empty', textContent: 'No browser captures yet. Keep this view open, then send a page, selection, or link from the extension.' }));
        return;
      }
      captures.forEach(function (capture) {
        var row = el('div', {
          className: 'browser-inbox-row' + (capture.captureId === selectedId ? ' selected' : ''),
          'data-browser-capture-id': capture.captureId,
          onClick: function () {
            selectedId = capture.captureId;
            render();
          }
        }, [
          el('div', { className: 'browser-inbox-row-head' }, [
            el('span', { className: 'browser-inbox-kind', textContent: capture.kind }),
            el('span', { className: 'browser-inbox-row-title', textContent: displayTitle(capture) })
          ]),
          el('div', { className: 'browser-inbox-row-url', textContent: capture.url || capture.domain || capture.captureId })
        ]);
        if (capture.text) {
          row.appendChild(el('div', { className: 'browser-inbox-row-text', textContent: capture.text }));
        }
        listEl.appendChild(row);
      });
    }

    function renderDetail() {
      detailEl.innerHTML = '';
      var capture = selectedCapture();
      if (!capture) {
        detailEl.appendChild(el('div', { className: 'browser-inbox-detail-empty', textContent: 'Select a capture to inspect it.' }));
        return;
      }
      selectedId = capture.captureId;
      detailEl.appendChild(el('div', { className: 'browser-inbox-detail-title', textContent: displayTitle(capture) }));
      detailEl.appendChild(el('div', { className: 'browser-inbox-meta' }, [
        el('div', { className: 'browser-inbox-meta-label', textContent: 'Kind' }),
        el('div', { className: 'browser-inbox-meta-value', textContent: capture.kind }),
        el('div', { className: 'browser-inbox-meta-label', textContent: 'URL' }),
        el('div', { className: 'browser-inbox-meta-value', textContent: capture.url || '-' }),
        el('div', { className: 'browser-inbox-meta-label', textContent: 'Domain' }),
        el('div', { className: 'browser-inbox-meta-value', textContent: capture.domain || '-' }),
        el('div', { className: 'browser-inbox-meta-label', textContent: 'Captured' }),
        el('div', { className: 'browser-inbox-meta-value', textContent: formatDate(capture.capturedAt) || '-' }),
        el('div', { className: 'browser-inbox-meta-label', textContent: 'Browser' }),
        el('div', { className: 'browser-inbox-meta-value', textContent: capture.browserName || capture.source || '-' })
      ]));
      if (capture.text) {
        detailEl.appendChild(el('div', { className: 'browser-inbox-text', textContent: capture.text }));
      }
      detailEl.appendChild(el('div', { className: 'browser-inbox-detail-actions' }, [
        el('button', {
          className: 'browser-inbox-btn danger',
          'data-browser-inbox-action': 'remove',
          textContent: 'Remove',
          onClick: function () {
            removeCapture(capture.captureId);
          }
        })
      ]));
    }

    function render() {
      countEl.textContent = captures.length + ' item' + (captures.length === 1 ? '' : 's');
      clearBtn.disabled = captures.length === 0;
      statusEl.textContent = statusText;
      statusEl.className = 'browser-inbox-status' + (statusClass ? ' ' + statusClass : '');
      renderList();
      renderDetail();
    }

    function loadStored() {
      if (!api || !api.settings || typeof api.settings.read !== 'function') return Promise.resolve();
      if (scope.mode === 'global') {
        return api.settings.read().then(function (settings) {
          var all = [];
          globalCaptureKeys(settings || {}).forEach(function (key) {
            all = all.concat(normalizeStoredCaptures((settings || {})[key], key));
          });
          captures = sortCaptures(all);
          if (!selectedId && captures[0]) selectedId = captures[0].captureId;
        }).catch(function (err) {
          statusText = 'Could not load inbox: ' + (err && err.message ? err.message : String(err));
          statusClass = 'error';
        });
      }
      return api.settings.read().then(function (settings) {
        var scopedCaptures = normalizeStoredCaptures((settings || {})[scope.key], scope.key);
        var globalCaptures = normalizeStoredCaptures((settings || {})[GLOBAL_KEY], GLOBAL_KEY).filter(function (item) {
          return item.workspaceRootPath === scope.workspaceRoot;
        });
        var legacyCaptures = normalizeStoredCaptures((settings || {})[LEGACY_KEY], LEGACY_KEY).filter(function (item) {
          return item.workspaceRootPath === scope.workspaceRoot;
        });
        captures = sortCaptures(scopedCaptures.concat(globalCaptures, legacyCaptures));
        if (!selectedId && captures[0]) selectedId = captures[0].captureId;
      }).catch(function (err) {
        statusText = 'Could not load inbox: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
      });
    }

    function subscribeEvents() {
      if (!api || !api.events || typeof api.events.subscribe !== 'function') return Promise.resolve();
      return Promise.all(CAPTURE_EVENTS.map(function (eventName) {
        return api.events.subscribe(eventName, function (event) {
          var eventWorkspace = workspaceFromPayload(eventPayload(event));
          if (scope.mode === 'workspace' && eventWorkspace && eventWorkspace !== scope.workspaceRoot) return Promise.resolve();
          return addCapture(captureFromEvent(event, scope));
        }).then(function (unsubscribe) {
          if (typeof unsubscribe === 'function') unsubscribers.push(unsubscribe);
        });
      })).then(function () {
        statusText = scope.mode === 'global' ? 'Receiver ready for all workspaces' : 'Receiver ready for workspace';
        statusClass = '';
      }).catch(function (err) {
        statusText = 'Receiver unavailable: ' + (err && err.message ? err.message : String(err));
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

    containerEl.__browserInboxUnmount = function () {
      disposed = true;
      while (unsubscribers.length > 0) {
        try {
          unsubscribers.pop()();
        } catch (err) {
          console.error('[BrowserInbox] unsubscribe error:', err);
        }
      }
    };
  };

  BrowserInboxView.unmount = function (containerEl) {
    if (containerEl && typeof containerEl.__browserInboxUnmount === 'function') {
      containerEl.__browserInboxUnmount();
      delete containerEl.__browserInboxUnmount;
    }
  };

  window.VerstakPluginRegister(PLUGIN_ID, {
    components: {
      BrowserInboxView: BrowserInboxView
    }
  });
})();
