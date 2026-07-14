/* ===========================================================
   Browser Plugin — Verstak v2 Frontend Bundle
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
  var MUTATION_EVENT = 'browser-inbox.storage.mutate';

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
    '.browser-inbox-select{max-width:12rem;appearance:none;background-color:var(--vt-color-surface,#15152c);background-image:linear-gradient(45deg,transparent 50%,var(--vt-color-text-muted,#7f8aa3) 50%),linear-gradient(135deg,var(--vt-color-text-muted,#7f8aa3) 50%,transparent 50%);background-position:calc(100% - 14px) 50%,calc(100% - 9px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;padding-right:1.65rem}',
    '.browser-inbox-select option{background:var(--vt-color-surface,#15152c);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.browser-inbox-input:focus,.browser-inbox-select:focus{outline:none;border-color:var(--vt-color-accent,#4ecca3);box-shadow:0 0 0 1px var(--vt-color-accent,#4ecca3)}',
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
      return { mode: 'global', key: GLOBAL_KEY, label: '', workspaceRoot: '' };
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

  function displayTitle(capture, fallbackTitle) {
    if (capture && capture.kind === 'file' && capture.fileName) return capture.fileName;
    return capture.title || capture.url || capture.captureId || fallbackTitle || '';
  }

  function noteTitle(capture, fallbackTitle) {
    return text((capture && (capture.title || capture.domain || capture.captureId)) || fallbackTitle).trim() || text(fallbackTitle).trim();
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

  function numberedLinkFilename(title, number) {
    var filename = safeLinkFilename(title);
    if (number <= 1) return filename;
    return filename.replace(/\.url$/, ' (' + number + ').url');
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

  function captureToMarkdown(capture, fallbackTitle) {
    var title = noteTitle(capture, fallbackTitle);
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
      workspaceRootPath: workspaceFromPayload(payload),
      workspaceId: text(payload.workspaceId).trim(),
      workspaceState: text(payload.workspaceState || 'unassigned').trim(),
      workspaceTrashId: text(payload.workspaceTrashId).trim()
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
        workspaceId: text(item.workspaceId),
        workspaceState: text(item.workspaceState || (workspaceRootPath ? 'active' : 'unassigned')),
        workspaceTrashId: text(item.workspaceTrashId),
        globalState: text(item.globalState || 'inbox') === 'archived' ? 'archived' : 'inbox',
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
        workspaceId: item.workspaceId || '',
        workspaceState: item.workspaceState || (item.workspaceRootPath ? 'active' : 'unassigned'),
        workspaceTrashId: item.workspaceTrashId || '',
        globalState: item.globalState === 'archived' ? 'archived' : 'inbox',
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
    var statusText = '';
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

    function localizedItemCount(count) {
      var locale = api && api.i18n && typeof api.i18n.getLocale === 'function' ? api.i18n.getLocale() : 'en';
      if (locale === 'ru') {
        var mod10 = count % 10;
        var mod100 = count % 100;
        if (mod10 === 1 && mod100 !== 11) return tr('ui.items.one', { count: count }, count + ' материал');
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return tr('ui.items.few', { count: count }, count + ' материала');
        return tr('ui.items.many', { count: count }, count + ' материалов');
      }
      return tr(count === 1 ? 'ui.items.one' : 'ui.items.other', { count: count }, count + (count === 1 ? ' item' : ' items'));
    }

    function reportError(key, fallback, err) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('[verstak.browser-inbox] ' + key, err);
      }
      statusText = tr(key, null, fallback);
      statusClass = 'error';
      render();
    }

    statusText = tr('ui.connecting', null, 'Connecting to receiver events...');

    var toolbar = el('div', { className: 'browser-inbox-toolbar' });
    var titleEl = el('span', { className: 'browser-inbox-title', textContent: scope.mode === 'global' ? tr('ui.title', null, 'Browser') : tr('ui.workspaceTitle', { workspace: scope.label }, 'Browser · ' + scope.label) });
    var countEl = el('span', { className: 'browser-inbox-count' });
    var statusEl = el('span', { className: 'browser-inbox-status' });
    var filtersEl = el('div', { className: 'browser-inbox-filters' });
    var statusFilterEl = el('select', {
      className: 'browser-inbox-select',
      'data-browser-inbox-filter': 'status',
      'aria-label': tr('ui.statusFilter', null, 'Material status filter'),
      onChange: function (event) {
        statusFilter = text(event && event.target && event.target.value) || 'all';
        selectedId = '';
        render();
      }
    }, [
      el('option', { value: 'all', textContent: tr('ui.allCaptures', null, 'All captures') }),
      el('option', { value: 'unassigned', textContent: tr('ui.unassigned', null, 'Unassigned') }),
      el('option', { value: 'unprocessed', textContent: tr('ui.unprocessed', null, 'Unprocessed') }),
      el('option', { value: 'processed', textContent: tr('ui.processed', null, 'Processed') }),
      el('option', { value: 'archived', textContent: tr('ui.archive', null, 'Archive') })
    ]);
    var workspaceFilterEl = el('select', {
      className: 'browser-inbox-select',
      'data-browser-inbox-filter': 'workspace',
      'aria-label': tr('ui.workspaceFilter', null, 'Deal filter'),
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
      'aria-label': tr('ui.search', null, 'Search captures'),
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
      workspaceFilterEl.appendChild(option('', tr('ui.allDeals', null, 'All Deals')));
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
        if (statusFilter === 'archived' && capture.globalState !== 'archived') return false;
        if (statusFilter !== 'archived' && capture.globalState === 'archived') return false;
        if (statusFilter === 'unassigned' && workspaceRoot) return false;
        if (statusFilter === 'unprocessed' && capture.processed === true) return false;
        if (statusFilter === 'processed' && capture.processed !== true) return false;
        if (!searchQuery) return true;
        return [displayTitle(capture), capture.url, capture.domain, capture.text, workspaceRoot].join('\n').toLowerCase().indexOf(searchQuery) !== -1;
      });
    }

    function publishMutation(action, payload, verify, verifySettings) {
      if (!api || !api.events || typeof api.events.publish !== 'function') {
        reportError('ui.saveError', 'Could not update browser materials. Please try again.');
        return Promise.resolve(false);
      }
      return api.events.publish(MUTATION_EVENT, Object.assign({ action: action }, payload || {})).then(function () {
        if (!api.settings || typeof api.settings.read !== 'function') throw new Error('settings API unavailable');
        return api.settings.read();
      }).then(function (settings) {
        settings = settings || {};
        if (typeof verifySettings === 'function' && !verifySettings(settings)) {
          throw new Error('the stored inbox did not reach the expected state');
        }
        return loadStored(true);
      }).then(function () {
        if (typeof verify === 'function' && !verify()) {
          throw new Error('the stored capture did not change');
        }
        return true;
      }).catch(function (err) {
        reportError('ui.saveError', 'Could not update browser materials. Please try again.', err);
        return false;
      });
    }

    function archiveCaptures(captureIds, successText) {
      var ids = {};
      captureIds.forEach(function (captureId) {
        ids[captureId] = true;
      });
      return publishMutation('archive', { captureIds: captureIds }, function () {
        return captures.every(function (capture) {
          return !ids[capture.captureId] || capture.globalState === 'archived';
        });
      }).then(function (saved) {
        if (!saved) return;
        if (ids[selectedId]) selectedId = '';
        statusText = successText;
        statusClass = '';
        render();
      });
    }

    function clearScope() {
      var ids = scope.mode === 'global'
        ? captures.map(function (capture) { return capture.captureId; })
        : captures.filter(function (capture) { return capture.workspaceRootPath === scope.workspaceRoot; }).map(function (capture) { return capture.captureId; });
      return archiveCaptures(ids, scope.mode === 'global'
        ? tr('ui.inboxArchived', null, 'Inbox archived')
        : tr('ui.workspaceCapturesArchived', null, 'Deal materials archived'));
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
      selectedId = capture.captureId;
      statusText = tr('ui.captureReceived', null, 'Material received');
      statusClass = '';
      render();
      return Promise.resolve();
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
      return publishMutation('assign', {
        captureId: captureId,
        workspaceRootPath: workspaceRoot
      }, function () {
        return captures.some(function (capture) {
          return capture.captureId === captureId && cleanWorkspace(capture.workspaceRootPath) === workspaceRoot;
        });
      }).then(function (saved) {
        if (!saved) return;
        if (workspaceRoot && workspaceOptions.indexOf(workspaceRoot) === -1) workspaceOptions.push(workspaceRoot);
        statusText = workspaceRoot
          ? tr('ui.assignedToWorkspace', { workspace: workspaceRoot }, 'Material assigned to ' + workspaceRoot)
          : tr('ui.captureUnassigned', null, 'Material is unassigned');
        statusClass = '';
        render();
      });
    }

    function archiveCapture(captureId) {
      return archiveCaptures([captureId], tr('ui.captureArchived', null, 'Material archived'));
    }

    function restoreCapture(captureId) {
      return publishMutation('restore', { captureId: captureId }, function () {
        return captures.some(function (capture) {
          return capture.captureId === captureId && capture.globalState === 'inbox';
        });
      }).then(function (saved) {
        if (!saved) return;
        statusText = tr('ui.captureRestored', null, 'Material restored to Inbox');
        statusClass = '';
        render();
      });
    }

    function permanentlyDeleteCapture(captureId) {
      return publishMutation('delete', { captureId: captureId, permanent: true }, function () {
        return !captures.some(function (capture) { return capture.captureId === captureId; });
      }).then(function (saved) {
        if (!saved) return;
        if (selectedId === captureId) selectedId = '';
        statusText = tr('ui.captureDeleted', null, 'Material permanently deleted');
        statusClass = '';
        render();
      });
    }

    function setProcessed(captureId, processed) {
      return publishMutation('processed', {
        captureId: captureId,
        processed: processed === true
      }, function () {
        return captures.some(function (capture) {
          return capture.captureId === captureId && capture.processed === (processed === true);
        });
      }).then(function (saved) {
        if (!saved) return;
        statusText = processed
          ? tr('ui.captureProcessed', null, 'Material marked processed')
          : tr('ui.captureUnprocessed', null, 'Material marked unprocessed');
        statusClass = '';
        render();
      });
    }

    function createNoteFromCapture(capture) {
      if (!capture || !capture.workspaceRootPath) return Promise.resolve();
      if (!api || !api.files || typeof api.files.writeText !== 'function') {
        reportError('ui.createNoteError', 'Could not create the note. Please try again.');
        return Promise.resolve();
      }
      var title = noteTitle(capture, tr('ui.untitledCapture', null, 'Untitled material'));
      var notePath = capture.workspaceRootPath + '/Notes/' + safeNoteFilename(title);
      statusText = tr('ui.creatingNote', null, 'Creating note...');
      statusClass = '';
      render();
      return api.files.writeText(notePath, captureToMarkdown(capture, tr('ui.untitledCapture', null, 'Untitled material')), {
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
        statusText = tr('ui.noteCreated', { path: notePath }, 'Note created: ' + notePath);
        statusClass = '';
        return archiveCapture(capture.captureId);
      }).catch(function (err) {
        reportError('ui.createNoteError', 'Could not create the note. Please try again.', err);
      });
    }

    function createLinkFromCapture(capture) {
      if (!capture || !capture.workspaceRootPath || !capture.url) return Promise.resolve();
      if (!api || !api.files || typeof api.files.writeText !== 'function') {
        reportError('ui.createLinkError', 'Could not create the link. Please try again.');
        return Promise.resolve();
      }
      var title = noteTitle(capture, tr('ui.untitledCapture', null, 'Untitled material'));
      statusText = tr('ui.creatingLink', null, 'Creating link...');
      statusClass = '';
      render();
      function writeLink(number) {
        var linkPath = capture.workspaceRootPath + '/Links/' + numberedLinkFilename(title, number);
        return api.files.writeText(linkPath, captureToUrlShortcut(capture), {
          createIfMissing: true,
          overwrite: false
        }).then(function () {
          return linkPath;
        }).catch(function (error) {
          if (number < 99 && /^conflict:/.test(text(error && error.message ? error.message : error))) {
            return writeLink(number + 1);
          }
          throw error;
        });
      }
      return writeLink(1).then(function (linkPath) {
        if (api.events && typeof api.events.publish === 'function') {
          return api.events.publish('browser.capture.converted', {
            captureId: capture.captureId,
            conversionType: 'link',
            linkPath: linkPath,
            workspaceRootPath: capture.workspaceRootPath,
            title: title,
            url: capture.url || '',
            sourcePluginId: PLUGIN_ID
          }).then(function () {
            return linkPath;
          });
        }
        return linkPath;
      }).then(function () {
        statusText = tr('ui.linkCreated', null, 'Link created');
        statusClass = '';
        return archiveCapture(capture.captureId);
      }).catch(function (err) {
        reportError('ui.createLinkError', 'Could not create the link. Please try again.', err);
      });
    }

    function openCaptureURL(capture) {
      if (!capture || !capture.url || !api || !api.files || typeof api.files.openURL !== 'function') return Promise.resolve();
      return api.files.openURL(capture.url).catch(function (err) {
        reportError('ui.openLinkError', 'Could not open the link. Please try again.', err);
      });
    }

    function createFileFromCapture(capture) {
      if (!capture || !capture.workspaceRootPath || capture.kind !== 'file' || !capture.fileName || (!capture.fileText && !capture.fileDataBase64)) return Promise.resolve();
      if (!api || !api.files || (capture.fileDataBase64 ? typeof api.files.writeBytes !== 'function' : typeof api.files.writeText !== 'function')) {
        reportError('ui.createFileError', 'Could not create the file. Please try again.');
        return Promise.resolve();
      }
      var fileName = safeFileFilename(capture.fileName);
      var filePath = capture.workspaceRootPath + '/Files/' + fileName;
      statusText = tr('ui.creatingFile', null, 'Creating file...');
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
        statusText = tr('ui.fileCreated', { path: filePath }, 'File created: ' + filePath);
        statusClass = '';
        return archiveCapture(capture.captureId);
      }).catch(function (err) {
        reportError('ui.createFileError', 'Could not create the file. Please try again.', err);
      });
    }

    function renderList() {
      listEl.innerHTML = '';
      var visible = visibleCaptures();
      if (visible.length === 0) {
        var emptyText = captures.length === 0
          ? tr('ui.empty', null, 'No browser materials yet. Send a page, selection, or link from the extension.')
          : tr('ui.emptyFiltered', null, 'No materials match the current filters.');
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
            el('span', { className: 'browser-inbox-row-title', textContent: displayTitle(capture, tr('ui.untitledCapture', null, 'Untitled material')) })
          ]),
          el('div', { className: 'browser-inbox-row-url', textContent: capture.url || capture.domain || capture.captureId })
        ]);
        row.appendChild(el('div', { className: 'browser-inbox-row-meta' }, [
          el('span', {
            className: 'browser-inbox-badge' + (workspaceRoot ? '' : ' unassigned'),
            textContent: workspaceRoot || tr('ui.unassigned', null, 'Unassigned')
          }),
          el('span', {
            className: 'browser-inbox-badge' + (capture.processed ? ' processed' : ''),
            textContent: capture.processed
              ? tr('ui.processed', null, 'Processed')
              : tr('ui.unprocessed', null, 'Unprocessed')
          }),
          capture.globalState === 'archived' ? el('span', { className: 'browser-inbox-badge', textContent: tr('ui.archive', null, 'Archive') }) : null
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
      detailEl.appendChild(el('div', { className: 'browser-inbox-detail-title', textContent: displayTitle(capture, tr('ui.untitledCapture', null, 'Untitled material')) }));
      detailEl.appendChild(el('div', { className: 'browser-inbox-meta' }, [
        el('div', { className: 'browser-inbox-meta-label', textContent: tr('ui.kind', null, 'Kind') }),
        el('div', { className: 'browser-inbox-meta-value', textContent: capture.kind }),
        el('div', { className: 'browser-inbox-meta-label', textContent: tr('ui.url', null, 'URL') }),
        el('div', { className: 'browser-inbox-meta-value', textContent: capture.url || '-' }),
        el('div', { className: 'browser-inbox-meta-label', textContent: tr('ui.domain', null, 'Domain') }),
        el('div', { className: 'browser-inbox-meta-value', textContent: capture.domain || '-' }),
        el('div', { className: 'browser-inbox-meta-label', textContent: tr('ui.captured', null, 'Captured') }),
        el('div', { className: 'browser-inbox-meta-value', textContent: formatDate(capture.capturedAt) || '-' }),
        el('div', { className: 'browser-inbox-meta-label', textContent: tr('ui.browser', null, 'Browser') }),
        el('div', { className: 'browser-inbox-meta-value', textContent: capture.browserName || capture.source || '-' }),
        el('div', { className: 'browser-inbox-meta-label', textContent: tr('ui.workspace', null, 'Workspace') }),
        el('div', { className: 'browser-inbox-meta-value', textContent: capture.workspaceRootPath || tr('ui.unassigned', null, 'Unassigned') }),
        el('div', { className: 'browser-inbox-meta-label', textContent: tr('ui.status', null, 'Status') }),
        el('div', { className: 'browser-inbox-meta-value', textContent: capture.processed
          ? tr('ui.processed', null, 'Processed')
          : tr('ui.unprocessed', null, 'Unprocessed') })
      ]));
      var assignmentSelect = el('select', {
        className: 'browser-inbox-select',
        'data-browser-inbox-assignment': capture.captureId,
        'aria-label': tr('ui.assignment', null, 'Assign to Deal'),
        onChange: function (event) {
          assignWorkspace(capture.captureId, event && event.target && event.target.value);
        }
      });
      assignmentSelect.appendChild(option('', tr('ui.unassigned', null, 'Unassigned')));
      workspaceRoots().forEach(function (workspaceRoot) {
        assignmentSelect.appendChild(option(workspaceRoot, workspaceRoot));
      });
      assignmentSelect.value = capture.workspaceRootPath || '';
      var assignmentControls = [
        el('span', { className: 'browser-inbox-meta-label', textContent: tr('ui.assignment', null, 'Assign to Deal') }),
        assignmentSelect
      ];
      if (capture.workspaceRootPath) {
        assignmentControls.push(el('button', {
          className: 'browser-inbox-btn',
          'data-browser-inbox-action': 'clear-assignment',
          textContent: tr('ui.clearAssignment', null, 'Clear assignment'),
          onClick: function () {
            assignWorkspace(capture.captureId, '');
          }
        }));
      }
      detailEl.appendChild(el('div', { className: 'browser-inbox-assignment' }, assignmentControls));
      if (!capture.workspaceRootPath) {
        detailEl.appendChild(el('div', { className: 'browser-inbox-detail-note', textContent: tr('ui.assignBeforeCreation', null, 'Assign a Deal before creating a note, link, or file.') }));
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
        textContent: capture.processed
          ? tr('ui.markUnprocessed', null, 'Mark unprocessed')
          : tr('ui.markProcessed', null, 'Mark processed'),
        onClick: function () {
          setProcessed(capture.captureId, !capture.processed);
        }
      }));
      if (capture.url) {
        actionButtons.push(el('button', {
          className: 'browser-inbox-btn',
          'data-browser-inbox-action': 'open-link',
          textContent: tr('ui.openLink', null, 'Open link'),
          onClick: function () {
            openCaptureURL(capture);
          }
        }));
      }
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
      if (capture.globalState === 'archived') {
        actionButtons.push(el('button', {
          className: 'browser-inbox-btn',
          'data-browser-inbox-action': 'restore',
          textContent: tr('ui.restore', null, 'Restore to Inbox'),
          onClick: function () {
            restoreCapture(capture.captureId);
          }
        }));
      } else {
        actionButtons.push(el('button', {
          className: 'browser-inbox-btn',
          'data-browser-inbox-action': 'archive',
          textContent: tr('ui.archive', null, 'Archive'),
          onClick: function () {
            archiveCapture(capture.captureId);
          }
        }));
      }
      actionButtons.push(el('button', {
          className: 'browser-inbox-btn danger',
          'data-browser-inbox-action': 'delete-permanently',
          textContent: tr('ui.deletePermanently', null, 'Delete permanently'),
          onClick: function () {
            permanentlyDeleteCapture(capture.captureId);
          }
        }));
      detailEl.appendChild(el('div', { className: 'browser-inbox-detail-actions' }, actionButtons));
    }

    function renderCount() {
      var visibleCount = visibleCaptures().length;
      var total = captures.length;
      countEl.textContent = visibleCount === total
        ? localizedItemCount(total)
        : tr('ui.items.filtered', {
          visible: localizedItemCount(visibleCount),
          total: localizedItemCount(total)
        }, localizedItemCount(visibleCount) + ' of ' + localizedItemCount(total));
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

    function loadStored(skipMigration) {
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
        captures = sortCaptures(all).map(applyDomainBinding);
        if (!selectedId && captures[0]) selectedId = captures[0].captureId;
        // Read legacy records once, then ask the backend to migrate them atomically.
        if (!hasLegacyCaptures || skipMigration) return undefined;
        var expectedIds = captures.map(function (capture) { return capture.captureId; });
        return publishMutation('migrate', {}, function () {
          return expectedIds.every(function (captureId) {
            return captures.some(function (capture) { return capture.captureId === captureId; });
          });
        }, function (migratedSettings) {
          var canonicalIds = normalizeStoredCaptures(migratedSettings[GLOBAL_KEY], GLOBAL_KEY).map(function (capture) {
            return capture.captureId;
          });
          var legacyIsEmpty = globalCaptureKeys(migratedSettings).filter(function (key) {
            return key !== GLOBAL_KEY;
          }).every(function (key) {
            return normalizeStoredCaptures(migratedSettings[key], key).length === 0;
          });
          return legacyIsEmpty && expectedIds.every(function (captureId) {
            return canonicalIds.indexOf(captureId) !== -1;
          });
        });
      }).catch(function (err) {
        reportError('ui.loadError', 'Could not load browser materials. Please try again.', err);
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
          var received = captureFromEvent(event);
          return loadStored(true).then(function () {
            var stored = captures.find(function (capture) {
              return capture.captureId === received.captureId;
            });
            if (!stored) return addCapture(received);
            if (!received.workspaceRootPath && stored.workspaceRootPath) {
              return publishMutation('assign', {
                captureId: stored.captureId,
                workspaceRootPath: stored.workspaceRootPath
              }, function () {
                return captures.some(function (capture) {
                  return capture.captureId === stored.captureId && capture.workspaceRootPath === stored.workspaceRootPath;
                });
              }).then(function (saved) {
                if (!saved) return;
                selectedId = received.captureId;
                statusText = tr('ui.captureReceived', null, 'Material received');
                statusClass = '';
                render();
              });
            }
            selectedId = received.captureId;
            statusText = tr('ui.captureReceived', null, 'Material received');
            statusClass = '';
            render();
            return undefined;
          });
        }).then(function (unsubscribe) {
          if (typeof unsubscribe === 'function') unsubscribers.push(unsubscribe);
        });
      })).then(function () {
        statusText = scope.mode === 'global'
          ? tr('ui.receiverReadyAll', null, 'Receiver ready for all Deals')
          : tr('ui.receiverReadyWorkspace', null, 'Receiver ready for this Deal');
        statusClass = '';
      }).catch(function (err) {
        reportError('ui.receiverError', 'The browser receiver is unavailable. Please try again.', err);
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
        titleEl.textContent = scope.mode === 'global' ? tr('ui.title', null, 'Browser') : tr('ui.workspaceTitle', { workspace: scope.label }, 'Browser · ' + scope.label);
        searchInput.setAttribute('placeholder', tr('ui.search', null, 'Search captures'));
        statusFilterEl.setAttribute('aria-label', tr('ui.statusFilter', null, 'Material status filter'));
        workspaceFilterEl.setAttribute('aria-label', tr('ui.workspaceFilter', null, 'Deal filter'));
        searchInput.setAttribute('aria-label', tr('ui.search', null, 'Search captures'));
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

      function reportError(key, fallback, err) {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          console.warn('[verstak.browser-inbox.settings] ' + key, err);
        }
        setStatus(tr(key, null, fallback), true);
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
        setStatus(tr('ui.loading', null, 'Loading...'), false);
        return Promise.resolve().then(function () {
          return pairingAPI().pairing();
        }).then(function (pairing) {
          applyPairing(pairing);
          setStatus('', false);
        }).catch(function (err) {
          reportError('ui.pairingLoadError', 'Could not load browser connection settings. Please try again.', err);
        }).then(function () {
          setBusy(false);
        });
      }

      function copyValue(value, label) {
        if (!value) return;
        if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
          setStatus(tr('ui.clipboardUnavailable', null, 'Clipboard unavailable'), true);
          return;
        }
        navigator.clipboard.writeText(value).then(function () {
          setStatus(tr('ui.copied', { label: label }, '{label} copied'), false);
        }).catch(function (err) {
          reportError('ui.clipboardError', 'Could not copy to the clipboard. Please try again.', err);
        });
      }

      copyURLButton.addEventListener('click', function () {
        copyValue(receiverURLInput.value, 'URL');
      });
      copyTokenButton.addEventListener('click', function () {
        copyValue(receiverTokenInput.value, 'Token');
      });
      rotateTokenButton.addEventListener('click', function () {
        if (typeof window.confirm === 'function' && !window.confirm(tr('ui.rotateConfirm', null, 'Rotate pairing token?'))) return;
        setBusy(true);
        setStatus(tr('ui.rotating', null, 'Rotating...'), false);
        Promise.resolve().then(function () {
          return pairingAPI().rotateToken();
        }).then(function (pairing) {
          applyPairing(pairing);
          setStatus(tr('ui.tokenRotated', null, 'Token rotated'), false);
        }).catch(function (err) {
          reportError('ui.tokenRotateError', 'Could not rotate the pairing token. Please try again.', err);
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
