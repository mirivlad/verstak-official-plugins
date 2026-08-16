from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, got {count}: {old!r}')
    p.write_text(text.replace(old, new, 1))


path = 'plugins/search/frontend/src/index.js'
p = Path(path)
text = p.read_text()

text = text.replace(
    "  var SEARCH_COMMAND_ID = 'verstak.search.searchVaultText';\n",
    """  var SEARCH_COMMAND_ID = 'verstak.search.searchVaultText';
  var providerIndexes = Object.create(null);
  var providerBuilds = Object.create(null);
  var providerGeneration = 0;
""",
    1,
)

anchor = """  function normalizeProviderResults(provider, value) {
"""
insert = """  function providerResultId(result) {
    return [result && result.type || 'result', cleanPath(result && result.path), result && result.matchType || 'match'].join(':');
  }

  function normalizeLocalProviderResult(result) {
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

  function invalidateProviderIndexes(event) {
    var payload = (event && event.payload) || event || {};
    var changedPath = cleanPath(payload.relativePath || payload.path || '');
    providerGeneration += 1;
    if (!changedPath) {
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
  }

  function activateSearchProvider(api) {
    var tasks = [];
    if (api && api.commands && typeof api.commands.register === 'function') {
      tasks.push(api.commands.register(SEARCH_COMMAND_ID, function (args) {
        return provideSearch(api, args);
      }));
    }
    if (api && api.events && typeof api.events.subscribe === 'function') {
      tasks.push(api.events.subscribe('file.changed', function (event) {
        invalidateProviderIndexes(event);
      }));
    }
    return Promise.all(tasks).catch(function (err) {
      console.warn('[verstak.search] background provider activation:', err);
    });
  }

"""
if text.count(anchor) != 1:
    raise SystemExit('provider helper anchor mismatch')
text = text.replace(anchor, insert + anchor, 1)

old_setup = """      function setupIntegrations() {
        if (api.commands && typeof api.commands.register === 'function') {
          api.commands.register(SEARCH_COMMAND_ID, searchVaultText).then(function (unregister) {
            if (typeof unregister === 'function') cleanupFns.push(unregister);
          }).catch(function (err) {
            console.error('[search] register command:', err);
          });
        }
        if (api.events && typeof api.events.subscribe === 'function') {
"""
new_setup = """      function setupIntegrations() {
        if (api.events && typeof api.events.subscribe === 'function') {
"""
if text.count(old_setup) != 1:
    raise SystemExit('SearchView setupIntegrations anchor mismatch')
text = text.replace(old_setup, new_setup, 1)

old_bundle = """  window.VerstakPluginRegister('verstak.search', {
    components: { SearchView: SearchView }
  });
"""
new_bundle = """  window.VerstakPluginRegister('verstak.search', {
    components: { SearchView: SearchView },
    activate: activateSearchProvider
  });
"""
if text.count(old_bundle) != 1:
    raise SystemExit('Search bundle registration anchor mismatch')
text = text.replace(old_bundle, new_bundle, 1)

if text.count("api.commands.register(SEARCH_COMMAND_ID") != 1:
    raise SystemExit('Search command must be registered exactly once, from background activation')
if 'activate: activateSearchProvider' not in text:
    raise SystemExit('Search bundle must expose background activation')
p.write_text(text)

# Update the smoke test so lifecycle is part of the permanent contract.
path = 'scripts/smoke-search-plugin.js'
p = Path(path)
text = p.read_text()
old_loader = """function loadComponent(document) {
  const registry = {};
  vm.runInNewContext(source, {
"""
new_loader = """function loadBundle(document) {
  const registry = {};
  vm.runInNewContext(source, {
"""
if text.count(old_loader) != 1:
    raise SystemExit('smoke loader anchor mismatch')
