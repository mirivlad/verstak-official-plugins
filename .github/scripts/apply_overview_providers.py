from pathlib import Path
import json

ROOT = Path('.')


def add_manifest_provider(name, command_id, provider_id, label, needs_commands_permission=True):
    path = ROOT / 'plugins' / name / 'plugin.json'
    data = json.loads(path.read_text())
    if needs_commands_permission and 'commands.register' not in data.setdefault('permissions', []):
        data['permissions'].append('commands.register')
    contributes = data.setdefault('contributes', {})
    commands = contributes.setdefault('commands', [])
    if not any(item.get('id') == command_id for item in commands):
        commands.append({'id': command_id, 'title': 'Provide Overview Signals', 'handler': command_id})
    providers = contributes.setdefault('overviewProviders', [])
    if not any(item.get('id') == provider_id for item in providers):
        providers.append({'id': provider_id, 'label': label, 'handler': command_id})
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')


def add_locale(name, en, ru):
    for locale, values in [('en', en), ('ru', ru)]:
        path = ROOT / 'plugins' / name / 'locales' / f'{locale}.json'
        data = json.loads(path.read_text())
        overview = data.setdefault('overview', {})
        for key, value in values.items():
            assert key not in overview or overview[key] == value, (name, locale, key)
            overview[key] = value
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')


def replace_once(path, old, new):
    path = Path(path)
    text = path.read_text()
    assert old in text, f'pattern not found in {path}: {old[:80]!r}'
    assert text.count(old) == 1, f'pattern not unique in {path}'
    path.write_text(text.replace(old, new, 1))


# ---------------------------------------------------------------------------
# Notes
# ---------------------------------------------------------------------------
add_manifest_provider('notes', 'verstak.notes.provideOverview', 'verstak.notes.overview', 'Notes')
add_locale('notes', {
    'summary': 'Notes',
    'countOne': '{count} note',
    'countMany': '{count} notes',
    'overviewNote': 'Overview note',
}, {
    'summary': 'Заметки',
    'countOne': '{count} заметка',
    'countMany': '{count} заметок',
    'overviewNote': 'Обзорная заметка',
})
notes = ROOT / 'plugins/notes/frontend/src/index.js'
replace_once(notes, "  'use strict';\n", "  'use strict';\n\n  var PLUGIN_ID = 'verstak.notes';\n  var OVERVIEW_COMMAND_ID = 'verstak.notes.provideOverview';\n")
notes_provider = r'''
  function overviewText(api, key, params, fallback) {
    if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
    return fallback || key;
  }

  function provideOverview(api, args) {
    var workspace = cleanPath(args && args.workspaceRootPath);
    if (!workspace || !api || !api.files || typeof api.files.list !== 'function') return Promise.resolve({});
    var notesPath = notesFolderPath(workspace);
    return Promise.all([
      api.files.list(notesPath).catch(function () { return []; }),
      api.files.list(workspace).catch(function () { return []; })
    ]).then(function (results) {
      var noteFiles = (results[0] || []).filter(function (entry) {
        return entry && entry.type === 'file' && /\.(md|markdown)$/i.test(entry.name || entry.relativePath || '');
      });
      var overview = noteFiles.concat(results[1] || []).find(function (entry) {
        var value = text(entry && (entry.relativePath || entry.name)).replace(/\\/g, '/');
        return entry && entry.type === 'file' && /(^|\/)overview\.md$/i.test(value);
      });
      var count = noteFiles.length;
      var countKey = count === 1 ? 'overview.countOne' : 'overview.countMany';
      var result = {
        summary: [{
          id: 'notes',
          label: overviewText(api, 'overview.summary', null, 'Notes'),
          count: count,
          detail: overviewText(api, countKey, { count: count }, count + (count === 1 ? ' note' : ' notes')),
          order: 10,
          action: { workspaceItemId: 'verstak.notes.workspace' }
        }]
      };
      if (overview) {
        var relative = text(overview.relativePath || overview.name);
        result.resources = [{
          id: 'overview-note',
          title: text(overview.name || fileName(relative) || 'Overview.md'),
          meta: relative || overviewText(api, 'overview.overviewNote', null, 'Overview note'),
          action: { workspaceItemId: 'verstak.notes.workspace' }
        }];
      }
      return result;
    });
  }

'''
replace_once(notes, "  NotesView.unmount = function (containerEl) {", notes_provider + "  NotesView.unmount = function (containerEl) {")
replace_once(notes, "  window.VerstakPluginRegister('verstak.notes', {\n    components: { NotesView: NotesView }\n  });", "  window.VerstakPluginRegister(PLUGIN_ID, {\n    components: { NotesView: NotesView },\n    activate: function (api) {\n      if (!api || !api.commands || typeof api.commands.register !== 'function') return Promise.resolve();\n      return api.commands.register(OVERVIEW_COMMAND_ID, function (args) { return provideOverview(api, args); });\n    }\n  });")

