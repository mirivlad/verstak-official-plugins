from pathlib import Path
import json
import re

ROOT = Path('.')


def read(path):
    return (ROOT / path).read_text()


def write(path, text):
    (ROOT / path).write_text(text)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, got {count}: {old!r}')
    return text.replace(old, new, 1)


def sub_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected one regex match, got {count}')
    return updated


def add_manifest_provider(path, command_id, command_title, provider_id, provider_label):
    p = ROOT / path
    manifest = json.loads(p.read_text())
    contributes = manifest.setdefault('contributes', {})
    commands = contributes.setdefault('commands', [])
    if any(item.get('id') == command_id for item in commands):
        raise SystemExit(f'{path}: command already exists: {command_id}')
    commands.append({'id': command_id, 'title': command_title, 'handler': command_id})
    providers = contributes.setdefault('searchProviders', [])
    if any(item.get('id') == provider_id for item in providers):
        raise SystemExit(f'{path}: provider already exists: {provider_id}')
    providers.append({'id': provider_id, 'label': provider_label, 'handler': command_id})
    p.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')


# ---------------------------------------------------------------------------
# Journal: one read-only canonical source for Overview and Search.
# ---------------------------------------------------------------------------
path = 'plugins/journal/frontend/src/index.js'
text = read(path)
text = replace_once(
    text,
    "  var OVERVIEW_COMMAND_ID = 'verstak.journal.provideOverview';\n",
    "  var OVERVIEW_COMMAND_ID = 'verstak.journal.provideOverview';\n  var SEARCH_COMMAND_ID = 'verstak.journal.search';\n",
    'Journal Search command constant',
)

journal_reader = r'''
  // Providers are read-only views over the same Markdown documents the Journal
  // UI owns. Legacy settings are only a fallback for entries that have not yet
  // reached the vault; when both copies exist, the human-readable file wins.
  function readJournalDealEntries(api, dealRoot) {
    var deal = cleanWorkspace(dealRoot);
    if (!deal || !api || !api.files || typeof api.files.list !== 'function' || typeof api.files.readText !== 'function') {
      return Promise.resolve([]);
    }
    return api.files.list(journalFolderPath(deal)).then(function (found) {
      var months = (Array.isArray(found) ? found : []).map(function (item) {
        if (!item || item.type === 'folder') return null;
        var match = MONTH_FILE.exec(text(item.name));
        return match ? { month: match[1], path: text(item.relativePath) } : null;
      }).filter(Boolean);
      return Promise.all(months.map(function (item) {
        return api.files.readText(item.path).then(function (content) {
          return parseMonthFile(content, deal, item.month);
        }).catch(function (err) {
          console.warn('[verstak.journal] read ' + item.path + ':', err);
          return [];
        });
      }));
    }).then(function (lists) {
      var all = [];
      lists.forEach(function (list) { all = all.concat(list); });
      return all;
    }).catch(function () {
      return [];
    });
  }

  function journalDealRoots(api, settings, workspaceRoot) {
    var scoped = cleanWorkspace(workspaceRoot);
    if (scoped) return Promise.resolve([scoped]);
    var seen = {};
    var roots = [];
    function add(value) {
      var root = cleanWorkspace(value);
      if (!root || seen[root]) return;
      seen[root] = true;
      roots.push(root);
    }
    worklogKeys(settings || {}).map(decodeWorkspaceKey).forEach(add);
    if (!api || !api.workspaces || typeof api.workspaces.list !== 'function') return Promise.resolve(roots);
    return api.workspaces.list().then(function (entries) {
      (Array.isArray(entries) ? entries : []).forEach(function (entry) { add(entry && entry.rootPath); });
      return roots;
    }).catch(function () { return roots; });
  }

  function legacyJournalDealEntries(settings, dealRoot) {
    var deal = cleanWorkspace(dealRoot);
    var key = WORKLOG_PREFIX + encodeKey(deal);
    return normalizeEntries((settings || {})[key], key).map(function (entry) {
      entry.workspaceRootPath = deal;
      return entry;
    });
  }

  function readJournalEntries(api, workspaceRoot) {
    var readSettings = api && api.settings && typeof api.settings.read === 'function'
      ? api.settings.read().catch(function () { return {}; })
      : Promise.resolve({});
    return readSettings.then(function (settings) {
      settings = settings || {};
      return journalDealRoots(api, settings, workspaceRoot).then(function (deals) {
        return deals.reduce(function (chain, deal) {
          return chain.then(function (all) {
            return readJournalDealEntries(api, deal).then(function (canonical) {
              // canonical is first so sortEntries' de-duplication preserves it.
              return all.concat(canonical, legacyJournalDealEntries(settings, deal));
            });
          });
        }, Promise.resolve([]));
      });
    }).then(sortEntries);
  }
'''
text = replace_once(text, "\n  function candidateDate(value) {", journal_reader + "\n  function candidateDate(value) {", 'Journal canonical reader insertion')

