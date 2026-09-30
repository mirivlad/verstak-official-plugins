import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, webkit, expect } from '@playwright/test';
import fs from 'node:fs';

const bundle = fs.readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
const translations = JSON.parse(fs.readFileSync(new URL('../../locales/en.json', import.meta.url), 'utf8'));
let browser;
before(async () => { browser = await (process.env.EDITOR_BROWSER === 'webkit' ? webkit : chromium).launch({ headless: true }); });
after(async () => { await browser?.close(); });

async function mount(t, options = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  t.after(async () => { await page.close(); assert.deepEqual(errors, []); });
  await page.setContent('<div id="root" style="height:760px"></div>');
  await page.evaluate(() => { window.VerstakPluginRegister = (_, bundle) => { window.component = bundle.components.DefaultEditor; }; });
  await page.addScriptTag({ content: bundle });
  await page.evaluate(({ options, translations }) => {
    const path = options.path || 'Project/Notes/Current.md';
    window.files = { [path]: options.text ?? 'First paragraph\n\n- [ ] Same\n  - [ ] Same\n', ...options.files };
    window.writes = []; window.opened = []; window.drafts = {}; window.failWrite = false; window.holdWrite = false;
    const settings = options.settings || {};
    window.api = {
      keys: { matches: (event, spec) => event.code === spec.code && (event.ctrlKey || event.metaKey) && event.shiftKey === !!spec.shift && !event.altKey },
      files: {
        readText: async path => { if (!(path in window.files)) throw new Error('not-found'); return window.files[path]; },
        writeText: async (path, content) => {
          if (window.failWrite) throw new Error('write failed');
          if (window.holdWrite) await new Promise(resolve => { window.releaseWrite = resolve; });
          window.files[path] = content; window.writes.push({ path, content });
        },
        list: async folder => Object.keys(window.files).filter(path => path.startsWith(folder + '/')).map(path => ({ type: 'file', relativePath: path, name: path.slice(folder.length + 1) })),
      },
      settings: { read: async key => settings[key], write: async (key, value) => { settings[key] = value; } },
      contributions: { list: async () => options.secrets ? [{ supports: [{ kind: 'secret' }] }] : [] },
      storage: { data: { read: async key => window.drafts[key], write: async (key, value) => { window.drafts[key] = value; } } },
      workbench: { openResource: async request => window.opened.push(request) },
      capabilities: { has: async () => options.notesProvider !== false, invoke: async (_, operation, args) => {
        if (operation !== 'create') throw new Error('wrong operation');
        const filename = args.title.replace(/ /g, '_') + '.md';
        window.files[args.workspaceRootPath + '/Notes/' + filename] = '# ' + args.title;
        return { filename };
      } },
      i18n: { t: (key, params, fallback) => {
        let value = translations[key] || fallback;
        for (const [key, replacement] of Object.entries(params || {})) value = value.replace(`{${key}}`, replacement);
        return value;
      } },
    };
    window.props = { request: { path, extension: options.plain ? '.txt' : '.md', mode: options.mode || 'view', context: options.plain ? {} : { notesMode: true, notesScopePath: 'Project' } } };
    window.mount = () => window.component.mount(document.getElementById('root'), window.props, window.api);
    window.mount();
  }, { options, translations });
  await page.locator(options.mode === 'edit' || options.plain ? '.cm-content' : '[data-preview]').waitFor();
  return page;
}

async function edit(page) { await page.locator('[data-editor-mode-button=edit]').click(); return page.locator('.cm-content'); }
async function value(page) { return page.locator('.cm-content .cm-line').evaluateAll(lines => lines.map(line => line.textContent).join('\n')); }
async function stored(page) { return page.evaluate(() => window.files[window.props.request.path]); }

test('optional notes provider can be disabled without breaking existing note links', async t => {
  const page = await mount(t, { notesProvider: false, text: 'Text', mode: 'edit' });
  await page.locator('[data-editor-action=insert-note-link]').click();
  await page.locator('[data-link-query]').fill('New note');
  await expect(page.locator('.de-picker-results')).toContainText('No matching note');
  await expect(page.locator('[data-editor-action=create-linked-note]')).toHaveCount(0);
});

