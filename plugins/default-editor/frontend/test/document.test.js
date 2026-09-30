import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../src/document.js';

test('formatting and task changes share undo and redo even without a view', () => {
  const doc = createDocument({ text: 'hello\n- [ ] task' });
  doc.select(0, 5);
  doc.format('bold');
  assert.equal(doc.text, '**hello**\n- [ ] task');
  assert.equal(doc.active('bold'), true);
  const offset = doc.text.indexOf('[ ]') + 1;
  doc.change({ from: offset, to: offset + 1, insert: 'x' });
  doc.undo();
  assert.equal(doc.text, '**hello**\n- [ ] task');
  doc.undo();
  assert.equal(doc.text, 'hello\n- [ ] task');
  doc.redo();
  doc.redo();
  assert.equal(doc.text, '**hello**\n- [x] task');
});

test('formatting toggles off and returns selection to the original text', () => {
  const doc = createDocument({ text: 'start word end' });
  doc.select(6, 10);
  doc.format('italic');
  doc.format('italic');
  assert.equal(doc.text, 'start word end');
  assert.deepEqual([doc.selection.from, doc.selection.to], [6, 10]);
});

test('list commands replace list type and toggle entire selected block', () => {
  const doc = createDocument({ text: '- first\n- second\nlast' });
  doc.select(0, 16);
  doc.format('task');
  assert.equal(doc.text, '- [ ] first\n- [ ] second\nlast');
  doc.format('task');
  assert.equal(doc.text, 'first\nsecond\nlast');
  doc.undo();
  assert.equal(doc.text, '- [ ] first\n- [ ] second\nlast');
});

test('inserted link is one undoable action and preserves following text', () => {
  const doc = createDocument({ text: 'before after' });
  doc.select(7);
  doc.replaceSelection('[[Another note]] ');
  assert.equal(doc.text, 'before [[Another note]] after');
  doc.undo();
  assert.equal(doc.text, 'before after');
});

test('italic can be added to and removed from bold without removing bold', () => {
  const doc = createDocument({ text: 'word' });
  doc.select(0, 4);
  doc.format('bold');
  assert.equal(doc.active('italic'), false);
  doc.format('italic');
  assert.equal(doc.text, '***word***');
  assert.equal(doc.active('italic'), true);
  doc.format('italic');
  assert.equal(doc.text, '**word**');
  assert.equal(doc.active('bold'), true);
});