text = sub_once(
    text,
    r"\n    function readDealEntries\(dealRoot\) \{.*?\n    \}\n\n    function writeMonths",
    "\n    function readDealEntries(dealRoot) {\n      return readJournalDealEntries(api, dealRoot);\n    }\n\n    function writeMonths",
    'Journal mounted reader delegation',
)

provider_block = r'''
  function provideOverview(api, args) {
    var workspace = cleanWorkspace(args && args.workspaceRootPath);
    if (!workspace) return Promise.resolve({});
    return readJournalEntries(api, workspace).then(function (entries) {
      entries = entries.filter(function (entry) { return cleanWorkspace(entry.workspaceRootPath) === workspace; });
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

  function journalSearchScore(entry, query) {
    var q = text(query).trim().toLowerCase();
    if (!q) return 0;
    var title = text(entry && entry.title).toLowerCase();
    var summary = text(entry && entry.summary).toLowerCase();
    var workspace = cleanWorkspace(entry && entry.workspaceRootPath).toLowerCase();
    var date = text(entry && entry.date).toLowerCase();
    if (title === q) return 120;
    if (title.indexOf(q) === 0) return 100;
    if (title.indexOf(q) !== -1) return 90;
    if (summary.indexOf(q) !== -1) return 70;
    if (workspace.indexOf(q) !== -1 || date.indexOf(q) !== -1) return 50;
    return 0;
  }

  function provideSearch(api, args) {
    args = args || {};
    var query = text(args.query).trim();
    var workspace = cleanWorkspace(args.workspaceRootPath);
    var limit = Math.max(1, Number(args.limit) || 50);
    if (query.length < 2) return Promise.resolve({ results: [] });
    return readJournalEntries(api, workspace).then(function (entries) {
      var ranked = entries.map(function (entry) {
        return { entry: entry, score: journalSearchScore(entry, query) };
      }).filter(function (row) { return row.score > 0; }).sort(function (a, b) {
        return b.score - a.score || text(b.entry.date).localeCompare(text(a.entry.date));
      });
      return {
        results: ranked.slice(0, limit).map(function (row) {
          var entry = row.entry;
          return {
            id: entry.entryId,
            title: entry.title,
            subtitle: [entry.workspaceRootPath, entry.date].filter(Boolean).join(' · '),
            snippet: entry.summary || '',
            categoryId: 'journal',
            categoryLabel: overviewText(api, 'overview.category', null, 'Journal'),
            score: row.score,
            action: {
              kind: 'workspace-item',
              workspaceRootPath: entry.workspaceRootPath,
              workspaceItemId: 'verstak.journal.workspace'
            }
          };
        }),
        partial: ranked.length > limit
      };
    });
  }
'''
text = sub_once(
    text,
    r"\n  function provideOverview\(api, args\) \{.*?\n  \}\n\n  JournalView\.unmount",
    "\n" + provider_block + "\n  JournalView.unmount",
    'Journal Overview/Search provider block',
)
text = replace_once(
    text,
    """      return api.commands.register(OVERVIEW_COMMAND_ID, function (args) { return provideOverview(api, args); });""",
    """      return Promise.all([
        api.commands.register(OVERVIEW_COMMAND_ID, function (args) { return provideOverview(api, args); }),
        api.commands.register(SEARCH_COMMAND_ID, function (args) { return provideSearch(api, args); })
      ]);""",
    'Journal activation providers',
)
write(path, text)
add_manifest_provider('plugins/journal/plugin.json', 'verstak.journal.search', 'Search Journal', 'verstak.journal.search-provider', 'Journal')


