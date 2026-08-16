from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, got {count}")
    path.write_text(text.replace(old, new, 1))


search = ROOT / "plugins/search/frontend/src/index.js"
files = ROOT / "plugins/files/frontend/src/index.js"
manifest_path = ROOT / "plugins/search/plugin.json"
checker = ROOT / "scripts/check-search-providers.js"

replace_once(search,
"""  var SEARCH_COMMAND_ID = 'verstak.search.searchVaultText';
  var providerIndexes = Object.create(null);
  var providerBuilds = Object.create(null);
  var providerGeneration = 0;
""",
"""  var SEARCH_COMMAND_ID = 'verstak.search.searchVaultText';
  var FILES_CAPABILITY_ID = 'verstak/files/v1';
  var providerEntries = Object.create(null);
  var providerEntryBuilds = Object.create(null);
  var providerIndexes = Object.create(null);
  var providerBuilds = Object.create(null);
  var providerGeneration = 0;
""")

replace_once(search,
"""  async function buildIndex(api, rootPath) {
    var entries = await collectEntries(api, rootPath);
    var files = [];
""",
"""  async function buildIndex(api, rootPath, entries) {
    entries = Array.isArray(entries) ? entries : await collectEntries(api, rootPath);
    var files = [];
""")

replace_once(search,
"""  function normalizeLocalProviderResult(result) {
    var normalized = {
      id: providerResultId(result),
      title: baseName(result.path),
      subtitle: cleanPath(result.path),
      snippet: result.snippet || '',
      categoryId: result.type === 'folder' ? 'folders' : 'files',
      score: result.matchType === 'Content match' ? 80 : 100
    };
    if (result.openable) {
      normalized.action = {
        kind: 'resource',
        resource: {
          kind: 'vault-file',
          path: cleanPath(result.path),
          mode: 'view'
        }
      };
    }
    return normalized;
  }

  async function loadProviderIndex(api, rootPath) {
    var key = cleanPath(rootPath);
    if (normalizeIndex(providerIndexes[key], key)) return providerIndexes[key];
    if (providerBuilds[key]) return providerBuilds[key];
    var generation = providerGeneration;
    providerBuilds[key] = buildIndex(api, key).then(function (built) {
      if (generation === providerGeneration) providerIndexes[key] = built;
      return built;
    }).finally(function () {
      delete providerBuilds[key];
    });
    return providerBuilds[key];
  }

  async function provideSearch(api, args) {
    args = args || {};
    var query = String(args.query || '').trim();
    var rootPath = cleanPath(args.workspaceRootPath || '');
    var limit = Number(args.limit) || MAX_RESULTS;
    if (limit <= 0) limit = MAX_RESULTS;
    if (query.length < 2) return { results: [] };
    var index = await loadProviderIndex(api, rootPath);
    var local = runLocalSearch(index, query).slice(0, limit);
    return {
      results: local.map(normalizeLocalProviderResult),
      partial: local.length >= limit
    };
  }
""",
"""  async function resolveFolderAction(api, result) {
    if (!api || !api.capabilities || typeof api.capabilities.get !== 'function') return null;
    if (!api.contributions || typeof api.contributions.list !== 'function') return null;
    if (!api.workspaces || typeof api.workspaces.resolvePath !== 'function') return null;
    try {
      var capability = await api.capabilities.get(FILES_CAPABILITY_ID);
      if (!capability || !capability.available || !capability.pluginId) return null;
      var workspaceItems = await api.contributions.list('workspaceItems');
      workspaceItems = Array.isArray(workspaceItems) ? workspaceItems : [];
      var filesTool = workspaceItems.find(function (item) {
        return item && item.pluginId === capability.pluginId && item.id;
      });
      if (!filesTool) return null;
      var resolved = await api.workspaces.resolvePath(cleanPath(result.path));
      if (!resolved || !resolved.found || !resolved.workspaceRootPath) return null;
      var fullPath = cleanPath(result.path);
      var workspaceRootPath = cleanPath(resolved.workspaceRootPath);
      if (fullPath !== workspaceRootPath && fullPath.indexOf(workspaceRootPath + '/') !== 0) return null;
      var localPath = fullPath === workspaceRootPath ? '' : fullPath.slice(workspaceRootPath.length + 1);
      return {
        kind: 'workspace-item',
        workspaceRootPath: workspaceRootPath,
        workspaceItemId: filesTool.id,
        toolRequest: { type: 'open-folder', path: localPath }
      };
    } catch (err) {
      return null;
    }
  }

  async function normalizeLocalProviderResult(api, result) {
    var normalized = {
      id: providerResultId(result),
      title: baseName(result.path),
      subtitle: cleanPath(result.path),
      snippet: result.snippet || '',
      categoryId: result.type === 'folder' ? 'folders' : 'files',
      score: result.matchType === 'Content match' ? 80 : 100
    };
    if (result.openable) {
      normalized.action = {
        kind: 'resource',
        resource: {
          kind: 'vault-file',
          path: cleanPath(result.path),
          mode: 'view'
        }
      };
    } else if (result.type === 'folder') {
      normalized.action = await resolveFolderAction(api, result);
    }
    return normalized;
  }

  async function loadProviderEntries(api, rootPath) {
    var key = cleanPath(rootPath);
    if (Array.isArray(providerEntries[key])) return providerEntries[key];
    if (providerEntryBuilds[key]) return providerEntryBuilds[key];
    var generation = providerGeneration;
    providerEntryBuilds[key] = collectEntries(api, key).then(function (entries) {
      if (generation === providerGeneration) providerEntries[key] = entries;
      return entries;
    }).finally(function () {
      delete providerEntryBuilds[key];
    });
    return providerEntryBuilds[key];
  }

  async function loadProviderIndex(api, rootPath, knownEntries) {
    var key = cleanPath(rootPath);
    if (normalizeIndex(providerIndexes[key], key)) return providerIndexes[key];
    if (providerBuilds[key]) return providerBuilds[key];
    var generation = providerGeneration;
    var entries = Array.isArray(knownEntries) ? knownEntries : await loadProviderEntries(api, key);
    providerBuilds[key] = buildIndex(api, key, entries).then(function (built) {
      if (generation === providerGeneration) providerIndexes[key] = built;
      return built;
    }).finally(function () {
      delete providerBuilds[key];
    });
    return providerBuilds[key];
  }

  async function normalizeLocalProviderResults(api, rows) {
    return Promise.all(rows.map(function (row) {
      return normalizeLocalProviderResult(api, row);
    }));
  }

  async function provideSearch(api, args) {
    args = args || {};
    var query = String(args.query || '').trim();
    var rootPath = cleanPath(args.workspaceRootPath || '');
    var limit = Number(args.limit) || MAX_RESULTS;
    if (limit <= 0) limit = MAX_RESULTS;
    if (query.length < 2) return { results: [] };

    var readyIndex = normalizeIndex(providerIndexes[rootPath], rootPath);
    if (readyIndex) {
      var readyLocal = runLocalSearch(readyIndex, query).slice(0, limit);
      return {
        results: await normalizeLocalProviderResults(api, readyLocal),
        partial: readyLocal.length >= limit
      };
    }

    // File and folder names are useful before full-text indexing finishes.
    // Do not make a quick jump wait behind every readText() call in the vault.
    var entries = await loadProviderEntries(api, rootPath);
    var pathLocal = runLocalSearch({ entries: entries, files: [] }, query).slice(0, limit);
    if (pathLocal.length) {
      loadProviderIndex(api, rootPath, entries).catch(function (err) {
        console.warn('[verstak.search] background text index:', err);
      });
      return {
        results: await normalizeLocalProviderResults(api, pathLocal),
        partial: true
      };
    }

    var index = await loadProviderIndex(api, rootPath, entries);
    var local = runLocalSearch(index, query).slice(0, limit);
    return {
      results: await normalizeLocalProviderResults(api, local),
      partial: local.length >= limit
    };
  }
""")