text = text.replace(old_loader, new_loader, 1)
text = text.replace(
    """      VerstakPluginRegister(pluginId, bundle) {
        registry[pluginId] = bundle.components || {};
      },
""",
    """      VerstakPluginRegister(pluginId, bundle) {
        registry[pluginId] = bundle || {};
      },
""",
    1,
)
text = text.replace(
    """  const component = registry['verstak.search'] && registry['verstak.search'].SearchView;
  if (!component) throw new Error('SearchView was not registered');
  return component;
}
""",
    """  const bundle = registry['verstak.search'];
  if (!bundle || !bundle.components || !bundle.components.SearchView) throw new Error('SearchView was not registered');
  if (typeof bundle.activate !== 'function') throw new Error('Search bundle must expose background activate()');
  return bundle;
}
""",
    1,
)
text = text.replace(
    """  const component = loadComponent(document);
""",
    """  const bundle = loadBundle(document);
  const component = bundle.components.SearchView;
""",
    1,
)
# Global provider search needs a vault root containing Project.
text = text.replace(
    """      list: async (relativeDir) => {
        if (relativeDir === 'Project') {
""",
    """      list: async (relativeDir) => {
        if (relativeDir === '') {
          return [
            { name: 'Project', relativePath: 'Project', type: 'folder' },
          ];
        }
        if (relativeDir === 'Project') {
""",
    1,
)
# Activation happens before any view is mounted.
activation_anchor = """  const container = new FakeNode('div');
  component.mount(container, { workspaceRootPath: 'Project' }, api);
  await flush();

  if (!commandHandlers.has('verstak.search.searchVaultText')) throw new Error('search provider command was not registered');
  if (!eventHandlers['file.changed'] || eventHandlers['file.changed'].length !== 1) throw new Error('file.changed subscription was not registered');
"""
activation_replacement = """  await bundle.activate(api);
  await flush();
  if (!commandHandlers.has('verstak.search.searchVaultText')) throw new Error('background search provider command was not registered');
  if (!eventHandlers['file.changed'] || eventHandlers['file.changed'].length !== 1) throw new Error('background file.changed subscription was not registered');

  const backgroundSearch = commandHandlers.get('verstak.search.searchVaultText');
  const globalResponse = await backgroundSearch({ query: 'target phrase', limit: 10 });
  if (!globalResponse || !Array.isArray(globalResponse.results)) throw new Error('background provider must return SearchProviderResponse');
  const globalFile = globalResponse.results.find((item) => item.subtitle === 'Project/Docs/case.md');
  if (!globalFile) throw new Error('background provider must support vault-global search without workspaceRootPath');
  if (!globalFile.action || globalFile.action.kind !== 'resource' || globalFile.action.resource.path !== 'Project/Docs/case.md') {
    throw new Error('background file result must expose a generic resource action');
  }
  const scopedResponse = await backgroundSearch({ query: 'target phrase', workspaceRootPath: 'Project', limit: 10 });
  if (!scopedResponse.results.some((item) => item.subtitle === 'Project/Docs/case.md')) {
    throw new Error('background provider must support Deal-scoped search');
  }

  const container = new FakeNode('div');
  component.mount(container, { workspaceRootPath: 'Project' }, api);
  await flush();

  if (commandHandlers.get('verstak.search.searchVaultText') !== backgroundSearch) {
    throw new Error('mounting SearchView must not replace the background provider handler');
  }
  if (!eventHandlers['file.changed'] || eventHandlers['file.changed'].length !== 2) throw new Error('view should add its scoped file.changed subscription beside background invalidation');
"""
if text.count(activation_anchor) != 1:
    raise SystemExit('smoke activation anchor mismatch')
text = text.replace(activation_anchor, activation_replacement, 1)

end_anchor = """  if (!opened[0] || opened[0].path !== 'Project/Docs/case.md' || opened[0].mode !== 'view') {
    throw new Error('result did not open through workbench');
  }

  console.log('search plugin smoke passed');
"""
end_replacement = """  if (!opened[0] || opened[0].path !== 'Project/Docs/case.md' || opened[0].mode !== 'view') {
    throw new Error('result did not open through workbench');
  }

  component.unmount(container);
  await flush();
  if (commandHandlers.get('verstak.search.searchVaultText') !== backgroundSearch) {
    throw new Error('unmounting SearchView must leave the background provider handler registered');
  }
  if (!eventHandlers['file.changed'] || eventHandlers['file.changed'].length !== 1) {
    throw new Error('unmounting SearchView must leave only the background file.changed subscription');
  }

  console.log('search plugin smoke passed');
"""
if text.count(end_anchor) != 1:
    raise SystemExit('smoke unmount anchor mismatch')
text = text.replace(end_anchor, end_replacement, 1)
p.write_text(text)

print('Search provider lifecycle patch applied')
