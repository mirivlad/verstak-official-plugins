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
    window.writes = []; window.moves = []; window.binaryFiles = {}; window.opened = []; window.drafts = {}; window.failWrite = false; window.holdWrite = false;
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
        createFolder: async () => {},
        move: async (from, to, options) => {
          if (!(from in window.files)) throw new Error('not found');
          if (to in window.files && !options?.overwrite) throw new Error('conflict');
          window.files[to] = window.files[from];
          delete window.files[from];
          window.moves.push({ from, to });
        },
        readBytes: async path => {
          if (!(path in window.binaryFiles)) throw new Error('not-found');
          const dataBase64 = window.binaryFiles[path];
          return { dataBase64, size: atob(dataBase64).length, mimeHint: 'image/png' };
        },
        writeBytes: async (path, base64, options) => {
          if (!options.overwrite && path in window.binaryFiles) throw new Error('already exists');
          if (window.failWrite) throw new Error('write failed');
          window.binaryFiles[path] = base64;
        },
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

test('editor toolbars use icon-only controls with accessible localized tooltips', async t => {
  const page = await mount(t, { text: 'Text', mode: 'edit' });
  const controls = page.locator('.de-toolbar .de-icon-button, .de-md-toolbar .de-icon-button');
  assert.ok(await controls.count() >= 15);
  for (const control of await controls.all()) {
    await expect(control.locator('svg.de-icon')).toHaveCount(1);
    const label = await control.getAttribute('aria-label');
    const title = await control.getAttribute('title');
    assert.ok(label?.trim());
    assert.ok(title?.includes(label));
    assert.equal((await control.textContent()).trim(), '');
  }
  await expect(page.locator('[data-editor-action=save]')).toHaveAttribute('title', /Ctrl\+S/);
  await expect(page.locator('[data-editor-action=find]')).toHaveAttribute('title', /Ctrl\+F/);
  await expect(page.locator('[data-md-action=bold]')).toHaveAttribute('title', /Ctrl\+B/);
  await expect(page.locator('[data-editor-action=insert-link]')).toHaveAttribute('title', /Ctrl\+K/);
});

test('narrow editor keeps both toolbars in single scrollable rows', async t => {
  const page = await mount(t, { text: 'Narrow viewport', mode: 'edit' });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 620 });
    const result = await page.evaluate(() => {
      const root = document.querySelector('.de-root');
      const toolbar = root.querySelector('.de-toolbar');
      const actions = root.querySelector('.de-toolbar-actions');
      const formatting = root.querySelector('.de-md-toolbar');
      const upper = [...actions.querySelectorAll('.de-icon-button')];
      const lower = [...formatting.querySelectorAll('.de-icon-button')].filter(control => control.getClientRects().length);
      const ySpread = nodes => Math.max(...nodes.map(e => e.getBoundingClientRect().top)) - Math.min(...nodes.map(e => e.getBoundingClientRect().top));
      return {
        overflow: root.scrollWidth > root.clientWidth,
        actionScroll: actions.scrollWidth > actions.clientWidth,
        formatScroll: formatting.scrollWidth > formatting.clientWidth,
        upperRows: ySpread(upper),
        lowerRows: ySpread(lower),
        toolbarHeight: toolbar.getBoundingClientRect().height,
        formatHeight: formatting.getBoundingClientRect().height,
      };
    });
    assert.equal(result.overflow, false, `root overflow at ${width}px`);
    assert.equal(result.actionScroll, true);
    assert.equal(result.formatScroll, true);
    assert.ok(result.upperRows < 2);
    assert.ok(result.lowerRows < 2);
    assert.ok(result.toolbarHeight < 100);
    assert.ok(result.formatHeight < 60);
  }
});

test('dropping image and file writes vault attachments without overwriting names', async t => {
  const page = await mount(t, { text: 'Base', mode: 'edit' });
  await page.evaluate(async () => {
    const target = document.querySelector('.cm-content');
    const makeFile = (name, type) => new File([new Uint8Array([1, 2, 3])], name, { type });
    const drop = file => {
      const event = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', { value: { files: [file] } });
      target.dispatchEvent(event);
    };
    drop(makeFile('photo.png', 'image/png'));
  });
  await expect.poll(() => page.evaluate(() => Object.keys(window.binaryFiles).length)).toBe(1);
  await expect(page.locator('.cm-content')).toContainText('![photo.png](attachments/photo.png)');
  await page.evaluate(() => {
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files: [new File(['more'], 'photo.png', { type: 'image/png' })] } });
    document.querySelector('.cm-content').dispatchEvent(event);
  });
  await expect.poll(() => page.evaluate(() => Object.keys(window.binaryFiles).length)).toBe(2);
  await expect(page.locator('.cm-content')).toContainText('![photo-1.png](attachments/photo-1.png)');
  await page.locator('[data-editor-mode-button=preview]').click();
  await expect(page.locator('[data-preview] img')).toHaveCount(2);
  await expect.poll(() => page.locator('[data-preview] img').first().getAttribute('src')).toMatch(/^data:image\/png;base64,/);
  await page.locator('[data-editor-mode-button=edit]').click();
  await page.evaluate(() => { window.failWrite = true; });
  await page.evaluate(() => {
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files: [new File(['no'], 'failed.txt', { type: 'text/plain' })] } });
    document.querySelector('.cm-content').dispatchEvent(event);
  });
  await expect(page.locator('.de-message')).toContainText('Could not attach the file');
  await expect(page.locator('.cm-content')).not.toContainText('failed.txt');
});

