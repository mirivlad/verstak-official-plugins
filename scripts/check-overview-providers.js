const fs = require('fs');
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
  if (!(contributes.overviewProviders || []).length) continue;
  const source = manifest.frontend && manifest.frontend.entry ? fs.readFileSync(path.join(root, path.basename(path.dirname(path.join(root, manifest.id.replace('verstak.', ''), 'plugin.json'))), manifest.frontend.entry), 'utf8') : '';
  for (const match of source.matchAll(/workspaceItemId:\s*['\"]([^'\"]+)['\"]/g)) {
    if (!workspaceIds.has(match[1])) throw new Error(`${manifest.id}: unknown Overview workspaceItemId ${match[1]}`);
  }
}
// Activity reconstructs Journal evidence in the background and intentionally
// no longer adds a user-facing Overview card.
if (providers !== 4) throw new Error(`expected 4 user-facing Overview providers, found ${providers}`);
console.log(`OK ${providers} Overview providers use declared commands and exact workspace item ids`);