# ---------------------------------------------------------------------------
# Browser: own capture search semantics and navigation.
# ---------------------------------------------------------------------------
path = 'plugins/browser-inbox/frontend/src/index.js'
text = read(path)
text = replace_once(
    text,
    "  var OVERVIEW_COMMAND_ID = 'verstak.browser-inbox.provideOverview';\n",
    "  var OVERVIEW_COMMAND_ID = 'verstak.browser-inbox.provideOverview';\n  var SEARCH_COMMAND_ID = 'verstak.browser-inbox.search';\n",
    'Browser Search command constant',
)
browser_search = r'''

  function browserSearchScore(capture, query) {
    var q = text(query).trim().toLowerCase();
    var title = overviewCaptureTitle(capture).toLowerCase();
    var url = text(capture && capture.url).toLowerCase();
    var domain = text(capture && capture.domain).toLowerCase();
    var body = text(capture && (capture.text || capture.fileText)).toLowerCase();
    var workspace = cleanWorkspace(capture && capture.workspaceRootPath).toLowerCase();
    if (title === q) return 120;
    if (title.indexOf(q) === 0) return 100;
    if (title.indexOf(q) !== -1) return 90;
    if (url.indexOf(q) !== -1 || domain.indexOf(q) !== -1) return 80;
    if (body.indexOf(q) !== -1) return 70;
    if (workspace.indexOf(q) !== -1) return 50;
    return 0;
  }

  function provideSearch(api, args) {
    args = args || {};
    var query = text(args.query).trim();
    var workspace = cleanWorkspace(args.workspaceRootPath);
    var limit = Math.max(1, Number(args.limit) || 50);
    if (query.length < 2 || !api || !api.settings || typeof api.settings.read !== 'function') return Promise.resolve({ results: [] });
    return api.settings.read().then(function (settings) {
      var captures = overviewCapturesFromSettings(settings).filter(function (capture) {
        if (text(capture.globalState || 'inbox') === 'archived') return false;
        return !workspace || cleanWorkspace(capture.workspaceRootPath) === workspace;
      });
      var ranked = captures.map(function (capture) {
        return { capture: capture, score: browserSearchScore(capture, query) };
      }).filter(function (row) { return row.score > 0; }).sort(function (a, b) {
        return b.score - a.score || text(b.capture.capturedAt || b.capture.receivedAt).localeCompare(text(a.capture.capturedAt || a.capture.receivedAt));
      });
      return {
        results: ranked.slice(0, limit).map(function (row) {
          var capture = row.capture;
          var deal = cleanWorkspace(capture.workspaceRootPath);
          return {
            id: capture.captureId,
            title: overviewCaptureTitle(capture),
            subtitle: capture.url || capture.domain || deal || overviewCaptureKind(api, capture),
            snippet: capture.text || capture.fileText || '',
            categoryId: 'browser',
            categoryLabel: overviewText(api, 'overview.category', null, 'Browser'),
            score: row.score,
            action: deal ? {
              kind: 'workspace-item',
              workspaceRootPath: deal,
              workspaceItemId: 'verstak.browser-inbox.workspace'
            } : {
              kind: 'view',
              viewId: 'verstak.browser-inbox.view',
              pluginId: PLUGIN_ID
            }
          };
        }),
        partial: ranked.length > limit
      };
    }).catch(function (err) {
      console.warn('[verstak.browser-inbox] search provider:', err);
      return { results: [] };
    });
  }
'''
text = replace_once(text, "\n  window.VerstakPluginRegister(PLUGIN_ID, {", browser_search + "\n  window.VerstakPluginRegister(PLUGIN_ID, {", 'Browser Search provider insertion')
text = replace_once(
    text,
    """      return api.commands.register(OVERVIEW_COMMAND_ID, function (args) { return provideOverview(api, args); });""",
    """      return Promise.all([
        api.commands.register(OVERVIEW_COMMAND_ID, function (args) { return provideOverview(api, args); }),
        api.commands.register(SEARCH_COMMAND_ID, function (args) { return provideSearch(api, args); })
      ]);""",
    'Browser activation providers',
)
write(path, text)
add_manifest_provider('plugins/browser-inbox/plugin.json', 'verstak.browser-inbox.search', 'Search Browser Materials', 'verstak.browser-inbox.search-provider', 'Browser')