# ---------------------------------------------------------------------------
# Activity
# ---------------------------------------------------------------------------
add_manifest_provider('activity', 'verstak.activity.provideOverview', 'verstak.activity.overview', 'Activity', False)
add_locale('activity', {
    'summary': 'Activity',
    'files': 'Files',
    'eventCountOne': '{count} recorded event',
    'eventCountMany': '{count} recorded events',
    'fileCountOne': '{count} recent change',
    'fileCountMany': '{count} recent changes',
    'notesCategory': 'Notes',
    'filesCategory': 'Files',
    'possibleJournalEntry': 'Possible journal entry',
    'candidateMeta': '{minutes} min · {activities} activities',
}, {
    'summary': 'Активность',
    'files': 'Файлы',
    'eventCountOne': '{count} событие',
    'eventCountMany': '{count} событий',
    'fileCountOne': '{count} недавнее изменение',
    'fileCountMany': '{count} недавних изменений',
    'notesCategory': 'Заметки',
    'filesCategory': 'Файлы',
    'possibleJournalEntry': 'Возможная запись журнала',
    'candidateMeta': '{minutes} мин · {activities} действий',
})
activity = ROOT / 'plugins/activity/frontend/src/index.js'
replace_once(activity, "  var WORKLOG_COMMAND_ID = 'verstak.activity.suggestWorklog';", "  var WORKLOG_COMMAND_ID = 'verstak.activity.suggestWorklog';\n  var OVERVIEW_COMMAND_ID = 'verstak.activity.provideOverview';")
activity_provider = r'''
  function overviewTranslate(api, key, params, fallback) {
    if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
    return fallback || key;
  }

  function overviewAction(workspaceItemId, toolRequest) {
    var action = { workspaceItemId: workspaceItemId };
    if (toolRequest) action.toolRequest = toolRequest;
    return action;
  }

  function provideOverview(api, args) {
    var workspace = cleanWorkspace(args && args.workspaceRootPath);
    if (!workspace || !api || !api.settings || typeof api.settings.read !== 'function') return Promise.resolve({});
    var rawPromise = readRawRecords(api).catch(function () { return []; });
    return Promise.all([
      api.settings.read().catch(function () { return {}; }),
      rawPromise,
      listWorkSessionCandidates(api, { workspaceRootPath: workspace }).catch(function () { return { candidates: [] }; })
    ]).then(function (results) {
      var settings = results[0] || {};
      var raw = Array.isArray(results[1]) ? results[1] : [];
      var events = (raw.length ? eventsFromRecords(raw, workspace) : eventsFromSettings(settings, workspace)).filter(function (event) {
        return !isServiceActivity(event);
      });
      var meaningful = events.filter(isMeaningfulActivity);
      var recent = meaningful.filter(function (event) {
        var type = text(event && event.type).toLowerCase();
        return type.indexOf('note.') === 0 || type.indexOf('file.') === 0;
      }).map(function (event) {
        var type = text(event.type).toLowerCase();
        var isNote = type.indexOf('note.') === 0;
        return {
          id: event.activityId,
          title: humanEventTitle(event, function (key, params, fallback) { return overviewTranslate(api, key, params, fallback); }),
          occurredAt: event.occurredAt || event.receivedAt || '',
          categoryId: isNote ? 'notes' : 'files',
          categoryLabel: overviewTranslate(api, isNote ? 'overview.notesCategory' : 'overview.filesCategory', null, isNote ? 'Notes' : 'Files'),
          action: overviewAction(isNote ? 'verstak.notes.workspace' : 'verstak.files.workspace')
        };
      });
      var resume = events.filter(function (event) {
        var type = text(event && event.type).toLowerCase();
        return type === 'note.opened' || type === 'note.saved' || type === 'note.edited' || type === 'file.changed' || type === 'file.created';
      }).map(function (event) {
        var type = text(event.type).toLowerCase();
        var isNote = type.indexOf('note.') === 0;
        return {
          id: event.activityId,
          title: humanEventTitle(event, function (key, params, fallback) { return overviewTranslate(api, key, params, fallback); }),
          occurredAt: event.occurredAt || event.receivedAt || '',
          action: overviewAction(isNote ? 'verstak.notes.workspace' : 'verstak.files.workspace')
        };
      });
      var fileRecent = recent.filter(function (item) { return item.categoryId === 'files'; }).length;
      var candidates = (results[2] && Array.isArray(results[2].candidates)) ? results[2].candidates : [];
      var attention = candidates.map(function (candidate) {
        return {
          id: candidate.candidateId,
          title: overviewTranslate(api, 'overview.possibleJournalEntry', null, 'Possible journal entry'),
          meta: overviewTranslate(api, 'overview.candidateMeta', {
            minutes: candidate.estimatedMinutes || 0,
            activities: candidate.activityCount || (candidate.activityIds || []).length || 0
          }, (candidate.estimatedMinutes || 0) + ' min · ' + (candidate.activityCount || 0) + ' activities'),
          occurredAt: candidate.endedAt || candidate.startedAt || '',
          action: overviewAction('verstak.journal.workspace', { type: 'work-session-candidate', candidate: candidate })
        };
      });
      var eventCount = events.length;
      return {
        summary: [
          {
            id: 'activity',
            label: overviewTranslate(api, 'overview.summary', null, 'Activity'),
            count: eventCount,
            detail: overviewTranslate(api, eventCount === 1 ? 'overview.eventCountOne' : 'overview.eventCountMany', { count: eventCount }, eventCount + (eventCount === 1 ? ' recorded event' : ' recorded events')),
            order: 40,
            action: overviewAction('verstak.activity.workspace')
          },
          {
            id: 'files',
            label: overviewTranslate(api, 'overview.files', null, 'Files'),
            count: fileRecent,
            detail: overviewTranslate(api, fileRecent === 1 ? 'overview.fileCountOne' : 'overview.fileCountMany', { count: fileRecent }, fileRecent + (fileRecent === 1 ? ' recent change' : ' recent changes')),
            order: 20,
            action: overviewAction('verstak.files.workspace')
          }
        ],
        resume: resume,
        attention: attention,
        recent: recent,
        lastActiveAt: events.length ? (events[0].occurredAt || events[0].receivedAt || '') : ''
      };
    });
  }

'''
replace_once(activity, "  ActivityView.unmount = function (containerEl) {", activity_provider + "  ActivityView.unmount = function (containerEl) {")
replace_once(activity, "        api.commands.register(WORKLOG_COMMAND_ID, function (args) {\n          return listWorkSessionCandidates(api, args);\n        }),", "        api.commands.register(WORKLOG_COMMAND_ID, function (args) {\n          return listWorkSessionCandidates(api, args);\n        }),\n        api.commands.register(OVERVIEW_COMMAND_ID, function (args) {\n          return provideOverview(api, args);\n        }),")