test('plain text keeps metadata literal and keyboard task activation is saved', async t => {
  const text = '<!-- verstak-note-aliases-v1: ["Old"] -->\nLiteral';
  const plain = await mount(t, { plain: true, text });
  assert.equal(await value(plain), text);
  const page = await mount(t, { text: '- [ ] Keyboard task' });
  await page.locator('[data-task-offset]').focus();
  await page.keyboard.press('Space');
  await expect.poll(() => stored(page)).toBe('- [x] Keyboard task');
  await expect(page.locator('[data-task-offset]')).toBeFocused();
  await page.keyboard.press('Control+z');
  await expect.poll(() => stored(page)).toBe('- [ ] Keyboard task');
  await page.keyboard.press('Control+y');
  await expect.poll(() => stored(page)).toBe('- [x] Keyboard task');
  await page.keyboard.press('Control+z');
  await expect.poll(() => stored(page)).toBe('- [ ] Keyboard task');
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(() => stored(page)).toBe('- [x] Keyboard task');
  await page.locator('[data-task-offset]').click();
  await expect.poll(() => stored(page)).toBe('- [ ] Keyboard task');
  await expect(page.locator('[data-task-offset]')).toBeFocused();
  await page.keyboard.press('Control+z');
  await expect.poll(() => stored(page)).toBe('- [x] Keyboard task');
});

