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
  var MAX_FILES = 500;
  var MAX_RESULTS = 100;

  function injectStyles() {
    if (document.getElementById('search-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'search-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  var STYLES = [
    '.search-root{height:100%;min-height:0;display:flex;flex-direction:column;background:#0d0d1a;color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '.search-toolbar{display:flex;align-items:center;gap:.5rem;padding:.55rem .75rem;border-bottom:1px solid #16213e;background:#12122a;flex-shrink:0;flex-wrap:wrap}',
    '.search-input{flex:1;min-width:180px;font-size:.86rem;padding:.42rem .55rem;border:1px solid #333;border-radius:4px;background:#0d0d1a;color:#e0e0e0;outline:none}',
    '.search-input:focus{border-color:#4ecca3}',
    '.search-btn{font-size:.8rem;padding:.42rem .7rem;border:1px solid #333;border-radius:4px;background:#1a1a2e;color:#ddd;cursor:pointer}',
    '.search-btn:hover{border-color:#4ecca3;background:#2a2a4e}',
    '.search-btn:disabled{opacity:.45;cursor:default}',
    '.search-scope{font-size:.72rem;color:#8b8ba8;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:18rem}',
    '.search-status{font-size:.78rem;color:#8b8ba8;padding:.45rem .75rem;border-bottom:1px solid rgba(22,33,62,.55);flex-shrink:0}',
    '.search-status.error{color:#e74c3c}',
    '.search-results{flex:1;min-height:0;overflow:auto}',
    '.search-empty{height:100%;display:flex;align-items:center;justify-content:center;color:#666;font-size:.9rem;padding:2rem;text-align:center}',
    '.search-result{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.5rem;padding:.7rem .85rem;border-bottom:1px solid rgba(22,33,62,.55)}',
    '.search-result:hover{background:#17172d}',
    '.search-path{font-size:.84rem;color:#4ecca3;word-break:break-word}',
    '.search-snippet{margin-top:.25rem;font-size:.8rem;line-height:1.45;color:#cfcfe0;white-space:pre-wrap;overflow-wrap:anywhere}',
    '.search-meta{margin-top:.28rem;font-size:.72rem;color:#777}',
    '@media(max-width:700px){.search-result{grid-template-columns:1fr}.search-toolbar{align-items:stretch}.search-btn{width:100%}.search-scope{max-width:none}}'
  ].join('\n');

  function el(tag, attrs, children) {
    var elem = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] == null) return;
        if (k === 'className') elem.className = attrs[k];
        else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(elem.style, attrs[k]);
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
      line: lineNumber(text, idx),
      snippet: snippet(text, idx, query.length)
    };
  }

  async function collectFiles(api, rootPath) {
    var files = [];
    var folders = [cleanPath(rootPath)];
    var visited = 0;
    while (folders.length && visited < MAX_FILES) {
      var current = folders.shift();
      var entries = await api.files.list(current);
      entries = Array.isArray(entries) ? entries : [];
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (!entry || !entry.relativePath) continue;
        if (entry.type === 'folder') {
          folders.push(entry.relativePath);
          continue;
        }
        if (isTextFile(entry)) files.push(entry);
        visited += 1;
        if (visited >= MAX_FILES) break;
      }
    }
    return files;
  }

  async function runSearch(api, rootPath, query) {
    query = String(query || '').trim();
    if (query.length < 2) return [];
    var files = await collectFiles(api, rootPath);
    var results = [];
    for (var i = 0; i < files.length && results.length < MAX_RESULTS; i++) {
      var path = files[i].relativePath;
      try {
        var text = await api.files.readText(path);
        var match = scanText(path, String(text || ''), query);
        if (match) results.push(match);
      } catch (err) {
        // Ignore unreadable files; search should remain usable on mixed vaults.
      }
    }
    return results;
  }

  var SearchView = {
    mount: function (containerEl, props, api) {
      injectStyles();
      var rootPath = cleanPath(props && (props.workspaceRootPath || props.workspaceName));
      var state = { query: '', searching: false, results: [], status: 'Enter at least 2 characters.', error: '' };

      function render() {
        containerEl.innerHTML = '';
        containerEl.className = 'search-root';
        containerEl.setAttribute('data-plugin-id', 'verstak.search');

        var input = el('input', {
          className: 'search-input',
          type: 'search',
          placeholder: 'Search text files',
          value: state.query,
          'data-search-input': 'query',
          onInput: function (event) { state.query = event.target.value; }
        });
        var button = el('button', {
          className: 'search-btn',
          textContent: state.searching ? 'Searching...' : 'Search',
          disabled: state.searching ? 'disabled' : null,
          'data-search-action': 'run',
          onClick: search
        });
        containerEl.appendChild(el('div', { className: 'search-toolbar' }, [
          input,
          button,
          el('span', { className: 'search-scope', title: rootPath || 'Vault' }, [rootPath || 'Vault'])
        ]));

        containerEl.appendChild(el('div', { className: 'search-status' + (state.error ? ' error' : '') }, [state.error || state.status]));
        var resultsEl = el('div', { className: 'search-results' });
        containerEl.appendChild(resultsEl);
        if (!state.results.length) {
          resultsEl.appendChild(el('div', { className: 'search-empty' }, [state.searching ? 'Searching...' : 'No results']));
          return;
        }
        state.results.forEach(function (result) {
          resultsEl.appendChild(el('div', { className: 'search-result' }, [
            el('div', {}, [
              el('div', { className: 'search-path' }, [result.path]),
              el('div', { className: 'search-snippet' }, [result.snippet]),
              el('div', { className: 'search-meta' }, ['Line ' + result.line])
            ]),
            el('button', {
              className: 'search-btn',
              textContent: 'Open',
              'data-search-open': result.path,
              onClick: function () {
                api.workbench.openResource({
                  kind: 'vault-file',
                  path: result.path,
                  mode: 'view'
                }).catch(function (err) { console.error('[search] openResource:', err); });
              }
            })
          ]));
        });
      }

      async function search() {
        state.query = String(state.query || '').trim();
        if (state.query.length < 2) {
          state.results = [];
          state.status = 'Enter at least 2 characters.';
          state.error = '';
          render();
          return;
        }
        state.searching = true;
        state.error = '';
        state.status = 'Searching...';
        render();
        try {
          state.results = await runSearch(api, rootPath, state.query);
          state.status = state.results.length + ' result' + (state.results.length === 1 ? '' : 's');
        } catch (err) {
          state.results = [];
          state.error = err && err.message ? err.message : String(err);
        } finally {
          state.searching = false;
          render();
        }
      }

      render();
    },
    unmount: function (containerEl) {
      containerEl.innerHTML = '';
    }
  };

  window.VerstakPluginRegister('verstak.search', {
    components: { SearchView: SearchView }
  });
})();