# ---------------------------------------------------------------------------
# Activity: search canonical raw NDJSON, settings only as backward fallback.
# ---------------------------------------------------------------------------
path = 'plugins/activity/frontend/src/index.js'
text = read(path)
text = replace_once(
    text,
    "  var OVERVIEW_COMMAND_ID = 'verstak.activity.provideOverview';\n",
    "  var OVERVIEW_COMMAND_ID = 'verstak.activity.provideOverview';\n  var SEARCH_COMMAND_ID = 'verstak.activity.search';\n",
    'Activity Search command constant',
)
activity_search = r'''

  function activitySearchScore(activity, query, title, summary) {
    var q = text(query).trim().toLowerCase();
    var normalizedTitle = text(title).toLowerCase();
    var normalizedSummary = text(summary).toLowerCase();
    var type = text(activity && activity.type).toLowerCase();
    var source = text(activity && activity.sourcePluginId).toLowerCase();
    var workspace = candidateWorkspace(activity).toLowerCase();
    var payload = '';
    try { payload = JSON.stringify((activity && activity.payload) || {}).toLowerCase(); } catch (_) {}
    if (normalizedTitle === q) return 120;
    if (normalizedTitle.indexOf(q) === 0) return 100;
    if (normalizedTitle.indexOf(q) !== -1) return 90;
    if (normalizedSummary.indexOf(q) !== -1) return 75;
    if (type.indexOf(q) !== -1 || source.indexOf(q) !== -1) return 65;
    if (workspace.indexOf(q) !== -1 || payload.indexOf(q) !== -1) return 50;
    return 0;
  }

  function provideSearch(api, args) {
    args = args || {};
    var query = text(args.query).trim();
    var workspace = cleanWorkspace(args.workspaceRootPath);
    var limit = Math.max(1, Number(args.limit) || 50);
    if (query.length < 2) return Promise.resolve({ results: [] });
    var settingsPromise = api && api.settings && typeof api.settings.read === 'function'
      ? api.settings.read().catch(function () { return {}; })
      : Promise.resolve({});
    return Promise.all([settingsPromise, readRawRecords(api).catch(function () { return []; })]).then(function (values) {
      var settings = values[0] || {};
      var raw = Array.isArray(values[1]) ? values[1] : [];
      var events = raw.length ? eventsFromRecords(raw, workspace) : eventsFromSettings(settings, workspace);
      var translate = function (key, params, fallback) { return overviewTranslate(api, key, params, fallback); };
      var ranked = events.filter(function (event) { return !isServiceActivity(event); }).map(function (event) {
        var title = humanEventTitle(event, translate);
        var summary = humanSummary(event, translate);
        return { event: event, title: title, summary: summary, score: activitySearchScore(event, query, title, summary) };
      }).filter(function (row) { return row.score > 0; }).sort(function (a, b) {
        return b.score - a.score || text(b.event.occurredAt || b.event.receivedAt).localeCompare(text(a.event.occurredAt || a.event.receivedAt));
      });
      return {
        results: ranked.slice(0, limit).map(function (row) {
          var event = row.event;
          var deal = candidateWorkspace(event);
          return {
            id: event.activityId,
            title: row.title,
            subtitle: [deal, eventKind(event, translate)].filter(Boolean).join(' · '),
            snippet: row.summary || '',
            categoryId: 'activity',
            categoryLabel: overviewTranslate(api, 'overview.summary', null, 'Activity'),
            score: row.score,
            action: deal ? {
              kind: 'workspace-item',
              workspaceRootPath: deal,
              workspaceItemId: 'verstak.activity.workspace'
            } : {
              kind: 'view',
              viewId: 'verstak.activity.view',
              pluginId: PLUGIN_ID
            }
          };
        }),
        partial: ranked.length > limit
      };
    });
  }
'''
text = replace_once(text, "\n  ActivityView.unmount = function", activity_search + "\n  ActivityView.unmount = function", 'Activity Search provider insertion')
text = replace_once(
    text,
    """        api.commands.register(OVERVIEW_COMMAND_ID, function (args) {
          return provideOverview(api, args);
        }),""",
    """        api.commands.register(OVERVIEW_COMMAND_ID, function (args) {
          return provideOverview(api, args);
        }),
        api.commands.register(SEARCH_COMMAND_ID, function (args) {
          return provideSearch(api, args);
        }),""",
    'Activity activation Search provider',
)
write(path, text)
add_manifest_provider('plugins/activity/plugin.json', 'verstak.activity.search', 'Search Activity', 'verstak.activity.search-provider', 'Activity')


