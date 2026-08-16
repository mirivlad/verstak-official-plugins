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

if (providerCount !== 4) throw new Error(`expected 4 official Search providers, found ${providerCount}`);
console.log(`OK ${providerCount} Search providers use declared background commands`);