replace_once(search,
"""    if (!changedPath) {
      providerIndexes = Object.create(null);
      providerBuilds = Object.create(null);
      return;
    }
    Object.keys(providerIndexes).forEach(function (scope) {
      if (!scope || changedPath === scope || changedPath.indexOf(scope + '/') === 0) delete providerIndexes[scope];
    });
    Object.keys(providerBuilds).forEach(function (scope) {
      if (!scope || changedPath === scope || changedPath.indexOf(scope + '/') === 0) delete providerBuilds[scope];
    });
""",
"""    if (!changedPath) {
      providerEntries = Object.create(null);
      providerEntryBuilds = Object.create(null);
      providerIndexes = Object.create(null);
      providerBuilds = Object.create(null);
      return;
    }
    Object.keys(providerEntries).forEach(function (scope) {
      if (!scope || changedPath === scope || changedPath.indexOf(scope + '/') === 0) delete providerEntries[scope];
    });
    Object.keys(providerEntryBuilds).forEach(function (scope) {
      if (!scope || changedPath === scope || changedPath.indexOf(scope + '/') === 0) delete providerEntryBuilds[scope];
    });
    Object.keys(providerIndexes).forEach(function (scope) {
      if (!scope || changedPath === scope || changedPath.indexOf(scope + '/') === 0) delete providerIndexes[scope];
    });
    Object.keys(providerBuilds).forEach(function (scope) {
      if (!scope || changedPath === scope || changedPath.indexOf(scope + '/') === 0) delete providerBuilds[scope];
    });
""")