test('formatting targets selection, toggles and survives mode changes and saves in history', async t => {
  const page = await mount(t, { text: 'before word after', mode: 'edit' });
  const input = page.locator('.cm-content');
  await input.click(); await input.press('Control+Home');
  for (let i = 0; i < 7; i++) await input.press('ArrowRight');
  for (let i = 0; i < 4; i++) await input.press('Shift+ArrowRight');
  await page.locator('[data-md-action=bold]').click();
  assert.equal(await value(page), 'before **word** after');
  await expect(page.locator('[data-md-action=bold]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-editor-action=save]').click();
  await expect.poll(() => stored(page)).toBe('before **word** after');
  await page.locator('[data-editor-mode-button=preview]').click();
  await expect(page.locator('.de-md-toolbar')).toBeHidden();
  await edit(page);
  await input.press('Control+z');
  assert.equal(await value(page), 'before word after');
  await input.press('Control+y');
  assert.equal(await value(page), 'before **word** after');
  await page.locator('[data-md-action=bold]').click();
  assert.equal(await value(page), 'before word after');
});

test('Russian physical shortcut codes undo and redo typing', async t => {
  const page = await mount(t, { text: '', mode: 'edit' });
  await page.locator('.cm-content').fill('Привет');
  await page.locator('.cm-content').dispatchEvent('keydown', { key: 'я', code: 'KeyZ', ctrlKey: true });
  assert.equal(await value(page), '');
  await page.locator('.cm-content').dispatchEvent('keydown', { key: 'н', code: 'KeyY', ctrlKey: true });
  assert.equal(await value(page), 'Привет');
});

test('nested duplicate tasks update only their source, auto-save, and undo in reading mode', async t => {
  const page = await mount(t);
  const boxes = page.locator('[data-task-offset]');
  assert.equal(await boxes.count(), 2);
  const size = await boxes.nth(1).boundingBox(); assert.ok(size.width >= 20 && size.height >= 20);
  assert.equal(await boxes.nth(1).evaluate(e => getComputedStyle(e.closest('li')).listStyleType), 'none');
  await boxes.nth(1).check();
  await expect.poll(() => stored(page)).toBe('First paragraph\n\n- [ ] Same\n  - [x] Same\n');
  await page.locator('[data-editor-action=undo]').click();
  await expect(boxes.nth(1)).not.toBeChecked();
  await expect.poll(() => stored(page)).toBe('First paragraph\n\n- [ ] Same\n  - [ ] Same\n');
  await page.locator('[data-editor-action=redo]').click();
  await expect(boxes.nth(1)).toBeChecked();
});

test('link picker inserts at saved caret, aliases resolve, backlinks show context', async t => {
  const page = await mount(t, { text: 'Before after', mode: 'edit', files: {
    'Project/Notes/Renamed.md': '<!-- verstak-note-aliases-v1: ["Old"] -->\n# Renamed\nSee [[Current]] here.',
  } });
  const input = page.locator('.cm-content');
  await input.click(); await input.press('Control+Home');
  for (let i = 0; i < 7; i++) await input.press('ArrowRight');
  await page.locator('[data-editor-action=insert-note-link]').click();
  await page.locator('[data-link-query]').fill('Old');
  await page.locator('[data-editor-action=choose-note]').click();
  assert.equal(await value(page), 'Before [[Renamed]]after');
  await page.locator('[data-editor-action=toggle-links]').click();
  await expect(page.locator('[data-note-backlink]')).toContainText('See [[Current]] here.');
  await page.locator('[data-editor-mode-button=preview]').click();
  await page.locator('[data-note-link]').click();
  await expect.poll(() => page.evaluate(() => window.opened.at(-1)?.path)).toBe('Project/Notes/Renamed.md');
});

test('wiki completion works with keyboard and Enter continues and exits a task list', async t => {
  const page = await mount(t, { text: '', mode: 'edit', files: { 'Project/Notes/Another.md': '# Another' } });
  const input = page.locator('.cm-content');
  await input.pressSequentially('[[Ano');
  await page.locator('.cm-tooltip-autocomplete').waitFor();
  await input.press('Enter');
  assert.equal(await value(page), '[[Another]]');
  await input.press('Control+a'); await input.press('Backspace');
  await page.locator('[data-md-action=task]').click();
  await input.pressSequentially('First'); await input.press('End'); await input.press('Enter');
  assert.equal(await value(page), '- [ ] First\n- [ ] ');
  await input.press('Enter');
  assert.ok(!(await value(page)).endsWith('- [ ] '));
});

test('metadata is hidden and preserved, saved status tracks the written version', async t => {
  const header = '<!-- verstak-note-aliases-v1: ["Old"] -->\r\n';
  const page = await mount(t, { text: header + '# New\r\nbody\r\n', mode: 'edit' });
  assert.ok(!(await value(page)).includes('aliases'));
  await page.locator('.cm-content').press('Control+End');
  await page.locator('.cm-content').pressSequentially('first');
  await page.evaluate(() => { window.holdWrite = true; });
  await page.locator('[data-editor-action=save]').click();
  await expect.poll(() => page.evaluate(() => typeof window.releaseWrite)).toBe('function');
  await page.locator('.cm-content').pressSequentially(' second');
  await page.evaluate(() => { window.holdWrite = false; window.releaseWrite(); });
  await expect(page.locator('[data-save-state]')).toHaveText('Modified');
  await page.locator('[data-editor-action=save]').click();
  await expect.poll(() => stored(page)).toBe(header + '# New\r\nbody\r\nfirst second');
});

test('save errors keep draft, retry works, and closing and reopening restores it', async t => {
  const page = await mount(t, { text: 'base', mode: 'edit' });
  await page.locator('.cm-content').fill('draft');
  await page.evaluate(() => { window.failWrite = true; });
  await page.locator('[data-editor-action=save]').click();
  await expect(page.locator('[data-save-state]')).toHaveText('Error saving');
  assert.equal(await value(page), 'draft');
  await page.evaluate(async () => {
    window.component.unmount(document.getElementById('root'));
    await new Promise(r => setTimeout(r, 10)); window.mount();
  });
  await expect(page.locator('.cm-content')).toHaveText('draft');
  await page.evaluate(() => { window.failWrite = false; });
  await page.locator('[data-editor-action=save]').click();
  await expect.poll(() => stored(page)).toBe('draft');
});

test('find and replace is literal and one undoable operation', async t => {
  const page = await mount(t, { text: 'a.b a.b other', mode: 'edit' });
  await page.locator('[data-editor-action=find]').click();
  await page.locator('[data-editor-find-query]').fill('a.b');
  await page.locator('[data-editor-replace-value]').fill('new');
  await page.locator('[data-editor-find-action=replace-all]').click();
  assert.equal(await value(page), 'new new other');
  await page.locator('[data-editor-action=undo]').click();
  assert.equal(await value(page), 'a.b a.b other');
});

test('reading renders highlighted code, nested lists and responsive tables', async t => {
  const page = await mount(t, { text: '# Title\n\n- Outer\n  - Inner\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```js\nconst answer = 42;\n```\n\n```unknown\nliteral <code>\n```' });
  await expect(page.locator('.hljs-keyword')).toContainText('const');
  await expect(page.locator('thead')).toBeVisible();
  await expect(page.locator('.de-prose ul ul')).toBeVisible();
  await expect(page.locator('.language-unknown')).toHaveText('literal <code>\n');
  await page.setViewportSize({ width: 600, height: 800 });
  assert.ok(await page.locator('#root').evaluate(e => e.scrollWidth <= e.clientWidth));
});

test('missing and ambiguous note links cannot open an invented or wrong path', async t => {
  const page = await mount(t, { text: '[[Old]] [[Missing]]', files: {
    'Project/Notes/Renamed.md': '<!-- verstak-note-aliases-v1: ["Old"] -->\n# Renamed',
    'Project/Notes/Old.md': '# Different note',
  } });
  await page.locator('[data-note-link=Old]').click();
  await expect(page.locator('.de-message')).toContainText('ambiguous');
  await page.locator('[data-note-link=Missing]').click();
  assert.equal(await page.evaluate(() => window.opened.length), 0);
});

test('secret provider controls link availability and exact target', async t => {
  const page = await mount(t, { text: '[Secret](verstak-secret://account.db)', secrets: true });
  await page.locator('.secret-link').click();
  await expect.poll(() => page.evaluate(() => window.opened[0]?.path)).toBe('account.db');
  const disabled = await mount(t, { text: '[Secret](verstak-secret://account.db)' });
  await expect(disabled.locator('.secret-link')).toHaveCount(0);
  await expect(disabled.locator('[data-preview]')).toContainText('Secret');
});

test('explicitly create a linked note and insert web link over selection', async t => {
  const page = await mount(t, { text: '', mode: 'edit' });
  await page.locator('[data-editor-action=insert-note-link]').click();
  await page.locator('[data-link-query]').fill('New note');
  await page.locator('[data-editor-action=create-linked-note]').click();
  await expect.poll(() => value(page)).toBe('[[New note]]');
  assert.equal(await page.evaluate(() => window.files['Project/Notes/New_note.md']), '# New note');
  await page.locator('.cm-content').press('Control+a');
  await page.locator('[data-editor-action=insert-link]').click();
  await page.locator('.de-dialog select').selectOption('web');
  await page.locator('[data-link-query]').fill('https://example.com');
  await page.locator('[data-editor-action=confirm-link]').click();
  assert.equal(await value(page), '[\\[\\[New note\\]\\]](https://example.com)');
});

test('external change blocks overwrite and unresolved draft survives closing', async t => {
  const page = await mount(t, { text: 'base', mode: 'edit' });
  await page.locator('.cm-content').fill('draft');
  await page.evaluate(() => { window.files[window.props.request.path] = 'external'; });
  await page.locator('[data-editor-action=save]').click();
  await expect(page.locator('.de-message')).toContainText('outside the editor');
  assert.equal(await stored(page), 'external');
  async function reopen() {
    await page.evaluate(async () => { window.component.unmount(document.getElementById('root')); await new Promise(r => setTimeout(r, 20)); window.mount(); });
    await page.locator('.cm-content').waitFor();
  }
  await reopen();
  await expect(page.locator('[data-editor-action=restore-draft]')).toBeVisible();
  await reopen();
  await page.locator('[data-editor-action=restore-draft]').click();
  assert.equal(await value(page), 'draft');
  await page.locator('[data-editor-action=save]').click();
  await expect.poll(() => stored(page)).toBe('draft');
});

test('long note selection and edit scroll survive opening and closing the reading pane', async t => {
  const source = Array.from({ length: 200 }, (_, i) => `Paragraph ${i}`).join('\n\n');
  const page = await mount(t, { text: source, mode: 'edit' });
  await page.locator('.cm-content').press('Control+End');
  await page.locator('.cm-content').press('Shift+Home');
  const selected = await page.evaluate(() => window.getSelection().toString());
  const scroll = await page.locator('.cm-scroller').evaluate(el => el.scrollTop);
  await page.locator('[data-editor-mode-button=preview]').click();
  await edit(page);
  assert.equal(await page.evaluate(() => window.getSelection().toString()), selected);
  await expect.poll(() => page.locator('.cm-scroller').evaluate(el => el.scrollTop)).toBeGreaterThan(scroll - 100);
});
