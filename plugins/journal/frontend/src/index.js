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
    '.journal-root{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--vt-color-background,#101020);color:var(--vt-color-text-primary,#f4f7fb);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '.journal-toolbar{display:flex;align-items:center;gap:.5rem;min-height:2.75rem;padding:.55rem .75rem;border-bottom:1px solid var(--vt-color-border,#202b46);background:var(--vt-color-surface-muted,#111629);flex-shrink:0;flex-wrap:wrap}',
    '.journal-title{font-size:.86rem;font-weight:600}',
    '.journal-count{font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.journal-spacer{flex:1}',
    '.journal-btn{font-size:.78rem;padding:.36rem .65rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-secondary,#b7c0d4);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:.35rem}',
    '.journal-btn svg{width:14px;height:14px;display:block;fill:currentColor}',
    '.journal-btn:hover{border-color:var(--vt-color-accent,#4ecca3);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.journal-btn:disabled{opacity:.45;cursor:default}',
    '.journal-status{font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.journal-status.error{display:inline-flex;border:1px solid rgba(233,69,96,.45);border-radius:var(--vt-radius-sm,4px);background:var(--vt-color-danger-muted,rgba(233,69,96,.14));color:#ffc6ce;padding:.18rem .4rem}',
    '.journal-input{font-size:.8rem;padding:.38rem .5rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:#0f1424;color:var(--vt-color-text-primary,#f4f7fb);min-width:0;font-family:inherit}',
    '.journal-input.textarea{min-height:7rem;resize:vertical;line-height:1.4}',
    '.journal-input:focus{outline:none;border-color:var(--vt-color-accent,#4ecca3);box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34))}',
    '.journal-billable{display:flex;align-items:center;gap:.25rem;font-size:.74rem;color:var(--vt-color-text-secondary,#b7c0d4);white-space:nowrap}',
    '.journal-list{flex:1;min-height:0;overflow:auto;background:var(--vt-color-background,#101020)}',
    '.journal-empty{height:100%;display:flex;align-items:center;justify-content:center;color:var(--vt-color-text-muted,#7f8aa3);font-size:.86rem;padding:2rem;text-align:center}',
    '.journal-row{display:grid;grid-template-columns:8rem minmax(0,1fr) auto auto;gap:.7rem;margin:.5rem .75rem 0;padding:.75rem .85rem;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c);align-items:start}',
    '.journal-row:hover{background:var(--vt-color-surface-hover,#1b2440)}',
    '.journal-date{font-size:.75rem;color:var(--vt-color-text-muted,#7f8aa3);white-space:nowrap}',
    '.journal-main{min-width:0}',
    '.journal-entry-title{font-size:.88rem;color:var(--vt-color-text-primary,#f4f7fb);font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.journal-summary{margin-top:.25rem;font-size:.78rem;line-height:1.4;color:var(--vt-color-text-secondary,#b7c0d4);white-space:pre-wrap;overflow-wrap:anywhere}',
    '.journal-meta{margin-top:.25rem;font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.journal-minutes{font-size:.78rem;color:var(--vt-color-accent,#4ecca3);white-space:nowrap}',
    '.journal-row-actions{display:flex;gap:.25rem}',
    '.journal-icon-btn{width:1.65rem;height:1.65rem;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--vt-color-border,#202b46);border-radius:var(--vt-radius-sm,4px);background:transparent;color:var(--vt-color-text-muted,#7f8aa3);cursor:pointer;padding:0}',
    '.journal-icon-btn:hover{background:var(--vt-color-surface-hover,#1b2440);border-color:var(--vt-color-accent,#4ecca3);color:var(--vt-color-accent,#4ecca3)}',
    '.journal-icon-btn.danger:hover{border-color:rgba(233,69,96,.65);color:var(--vt-color-danger,#e94560)}',
    '.journal-icon-btn svg{width:14px;height:14px;display:block;fill:currentColor}',
    '.journal-modal-host[hidden]{display:none}',
    '.journal-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.58);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem}',
    '.journal-modal{width:520px;max-width:96vw;display:grid;gap:.75rem;padding:1rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-lg,8px);background:var(--vt-color-surface,#15152c);box-shadow:0 18px 44px rgba(0,0,0,.38)}',
    '.journal-modal-title{font-size:.95rem;font-weight:650;color:var(--vt-color-text-primary,#f4f7fb)}',
    '.journal-modal-grid{display:grid;grid-template-columns:1fr 8rem;gap:.6rem}',
    '.journal-field{display:grid;gap:.3rem;font-size:.72rem;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.journal-field.wide{grid-column:1/-1}',
    '.journal-modal-actions{display:flex;justify-content:flex-end;gap:.5rem}',
    '.journal-btn.primary{background:var(--vt-color-accent,#4ecca3);border-color:var(--vt-color-accent,#4ecca3);color:#101827}',
    '.journal-btn.ghost{background:transparent}',
    '@media(max-width:820px){.journal-row{grid-template-columns:1fr}.journal-btn{width:100%}.journal-toolbar{align-items:stretch}.journal-status{width:100%}.journal-modal-grid{grid-template-columns:1fr}}'
  ].join('\n');

  function el(tag, attrs, children) {
    var elem = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (attrs[key] == null) return;
        if (key === 'className') elem.className = attrs[key];
        else if (key === 'innerHTML') elem.innerHTML = attrs[key];
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

  var ICONS = {
    add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5-1-1h-5l-1 1H5v2h14V4z'
  };

  function iconSvg(name) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (ICONS[name] || ICONS.edit) + '" fill="currentColor"/></svg>';
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
    var modalHost = el('div', { className: 'journal-modal-host', hidden: 'hidden' });

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
    var addBtn = el('button', {
      className: 'journal-btn primary',
      'data-journal-action': 'add',
      innerHTML: iconSvg('add') + '<span>Add</span>',
      onClick: function () { showEntryModal(); }
    });
    toolbar.appendChild(titleEl);
    toolbar.appendChild(countEl);
    toolbar.appendChild(el('span', { className: 'journal-spacer' }));
    toolbar.appendChild(statusEl);
    toolbar.appendChild(addBtn);
    toolbar.appendChild(importBtn);

    var listEl = el('div', { className: 'journal-list' });
    containerEl.appendChild(toolbar);
    containerEl.appendChild(listEl);
    containerEl.appendChild(modalHost);

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

    function closeEntryModal() {
      modalHost.innerHTML = '';
      modalHost.setAttribute('hidden', 'hidden');
    }

    function showEntryModal(existingEntry) {
      if (scope.mode !== 'workspace') return;
      var editing = !!existingEntry;
      var dateInput = el('input', { className: 'journal-input', type: 'date', value: editing ? existingEntry.date : today(), 'data-journal-input': 'date' });
      var titleInput = el('input', { className: 'journal-input', type: 'text', placeholder: 'Work item', value: editing ? existingEntry.title : '', 'data-journal-input': 'title' });
      var summaryInput = el('textarea', { className: 'journal-input textarea', placeholder: 'Summary', 'data-journal-input': 'summary' });
      summaryInput.value = editing ? existingEntry.summary : '';
      var minutesInput = el('input', { className: 'journal-input', type: 'number', min: '0', step: '15', value: editing ? existingEntry.minutes : '30', 'data-journal-input': 'minutes' });
      var billableInput = el('input', { type: 'checkbox', 'data-journal-input': 'billable' });
      billableInput.checked = editing ? existingEntry.billable === true : false;

      function saveEntry() {
        addOrUpdateEntry(existingEntry, {
          date: dateInput.value || today(),
          title: titleInput.value,
          summary: summaryInput.value,
          minutes: minutesInput.value,
          billable: billableInput.checked === true
        });
      }

      modalHost.innerHTML = '';
      if (typeof modalHost.removeAttribute === 'function') modalHost.removeAttribute('hidden');
      else delete modalHost.attributes.hidden;
      modalHost.appendChild(el('div', { className: 'journal-modal-overlay', onClick: function (event) {
        if (event.target === event.currentTarget) closeEntryModal();
      } }, [
        el('div', { className: 'journal-modal' }, [
          el('div', { className: 'journal-modal-title', textContent: editing ? 'Edit journal entry' : 'Add journal entry' }),
          el('div', { className: 'journal-modal-grid' }, [
            el('label', { className: 'journal-field' }, ['Date', dateInput]),
            el('label', { className: 'journal-field' }, ['Minutes', minutesInput]),
            el('label', { className: 'journal-field wide' }, ['Title', titleInput]),
            el('label', { className: 'journal-field wide' }, ['Summary', summaryInput]),
            el('label', { className: 'journal-billable' }, [billableInput, 'Billable'])
          ]),
          el('div', { className: 'journal-modal-actions' }, [
            el('button', { className: 'journal-btn ghost', type: 'button', textContent: 'Cancel', onClick: closeEntryModal }),
            el('button', { className: 'journal-btn primary', type: 'button', 'data-journal-action': 'save-entry', textContent: editing ? 'Save changes' : 'Add entry', onClick: saveEntry })
          ])
        ])
      ]));
      titleInput.focus && titleInput.focus();
    }

    function addOrUpdateEntry(existingEntry, formValue) {
      if (scope.mode !== 'workspace') return;
      var title = text(formValue && formValue.title).trim();
      if (!title) {
        statusText = 'Title is required';
        statusClass = 'error';
        render();
        return;
      }
      var entry = normalizeEntry({
        entryId: existingEntry ? existingEntry.entryId : entryId(scope.workspaceRoot, formValue.date || today(), title),
        workspaceRootPath: scope.workspaceRoot,
        date: formValue.date || today(),
        title: title,
        summary: formValue.summary,
        minutes: Number(formValue.minutes || 0),
        billable: formValue.billable === true,
        sourceSuggestionId: existingEntry ? existingEntry.sourceSuggestionId : '',
        eventIds: existingEntry ? existingEntry.eventIds : []
      }, scope.key);
      if (existingEntry) {
        entries = entries.map(function (item) {
          return item.entryId === existingEntry.entryId ? entry : item;
        });
      } else {
        entries = [entry].concat(entries);
      }
      entries = sortEntries(entries);
      closeEntryModal();
      statusText = existingEntry ? 'Entry updated' : 'Entry added';
      statusClass = '';
      persist().then(render);
    }

    function deleteEntry(entry) {
      if (scope.mode !== 'workspace' || !entry) return;
      entries = entries.filter(function (item) { return item.entryId !== entry.entryId; });
      statusText = 'Entry deleted';
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
          el('div', { className: 'journal-minutes', textContent: entry.minutes + ' min' }),
          scope.mode === 'workspace' ? el('div', { className: 'journal-row-actions' }, [
            el('button', { className: 'journal-icon-btn', type: 'button', title: 'Edit', 'aria-label': 'Edit', 'data-journal-action': 'edit', innerHTML: iconSvg('edit'), onClick: function () { showEntryModal(entry); } }),
            el('button', { className: 'journal-icon-btn danger', type: 'button', title: 'Delete', 'aria-label': 'Delete', 'data-journal-action': 'delete', innerHTML: iconSvg('trash'), onClick: function () { deleteEntry(entry); } })
          ]) : null
        ]));
      });
    }

    function render() {
      countEl.textContent = entries.length + ' entr' + (entries.length === 1 ? 'y' : 'ies');
      statusEl.textContent = statusText;
      statusEl.className = 'journal-status' + (statusClass ? ' ' + statusClass : '');
      addBtn.disabled = scope.mode !== 'workspace';
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