# ---------------------------------------------------------------------------
# Browser Inbox
# ---------------------------------------------------------------------------
add_manifest_provider('browser-inbox', 'verstak.browser-inbox.provideOverview', 'verstak.browser-inbox.overview', 'Browser')
add_locale('browser-inbox', {
    'summary': 'Inbox',
    'countOne': '{count} capture to review',
    'countMany': '{count} captures to review',
    'category': 'Browser',
    'capturePage': 'Page',
    'captureSelection': 'Selection',
    'captureLink': 'Link',
    'captureFile': 'File',
    'captureItem': 'Item',
}, {
    'summary': 'Входящие',
    'countOne': '{count} материал на разбор',
    'countMany': '{count} материалов на разбор',
    'category': 'Браузер',
    'capturePage': 'Страница',
    'captureSelection': 'Фрагмент',
    'captureLink': 'Ссылка',
    'captureFile': 'Файл',
    'captureItem': 'Материал',
})
browser = ROOT / 'plugins/browser-inbox/frontend/src/index.js'
replace_once(browser, "  var REMOVE_RULE_COMMAND = 'verstak.activity.removeBrowserActivityRule';", "  var REMOVE_RULE_COMMAND = 'verstak.activity.removeBrowserActivityRule';\n  var OVERVIEW_COMMAND_ID = 'verstak.browser-inbox.provideOverview';")
browser_provider = r'''
  function overviewText(api, key, params, fallback) {
    if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
    return fallback || key;
  }

  function overviewCaptureTitle(capture) {
    return text(capture && (capture.title || capture.fileName || capture.url || capture.captureId)).trim() || 'Untitled';
  }

  function overviewCaptureKind(api, capture) {
    var kind = text(capture && capture.kind).toLowerCase();
    var suffix = kind === 'page' ? 'Page' : kind === 'selection' ? 'Selection' : kind === 'link' ? 'Link' : kind === 'file' ? 'File' : 'Item';
    return overviewText(api, 'overview.capture' + suffix, null, suffix);
  }

  function overviewCapturesFromSettings(settings) {
    settings = settings || {};
    var bindings = normalizeDomainBindings(settings.domainBindings);
    var all = [];
    globalCaptureKeys(settings).forEach(function (key) {
      all = all.concat(normalizeStoredCaptures(settings[key], key));
    });
    return sortCaptures(all).map(function (capture) {
      if (!capture.workspaceRootPath) {
        var bound = bindings[domainFromCapture(capture)];
        if (bound) {
          capture.workspaceRootPath = bound;
          capture.workspaceName = bound;
        }
      }
      return capture;
    });
  }

  function provideOverview(api, args) {
    var workspace = cleanWorkspace(args && args.workspaceRootPath);
    if (!workspace || !api || !api.settings || typeof api.settings.read !== 'function') return Promise.resolve({});
    return api.settings.read().then(function (settings) {
      var captures = overviewCapturesFromSettings(settings).filter(function (capture) {
        return cleanWorkspace(capture.workspaceRootPath) === workspace && text(capture.globalState || 'inbox') !== 'archived';
      });
      var pending = captures.filter(function (capture) { return capture.processed !== true; });
      var count = pending.length;
      var action = { workspaceItemId: 'verstak.browser-inbox.workspace' };
      return {
        summary: [{
          id: 'captures',
          label: overviewText(api, 'overview.summary', null, 'Inbox'),
          count: count,
          detail: overviewText(api, count === 1 ? 'overview.countOne' : 'overview.countMany', { count: count }, count + (count === 1 ? ' capture to review' : ' captures to review')),
          order: 30,
          action: action
        }],
        attention: pending.map(function (capture) {
          return {
            id: capture.captureId,
            title: overviewCaptureTitle(capture),
            meta: overviewCaptureKind(api, capture),
            occurredAt: capture.capturedAt || capture.receivedAt || '',
            action: action
          };
        }),
        recent: captures.map(function (capture) {
          return {
            id: capture.captureId,
            title: overviewCaptureKind(api, capture) + ' — ' + overviewCaptureTitle(capture),
            meta: capture.domain || capture.url || '',
            occurredAt: capture.capturedAt || capture.receivedAt || '',
            categoryId: 'captures',
            categoryLabel: overviewText(api, 'overview.category', null, 'Browser'),
            action: action
          };
        }),
        lastActiveAt: captures.length ? (captures[0].capturedAt || captures[0].receivedAt || '') : ''
      };
    }).catch(function (err) {
      console.warn('[verstak.browser-inbox] overview provider:', err);
      return {};
    });
  }

'''
replace_once(browser, "  window.VerstakPluginRegister(PLUGIN_ID, {\n    components: {\n      BrowserInboxView: BrowserInboxView,", browser_provider + "  window.VerstakPluginRegister(PLUGIN_ID, {\n    components: {\n      BrowserInboxView: BrowserInboxView,")
replace_once(browser, "      BrowserInboxSettings: BrowserInboxSettings\n    }\n  });", "      BrowserInboxSettings: BrowserInboxSettings\n    },\n    activate: function (api) {\n      if (!api || !api.commands || typeof api.commands.register !== 'function') return Promise.resolve();\n      return api.commands.register(OVERVIEW_COMMAND_ID, function (args) { return provideOverview(api, args); });\n    }\n  });")

