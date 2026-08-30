#!/usr/bin/env node
'use strict';
const fs = require('fs'); const path = require('path');
let bundle; global.window = { VerstakPluginRegister(id, definition) { bundle = { id, definition }; } };
new Function(fs.readFileSync(path.join(__dirname, '..', 'plugins', 'git', 'frontend', 'src', 'index.js'), 'utf8'))();
if (!bundle || bundle.id !== 'verstak.git') throw new Error('Git plugin did not register');
let records = [], local = [], commands = {};
const api = { commands: { register(id, handler) { commands[id] = handler; return Promise.resolve(); } }, storage: { data: { readNDJSON(name) { return Promise.resolve(name === 'checkouts' ? local : records); }, writeNDJSON(name, rows) { if (name === 'checkouts') local = rows; else records = rows; return Promise.resolve(); } } } };
(async () => {
  await bundle.definition.activate(api);
  const scope = { kind: 'deal', workspaceId: '11111111-1111-4111-8111-111111111111' };
  const first = await commands['verstak.git.add']({ scope, name: 'Origin', remoteUrl: 'https://example.test/acme/repo.git', defaultBranch: 'main', credentialRef: 'verstak-secret://git-token' });
  await commands['verstak.git.add']({ scope, name: 'Mirror', remoteUrl: 'git@example.test:acme/mirror.git', defaultBranch: 'trunk' });
  const listed = await commands['verstak.git.list']({ scope });
  if (listed.length !== 2 || !listed.every((row) => row.workspaceId === scope.workspaceId)) throw new Error('multiple Deal repositories were not preserved');
  if (first.checkoutName !== 'repo') throw new Error(`checkout should use remote repository basename, got ${first.checkoutName}`);
  if (Object.prototype.hasOwnProperty.call(first, 'checkoutPath') || JSON.stringify(first).includes('git-token-value')) throw new Error('descriptor leaked device-local path or credential plaintext');
  records.push({ id: 'repo-11111111-1111-4111-8111-111111111111', workspaceId: scope.workspaceId, name: 'гитхаб', remoteUrl: 'git@github.com:mirivlad/sshkeeper.git', defaultBranch: 'main', checkoutName: 'repo-11111111-1111-4111-8111-111111111111' });
  const migrated = await commands['verstak.git.list']({ scope });
  const legacy = migrated.find((row) => row.id === 'repo-11111111-1111-4111-8111-111111111111');
  if (!legacy || legacy.checkoutName !== 'sshkeeper') throw new Error(`legacy generated checkout name was not migrated: ${JSON.stringify(legacy)}`);

  await commands['verstak.git.remove']({ scope, id: first.id });
  if ((await commands['verstak.git.list']({ scope })).some((row) => row.id === first.id)) throw new Error('repository removal failed');
  console.log('git plugin smoke passed');
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
