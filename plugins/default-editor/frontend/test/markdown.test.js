import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown, noteFile } from '../src/markdown.js';

test('nested and duplicate tasks retain exact source offsets; code stays literal', () => {
  const source = '# Heading\n\n- [ ] Same\n  - [x] Same\n\n```md\n- [ ] Not a task\n```\n';
  const result = parseMarkdown(source);
  assert.equal(result.tasks.length, 2);
  assert.deepEqual(result.tasks.map(t => source[t.offset]), [' ', 'x']);
  assert.equal(result.tasks[1].offset, source.indexOf('[x]') + 1);
  for (const task of result.tasks) assert.match(result.html, new RegExp(`data-task-offset="${task.offset}"`));
  assert.ok(!result.html.includes('disabled'));
  assert.match(result.html, /contains-task-list/);
  assert.equal(result.headings[0].from, 0);
});

test('wiki links ignore inline and fenced code and retain escaped titles', () => {
  const result = parseMarkdown('[[A & B]] `[[Literal]]`\n\n~~~md\n[[Also literal]]\n~~~');
  assert.deepEqual(result.links, ['A & B']);
  assert.match(result.html, /data-note-link="A (?:&amp;|&#x26;) B"/);
});

test('GFM renders nested lists, table headers and fenced language names', () => {
  const result = parseMarkdown('- outer\n  - inner\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```c++\n<test>\n```');
  assert.match(result.html, /<thead>/);
  assert.match(result.html, /<ul>[\s\S]*<ul>/);
  assert.match(result.html, /language-c\+\+/);
  assert.match(result.html, /(?:&lt;|&#x3C;)test(?:&gt;|>)/);
});

test('unsafe links and HTML cannot execute, including reference links', () => {
  const result = parseMarkdown('[bad](javascript:alert%281%29)\n\n[ref][x]\n\n[x]: javascript:alert%281%29\n\n<script>alert(1)</script>\n\n![image](data:text/html,bad)');
  assert.ok(!result.html.includes('javascript:'));
  assert.ok(!result.html.includes('<script'));
  assert.ok(!result.html.includes('data:text'));
});

test('unchanged file and metadata are preserved byte-for-byte', () => {
  const source = '<!-- verstak-note-aliases-v1: ["Old"] -->\r\n# New\r\n\r\nbody\r\n';
  const file = noteFile(source);
  assert.equal(file.serialize(file.text), source);
  assert.equal(file.serialize(file.text + 'edit'), source + 'edit');
});