# ---------------------------------------------------------------------------
# Journal
# ---------------------------------------------------------------------------
add_manifest_provider('journal', 'verstak.journal.provideOverview', 'verstak.journal.overview', 'Journal')
add_locale('journal', {
    'summary': 'Journal',
    'countOne': '{count} journal entry',
    'countMany': '{count} journal entries',
    'category': 'Journal',
    'continue': 'Continue journal entry “{title}”',
}, {
    'summary': 'Журнал',
    'countOne': '{count} запись журнала',
    'countMany': '{count} записей журнала',
    'category': 'Журнал',
    'continue': 'Продолжить запись журнала «{title}»',
})
journal = ROOT / 'plugins/journal/frontend/src/index.js'
replace_once(journal, "  var SET_RULE_COMMAND = 'verstak.activity.setBrowserActivityRule';", "  var SET_RULE_COMMAND = 'verstak.activity.setBrowserActivityRule';\n  var OVERVIEW_COMMAND_ID = 'verstak.journal.provideOverview';")
journal_provider = r'''
  function overviewText(api, key, params, fallback) {
    if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
    return fallback || key;
  }

  function provideOverview(api, args) {
    var workspace = cleanWorkspace(args && args.workspaceRootPath);
    if (!workspace || !api || !api.settings || typeof api.settings.read !== 'function') return Promise.resolve({});
    var key = WORKLOG_PREFIX + encodeKey(workspace);
    return api.settings.read().then(function (settings) {
      var entries = sortEntries(normalizeEntries((settings || {})[key], key).filter(function (entry) {
        return cleanWorkspace(entry.workspaceRootPath) === workspace;
      }));
      var action = { workspaceItemId: 'verstak.journal.workspace' };
      var count = entries.length;
      return {
        summary: [{
          id: 'journal',
          label: overviewText(api, 'overview.summary', null, 'Journal'),
          count: count,
          detail: overviewText(api, count === 1 ? 'overview.countOne' : 'overview.countMany', { count: count }, count + (count === 1 ? ' journal entry' : ' journal entries')),
          order: 50,
          action: action
        }],
        resume: entries.map(function (entry) {
          return {
            id: entry.entryId,
            title: overviewText(api, 'overview.continue', { title: entry.title }, 'Continue journal entry “' + entry.title + '”'),
            occurredAt: entry.date,
            action: action
          };
        }),
        recent: entries.map(function (entry) {
          return {
            id: entry.entryId,
            title: entry.title,
            meta: entry.minutes ? entry.minutes + ' min' : '',
            occurredAt: entry.date,
            categoryId: 'journal',
            categoryLabel: overviewText(api, 'overview.category', null, 'Journal'),
            action: action
          };
        }),
        lastActiveAt: entries.length ? entries[0].date : ''
      };
    }).catch(function (err) {
      console.warn('[verstak.journal] overview provider:', err);
      return {};
    });
  }

'''
replace_once(journal, "  JournalView.unmount = function (containerEl) {", journal_provider + "  JournalView.unmount = function (containerEl) {")
replace_once(journal, "  window.VerstakPluginRegister(PLUGIN_ID, {\n    components: {\n      JournalView: JournalView\n    }\n  });", "  window.VerstakPluginRegister(PLUGIN_ID, {\n    components: {\n      JournalView: JournalView\n    },\n    activate: function (api) {\n      if (!api || !api.commands || typeof api.commands.register !== 'function') return Promise.resolve();\n      return api.commands.register(OVERVIEW_COMMAND_ID, function (args) { return provideOverview(api, args); });\n    }\n  });")