replace_once(files,
"""      var historyKey = workspaceRoot || workspaceName;
      var savedHistory = window.__filesHistoryByWorkspace[historyKey] || { stack: [''], index: 0, currentPath: '' };
      var currentPath = cleanPath(savedHistory.currentPath || '');
""",
"""      var historyKey = workspaceRoot || workspaceName;
      var savedHistory = window.__filesHistoryByWorkspace[historyKey] || { stack: [''], index: 0, currentPath: '' };
      var toolRequest = props && props.toolRequest;
      var requestedFolderPath = '';
      var hasFolderRequest = !!(toolRequest && toolRequest.type === 'open-folder');
      if (hasFolderRequest) {
        var rawRequestedFolderPath = String(toolRequest.path || '');
        var requestedSegments = rawRequestedFolderPath.split('/').filter(Boolean);
        if (requestedSegments.indexOf('..') === -1 && rawRequestedFolderPath[0] !== '/') {
          requestedFolderPath = cleanPath(rawRequestedFolderPath);
        } else {
          hasFolderRequest = false;
        }
      }
      var currentPath = cleanPath(savedHistory.currentPath || '');
""")

replace_once(files,
"""      if (historyStack[historyIndex] !== currentPath) {
        historyStack = [currentPath];
        historyIndex = 0;
      }
      var navigatingHistory = false;
""",
"""      if (historyStack[historyIndex] !== currentPath) {
        historyStack = [currentPath];
        historyIndex = 0;
      }
      if (hasFolderRequest) {
        if (historyIndex < historyStack.length - 1) historyStack = historyStack.slice(0, historyIndex + 1);
        if (historyStack[historyStack.length - 1] !== requestedFolderPath) historyStack.push(requestedFolderPath);
        historyIndex = historyStack.length - 1;
        currentPath = requestedFolderPath;
      }
      var navigatingHistory = false;
""")

replace_once(files,
"""      updateHistoryButtons();
      loadContributionActions();
      loadEntries();
""",
"""      updateHistoryButtons();
      saveHistoryState();
      loadContributionActions();
      loadEntries();
""")

manifest = json.loads(manifest_path.read_text())
optional = list(manifest.get("optionalRequires") or [])
for capability in ["verstak/core/capability-registry/v1", "verstak/core/workspace/v1"]:
    if capability not in optional:
        optional.append(capability)
manifest["optionalRequires"] = optional
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")

replace_once(checker,
"""if (!source.includes("commands.register(SEARCH_COMMAND_ID")) fail("Search bundle must register its provider command during activation");
if (!source.includes("api.events.subscribe('file.changed'")) fail("Search provider index must invalidate on file.changed");
if (!source.includes("api.commands.executeFor(provider.pluginId, provider.handler")) fail("Search workspace must aggregate declared Search providers");
""",
"""if (!source.includes("commands.register(SEARCH_COMMAND_ID")) fail("Search bundle must register its provider command during activation");
if (!source.includes("api.events.subscribe('file.changed'")) fail("Search provider index must invalidate on file.changed");
if (!source.includes("loadProviderEntries(api, rootPath)")) fail("Search provider must publish path matches before full-text reads finish");
if (!source.includes("api.capabilities.get(FILES_CAPABILITY_ID)")) fail("Search folder navigation must resolve Files through its capability");
if (!source.includes("api.workspaces.resolvePath(cleanPath(result.path))")) fail("Search folder navigation must resolve the owning Deal through the workspace API");
if (!source.includes("toolRequest: { type: 'open-folder', path: localPath }")) fail("Search folder results must use the Files open-folder tool request contract");
if (!source.includes("api.commands.executeFor(provider.pluginId, provider.handler")) fail("Search workspace must aggregate declared Search providers");

const filesSource = fs.readFileSync(path.join(root, 'plugins/files/frontend/src/index.js'), 'utf8');
if (!filesSource.includes("toolRequest && toolRequest.type === 'open-folder'")) fail("Files workspace item must accept the open-folder tool request");
if (!filesSource.includes("requestedSegments.indexOf('..') === -1")) fail("Files open-folder tool request must reject parent traversal");

const searchOptional = new Set((byId.get('verstak.search').manifest.optionalRequires || []));
for (const capability of ['verstak/core/capability-registry/v1', 'verstak/core/workspace/v1']) {
  if (!searchOptional.has(capability)) fail(`verstak.search must declare optional dependency ${capability}`);
}
""")

print("Applied Search provider navigation/progressive-index patch")
