const fs = require('fs');
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

const byId = new Map(manifests.map((row) => [row.manifest.id, row]));
function fail(message) { throw new Error(message); }
const searchRow = byId.get('verstak.search');
if (!searchRow) fail('verstak.search manifest missing');
const source = fs.readFileSync(path.join(root, searchRow.name, searchRow.manifest.frontend.entry), 'utf8');
if (!source.includes("commands.register(SEARCH_COMMAND_ID")) fail("Search bundle must register its provider command during activation");
if (!source.includes("api.events.subscribe('file.changed'")) fail("Search provider index must invalidate on file.changed");
if (!source.includes("loadProviderEntries(api, rootPath)")) fail("Search provider must publish path matches before full-text reads finish");
if (!source.includes("api.capabilities.get(FILES_CAPABILITY_ID)")) fail("Search folder navigation must resolve Files through its capability");
if (!source.includes("api.workspaces.resolvePath(cleanPath(result.path))")) fail("Search folder navigation must resolve the owning Deal through the workspace API");
if (!source.includes("toolRequest: { type: 'open-folder', path: localPath }")) fail("Search folder results must use the Files open-folder tool request contract");
if (!source.includes("api.commands.executeFor(provider.pluginId, provider.handler")) fail("Search workspace must aggregate declared Search providers");

const filesSource = fs.readFileSync(path.join(root, 'files/frontend/src/index.js'), 'utf8');
if (!filesSource.includes("toolRequest && toolRequest.type === 'open-folder'")) fail("Files workspace item must accept the open-folder tool request");
if (!filesSource.includes("requestedSegments.indexOf('..') === -1")) fail("Files open-folder tool request must reject parent traversal");

const searchOptional = new Set((byId.get('verstak.search').manifest.optionalRequires || []));
for (const capability of ['verstak/core/capability-registry/v1', 'verstak/core/workspace/v1']) {
  if (!searchOptional.has(capability)) fail(`verstak.search must declare optional dependency ${capability}`);
}

// Activity is intentionally absent from global user search; it remains a
// background Journal provider rather than a discoverable result surface.
if (providerCount !== 3) throw new Error(`expected 3 user-facing Search providers, found ${providerCount}`);
console.log(`OK ${providerCount} Search providers use declared background commands`);
