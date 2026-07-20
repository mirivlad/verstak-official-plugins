const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.children = [];
    this.listeners = {};
    this.nodes = new Map();
    this.style = {};
    this.innerHTML = '';
    this.textContent = '';
  }

  addEventListener(name, handler) { this.listeners[name] = handler; }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute() {}
  remove() { this.removed = true; }
  querySelector(selector) {
    if (!this.nodes.has(selector)) this.nodes.set(selector, new FakeElement());
    return this.nodes.get(selector);
  }
  querySelectorAll(selector) {
    if (selector === '.fa-color-dot') return this.querySelector('#fa-colors').children;
    return [];
  }
}

(async function run() {
  const sourcePath = path.join(__dirname, '..', 'plugins', 'folder-appearance', 'frontend', 'src', 'index.js');
  const source = fs.readFileSync(sourcePath, 'utf8');
  let registration;
  const body = new FakeElement('body');
  const sandbox = {
    console,
    document: {
      body,
      createElement: (tagName) => new FakeElement(tagName),
    },
    window: {
      VerstakPluginRegister(id, definition) { registration = { id, definition }; },
    },
  };

  vm.runInNewContext(source, sandbox, { filename: sourcePath });
  assert.equal(registration.id, 'verstak.folder-appearance');

  const saved = [];
  const maliciousName = '\"><img src=x onerror=alert(1)>';
  const container = new FakeElement();
  registration.definition.components.FolderAppearanceAction.mount(container, {
    folderId: 'folder-1',
    folderName: maliciousName,
  }, {
    i18n: { getLocale: () => 'en', t: (_key, _params, fallback) => fallback },
    folders: {
      getAppearance: async () => ({ iconId: 'calendar', colorId: '#4da6ff' }),
      setAppearance: async (_folderId, appearance) => { saved.push(appearance); },
    },
  });

  await Promise.resolve();
  container.children[0].listeners.click({ stopPropagation() {} });
  const overlay = body.children[0];
  assert.ok(overlay, 'picker overlay should open');
  assert.ok(!overlay.innerHTML.includes(maliciousName), 'folder name must not be interpolated into HTML');
  assert.equal(overlay.querySelector('#fa-folder-name').textContent, maliciousName);

  const grid = overlay.querySelector('#fa-grid');
  assert.ok(grid.children.length > 1, 'icon grid should render choices');
  assert.notEqual(grid.children[0].innerHTML, grid.children[1].innerHTML, 'different icon choices must render differently');

  overlay.querySelector('#fa-save').listeners.click();
  await Promise.resolve();
  assert.deepEqual(saved, [{ iconId: 'calendar', colorId: '#4da6ff' }]);
  console.log('folder appearance frontend behavior passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
