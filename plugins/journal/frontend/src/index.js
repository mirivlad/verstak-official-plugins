/* ===========================================================
   Journal Plugin - Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  var PLUGIN_ID = 'verstak.journal';
  var WORKLOG_PREFIX = 'worklog:workspace:';
  var ACTIVITY_PLUGIN_ID = 'verstak.activity';
  var ACTIVITY_WORKLOG_COMMAND = 'verstak.activity.suggestWorklog';

  function injectStyles() {
    if (document.getElementById('journal-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'journal-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  var STYLES = [
    '.journal-root{display:flex;flex-direction:column;height:100%;min-height:0;background:#0d0d1a;color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '.journal-toolbar{display:flex;align-items:center;gap:.5rem;padding:.55rem .75rem;border-bottom:1px solid #16213e;background:#12122a;flex-shrink:0;flex-wrap:wrap}',
    '.journal-title{font-size:.86rem;font-weight:600}',
    '.journal-count{font-size:.72rem;color:#8b8ba8}',
    '.journal-spacer{flex:1}',
    '.journal-btn{font-size:.78rem;padding:.36rem .65rem;border:1px solid #333;border-radius:4px;background:#1a1a2e;color:#ddd;cursor:pointer}',
    '.journal-btn:hover{border-color:#4ecca3;background:#2a2a4e}',
    '.journal-btn:disabled{opacity:.45;cursor:default}',
    '.journal-status{font-size:.72rem;color:#8b8ba8}',
    '.journal-status.error{color:#e74c3c}',
    '.journal-form{display:grid;grid-template-columns:8rem minmax(10rem,1fr) 7rem auto auto;gap:.45rem;padding:.65rem .75rem;border-bottom:1px solid rgba(22,33,62,.65);background:#101020;align-items:center}',
    '.journal-input{font-size:.8rem;padding:.38rem .5rem;border:1px solid #333;border-radius:4px;background:#0d0d1a;color:#e0e0e0;min-width:0}',
    '.journal-input:focus{outline:none;border-color:#4ecca3}',
    '.journal-billable{display:flex;align-items:center;gap:.25rem;font-size:.74rem;color:#aaa;white-space:nowrap}',
    '.journal-list{flex:1;min-height:0;overflow:auto;background:#101020}',
    '.journal-empty{height:100%;display:flex;align-items:center;justify-content:center;color:#666;font-size:.86rem;padding:2rem;text-align:center}',
    '.journal-row{display:grid;grid-template-columns:8rem minmax(0,1fr) auto;gap:.7rem;padding:.75rem .85rem;border-bottom:1px solid rgba(22,33,62,.6)}',
    '.journal-date{font-size:.75rem;color:#8b8ba8;white-space:nowrap}',
    '.journal-main{min-width:0}',
    '.journal-entry-title{font-size:.88rem;color:#e0e0e0;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.journal-summary{margin-top:.25rem;font-size:.78rem;line-height:1.4;color:#aaa;white-space:pre-wrap;overflow-wrap:anywhere}',
    '.journal-meta{margin-top:.25rem;font-size:.72rem;color:#777}',
    '.journal-minutes{font-size:.78rem;color:#4ecca3;white-space:nowrap}',
    '@media(max-width:820px){.journal-form,.journal-row{grid-template-columns:1fr}.journal-btn{width:100%}.journal-toolbar{align-items:stretch}.journal-status{width:100%}}'
  ].join('\n');

  function el(tag, attrs, children) {
    var elem = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (attrs[key] == null) return;
        if (key === 'className') elem.className = attrs[key];
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
    if (!workspaceRoot) return { mode: 'global', key: '', label: 'All workspaces', workspaceRoot: '' };
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
      sourceSuggestionId: text(value.sourceSuggestionId),
      eventIds: Array.isArray(value.eventIds) ? value.eventIds.map(text) : []
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
        sourceSuggestionId: entry.sourceSuggestionId,
        eventIds: entry.eventIds || []
      };
    });
  }

  function sortEntries(entryList) {
    var seen = {};
    return entryList.filter(function (entry) {
      var key = entry.sourceSuggestionId || entry.entryId;
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

  function JournalView() {}

  JournalView.mount = function (containerEl, props, api) {
    injectStyles();
    containerEl.innerHTML = '';
    containerEl.className = 'journal-root';
    containerEl.setAttribute('data-plugin-id', PLUGIN_ID);

    var scope = scopeFromProps(props || {});
    var entries = [];
    var statusText = 'Loading journal...';
    var statusClass = '';

    var toolbar = el('div', { className: 'journal-toolbar' });
    var titleEl = el('span', { className: 'journal-title', textContent: scope.mode === 'global' ? 'Journal' : 'Journal · ' + scope.label });
    var countEl = el('span', { className: 'journal-count' });
    var statusEl = el('span', { className: 'journal-status' });
    var importBtn = el('button', {
      className: 'journal-btn',
      'data-journal-action': 'import-activity',
      textContent: 'Import Activity',
      onClick: importActivity
    });
    toolbar.appendChild(titleEl);
    toolbar.appendChild(countEl);
    toolbar.appendChild(el('span', { className: 'journal-spacer' }));
    toolbar.appendChild(statusEl);
    toolbar.appendChild(importBtn);

    var dateInput = el('input', { className: 'journal-input', type: 'date', value: today(), 'data-journal-input': 'date' });
    var titleInput = el('input', { className: 'journal-input', type: 'text', placeholder: 'Work item', 'data-journal-input': 'title' });
    var summaryInput = el('input', { className: 'journal-input', type: 'text', placeholder: 'Summary', 'data-journal-input': 'summary' });
    var minutesInput = el('input', { className: 'journal-input', type: 'number', min: '0', step: '15', value: '30', 'data-journal-input': 'minutes' });
    var billableInput = el('input', { type: 'checkbox', 'data-journal-input': 'billable' });
    var addBtn = el('button', {
      className: 'journal-btn',
      'data-journal-action': 'add',
      textContent: 'Add',
      onClick: addManualEntry
    });
    var formEl = el('div', { className: 'journal-form' }, [
      dateInput,
      titleInput,
      summaryInput,
      minutesInput,
      el('label', { className: 'journal-billable' }, [billableInput, 'Billable']),
      addBtn
    ]);
    var listEl = el('div', { className: 'journal-list' });
    containerEl.appendChild(toolbar);
    if (scope.mode === 'workspace') containerEl.appendChild(formEl);
    containerEl.appendChild(listEl);

    function persist() {
      if (scope.mode !== 'workspace') return Promise.resolve();
      if (!api || !api.settings || typeof api.settings.write !== 'function') return Promise.resolve();
      return api.settings.write(scope.key, storageEntries(entries)).catch(function (err) {
        statusText = 'Could not save journal: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
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
          statusText = 'Aggregating worklogs';
          statusClass = '';
        }).catch(function (err) {
          statusText = 'Could not load journal: ' + (err && err.message ? err.message : String(err));
          statusClass = 'error';
        });
      }
      return api.settings.read(scope.key).then(function (stored) {
        entries = sortEntries(normalizeEntries(stored, scope.key));
        statusText = 'Ready';
        statusClass = '';
      }).catch(function (err) {
        statusText = 'Could not load journal: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
      });
    }

    function addManualEntry() {
      if (scope.mode !== 'workspace') return;
      var title = text(titleInput.value).trim();
      if (!title) {
        statusText = 'Title is required';
        statusClass = 'error';
        render();
        return;
      }
      var entry = normalizeEntry({
        entryId: entryId(scope.workspaceRoot, dateInput.value || today(), title),
        workspaceRootPath: scope.workspaceRoot,
        date: dateInput.value || today(),
        title: title,
        summary: summaryInput.value,
        minutes: Number(minutesInput.value || 0),
        billable: billableInput.checked === true
      }, scope.key);
      entries = sortEntries([entry].concat(entries));
      titleInput.value = '';
      summaryInput.value = '';
      statusText = 'Entry added';
      statusClass = '';
      persist().then(render);
    }

    function suggestionToEntry(suggestion) {
      return normalizeEntry({
        entryId: 'journal:' + suggestion.suggestionId,
        workspaceRootPath: suggestion.workspaceRootPath || scope.workspaceRoot,
        date: suggestion.date || today(),
        title: suggestion.title || 'Activity work',
        summary: suggestion.summary || '',
        minutes: Number(suggestion.minutes || 0),
        billable: false,
        sourceSuggestionId: suggestion.suggestionId,
        eventIds: suggestion.eventIds || []
      }, scope.key);
    }

    function importActivity() {
      if (scope.mode !== 'workspace') return;
      if (!api || !api.commands || typeof api.commands.executeFor !== 'function') {
        statusText = 'Activity suggestions unavailable';
        statusClass = 'error';
        render();
        return;
      }
      importBtn.disabled = true;
      statusText = 'Importing activity...';
      statusClass = '';
      render();
      api.commands.executeFor(ACTIVITY_PLUGIN_ID, ACTIVITY_WORKLOG_COMMAND, {
        workspaceRootPath: scope.workspaceRoot
      }).then(function (response) {
        var suggestions = response && response.result && Array.isArray(response.result.suggestions)
          ? response.result.suggestions
          : [];
        var imported = 0;
        suggestions.forEach(function (suggestion) {
          if (!suggestion || !suggestion.suggestionId) return;
          var exists = entries.some(function (entry) {
            return entry.sourceSuggestionId === suggestion.suggestionId;
          });
          if (exists) return;
          entries.push(suggestionToEntry(suggestion));
          imported += 1;
        });
        entries = sortEntries(entries);
        statusText = imported ? 'Imported ' + imported + ' activity suggestion' + (imported === 1 ? '' : 's') : 'No new activity suggestions';
        statusClass = '';
        return persist();
      }).catch(function (err) {
        statusText = 'Activity suggestions unavailable: ' + (err && err.message ? err.message : String(err));
        statusClass = 'error';
      }).then(function () {
        importBtn.disabled = false;
        render();
      });
    }

    function renderList() {
      listEl.innerHTML = '';
      if (!entries.length) {
        listEl.appendChild(el('div', { className: 'journal-empty', textContent: scope.mode === 'global' ? 'No worklog entries yet.' : 'No worklog entries yet.' }));
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
            el('div', { className: 'journal-meta', textContent: entry.workspaceRootPath + (entry.billable ? ' · billable' : ' · non-billable') })
          ]),
          el('div', { className: 'journal-minutes', textContent: entry.minutes + ' min' })
        ]));
      });
    }

    function render() {
      countEl.textContent = entries.length + ' entr' + (entries.length === 1 ? 'y' : 'ies');
      statusEl.textContent = statusText;
      statusEl.className = 'journal-status' + (statusClass ? ' ' + statusClass : '');
      importBtn.disabled = scope.mode !== 'workspace' || importBtn.disabled;
      renderList();
    }

    render();
    loadStored().then(render);
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
