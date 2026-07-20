/* ===========================================================
   Search Plugin — Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  var TEXT_EXTS = [
    'md', 'markdown', 'txt', 'log', 'conf', 'ini', 'toml', 'yaml', 'yml',
    'json', 'csv', 'tsv', 'xml', 'html', 'htm', 'css', 'scss', 'sass', 'less',
    'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'py', 'go', 'rs', 'java', 'kt',
    'swift', 'rb', 'php', 'c', 'cpp', 'h', 'hpp', 'sh', 'bash', 'zsh', 'sql'
  ];
  var SEARCH_DEBOUNCE_MS = 300;
  var MAX_FILES = 500;
  var MAX_RESULTS = 100;
  var INDEX_STORAGE_KEY = 'search-index';
  var INDEX_VERSION = 1;
  var SEARCH_COMMAND_ID = 'verstak.search.searchVaultText';

  function injectStyles() {
    if (document.getElementById('search-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'search-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  var STYLES = [
    '.search-root{height:100%;min-height:0;display:flex;flex-direction:column;container-type:inline-size;background:var(--vt-color-background,#101020);color:var(--vt-color-text-primary,#f4f7fb);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '.search-toolbar{display:flex;align-items:center;gap:.5rem;min-height:2.75rem;padding:.55rem .75rem;border-bottom:1px solid var(--vt-color-border,#202b46);background:var(--vt-color-surface-muted,#111629);flex-shrink:0;flex-wrap:wrap}',
    '.search-filter-group{display:flex;align-items:center;gap:.5rem;min-width:0;flex:1;flex-wrap:nowrap}',
    '.search-input{flex:1;min-width:180px;font-size:.86rem;padding:.42rem .55rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:#0f1424;color:var(--vt-color-text-primary,#f4f7fb);outline:none}',
    '.search-input:focus{border-color:var(--vt-color-accent,#4ecca3);box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34))}',
    '.search-btn{font-size:.8rem;min-height:2rem;padding:.42rem .7rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-secondary,#b7c0d4);cursor:pointer}',
    '.search-btn:hover{border-color:var(--vt-color-accent,#4ecca3);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.search-btn:disabled{opacity:.45;cursor:default}',
    '.search-scope{font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:18rem}',
    '.search-status{font-size:.78rem;color:var(--vt-color-text-muted,#7f8aa3);padding:.45rem .75rem;border-bottom:1px solid rgba(32,43,70,.72);flex-shrink:0}',
    '.search-status.error{color:var(--vt-color-danger,#e94560)}',
    '.search-alert{margin:.65rem .75rem 0;border:1px solid rgba(233,69,96,.45);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-danger-muted,rgba(233,69,96,.14));color:#ffc6ce;padding:.55rem .65rem;font-size:.78rem}',
    '.search-alert[hidden]{display:none}',
    '.search-alert summary{cursor:pointer;color:#fff}',
    '.search-results{flex:1;min-height:0;overflow:auto}',
    '.search-empty{height:100%;display:flex;align-items:center;justify-content:center;color:var(--vt-color-text-muted,#7f8aa3);font-size:.9rem;padding:2rem;text-align:center}',
    '.search-result{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.75rem;align-items:center;margin:.5rem .75rem 0;padding:.7rem .8rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c)}',
    '.search-result:hover{background:var(--vt-color-surface-hover,#1b2440)}',
    '.search-result-head{display:flex;align-items:center;gap:.5rem;min-width:0}',
    '.search-type{display:inline-flex;align-items:center;min-height:1.25rem;padding:.1rem .4rem;border:1px solid rgba(78,204,163,.4);border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-accent-muted,rgba(78,204,163,.14));color:var(--vt-color-accent,#4ecca3);font-size:.68rem;font-weight:650;text-transform:uppercase;letter-spacing:.03em}',
    '.search-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.86rem;color:var(--vt-color-text-primary,#f4f7fb);font-weight:650}',
    '.search-path{margin-top:.2rem;font-size:.76rem;color:var(--vt-color-text-muted,#7f8aa3);word-break:break-word}',
    '.search-snippet{margin-top:.25rem;font-size:.8rem;line-height:1.45;color:var(--vt-color-text-secondary,#b7c0d4);white-space:pre-wrap;overflow-wrap:anywhere}',
    '.search-meta{margin-top:.28rem;font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.search-open-btn{align-self:center;white-space:nowrap;min-width:4.5rem;padding:.35rem .65rem}',
    '@container(max-width:700px){.search-filter-group{order:10;flex:1 0 100%;width:100%}.search-filter-group .search-input{min-width:0}.search-scope{max-width:none}}',
    '@media(max-width:700px){.search-result{grid-template-columns:1fr}}'
  ].join('\n');

  function el(tag, attrs, children) {
    var elem = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] == null) return;
        if (k === 'className') elem.className = attrs[k];
        else if (k === 'style' && typeof attrs[k] === 'object') {
          if (elem.style) Object.assign(elem.style, attrs[k]);
        }
        else if (k.slice(0, 2) === 'on') elem.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (k === 'textContent') elem.textContent = attrs[k];
        else if (k === 'innerHTML') elem.innerHTML = attrs[k];
        else elem.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        elem.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return elem;
  }

  function cleanPath(path) {
    return String(path || '').split('/').filter(Boolean).join('/');
  }

  function baseName(path) {
    path = cleanPath(path);
    var parts = path.split('/');
    return parts[parts.length - 1] || path || 'Untitled';
  }

  function resultTypeLabel(result) {
    var type = String(result && result.type || 'result').toLowerCase();
    if (type === 'folder') return 'Folder';
    if (type === 'file') return 'File';
    if (type === 'external') return 'Plugin';
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  function extension(entry) {
    var explicit = String((entry && entry.extension) || '').replace(/^\./, '').toLowerCase();
    if (explicit) return explicit;
    var name = String((entry && (entry.name || entry.relativePath)) || '');
    var idx = name.lastIndexOf('.');
    return idx > 0 ? name.slice(idx + 1).toLowerCase() : '';
  }

  function isTextFile(entry) {
    return entry && entry.type === 'file' && TEXT_EXTS.indexOf(extension(entry)) !== -1;
  }

  function pathMatches(entry, query) {
    var needle = String(query || '').toLowerCase();
    var path = String((entry && entry.relativePath) || '').toLowerCase();
    var name = String((entry && entry.name) || '').toLowerCase();
    return path.indexOf(needle) !== -1 || name.indexOf(needle) !== -1;
  }

  function lineNumber(text, index) {
    return text.slice(0, index).split('\n').length;
  }

  function snippet(text, index, needleLength) {
    var start = Math.max(0, index - 60);
    var end = Math.min(text.length, index + needleLength + 90);
    return (start > 0 ? '...' : '') + text.slice(start, end).replace(/\s+/g, ' ').trim() + (end < text.length ? '...' : '');
  }

  function scanText(path, text, query) {
    var lower = text.toLowerCase();
    var needle = query.toLowerCase();
    var idx = lower.indexOf(needle);
    if (idx === -1) return null;
    return {
      path: path,
      type: 'file',
      matchType: 'Content match',
      openable: true,
      line: lineNumber(text, idx),
      snippet: snippet(text, idx, query.length)
    };
  }

  function scanPath(entry) {
    var isFolder = entry.type === 'folder';
    return {
      path: entry.relativePath,
      type: entry.type,
      matchType: isFolder ? 'Folder name' : 'File name',
      openable: !isFolder,
      line: 0,
      snippet: isFolder ? 'Folder name/path match' : 'File name/path match'
    };
  }

  async function collectEntries(api, rootPath) {
    var found = [];
    var folders = [cleanPath(rootPath)];
    var visited = 0;
    while (folders.length && visited < MAX_FILES) {
      var current = folders.shift();
      var entries = await api.files.list(current);
      entries = Array.isArray(entries) ? entries : [];
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (!entry || !entry.relativePath) continue;
        found.push(entry);
        if (entry.type === 'folder') {
          folders.push(entry.relativePath);
        }
        visited += 1;
        if (visited >= MAX_FILES) break;
      }
    }
    return found;
  }

  async function buildIndex(api, rootPath) {
    var entries = await collectEntries(api, rootPath);
    var files = [];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (!isTextFile(entry)) continue;
      try {
        files.push({
          path: entry.relativePath,
          text: String(await api.files.readText(entry.relativePath) || '')
        });
      } catch (err) {
        // Ignore unreadable files; search should remain usable on mixed vaults.
      }
    }
    return {
      version: INDEX_VERSION,
      workspaceRootPath: cleanPath(rootPath),
      updatedAt: new Date().toISOString(),
      entries: entries,
      files: files
    };
  }

  function normalizeIndex(value, rootPath) {
    if (!value || value.version !== INDEX_VERSION) return null;
    if (cleanPath(value.workspaceRootPath) !== cleanPath(rootPath)) return null;
    if (!Array.isArray(value.entries) || !Array.isArray(value.files)) return null;
    return value;
  }

  async function readStoredIndex(api, rootPath) {
    if (!api.storage || !api.storage.data || typeof api.storage.data.read !== 'function') return null;
    try {
      return normalizeIndex(await api.storage.data.read(INDEX_STORAGE_KEY), rootPath);
    } catch (err) {
      return null;
    }
  }

  async function writeStoredIndex(api, index) {
    if (!api.storage || !api.storage.data || typeof api.storage.data.write !== 'function') return;
    try {
      await api.storage.data.write(INDEX_STORAGE_KEY, index);
    } catch (err) {
      // Storage is an optimization for fast reloads; search can still work in memory.
    }
  }

  async function loadOrBuildIndex(api, rootPath, currentIndex) {
    var normalized = normalizeIndex(currentIndex, rootPath);
    if (normalized) return normalized;
    var stored = await readStoredIndex(api, rootPath);
    if (stored) return stored;
    var index = await buildIndex(api, rootPath);
    await writeStoredIndex(api, index);
    return index;
  }

  function runLocalSearch(index, query) {
    query = String(query || '').trim();
    if (query.length < 2) return [];
    index = index || { entries: [], files: [] };
    var results = [];
    var entries = Array.isArray(index.entries) ? index.entries : [];
    var files = Array.isArray(index.files) ? index.files : [];
    for (var i = 0; i < entries.length && results.length < MAX_RESULTS; i++) {
      var entry = entries[i];
      if (pathMatches(entry, query)) results.push(scanPath(entry));
    }
    for (var j = 0; j < files.length && results.length < MAX_RESULTS; j++) {
      var file = files[j];
      var match = scanText(file.path, String(file.text || ''), query);
      if (match) results.push(match);
    }
    return results;
  }

  function normalizeProviderResults(provider, value) {
    var list = Array.isArray(value) ? value : (value && Array.isArray(value.results) ? value.results : []);
    return list.map(function (item) {
      return {
        path: cleanPath(item.path || item.relativePath || item.title || provider.label || provider.id),
        type: item.type || 'external',
        matchType: item.matchType || provider.label || 'External match',
        sourceLabel: provider.label || provider.id || provider.pluginId,
        openable: item.openable === true,
        line: item.line || 0,
        snippet: item.snippet || item.preview || ''
      };
    }).filter(function (item) { return item.path; });
  }

  async function runExternalProviders(api, rootPath, query, remaining) {
    var output = { results: [], errors: [] };
    if (remaining <= 0) return output;
    if (!api.contributions || typeof api.contributions.list !== 'function') return output;
    if (!api.commands || typeof api.commands.executeFor !== 'function') return output;
    var providers = [];
    try {
      providers = await api.contributions.list('searchProviders');
    } catch (err) {
      console.warn('[verstak.search] list search providers:', err);
      output.errors.push(true);
      return output;
    }
    providers = Array.isArray(providers) ? providers : [];
    for (var i = 0; i < providers.length && output.results.length < remaining; i++) {
      var provider = providers[i];
      if (!provider || !provider.handler) continue;
      if (provider.pluginId === 'verstak.search' || provider.handler === SEARCH_COMMAND_ID) continue;
      try {
        var response = await api.commands.executeFor(provider.pluginId, provider.handler, {
          query: query,
          workspaceRootPath: rootPath,
          limit: remaining - output.results.length
        });
        var normalized = normalizeProviderResults(provider, response && response.result);
        output.results = output.results.concat(normalized.slice(0, remaining - output.results.length));
      } catch (err) {
        console.warn('[verstak.search] provider search:', err);
        output.errors.push(true);
      }
    }
    return output;
  }

  var SearchView = {
    mount: function (containerEl, props, api) {
      injectStyles();
      var rootPath = cleanPath(props && (props.workspaceRootPath || props.workspaceName));
      var state = { query: '', searching: false, results: [], status: 'Enter at least 2 characters.', error: '', providerErrors: [] };
      var searchTimer = null;
      var searchSeq = 0;
      var index = null;
      var cleanupFns = [];
      var indexRefresh = Promise.resolve();
      var input = null;
      var button = null;
      var statusEl = null;
      var alertEl = null;
      var resultsEl = null;
      function tr(key, params, fallback) {
        if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
        return fallback || key;
      }
      state.status = tr('ui.minChars', null, 'Enter at least 2 characters.');

      function ensureLayout() {
        if (input) return;
        containerEl.innerHTML = '';
        containerEl.className = 'search-root';
        containerEl.setAttribute('data-plugin-id', 'verstak.search');

        input = el('input', {
          className: 'search-input',
          type: 'search',
          placeholder: tr('ui.placeholder', null, 'Search files, folders, text'),
          value: state.query,
          'data-search-input': 'query',
          onInput: function (event) {
            state.query = event.target.value;
            scheduleSearch();
          }
        });
        button = el('button', {
          className: 'search-btn',
          'data-search-action': 'run',
          onClick: search
        });
        containerEl.appendChild(el('div', { className: 'search-toolbar' }, [
          el('span', { className: 'search-scope', title: rootPath || tr('ui.vault', null, 'Vault') }, [rootPath || tr('ui.vault', null, 'Vault')]),
          el('div', { className: 'search-filter-group' }, [input, button])
        ]));

        statusEl = el('div', { className: 'search-status' });
        containerEl.appendChild(statusEl);
        alertEl = el('div', { className: 'search-alert', hidden: 'hidden' });
        containerEl.appendChild(alertEl);
        resultsEl = el('div', { className: 'search-results' });
        containerEl.appendChild(resultsEl);
      }

      function render() {
        ensureLayout();
        if (document.activeElement !== input && input.value !== state.query) {
          input.value = state.query;
        }
        button.textContent = state.searching ? tr('ui.searching', null, 'Searching...') : tr('ui.search', null, 'Search');
        button.disabled = !!state.searching;
        statusEl.className = 'search-status' + (state.error ? ' error' : '');
        statusEl.textContent = state.error || state.status;
        alertEl.innerHTML = '';
        if (state.providerErrors && state.providerErrors.length) {
          if (typeof alertEl.removeAttribute === 'function') alertEl.removeAttribute('hidden');
          alertEl.appendChild(el('details', {}, [
            el('summary', {}, [tr('ui.providersFailed', null, 'Some plugin search providers did not respond')]),
            el('div', {}, [state.providerErrors.map(function () {
              return tr('ui.providerUnavailable', null, 'A search provider is unavailable.');
            }).join(' ')])
          ]));
        } else if (typeof alertEl.setAttribute === 'function') {
          alertEl.setAttribute('hidden', 'hidden');
        }
        resultsEl.innerHTML = '';
        if (!state.results.length) {
          resultsEl.appendChild(el('div', { className: 'search-empty' }, [state.searching ? tr('ui.searching', null, 'Searching...') : tr('ui.noResults', null, 'No results')]));
          return;
        }
        state.results.forEach(function (result) {
          resultsEl.appendChild(el('div', { className: 'search-result' }, [
            el('div', {}, [
              el('div', { className: 'search-result-head' }, [
                el('span', { className: 'search-type' }, [resultTypeLabel(result)]),
                el('span', { className: 'search-title', title: result.path }, [baseName(result.path)])
              ]),
              el('div', { className: 'search-path' }, [result.path]),
              el('div', { className: 'search-snippet' }, [result.snippet]),
              el('div', { className: 'search-meta' }, [
                (result.sourceLabel ? result.sourceLabel + ' - ' : '') + result.matchType + (result.line ? ' - Line ' + result.line : '')
              ])
            ]),
            result.openable ? el('button', {
              className: 'search-btn search-open-btn',
              textContent: tr('ui.open', null, 'Open'),
              'data-search-open': result.path,
              onClick: function () {
                api.workbench.openResource({
                  kind: 'vault-file',
                  path: result.path,
                  mode: 'view'
                }).catch(function (err) { console.error('[search] openResource:', err); });
              }
            }) : null
          ]));
        });
      }

      function scheduleSearch() {
        if (searchTimer) {
          clearTimeout(searchTimer);
          searchTimer = null;
        }
        searchSeq += 1;
        var query = String(state.query || '').trim();
        if (query.length < 2) {
          state.searching = false;
          state.results = [];
          state.status = tr('ui.minChars', null, 'Enter at least 2 characters.');
          state.error = '';
          state.providerErrors = [];
          render();
          return;
        }
        searchTimer = setTimeout(search, SEARCH_DEBOUNCE_MS);
      }

      async function search() {
        if (searchTimer) {
          clearTimeout(searchTimer);
          searchTimer = null;
        }
        state.query = String(state.query || '').trim();
        if (state.query.length < 2) {
          state.results = [];
          state.status = tr('ui.minChars', null, 'Enter at least 2 characters.');
          state.error = '';
          state.providerErrors = [];
          render();
          return;
        }
        state.searching = true;
        state.error = '';
        state.providerErrors = [];
        state.status = tr('ui.searching', null, 'Searching...');
        var seq = searchSeq + 1;
        searchSeq = seq;
        render();
        try {
          await indexRefresh;
          var results = await searchVaultText({ query: state.query, limit: MAX_RESULTS });
          var external = await runExternalProviders(api, rootPath, state.query, MAX_RESULTS - results.length);
          if (seq !== searchSeq) return;
          state.results = results.concat(external.results);
          state.status = tr('ui.count', { count: state.results.length }, state.results.length + ' result' + (state.results.length === 1 ? '' : 's'));
          state.providerErrors = external.errors;
        } catch (err) {
          if (seq !== searchSeq) return;
          console.warn('[verstak.search] search:', err);
          state.results = [];
          state.error = tr('ui.searchError', null, 'Could not search the vault. Please try again.');
          state.providerErrors = [];
        } finally {
          if (seq !== searchSeq) return;
          state.searching = false;
          render();
        }
      }

      async function searchVaultText(args) {
        var query = args && args.query != null ? args.query : state.query;
        var limit = args && args.limit ? Number(args.limit) : MAX_RESULTS;
        index = await loadOrBuildIndex(api, rootPath, index);
        return runLocalSearch(index, query).slice(0, limit > 0 ? limit : MAX_RESULTS);
      }

      async function refreshIndex() {
        index = await buildIndex(api, rootPath);
        await writeStoredIndex(api, index);
        return index;
      }

      function handleFileChanged(event) {
        var payload = (event && event.payload) || event || {};
        var changedPath = cleanPath(payload.relativePath || payload.path || '');
        if (changedPath && rootPath && changedPath !== rootPath && changedPath.indexOf(rootPath + '/') !== 0) return;
        indexRefresh = refreshIndex().catch(function (err) {
          console.error('[search] refresh index:', err);
        });
        return indexRefresh;
      }

      function setupIntegrations() {
        if (api.commands && typeof api.commands.register === 'function') {
          api.commands.register(SEARCH_COMMAND_ID, searchVaultText).then(function (unregister) {
            if (typeof unregister === 'function') cleanupFns.push(unregister);
          }).catch(function (err) {
            console.error('[search] register command:', err);
          });
        }
        if (api.events && typeof api.events.subscribe === 'function') {
          api.events.subscribe('file.changed', handleFileChanged).then(function (unsubscribe) {
            if (typeof unsubscribe === 'function') cleanupFns.push(unsubscribe);
          }).catch(function (err) {
            console.error('[search] subscribe file.changed:', err);
          });
        }
      }

      setupIntegrations();
      render();
      if (api.i18n && typeof api.i18n.onDidChangeLocale === 'function') {
        cleanupFns.push(api.i18n.onDidChangeLocale(function () {
          if (input) input.setAttribute('placeholder', tr('ui.placeholder', null, 'Search files, folders, text'));
          render();
        }));
      }
      containerEl.__verstakSearchCleanup = function () {
        if (searchTimer) clearTimeout(searchTimer);
        searchSeq += 1;
        while (cleanupFns.length) {
          try {
            cleanupFns.pop()();
          } catch (err) {
            console.error('[search] cleanup:', err);
          }
        }
      };
    },
    unmount: function (containerEl) {
      if (containerEl.__verstakSearchCleanup) containerEl.__verstakSearchCleanup();
      delete containerEl.__verstakSearchCleanup;
      containerEl.innerHTML = '';
    }
  };

  window.VerstakPluginRegister('verstak.search', {
    components: { SearchView: SearchView }
  });
})();
