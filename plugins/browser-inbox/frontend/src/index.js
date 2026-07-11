/* ===========================================================
   Browser Inbox Plugin — Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  var PLUGIN_ID = 'verstak.browser-inbox';
  var CAPTURE_EVENTS = ['browser.capture.page', 'browser.capture.selection', 'browser.capture.link', 'browser.capture.file'];
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
    '.browser-inbox-root{display:flex;flex-direction:column;height:100%;min-height:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:var(--vt-color-text-primary,#f4f7fb);background:var(--vt-color-background,#101020)}',
    '.browser-inbox-toolbar{display:flex;align-items:center;gap:.5rem;min-height:2.75rem;padding:.5rem .75rem;border-bottom:1px solid var(--vt-color-border,#202b46);background:var(--vt-color-surface-muted,#111629);flex-shrink:0;flex-wrap:wrap}',
    '.browser-inbox-title{font-size:.82rem;font-weight:600;color:var(--vt-color-text-primary,#f4f7fb)}',
    '.browser-inbox-count{font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.browser-inbox-filters{display:flex;align-items:center;gap:.35rem;min-width:0;flex:1;flex-wrap:wrap}',
    '.browser-inbox-input,.browser-inbox-select{box-sizing:border-box;min-height:1.85rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-surface,#15152c);color:var(--vt-color-text-secondary,#b7c0d4);font:inherit;font-size:.76rem;padding:.25rem .42rem}',
    '.browser-inbox-input{width:min(15rem,100%)}',
    '.browser-inbox-select{max-width:12rem}',
    '.browser-inbox-spacer{flex:1}',
    '.browser-inbox-btn{font-size:.78rem;padding:.32rem .65rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-secondary,#b7c0d4);cursor:pointer}',
    '.browser-inbox-btn:hover{background:var(--vt-color-surface-hover,#1b2440);border-color:var(--vt-color-accent,#4ecca3);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.browser-inbox-btn:disabled{opacity:.45;cursor:default}',
    '.browser-inbox-btn.danger{border-color:rgba(233,69,96,.42);color:#ff9a9a;background:var(--vt-color-danger-muted,rgba(233,69,96,.14))}',
    '.browser-inbox-status{font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3);white-space:nowrap}',
    '.browser-inbox-status.error{display:inline-flex;border:1px solid rgba(233,69,96,.45);border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-danger-muted,rgba(233,69,96,.14));color:#ffc6ce;padding:.18rem .4rem}',
    '.browser-inbox-body{display:grid;grid-template-columns:minmax(260px,360px) minmax(0,1fr);flex:1;min-height:0}',
    '.browser-inbox-list{min-height:0;overflow:auto;border-right:1px solid var(--vt-color-border,#202b46);background:var(--vt-color-surface-muted,#111629)}',
    '.browser-inbox-empty{height:100%;display:flex;align-items:center;justify-content:center;color:var(--vt-color-text-muted,#7f8aa3);font-size:.86rem;padding:2rem;text-align:center;line-height:1.45}',
    '.browser-inbox-row{display:flex;flex-direction:column;gap:.22rem;padding:.65rem .75rem;border-bottom:1px solid rgba(32,43,70,.72);cursor:pointer}',
    '.browser-inbox-row:hover{background:var(--vt-color-surface-hover,#1b2440)}',
    '.browser-inbox-row.selected{background:var(--vt-color-surface-selected,rgba(78,204,163,.14));box-shadow:inset 2px 0 0 var(--vt-color-accent,#4ecca3)}',
    '.browser-inbox-row-head{display:flex;align-items:center;gap:.45rem;min-width:0}',
    '.browser-inbox-kind{font-size:.68rem;color:var(--vt-color-accent,#4ecca3);text-transform:uppercase;letter-spacing:.04em;flex-shrink:0}',
    '.browser-inbox-row-title{font-size:.86rem;color:var(--vt-color-text-primary,#f4f7fb);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.browser-inbox-row-url{font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.browser-inbox-row-text{font-size:.76rem;color:var(--vt-color-text-secondary,#b7c0d4);line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.browser-inbox-row-meta{display:flex;align-items:center;gap:.35rem;min-width:0;font-size:.68rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.browser-inbox-badge{display:inline-flex;align-items:center;min-height:1.1rem;padding:0 .3rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-sm,4px);white-space:nowrap}',
    '.browser-inbox-badge.unassigned{border-color:rgba(240,180,75,.5);color:#ffd37a}.browser-inbox-badge.processed{border-color:rgba(116,190,148,.45);color:#9fe0bc}',
    '.browser-inbox-detail{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:auto;padding:1rem;gap:.75rem}',
    '.browser-inbox-detail-empty{margin:auto;color:var(--vt-color-text-muted,#7f8aa3);font-size:.86rem}',
    '.browser-inbox-detail-title{font-size:1rem;font-weight:600;color:var(--vt-color-text-primary,#f4f7fb);word-break:break-word}',
    '.browser-inbox-meta{display:grid;grid-template-columns:7rem minmax(0,1fr);gap:.35rem .75rem;font-size:.78rem}',
    '.browser-inbox-meta-label{color:var(--vt-color-text-muted,#7f8aa3)}',
    '.browser-inbox-meta-value{color:var(--vt-color-text-secondary,#b7c0d4);min-width:0;overflow-wrap:anywhere}',
    '.browser-inbox-text{border:1px solid var(--vt-color-border,#202b46);background:var(--vt-color-surface,#15152c);border-radius:var(--vt-radius-lg,8px);padding:.75rem;font-size:.85rem;line-height:1.5;color:var(--vt-color-text-primary,#f4f7fb);white-space:pre-wrap;overflow-wrap:anywhere}',
    '.browser-inbox-detail-actions{display:flex;gap:.5rem;flex-wrap:wrap}',
    '.browser-inbox-assignment{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}',
    '.browser-inbox-detail-note{font-size:.76rem;color:var(--vt-color-text-muted,#7f8aa3);line-height:1.4}',
    '.browser-inbox-settings{display:grid;gap:.85rem;padding:1rem;max-width:560px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:var(--vt-color-text-primary,#f4f7fb)}',
    '.browser-inbox-settings-field{display:grid;gap:.3rem}',
    '.browser-inbox-settings-label{font-size:.78rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.browser-inbox-settings-input{width:100%;box-sizing:border-box;padding:.48rem .58rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-surface,#15152c);color:var(--vt-color-text-primary,#f4f7fb);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.78rem}',
    '.browser-inbox-settings-actions{display:flex;gap:.5rem;flex-wrap:wrap}',
    '.browser-inbox-settings-status{min-height:1.15rem;font-size:.76rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.browser-inbox-settings-status.error{color:#ffc6ce}',
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

  function cleanDomain(value) {
    return text(value).trim().toLowerCase().replace(/^\.+/, '');
  }

  function domainFromUrl(value) {
    try {
      return cleanDomain(new URL(text(value).trim()).hostname);
    } catch (_) {
      return '';
    }
  }

  function domainFromCapture(capture) {
    return cleanDomain(capture && capture.domain) || domainFromUrl(capture && capture.url);
  }

  function normalizeDomainBindings(value) {
    var result = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
    Object.keys(value).forEach(function (domain) {
      var normalizedDomain = cleanDomain(domain);
      var workspaceRoot = cleanWorkspace(value[domain]);
      if (normalizedDomain && workspaceRoot) result[normalizedDomain] = workspaceRoot;
    });
    return result;
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
    return value === 'selection' || value === 'link' || value === 'file' || value === 'page' ? value : 'page';
  }

  function displayTitle(capture) {
    if (capture && capture.kind === 'file' && capture.fileName) return capture.fileName;
    return capture.title || capture.url || capture.captureId || 'Untitled capture';
  }

  function noteTitle(capture) {
    return text((capture && (capture.title || capture.domain || capture.captureId)) || 'Browser Capture').trim() || 'Browser Capture';
  }

  function safeNoteFilename(title) {
    var base = text(title).trim()
      .replace(/[\\/:*?"<>|#\[\]\r\n\t]+/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    return (base || 'Browser_Capture') + '.md';
  }

  function safeLinkFilename(title) {
    return safeNoteFilename(title).replace(/\.md$/, '.url');
  }

  function safeFileFilename(name) {
    var base = text(name).trim()
      .replace(/[\\/:*?"<>|\r\n\t]+/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!base || base === '.' || base === '..') return 'browser-file.txt';
    return base;
  }

  function captureToMarkdown(capture) {
    var title = noteTitle(capture);
    var lines = ['# ' + title, ''];
    if (capture && capture.url) lines.push('Source: ' + capture.url);
    if (capture && capture.capturedAt) lines.push('Captured: ' + capture.capturedAt);
    if (capture && capture.kind) lines.push('Kind: ' + capture.kind);
    if (lines[lines.length - 1] !== '') lines.push('');
    if (capture && capture.text) {
      lines.push(capture.text);
      lines.push('');
    }
    return lines.join('\n');
  }

  function captureToUrlShortcut(capture) {
    return '[InternetShortcut]\nURL=' + text(capture && capture.url).trim() + '\n';
  }

  function eventPayload(event) {
    if (!event || !event.payload) return {};
    return event.payload;
  }

  function captureFromEvent(event) {
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
      fileName: text(payload.fileName).trim(),
      fileMime: text(payload.fileMime).trim(),
      fileSize: Number(payload.fileSize) || 0,
      fileText: text(payload.fileText),
      fileDataBase64: text(payload.fileDataBase64).trim(),
      source: text(payload.source).trim(),
      browserName: text(payload.browserName).trim(),
      // The receiver provides the active workspace. Untagged captures remain unassigned.
      workspaceRootPath: workspaceFromPayload(payload)
    };
  }

  function workspaceFromStorageKey(storageKey) {
    var key = text(storageKey);
    if (key.indexOf(WORKSPACE_PREFIX) !== 0) return '';
    try {
      return cleanWorkspace(decodeURIComponent(key.slice(WORKSPACE_PREFIX.length)));
    } catch (_) {
      return '';
    }
  }

  function normalizeStoredCaptures(value, storageKey) {
    if (!Array.isArray(value)) return [];
    return value.filter(function (item) {
      return item && typeof item === 'object' && item.captureId;
    }).map(function (item) {
      // Workspace root paths are the current stable identifiers; core has no immutable workspace ID yet.
      var workspaceRootPath = cleanWorkspace(item.workspaceRootPath) || workspaceFromStorageKey(storageKey);
      return {
        captureId: text(item.captureId),
        capturedAt: text(item.capturedAt),
        receivedAt: text(item.receivedAt),
        kind: cleanKind(item.kind),
        url: text(item.url),
        title: text(item.title),
        domain: text(item.domain),
        text: text(item.text),
        fileName: text(item.fileName),
        fileMime: text(item.fileMime),
        fileSize: Number(item.fileSize) || 0,
        fileText: text(item.fileText),
        fileDataBase64: text(item.fileDataBase64).trim(),
        source: text(item.source),
        browserName: text(item.browserName),
        workspaceRootPath: workspaceRootPath,
        workspaceName: cleanWorkspace(item.workspaceName || workspaceRootPath),
        processed: item.processed === true,
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
        fileName: item.fileName,
        fileMime: item.fileMime,
        fileSize: item.fileSize,
        fileText: item.fileText,
        fileDataBase64: item.fileDataBase64,
        source: item.source,
        browserName: item.browserName,
        workspaceRootPath: item.workspaceRootPath,
        workspaceName: item.workspaceName || item.workspaceRootPath || '',
        processed: item.processed === true
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
    var keys = [GLOBAL_KEY, LEGACY_KEY];
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
    var domainBindings = {};
    var workspaceOptions = [];
    var statusFilter = 'all';
    var workspaceFilter = '';
    var searchQuery = '';
    function tr(key, params, fallback) {
      if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
      return fallback || key;
    }
    statusText = tr('ui.connecting', null, 'Connecting to receiver events...');

    var toolbar = el('div', { className: 'browser-inbox-toolbar' });
    var titleEl = el('span', { className: 'browser-inbox-title', textContent: scope.mode === 'global' ? tr('ui.title', null, 'Browser Inbox') : tr('ui.workspaceTitle', { workspace: scope.label }, 'Browser Inbox · ' + scope.label) });
    var countEl = el('span', { className: 'browser-inbox-count' });
    var statusEl = el('span', { className: 'browser-inbox-status' });
    var filtersEl = el('div', { className: 'browser-inbox-filters' });
    var statusFilterEl = el('select', {
      className: 'browser-inbox-select',
      'data-browser-inbox-filter': 'status',
      'aria-label': 'Capture status filter',
      onChange: function (event) {
        statusFilter = text(event && event.target && event.target.value) || 'all';
        selectedId = '';
        render();
      }
    }, [
      el('option', { value: 'all', textContent: tr('ui.allCaptures', null, 'All captures') }),
      el('option', { value: 'unassigned', textContent: tr('ui.unassigned', null, 'Unassigned') }),
      el('option', { value: 'unprocessed', textContent: tr('ui.unprocessed', null, 'Unprocessed') }),
      el('option', { value: 'processed', textContent: tr('ui.processed', null, 'Processed') })
    ]);
    var workspaceFilterEl = el('select', {
      className: 'browser-inbox-select',
      'data-browser-inbox-filter': 'workspace',
      'aria-label': 'Workspace filter',
      onChange: function (event) {
        workspaceFilter = cleanWorkspace(event && event.target && event.target.value);
        selectedId = '';
        render();
      }
    });
    var searchInput = el('input', {
      className: 'browser-inbox-input',
      type: 'search',
      placeholder: tr('ui.search', null, 'Search captures'),
      'data-browser-inbox-filter': 'search',
      'aria-label': 'Search captures',
      onInput: function (event) {
        searchQuery = text(event && event.target && event.target.value).trim().toLowerCase();
        selectedId = '';
        renderList();
        renderDetail();
        renderCount();
      }
    });
    var clearBtn = el('button', {
      className: 'browser-inbox-btn danger',
      'data-browser-inbox-action': 'clear',
      textContent: tr('ui.clear', null, 'Clear'),
      onClick: function () {
        clearScope().then(render);
      }
    });
    toolbar.appendChild(titleEl);
    toolbar.appendChild(countEl);
    filtersEl.appendChild(statusFilterEl);
    if (scope.mode === 'global') {
      filtersEl.appendChild(workspaceFilterEl);
    } else {
      filtersEl.appendChild(el('span', { className: 'browser-inbox-count', textContent: tr('ui.assignedHere', null, 'Assigned to this workspace') }));
    }
    filtersEl.appendChild(searchInput);
    toolbar.appendChild(filtersEl);
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

    function option(value, label) {
      return el('option', { value: value, textContent: label });
    }

    function workspaceRoots() {
      var roots = workspaceOptions.slice();
      captures.forEach(function (capture) {
        var root = cleanWorkspace(capture && capture.workspaceRootPath);
        if (root && roots.indexOf(root) === -1) roots.push(root);
      });
      if (scope.workspaceRoot && roots.indexOf(scope.workspaceRoot) === -1) roots.push(scope.workspaceRoot);
      return roots.sort(function (a, b) {
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
      });
    }

    function renderWorkspaceFilterOptions() {
      if (scope.mode !== 'global') return;
      workspaceFilterEl.innerHTML = '';
      workspaceFilterEl.appendChild(option('', 'All workspaces'));
      workspaceRoots().forEach(function (root) {
        workspaceFilterEl.appendChild(option(root, root));
      });
      workspaceFilterEl.value = workspaceFilter;
    }

    function visibleCaptures() {
      return captures.filter(function (capture) {
        var workspaceRoot = cleanWorkspace(capture && capture.workspaceRootPath);
        if (scope.mode === 'workspace' && workspaceRoot !== scope.workspaceRoot) return false;
        if (scope.mode === 'global' && workspaceFilter && workspaceRoot !== workspaceFilter) return false;
        if (statusFilter === 'unassigned' && workspaceRoot) return false;
        if (statusFilter === 'unprocessed' && capture.processed === true) return false;
        if (statusFilter === 'processed' && capture.processed !== true) return false;
        if (!searchQuery) return true;
        return [displayTitle(capture), capture.url, capture.domain, capture.text, workspaceRoot].join('\n').toLowerCase().indexOf(searchQuery) !== -1;
      });
    }

    function persist() {
      if (!api || !api.settings || typeof api.settings.write !== 'function') return Promise.resolve();
      return api.settings.write(GLOBAL_KEY, storageCaptures(sortCaptures(captures))).catch(function (err) {
        statusText = 'Could not save inbox: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
      });
    }

    function removeCaptures(captureIds, successText) {
      var ids = {};
      captureIds.forEach(function (captureId) {
        ids[captureId] = true;
      });
      captures = captures.filter(function (item) {
        return !ids[item.captureId];
      });
      if (ids[selectedId]) selectedId = '';
      if (!api || !api.settings || typeof api.settings.read !== 'function' || typeof api.settings.write !== 'function') {
        return persist().then(function () {
          statusText = successText;
          statusClass = '';
        });
      }
      return api.settings.read().then(function (settings) {
        var keys = globalCaptureKeys(settings || {});
        return Promise.all(keys.map(function (key) {
          var next = normalizeStoredCaptures((settings || {})[key], key).filter(function (item) {
            return !ids[item.captureId];
          });
          return api.settings.write(key, storageCaptures(next));
        }));
      }).then(function () {
        statusText = successText;
        statusClass = '';
      }).catch(function (err) {
        statusText = 'Could not update inbox: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
      });
    }

    function clearScope() {
      var ids = scope.mode === 'global'
        ? captures.map(function (capture) { return capture.captureId; })
        : captures.filter(function (capture) { return capture.workspaceRootPath === scope.workspaceRoot; }).map(function (capture) { return capture.captureId; });
      return removeCaptures(ids, scope.mode === 'global' ? 'Inbox cleared' : 'Workspace captures cleared');
    }

    function selectedCapture() {
      var visible = visibleCaptures();
      for (var i = 0; i < visible.length; i += 1) {
        if (visible[i].captureId === selectedId) return visible[i];
      }
      return visible[0] || null;
    }

    function addCapture(capture) {
      capture = applyDomainBinding(capture);
      var existing = captures.some(function (item) {
        return item.captureId === capture.captureId;
      });
      if (existing) return Promise.resolve();
      captures = sortCaptures([capture].concat(captures));
      selectedId = capture.captureId;
      statusText = 'Capture received';
      statusClass = '';
      return persist().then(render);
    }

    function applyDomainBinding(capture) {
      if (!capture || capture.workspaceRootPath) return capture;
      var workspaceRoot = domainBindings[domainFromCapture(capture)];
      if (!workspaceRoot) return capture;
      capture.workspaceRootPath = workspaceRoot;
      capture.workspaceName = workspaceRoot;
      return capture;
    }

    function assignWorkspace(captureId, workspaceRoot) {
      workspaceRoot = cleanWorkspace(workspaceRoot);
      captures = captures.map(function (capture) {
        if (capture.captureId !== captureId) return capture;
        return Object.assign({}, capture, {
          workspaceRootPath: workspaceRoot,
          workspaceName: workspaceRoot
        });
      });
      if (workspaceRoot && workspaceOptions.indexOf(workspaceRoot) === -1) workspaceOptions.push(workspaceRoot);
      statusText = workspaceRoot ? 'Capture assigned to ' + workspaceRoot : 'Capture is unassigned';
      statusClass = '';
      return persist().then(render);
    }

    function removeCapture(captureId) {
      return removeCaptures([captureId], 'Capture deleted');
    }

    function setProcessed(captureId, processed) {
      captures = captures.map(function (capture) {
        if (capture.captureId !== captureId) return capture;
        return Object.assign({}, capture, { processed: processed === true });
      });
      statusText = processed ? 'Capture marked processed' : 'Capture marked unprocessed';
      statusClass = '';
      return persist().then(render);
    }

    function createNoteFromCapture(capture) {
      if (!capture || !capture.workspaceRootPath) return Promise.resolve();
      if (!api || !api.files || typeof api.files.writeText !== 'function') {
        statusText = 'Could not create note: files API unavailable';
        statusClass = 'error';
        render();
        return Promise.resolve();
      }
      var title = noteTitle(capture);
      var notePath = capture.workspaceRootPath + '/Notes/' + safeNoteFilename(title);
      statusText = 'Creating note...';
      statusClass = '';
      render();
      return api.files.writeText(notePath, captureToMarkdown(capture), {
        createIfMissing: true,
        overwrite: false
      }).then(function () {
        if (api.events && typeof api.events.publish === 'function') {
          return api.events.publish('browser.capture.converted', {
            captureId: capture.captureId,
            conversionType: 'note',
            notePath: notePath,
            workspaceRootPath: capture.workspaceRootPath,
            title: title,
            url: capture.url || '',
            sourcePluginId: PLUGIN_ID
          });
        }
        return undefined;
      }).then(function () {
        statusText = 'Created note: ' + notePath;
        statusClass = '';
        return removeCapture(capture.captureId);
      }).catch(function (err) {
        statusText = 'Could not create note: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
        render();
      });
    }

    function createLinkFromCapture(capture) {
      if (!capture || !capture.workspaceRootPath || !capture.url) return Promise.resolve();
      if (!api || !api.files || typeof api.files.writeText !== 'function') {
        statusText = 'Could not create link: files API unavailable';
        statusClass = 'error';
        render();
        return Promise.resolve();
      }
      var title = noteTitle(capture);
      var linkPath = capture.workspaceRootPath + '/Links/' + safeLinkFilename(title);
      statusText = 'Creating link...';
      statusClass = '';
      render();
      return api.files.writeText(linkPath, captureToUrlShortcut(capture), {
        createIfMissing: true,
        overwrite: false
      }).then(function () {
        if (api.events && typeof api.events.publish === 'function') {
          return api.events.publish('browser.capture.converted', {
            captureId: capture.captureId,
            conversionType: 'link',
            linkPath: linkPath,
            workspaceRootPath: capture.workspaceRootPath,
            title: title,
            url: capture.url || '',
            sourcePluginId: PLUGIN_ID
          });
        }
        return undefined;
      }).then(function () {
        statusText = 'Created link: ' + linkPath;
        statusClass = '';
        return removeCapture(capture.captureId);
      }).catch(function (err) {
        statusText = 'Could not create link: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
        render();
      });
    }

    function createFileFromCapture(capture) {
      if (!capture || !capture.workspaceRootPath || capture.kind !== 'file' || !capture.fileName || (!capture.fileText && !capture.fileDataBase64)) return Promise.resolve();
      if (!api || !api.files || (capture.fileDataBase64 ? typeof api.files.writeBytes !== 'function' : typeof api.files.writeText !== 'function')) {
        statusText = 'Could not create file: files API unavailable';
        statusClass = 'error';
        render();
        return Promise.resolve();
      }
      var fileName = safeFileFilename(capture.fileName);
      var filePath = capture.workspaceRootPath + '/Files/' + fileName;
      statusText = 'Creating file...';
      statusClass = '';
      render();
      var writeOptions = {
        createIfMissing: true,
        overwrite: false
      };
      var writePromise = capture.fileDataBase64
        ? api.files.writeBytes(filePath, capture.fileDataBase64, writeOptions)
        : api.files.writeText(filePath, capture.fileText, writeOptions);
      return writePromise.then(function () {
        if (api.events && typeof api.events.publish === 'function') {
          return api.events.publish('browser.capture.converted', {
            captureId: capture.captureId,
            conversionType: 'file',
            filePath: filePath,
            workspaceRootPath: capture.workspaceRootPath,
            title: displayTitle(capture),
            url: capture.url || '',
            fileName: capture.fileName || '',
            fileMime: capture.fileMime || '',
            fileSize: capture.fileSize || 0,
            sourcePluginId: PLUGIN_ID
          });
        }
        return undefined;
      }).then(function () {
        statusText = 'Created file: ' + filePath;
        statusClass = '';
        return removeCapture(capture.captureId);
      }).catch(function (err) {
        statusText = 'Could not create file: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
        render();
      });
    }

    function renderList() {
      listEl.innerHTML = '';
      var visible = visibleCaptures();
      if (visible.length === 0) {
        var emptyText = captures.length === 0
          ? 'No browser captures yet. Keep this view open, then send a page, selection, or link from the extension.'
          : 'No captures match the current filters.';
        listEl.appendChild(el('div', { className: 'browser-inbox-empty', textContent: emptyText }));
        return;
      }
      visible.forEach(function (capture) {
        var workspaceRoot = cleanWorkspace(capture.workspaceRootPath);
        var row = el('div', {
          className: 'browser-inbox-row' + (capture.captureId === selectedId ? ' selected' : '') + (capture.processed ? ' processed' : ''),
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
        row.appendChild(el('div', { className: 'browser-inbox-row-meta' }, [
          el('span', {
            className: 'browser-inbox-badge' + (workspaceRoot ? '' : ' unassigned'),
            textContent: workspaceRoot || 'Unassigned'
          }),
          el('span', {
            className: 'browser-inbox-badge' + (capture.processed ? ' processed' : ''),
            textContent: capture.processed ? 'Processed' : 'Unprocessed'
          })
        ]));
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
        detailEl.appendChild(el('div', { className: 'browser-inbox-detail-empty', textContent: tr('ui.selectCapture', null, 'Select a capture to inspect it.') }));
        return;
      }
      selectedId = capture.captureId;
      detailEl.appendChild(el('div', { className: 'browser-inbox-detail-title', textContent: displayTitle(capture) }));
      detailEl.appendChild(el('div', { className: 'browser-inbox-meta' }, [
        el('div', { className: 'browser-inbox-meta-label', textContent: tr('ui.kind', null, 'Kind') }),
        el('div', { className: 'browser-inbox-meta-value', textContent: capture.kind }),
        el('div', { className: 'browser-inbox-meta-label', textContent: 'URL' }),
        el('div', { className: 'browser-inbox-meta-value', textContent: capture.url || '-' }),
        el('div', { className: 'browser-inbox-meta-label', textContent: tr('ui.domain', null, 'Domain') }),
        el('div', { className: 'browser-inbox-meta-value', textContent: capture.domain || '-' }),
        el('div', { className: 'browser-inbox-meta-label', textContent: tr('ui.captured', null, 'Captured') }),
        el('div', { className: 'browser-inbox-meta-value', textContent: formatDate(capture.capturedAt) || '-' }),
        el('div', { className: 'browser-inbox-meta-label', textContent: 'Browser' }),
        el('div', { className: 'browser-inbox-meta-value', textContent: capture.browserName || capture.source || '-' }),
        el('div', { className: 'browser-inbox-meta-label', textContent: tr('ui.workspace', null, 'Workspace') }),
        el('div', { className: 'browser-inbox-meta-value', textContent: capture.workspaceRootPath || 'Unassigned' }),
        el('div', { className: 'browser-inbox-meta-label', textContent: tr('ui.status', null, 'Status') }),
        el('div', { className: 'browser-inbox-meta-value', textContent: capture.processed ? 'Processed' : 'Unprocessed' })
      ]));
      var assignmentSelect = el('select', {
        className: 'browser-inbox-select',
        'data-browser-inbox-assignment': capture.captureId,
        'aria-label': 'Assign capture workspace',
        onChange: function (event) {
          assignWorkspace(capture.captureId, event && event.target && event.target.value);
        }
      });
      assignmentSelect.appendChild(option('', 'Unassigned'));
      workspaceRoots().forEach(function (workspaceRoot) {
        assignmentSelect.appendChild(option(workspaceRoot, workspaceRoot));
      });
      assignmentSelect.value = capture.workspaceRootPath || '';
      var assignmentControls = [
        el('span', { className: 'browser-inbox-meta-label', textContent: 'Assign workspace' }),
        assignmentSelect
      ];
      if (capture.workspaceRootPath) {
        assignmentControls.push(el('button', {
          className: 'browser-inbox-btn',
          'data-browser-inbox-action': 'clear-assignment',
          textContent: 'Clear assignment',
          onClick: function () {
            assignWorkspace(capture.captureId, '');
          }
        }));
      }
      detailEl.appendChild(el('div', { className: 'browser-inbox-assignment' }, assignmentControls));
      if (!capture.workspaceRootPath) {
        detailEl.appendChild(el('div', { className: 'browser-inbox-detail-note', textContent: 'Assign a workspace before creating a note, link, or file.' }));
      }
      if (capture.text) {
        detailEl.appendChild(el('div', { className: 'browser-inbox-text', textContent: capture.text }));
      }
      if (capture.kind === 'file' && capture.fileText) {
        detailEl.appendChild(el('div', { className: 'browser-inbox-text', textContent: capture.fileText }));
      }
      var actionButtons = [];
      actionButtons.push(el('button', {
        className: 'browser-inbox-btn',
        'data-browser-inbox-action': 'toggle-processed',
        textContent: capture.processed ? 'Mark Unprocessed' : 'Mark Processed',
        onClick: function () {
          setProcessed(capture.captureId, !capture.processed);
        }
      }));
      if (capture.workspaceRootPath) {
        actionButtons.push(el('button', {
          className: 'browser-inbox-btn',
          'data-browser-inbox-action': 'create-note',
          textContent: tr('ui.createNote', null, 'Create Note'),
          onClick: function () {
            createNoteFromCapture(capture);
          }
        }));
        if (capture.url) {
          actionButtons.push(el('button', {
            className: 'browser-inbox-btn',
            'data-browser-inbox-action': 'create-link',
            textContent: tr('ui.createLink', null, 'Create Link'),
            onClick: function () {
              createLinkFromCapture(capture);
            }
          }));
        }
        if (capture.kind === 'file' && capture.fileName && (capture.fileText || capture.fileDataBase64)) {
          actionButtons.push(el('button', {
            className: 'browser-inbox-btn',
            'data-browser-inbox-action': 'create-file',
            textContent: tr('ui.createFile', null, 'Create File'),
            onClick: function () {
              createFileFromCapture(capture);
            }
          }));
        }
      }
      actionButtons.push(el('button', {
          className: 'browser-inbox-btn danger',
          'data-browser-inbox-action': 'remove',
          textContent: tr('ui.delete', null, 'Delete'),
          onClick: function () {
            removeCapture(capture.captureId);
          }
        }));
      detailEl.appendChild(el('div', { className: 'browser-inbox-detail-actions' }, actionButtons));
    }

    function renderCount() {
      var visibleCount = visibleCaptures().length;
      var total = captures.length;
      countEl.textContent = visibleCount === total
        ? total + ' item' + (total === 1 ? '' : 's')
        : visibleCount + ' of ' + total + ' items';
      var scopeCount = scope.mode === 'global'
        ? total
        : captures.filter(function (capture) { return capture.workspaceRootPath === scope.workspaceRoot; }).length;
      clearBtn.disabled = scopeCount === 0;
    }

    function render() {
      statusFilterEl.value = statusFilter;
      searchInput.value = searchQuery;
      renderWorkspaceFilterOptions();
      renderCount();
      statusEl.textContent = statusText;
      statusEl.className = 'browser-inbox-status' + (statusClass ? ' ' + statusClass : '');
      renderList();
      renderDetail();
    }

    function loadStored() {
      if (!api || !api.settings || typeof api.settings.read !== 'function') return Promise.resolve();
      return api.settings.read().then(function (settings) {
        domainBindings = normalizeDomainBindings((settings || {}).domainBindings);
        var keys = globalCaptureKeys(settings || {});
        var all = [];
        var hasLegacyCaptures = false;
        keys.forEach(function (key) {
          var stored = normalizeStoredCaptures((settings || {})[key], key);
          if (key !== GLOBAL_KEY && stored.length > 0) hasLegacyCaptures = true;
          all = all.concat(stored);
        });
        captures = sortCaptures(all);
        if (!selectedId && captures[0]) selectedId = captures[0].captureId;
        // Keep legacy records readable, then mirror the canonical state into the global queue.
        return hasLegacyCaptures ? persist() : undefined;
      }).catch(function (err) {
        statusText = 'Could not load inbox: ' + (err && err.message ? err.message : String(err));
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
        }).filter(function (workspaceRoot) {
          return workspaceRoot && workspaceRoot.indexOf('/') === -1;
        });
      }).catch(function () {
        workspaceOptions = [];
      });
    }

    function subscribeEvents() {
      if (!api || !api.events || typeof api.events.subscribe !== 'function') return Promise.resolve();
      return Promise.all(CAPTURE_EVENTS.map(function (eventName) {
        return api.events.subscribe(eventName, function (event) {
          return addCapture(captureFromEvent(event));
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
    Promise.all([loadStored(), loadWorkspaceOptions()]).then(function () {
      if (disposed) return;
      render();
      return subscribeEvents();
    }).then(function () {
      if (!disposed) render();
    });
    if (api && api.i18n && typeof api.i18n.onDidChangeLocale === 'function') {
      api.i18n.onDidChangeLocale(function () {
        titleEl.textContent = scope.mode === 'global' ? tr('ui.title', null, 'Browser Inbox') : tr('ui.workspaceTitle', { workspace: scope.label }, 'Browser Inbox · ' + scope.label);
        searchInput.setAttribute('placeholder', tr('ui.search', null, 'Search captures'));
        clearBtn.textContent = tr('ui.clear', null, 'Clear');
        render();
      });
    }

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

  var BrowserInboxSettings = {
    mount: function (containerEl, props, api) {
      injectStyles();
      containerEl.innerHTML = '';
      containerEl.className = 'browser-inbox-settings';

      function tr(key, params, fallback) {
        if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
        return fallback || key;
      }

      var receiverURLInput = el('input', {
        className: 'browser-inbox-settings-input',
        type: 'text',
        readonly: 'readonly',
        spellcheck: 'false',
        autocomplete: 'off',
        'data-browser-inbox-pairing-url': ''
      });
      var receiverTokenInput = el('input', {
        className: 'browser-inbox-settings-input',
        type: 'text',
        readonly: 'readonly',
        spellcheck: 'false',
        autocomplete: 'off',
        'data-browser-inbox-pairing-token': ''
      });
      var statusEl = el('div', { className: 'browser-inbox-settings-status' });
      var copyURLButton = el('button', {
        className: 'browser-inbox-btn',
        type: 'button',
        'data-browser-inbox-settings-action': 'copy-url',
        textContent: tr('ui.copyUrl', null, 'Copy URL')
      });
      var copyTokenButton = el('button', {
        className: 'browser-inbox-btn',
        type: 'button',
        'data-browser-inbox-settings-action': 'copy-token',
        textContent: tr('ui.copyToken', null, 'Copy Token')
      });
      var rotateTokenButton = el('button', {
        className: 'browser-inbox-btn danger',
        type: 'button',
        'data-browser-inbox-settings-action': 'rotate-token',
        textContent: tr('ui.rotateToken', null, 'Rotate Token')
      });

      containerEl.appendChild(el('div', { className: 'browser-inbox-settings-field' }, [
        el('label', { className: 'browser-inbox-settings-label', textContent: tr('ui.receiverUrl', null, 'Receiver URL') }),
        receiverURLInput
      ]));
      containerEl.appendChild(el('div', { className: 'browser-inbox-settings-field' }, [
        el('label', { className: 'browser-inbox-settings-label', textContent: tr('ui.pairingToken', null, 'Pairing Token') }),
        receiverTokenInput
      ]));
      containerEl.appendChild(el('div', { className: 'browser-inbox-settings-actions' }, [
        copyURLButton,
        copyTokenButton,
        rotateTokenButton
      ]));
      containerEl.appendChild(statusEl);

      function setStatus(message, isError) {
        statusEl.textContent = message || '';
        statusEl.className = 'browser-inbox-settings-status' + (isError ? ' error' : '');
      }

      function setBusy(busy) {
        copyURLButton.disabled = busy;
        copyTokenButton.disabled = busy;
        rotateTokenButton.disabled = busy;
      }

      function pairingAPI() {
        if (!api || !api.browserReceiver) throw new Error('Browser receiver API is unavailable');
        return api.browserReceiver;
      }

      function applyPairing(pairing) {
        receiverURLInput.value = text(pairing && pairing.receiverUrl).trim();
        receiverTokenInput.value = text(pairing && pairing.receiverToken).trim();
      }

      function loadPairing() {
        setBusy(true);
        setStatus('Loading...', false);
        return Promise.resolve().then(function () {
          return pairingAPI().pairing();
        }).then(function (pairing) {
          applyPairing(pairing);
          setStatus('', false);
        }).catch(function (err) {
          setStatus(text(err && err.message ? err.message : err), true);
        }).then(function () {
          setBusy(false);
        });
      }

      function copyValue(value, label) {
        if (!value) return;
        if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
          setStatus('Clipboard unavailable', true);
          return;
        }
        navigator.clipboard.writeText(value).then(function () {
          setStatus(label + ' copied', false);
        }).catch(function (err) {
          setStatus(text(err && err.message ? err.message : err), true);
        });
      }

      copyURLButton.addEventListener('click', function () {
        copyValue(receiverURLInput.value, 'URL');
      });
      copyTokenButton.addEventListener('click', function () {
        copyValue(receiverTokenInput.value, 'Token');
      });
      rotateTokenButton.addEventListener('click', function () {
        if (typeof window.confirm === 'function' && !window.confirm('Rotate pairing token?')) return;
        setBusy(true);
        setStatus('Rotating...', false);
        Promise.resolve().then(function () {
          return pairingAPI().rotateToken();
        }).then(function (pairing) {
          applyPairing(pairing);
          setStatus('Token rotated', false);
        }).catch(function (err) {
          setStatus(text(err && err.message ? err.message : err), true);
        }).then(function () {
          setBusy(false);
        });
      });

      loadPairing();
      if (api && api.i18n && typeof api.i18n.onDidChangeLocale === 'function') {
        api.i18n.onDidChangeLocale(function () {
          copyURLButton.textContent = tr('ui.copyUrl', null, 'Copy URL');
          copyTokenButton.textContent = tr('ui.copyToken', null, 'Copy Token');
          rotateTokenButton.textContent = tr('ui.rotateToken', null, 'Rotate Token');
        });
      }
    },
    unmount: function (containerEl) {
      if (containerEl) containerEl.innerHTML = '';
    }
  };

  window.VerstakPluginRegister(PLUGIN_ID, {
    components: {
      BrowserInboxView: BrowserInboxView,
      BrowserInboxSettings: BrowserInboxSettings
    }
  });
})();