test('pasted clipboard image becomes a vault attachment instead of raw content', async t => {
  const page = await mount(t, { text: 'Hello', mode: 'edit' });
  const prevented = await page.evaluate(() => {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { files: [new File(['image-bytes'], 'paste.png', { type: 'image/png' })] } });
    document.querySelector('.cm-content').dispatchEvent(event);
    return event.defaultPrevented;
  });
  assert.equal(prevented, true);
  await expect.poll(() => page.evaluate(() => Object.keys(window.binaryFiles).length)).toBe(1);
  await expect(page.locator('.cm-content')).toContainText('![paste.png](attachments/paste.png)');
  await expect(page.locator('.cm-content')).not.toContainText('image-bytes');
});

test('file picker attaches document and preview opens it inside Verstak', async t => {
  const page = await mount(t, { text: 'Text', mode: 'edit' });
  await expect(page.locator('[data-editor-action=attach-file]')).toHaveAttribute('aria-label', 'Attach file or image');
  await page.locator('[data-attachment-input]').setInputFiles({ name: 'report.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await expect.poll(() => page.evaluate(() => Object.keys(window.binaryFiles).length)).toBe(1);
  await expect(page.locator('.cm-content')).toContainText('[report.txt](attachments/report.txt)');
  await page.locator('[data-editor-mode-button=preview]').click();
  await page.locator('[data-preview] a[href="attachments/report.txt"]').click();
  await expect.poll(() => page.evaluate(() => window.opened[0]?.path)).toBe('Project/Notes/attachments/report.txt');
});

test('Ctrl+K edits existing web and note links without nesting them', async t => {
  const page = await mount(t, { mode: 'edit', text: 'Look [Example](https://old.test) and [[Old Note]]', files: {
    'Project/Notes/Old_Note.md': '# Old Note',
    'Project/Notes/New_Note.md': '# New Note',
  } });
  const input = page.locator('.cm-content');
  await input.click();
  await input.press('Control+Home');
  for (let i = 0; i < 12; i++) await input.press('ArrowRight');
  await input.press('Control+k');
  await expect(page.locator('.de-dialog h2')).toHaveText('Edit link');
  await expect(page.locator('[data-link-query]')).toHaveValue('https://old.test');
  await page.locator('[data-link-query]').fill('https://new.test');
  await page.locator('[data-editor-action=confirm-link]').click();
  assert.equal(await value(page), 'Look [Example](https://new.test) and [[Old Note]]');
  await input.click();
  await input.press('Control+End');
  await input.press('ArrowLeft');
  await input.press('Control+k');
  await expect(page.locator('[data-link-query]')).toHaveValue('Old Note');
  await page.locator('[data-link-query]').fill('New Note');
  await page.locator('[data-editor-action=confirm-link]').click();
  assert.equal(await value(page), 'Look [Example](https://new.test) and [[New Note]]');
  await input.press('Control+z');
  assert.equal(await value(page), 'Look [Example](https://new.test) and [[Old Note]]');
});

test('note hotkeys save, switch editing modes and rename with backlinks intact', async t => {
  const page = await mount(t, { text: '# Heading\n\nFirst', mode: 'edit', path: 'Project/Notes/Old_Note.md' });
  const content = page.locator('.cm-content');
  await content.click();
  await content.press('Control+End');
  await page.keyboard.type(' changed');
  await content.press('Control+s');
  await expect.poll(() => page.evaluate(() => window.files['Project/Notes/Old_Note.md'])).toBe('# Heading\n\nFirst changed');
  await content.press('Control+e');
  await expect(page.locator('.de-content')).toHaveAttribute('data-mode', 'preview');
  await page.locator('[data-preview]').focus();
  await page.keyboard.press('Control+Shift+e');
  await expect(page.locator('.de-content')).toHaveAttribute('data-mode', 'split');
  await page.locator('.cm-content').press('F2');
  await expect(page.locator('.de-dialog h2')).toHaveText('Rename note');
  await expect(page.locator('[data-rename-input]')).toHaveValue('Old Note');
  await page.locator('[data-rename-input]').fill('New Note');
  await page.locator('[data-editor-action=confirm-rename]').click();
  await expect.poll(() => page.evaluate(() => window.opened.at(-1)?.path)).toBe('Project/Notes/New_Note.md');
  assert.equal(await page.evaluate(() => window.files['Project/Notes/Old_Note.md']), undefined);
  const newContent = await page.evaluate(() => window.files['Project/Notes/New_Note.md']);
  assert.match(newContent, /verstak-note-aliases-v1: \["Old Note"\]/);
  assert.ok(newContent.includes('# Heading\n\nFirst changed'));
  await expect(page.locator('.de-toolbar-context')).toHaveText('Project/Notes/New_Note.md');
  await expect(page.locator('[data-editor-action=rename]')).toHaveAttribute('title', /F2/);
  await expect(page.locator('[data-editor-mode-button=edit]')).toHaveAttribute('title', /Ctrl\+E/);
  await page.evaluate(() => {
    window.component.unmount(document.getElementById('root'));
    window.files['Project/Notes/Referrer.md'] = '[[Old Note]]';
    window.props.request = { ...window.props.request, path: 'Project/Notes/Referrer.md', mode: 'view' };
    window.mount();
  });
  await page.locator('[data-preview] [data-note-link="Old Note"]').click();
  await expect.poll(() => page.evaluate(() => window.opened.at(-1)?.path)).toBe('Project/Notes/New_Note.md');
});

test('F2 rename handles conflicts and refuses to discard unsaved edits', async t => {
  const page = await mount(t, { text: 'Old content', mode: 'edit', path: 'Project/Notes/Old.md',
    files: { 'Project/Notes/Taken.md': 'Existing content' } });
  const content = page.locator('.cm-content');
  await content.focus();
  await content.press('F2');
  await page.locator('[data-rename-input]').fill('Taken');
  await page.locator('[data-editor-action=confirm-rename]').click();
  await expect(page.locator('.de-rename-error')).toContainText('already exists');
  assert.equal(await page.evaluate(() => window.files['Project/Notes/Taken.md']), 'Existing content');
  await page.locator('[data-editor-action=cancel-rename]').click();
  await content.click();
  await content.press('Control+End');
  await page.keyboard.type(' changed');
  await page.evaluate(() => { window.failWrite = true; });
  await content.press('F2');
  await page.locator('[data-rename-input]').fill('Renamed');
  await page.locator('[data-editor-action=confirm-rename]').click();
  await expect(page.locator('.de-rename-error')).toContainText('Save');
  assert.equal(await page.evaluate(() => window.moves.length), 0);
  assert.equal(await page.evaluate(() => window.files['Project/Notes/Old.md']), 'Old content');
});

test('markdown selection toolbar formats text and paired brackets wrap selection', async t => {
  const page = await mount(t, { text: 'alpha beta', mode: 'edit' });
  const input = page.locator('.cm-content');
  await input.click();
  await input.press('Control+Home');
  for (let i = 0; i < 6; i++) await input.press('ArrowRight');
  for (let i = 0; i < 4; i++) await input.press('Shift+ArrowRight');
  await expect(page.locator('.de-selection-actions')).toBeVisible();
  await page.locator('[data-editor-action=selection-bold]').click();
  assert.equal(await value(page), 'alpha **beta**');
  await input.press('Control+a');
  await page.keyboard.type('(');
  assert.equal(await value(page), '(alpha **beta**)');
  await input.press('Control+a');
  await page.keyboard.type('"');
  assert.equal(await value(page), '"(alpha **beta**)"');
});

test('keyboard shortcut reference is available in editing and reading', async t => {
  const page = await mount(t, { text: 'Text', mode: 'edit' });
  await page.locator('[data-editor-action=shortcuts]').click();
  await expect(page.locator('.de-dialog')).toContainText('Ctrl+S');
  await expect(page.locator('.de-dialog')).toContainText('F2');
  await expect(page.locator('.de-dialog')).toContainText('Ctrl+Shift+E');
  await page.keyboard.press('Escape');
  await expect(page.locator('.de-dialog')).toHaveCount(0);
  await page.locator('[data-editor-mode-button=preview]').click();
  await page.locator('[data-editor-action=shortcuts]').click();
  await expect(page.locator('.de-dialog')).toContainText('Ctrl+K');
  await page.locator('[data-editor-action=close-shortcuts]').click();
});

test('markdown list keyboard shortcuts format the selected line', async t => {
  const page = await mount(t, { text: 'One', mode: 'edit' });
  const input = page.locator('.cm-content');
  await input.click();
  await input.press('Control+Home');
  await input.press('Control+Shift+8');
  assert.equal(await value(page), '- One');
  await input.press('Control+Shift+9');
  assert.equal(await value(page), '- [ ] One');
  await input.press('Control+Shift+7');
  assert.equal(await value(page), '1. One');
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