# ---------------------------------------------------------------------------
# Todo
# ---------------------------------------------------------------------------
add_manifest_provider('todo', 'verstak.todo.provideOverview', 'verstak.todo.overview', 'Todo')
add_locale('todo', {
    'overdue': 'Overdue',
    'dueSoon': 'Due soon',
    'reminderDue': 'Reminder due',
    'due': 'Due {date}',
}, {
    'overdue': 'Просрочено',
    'dueSoon': 'Срок скоро',
    'reminderDue': 'Напоминание',
    'due': 'Срок {date}',
})
todo = ROOT / 'plugins/todo/frontend/src/index.js'
replace_once(todo, "  var PRIORITY_VALUES = ['low', 'normal', 'high'];", "  var PRIORITY_VALUES = ['low', 'normal', 'high'];\n  var OVERVIEW_COMMAND_ID = 'verstak.todo.provideOverview';")
todo_provider = r'''
  function overviewText(api, key, params, fallback) {
    if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
    return fallback || key;
  }

  function todoOverviewState(api, todo) {
    if (reminderIsDue(todo)) return overviewText(api, 'overview.reminderDue', null, 'Reminder due');
    var state = dueState(todo);
    if (state === 'overdue') return overviewText(api, 'overview.overdue', null, 'Overdue');
    if (state === 'due-soon') return overviewText(api, 'overview.dueSoon', null, 'Due soon');
    return '';
  }

  function provideOverview(api, args) {
    var workspace = cleanWorkspace(args && args.workspaceRootPath);
    if (!workspace || !api || !api.settings || typeof api.settings.read !== 'function') return Promise.resolve({});
    return api.settings.read().then(function (settings) {
      var todos = sortTodos(normalizeTodos((settings || {})[GLOBAL_KEY])).filter(function (todo) {
        return cleanWorkspace(todo.workspaceRootPath) === workspace && !!todoOverviewState(api, todo);
      }).sort(function (a, b) {
        var av = dateTimeValue(a.reminderAt, false) || dateTimeValue(a.dueAt, true) || Number.MAX_SAFE_INTEGER;
        var bv = dateTimeValue(b.reminderAt, false) || dateTimeValue(b.dueAt, true) || Number.MAX_SAFE_INTEGER;
        return av - bv || text(b.updatedAt).localeCompare(text(a.updatedAt));
      });
      return {
        attention: todos.map(function (todo) {
          var state = todoOverviewState(api, todo);
          var due = todo.dueAt ? overviewText(api, 'overview.due', { date: todo.dueAt }, 'Due ' + todo.dueAt) : '';
          return {
            id: todo.id,
            title: todo.title || 'Untitled',
            meta: due ? state + ' · ' + due : state,
            occurredAt: todo.reminderAt || todo.dueAt || todo.updatedAt || todo.createdAt || '',
            action: { workspaceItemId: 'verstak.todo.workspace' }
          };
        }),
        lastActiveAt: todos.length ? (todos[0].updatedAt || todos[0].dueAt || '') : ''
      };
    }).catch(function (err) {
      console.warn('[verstak.todo] overview provider:', err);
      return {};
    });
  }

'''
replace_once(todo, "  TodoView.unmount = function (containerEl) {", todo_provider + "  TodoView.unmount = function (containerEl) {")
replace_once(todo, "  window.VerstakPluginRegister(PLUGIN_ID, {\n    components: {\n      TodoView: TodoView\n    }\n  });", "  window.VerstakPluginRegister(PLUGIN_ID, {\n    components: {\n      TodoView: TodoView\n    },\n    activate: function (api) {\n      if (!api || !api.commands || typeof api.commands.register !== 'function') return Promise.resolve();\n      return api.commands.register(OVERVIEW_COMMAND_ID, function (args) { return provideOverview(api, args); });\n    }\n  });")