# ---------------------------------------------------------------------------
# Search UI aggregator: preserve and execute normalized SearchActionTarget.
# ---------------------------------------------------------------------------
path = 'plugins/search/frontend/src/index.js'
text = read(path)
old_normalize = r'''  function normalizeProviderResults(provider, value) {
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
'''
new_normalize = r'''  function normalizeProviderResults(provider, value) {
    var list = Array.isArray(value) ? value : (value && Array.isArray(value.results) ? value.results : []);
    return list.map(function (item) {
      var legacyPath = cleanPath(item.path || item.relativePath || '');
      var normalized = item && item.id && item.title;
      var title = normalized ? String(item.title) : baseName(legacyPath || item.title || provider.label || provider.id);
      var subtitle = normalized ? String(item.subtitle || '') : legacyPath;
      var path = legacyPath || subtitle || title;
      return {
        id: item.id || path,
        path: path,
        title: title,
        subtitle: subtitle,
        type: item.type || item.categoryId || 'external',
        matchType: item.matchType || item.categoryLabel || provider.label || 'External match',
        sourceLabel: provider.label || provider.id || provider.pluginId,
        openable: item.openable === true || !!item.action,
        action: item.action || null,
        line: item.line || 0,
        snippet: item.snippet || item.preview || ''
      };
    }).filter(function (item) { return item.path || item.title; });
  }
'''
text = replace_once(text, old_normalize, new_normalize, 'Search normalized provider result adapter')

