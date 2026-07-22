import { describe, expect, it } from 'vitest';
import { convertDokuWikiPage } from './convert.js';

describe('DokuWiki Markdown conversion', () => {
  it('converts headings, formatting, links and media while preserving plugin syntax', () => {
    const result = convertDokuWikiPage({
      pageId: 'project:start',
      text: "====== Project ======\n**bold** //italic// __under__ ''mono''\n[[project:plan#next|Plan]] {{:media:logo.png?200x100|Logo}}\n<WRAP box>Keep me</WRAP>",
      resolvePage: () => '../Plan.md#next',
      resolveMedia: () => '../../Files/media/logo.png',
    });
    expect(result.markdown).toContain('# Project');
    expect(result.markdown).toContain('**bold** *italic* <u>under</u> `mono`');
    expect(result.markdown).toContain('[Plan](../Plan.md#next)');
    expect(result.markdown).toContain('![Logo](../../Files/media/logo.png)');
    expect(result.markdown).toContain('DokuWiki size: 200x100');
    expect(result.markdown).toContain('<WRAP box>Keep me</WRAP>');
    expect(result.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'dokuwiki-unsupported-syntax' })]));
  });

  it('converts lists, quotes, tables, rules and protected blocks', () => {
    const result = convertDokuWikiPage({
      pageId: 'start',
      text: "  * One\n    - Two\n> Quote\n----\n^ Name ^ Value ^\n| A | B |\n<code js>\nconst x = **raw**;\n</code>\n<file>plain</file>\n<nowiki>**literal**</nowiki>",
    });
    expect(result.markdown).toContain('- One\n  1. Two');
    expect(result.markdown).toContain('> Quote\n---');
    expect(result.markdown).toContain('| Name | Value |\n| --- | --- |\n| A | B |');
    expect(result.markdown).toContain('```js\nconst x = **raw**;\n```');
    expect(result.markdown).toContain('```text\nplain\n```');
    expect(result.markdown).toContain('`**literal**`');
  });

  it('preserves unresolved and interwiki links with warnings', () => {
    const result = convertDokuWikiPage({ pageId: 'start', text: '[[missing|Missing]] [[wp>Tree|Tree]]', resolvePage: () => null });
    expect(result.markdown).toContain('[[missing|Missing]]');
    expect(result.markdown).toContain('[[wp>Tree|Tree]]');
    expect(result.warnings.map((warning) => warning.code)).toEqual(['dokuwiki-missing-page', 'dokuwiki-interwiki-link']);
  });
});