# A small static contract guard: every declared Overview provider must point at
# a declared command, and its target workspace ids must exist somewhere in the
# official plugin set. This catches typo-level integration breakage before the
# desktop starts consuming the providers.
check = ROOT / 'scripts/check-overview-providers.js'
check.write_text(r'''const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'plugins');
const manifests = fs.readdirSync(root).map(name => {
  const p = path.join(root, name, 'plugin.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}).filter(Boolean);
const workspaceIds = new Set(manifests.flatMap(m => ((m.contributes || {}).workspaceItems || []).map(x => x.id)));
let providers = 0;
for (const manifest of manifests) {
  const contributes = manifest.contributes || {};
  const commands = new Set((contributes.commands || []).map(x => x.id));
  for (const provider of contributes.overviewProviders || []) {
    providers += 1;
    if (!commands.has(provider.handler)) throw new Error(`${manifest.id}: Overview handler ${provider.handler} is not a declared command`);
    if (!(manifest.permissions || []).includes('commands.register')) throw new Error(`${manifest.id}: Overview provider lacks commands.register`);
  }
  const source = manifest.frontend && manifest.frontend.entry ? fs.readFileSync(path.join(root, path.basename(path.dirname(path.join(root, manifest.id.replace('verstak.', ''), 'plugin.json'))), manifest.frontend.entry), 'utf8') : '';
  for (const match of source.matchAll(/workspaceItemId:\s*['\"]([^'\"]+)['\"]/g)) {
    if (!workspaceIds.has(match[1])) throw new Error(`${manifest.id}: unknown Overview workspaceItemId ${match[1]}`);
  }
}
if (providers !== 5) throw new Error(`expected 5 official Overview providers, found ${providers}`);
console.log(`OK ${providers} Overview providers use declared commands and exact workspace item ids`);
''')

# Wire the static contract into the existing check without weakening any old test.
check_sh = ROOT / 'scripts/check.sh'
text = check_sh.read_text()
needle = "echo \"\"\n# Check all scripts in plugins are executable\n"
assert needle in text
block = """echo \"\"\necho \"[overview providers]\"\nif command -v node &>/dev/null; then\n  node \"$ROOT/scripts/check-overview-providers.js\"\n  report \"overview provider contracts\" $?\nelse\n  echo \"  ⚠️  node not available — skipping Overview provider contracts\"\nfi\n\n"""
text = text.replace(needle, block + needle, 1)
check_sh.write_text(text)