render_anchor = """      function render() {
"""
open_helper = r'''      function openResult(result) {
        var action = result && result.action;
        if (action && action.kind === 'resource' && action.resource) {
          return api.workbench.openResource(action.resource).catch(function (err) { console.error('[search] openResource:', err); });
        }
        if (action && action.kind === 'view') {
          window.dispatchEvent(new CustomEvent('verstak:open-view', {
            detail: { viewId: action.viewId || '', pluginId: action.pluginId || '' }
          }));
          return Promise.resolve();
        }
        if (action && (action.kind === 'workspace' || action.kind === 'workspace-item')) {
          var workspaceRoot = cleanPath(action.workspaceRootPath || '');
          if (!workspaceRoot) return Promise.resolve();
          window.dispatchEvent(new CustomEvent('verstak:workspace-selected', {
            detail: { workspaceName: workspaceRoot, workspaceRootPath: workspaceRoot }
          }));
          if (action.kind === 'workspace-item') {
            window.dispatchEvent(new CustomEvent('verstak:workspace-open-tool', {
              detail: { workspaceItemId: action.workspaceItemId || '', toolRequest: action.toolRequest || null }
            }));
          }
          return Promise.resolve();
        }
        if (!result || !result.openable || !result.path) return Promise.resolve();
        return api.workbench.openResource({ kind: 'vault-file', path: result.path, mode: 'view' })
          .catch(function (err) { console.error('[search] openResource:', err); });
      }

'''
text = replace_once(text, render_anchor, open_helper + render_anchor, 'Search action opener')
text = replace_once(text, "el('span', { className: 'search-title', title: result.path }, [baseName(result.path)])", "el('span', { className: 'search-title', title: result.title || result.path }, [result.title || baseName(result.path)])", 'Search provider title rendering')
text = replace_once(text, "el('div', { className: 'search-path' }, [result.path])", "el('div', { className: 'search-path' }, [result.subtitle || result.path])", 'Search provider subtitle rendering')
text = replace_once(
    text,
    """              'data-search-open': result.path,
              onClick: function () {
                api.workbench.openResource({
                  kind: 'vault-file',
                  path: result.path,
                  mode: 'view'
                }).catch(function (err) { console.error('[search] openResource:', err); });
              }""",
    """              'data-search-open': result.path || result.id || result.title,
              onClick: function () { openResult(result); }""",
    'Search result open action',
)
write(path, text)


# ---------------------------------------------------------------------------
# Generic declaration guard for every official search provider.
# ---------------------------------------------------------------------------
check = r'''const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'plugins');
const manifests = fs.readdirSync(root).map((name) => {
  const manifestPath = path.join(root, name, 'plugin.json');
  if (!fs.existsSync(manifestPath)) return null;
  return { name, manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf8')) };
}).filter(Boolean);

let providerCount = 0;
for (const { name, manifest } of manifests) {
  const contributes = manifest.contributes || {};
  const commands = new Set((contributes.commands || []).map((command) => command.handler || command.id));
  const providers = contributes.searchProviders || [];
  for (const provider of providers) {
    providerCount += 1;
    if (!provider.id || !provider.label || !provider.handler) throw new Error(`${manifest.id}: malformed search provider`);
    if (!commands.has(provider.handler)) throw new Error(`${manifest.id}: Search handler ${provider.handler} is not a declared command`);
    if (!(manifest.permissions || []).includes('commands.register')) throw new Error(`${manifest.id}: Search provider lacks commands.register`);
  }
  if (!providers.length) continue;
  const entry = manifest.frontend && manifest.frontend.entry;
  if (!entry) throw new Error(`${manifest.id}: Search provider has no frontend entry`);
  const source = fs.readFileSync(path.join(root, name, entry), 'utf8');
  for (const provider of providers) {
    if (!source.includes(provider.handler)) throw new Error(`${manifest.id}: frontend source does not mention Search handler ${provider.handler}`);
  }
}

if (providerCount !== 4) throw new Error(`expected 4 official Search providers, found ${providerCount}`);
console.log(`OK ${providerCount} Search providers use declared background commands`);
'''
write('scripts/check-search-providers.js', check)

check_sh = read('scripts/check.sh')
search_check = '''echo ""
echo "[search providers]"
if command -v node &>/dev/null; then
  node "$ROOT/scripts/check-search-providers.js"
  report "search provider contracts" $?
else
  echo "  ⚠️  node not available — skipping Search provider contracts"
fi

'''
check_sh = replace_once(check_sh, 'echo ""\n# Check all scripts in plugins are executable', search_check + '# Check all scripts in plugins are executable', 'check.sh Search provider guard')
write('scripts/check.sh', check_sh)


# ---------------------------------------------------------------------------
# Runtime smoke: canonical Journal + Browser + Activity provider semantics.
# ---------------------------------------------------------------------------
smoke = r'''#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');

function fakeDocument() {
  return {
    head: { appendChild() {} },
    getElementById() { return null; },
    createElement() { return { style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }; },
    createTextNode() { return {}; },
  };
}

function loadBundle(name) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'plugins', name, 'plugin.json'), 'utf8'));
  const source = fs.readFileSync(path.join(root, 'plugins', name, manifest.frontend.entry), 'utf8');
  let bundle = null;
  vm.runInNewContext(source, {
    console,
    Date,
    URL,
    document: fakeDocument(),
    window: { VerstakPluginRegister(_id, value) { bundle = value; } },
  }, { filename: `${name}/index.js` });
  if (!bundle || typeof bundle.activate !== 'function') throw new Error(`${name}: background activate() missing`);
  return { manifest, bundle };
}

async function activate(name, api) {
  const { manifest, bundle } = loadBundle(name);
  const handlers = new Map();
  const commandApi = {
    ...api,
    commands: {
      ...(api.commands || {}),
      register: async (id, handler) => {
        handlers.set(id, handler);
        return () => handlers.delete(id);
      },
    },
  };
  await bundle.activate(commandApi);
  for (const provider of (manifest.contributes.searchProviders || [])) {
    if (!handlers.has(provider.handler)) throw new Error(`${name}: provider handler ${provider.handler} was not registered`);
  }
  return { manifest, handlers };
}

function fallbackI18n() {
  return { t(_key, _params, fallback) { return fallback || ''; } };
}

(async () => {
  // Journal: canonical Markdown must beat a stale legacy settings copy.
  const month = [
    '---', 'verstak: worklog', 'version: 1', 'deal: "Project"', 'month: 2026-08', '---', '',
    '# Journal — Project — 2026-08', '', '## 2026-08-16', '', '### Canonical journal entry', '',
    '45 min · non-billable', '', 'Fresh canonical body', '',
    '<!-- verstak-entry {"entryId":"journal:shared","minutes":45,"billable":false} -->', ''
  ].join('\n');
  const journalApi = {
    i18n: fallbackI18n(),
    settings: { read: async () => ({
      'worklog:workspace:Project': [{
        entryId: 'journal:shared', workspaceRootPath: 'Project', date: '2026-08-16',
        title: 'STALE legacy title', summary: 'stale settings body', minutes: 5,
      }],
    }) },
    workspaces: { list: async () => [{ id: 'deal-project', rootPath: 'Project', name: 'Project' }] },
    files: {
      list: async (dir) => dir === 'Project/Журнал'
        ? [{ type: 'file', name: '2026-08.md', relativePath: 'Project/Журнал/2026-08.md' }]
        : [],
      readText: async (file) => file === 'Project/Журнал/2026-08.md' ? month : '',
    },
  };
  const journal = await activate('journal', journalApi);
  const overview = await journal.handlers.get('verstak.journal.provideOverview')({ workspaceRootPath: 'Project' });
  if (!overview.resume || !overview.resume.some((item) => String(item.title).includes('Canonical journal entry'))) {
    throw new Error(`Journal Overview did not read canonical Markdown: ${JSON.stringify(overview)}`);
  }
  if (JSON.stringify(overview).includes('STALE legacy title')) throw new Error('Journal Overview preferred stale settings over canonical Markdown');
  const journalSearch = await journal.handlers.get('verstak.journal.search')({ query: 'canonical body', workspaceRootPath: 'Project', limit: 10 });
  if (!journalSearch.results.some((item) => item.title === 'Canonical journal entry' && item.action?.workspaceItemId === 'verstak.journal.workspace')) {
    throw new Error(`Journal Search did not read canonical Markdown: ${JSON.stringify(journalSearch)}`);
  }

  // Browser: archived is absent; assigned and global captures route differently.
  const browserApi = {
    i18n: fallbackI18n(),
    settings: { read: async () => ({
      'captures:global': [
        { captureId: 'assigned', kind: 'page', title: 'Research Project', url: 'https://example.test/research', workspaceRootPath: 'Project', globalState: 'inbox' },
        { captureId: 'loose', kind: 'selection', title: 'Loose Research', text: 'unassigned material', globalState: 'inbox' },
        { captureId: 'archived', kind: 'page', title: 'Archived Research', globalState: 'archived' },
      ],
    }) },
  };
  const browser = await activate('browser-inbox', browserApi);
  const browserSearch = await browser.handlers.get('verstak.browser-inbox.search')({ query: 'research', limit: 20 });
  if (browserSearch.results.some((item) => item.id === 'archived')) throw new Error('Browser Search exposed archived capture');
  const assigned = browserSearch.results.find((item) => item.id === 'assigned');
  const loose = browserSearch.results.find((item) => item.id === 'loose');
  if (!assigned || assigned.action?.kind !== 'workspace-item' || assigned.action.workspaceRootPath !== 'Project') throw new Error('Browser assigned capture does not route to its Deal');
  if (!loose || loose.action?.kind !== 'view' || loose.action.viewId !== 'verstak.browser-inbox.view') throw new Error('Browser unassigned capture does not route to global Browser view');

  // Activity: canonical raw NDJSON wins; Deal and global activity route correctly.
  const activityApi = {
    i18n: fallbackI18n(),
    settings: { read: async () => ({ 'events:global': [{ activityId: 'stale', title: 'STALE activity' }] }) },
    storage: { data: { readNDJSON: async () => [
      { activityId: 'deal-event', type: 'note.saved', title: 'Research note saved', summary: 'Canonical activity summary', occurredAt: '2026-08-16T10:00:00Z', workspaceRootPath: 'Project', sourcePluginId: 'verstak.notes', payload: {} },
      { activityId: 'global-event', type: 'browser.capture.received', title: 'Research capture received', summary: 'Loose activity', occurredAt: '2026-08-16T09:00:00Z', sourcePluginId: 'verstak.browser-inbox', payload: {} },
    ] } },
  };
  const activity = await activate('activity', activityApi);
  const activitySearch = await activity.handlers.get('verstak.activity.search')({ query: 'research', limit: 20 });
  if (activitySearch.results.some((item) => item.id === 'stale')) throw new Error('Activity Search ignored canonical raw NDJSON');
  const dealEvent = activitySearch.results.find((item) => item.id === 'deal-event');
  const globalEvent = activitySearch.results.find((item) => item.id === 'global-event');
  if (!dealEvent || dealEvent.action?.kind !== 'workspace-item' || dealEvent.action.workspaceItemId !== 'verstak.activity.workspace') throw new Error('Deal Activity result action is wrong');
  if (!globalEvent || globalEvent.action?.kind !== 'view' || globalEvent.action.viewId !== 'verstak.activity.view') throw new Error('Global Activity result action is wrong');

  console.log('domain search providers smoke passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
'''
write('scripts/smoke-domain-search-providers.js', smoke)

check_sh = read('scripts/check.sh')
check_sh = replace_once(check_sh, '  node "$ROOT/scripts/smoke-search-plugin.js"\n  report "search frontend behavior" $?\n', '  node "$ROOT/scripts/smoke-search-plugin.js"\n  report "search frontend behavior" $?\n  node "$ROOT/scripts/smoke-domain-search-providers.js"\n  report "domain search provider behavior" $?\n', 'check.sh domain Search smoke')
write('scripts/check.sh', check_sh)

print('domain Search providers patch applied')
