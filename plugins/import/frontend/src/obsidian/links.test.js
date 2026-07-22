import { describe, expect, it } from 'vitest';
import { buildObsidianIndex, rewriteObsidianMarkdown } from './links.js';

const note = (sourcePath, text) => ({ sourcePath, text });
const asset = (sourcePath) => ({ sourcePath });

describe('Obsidian links', () => {
  it('preserves Markdown features and rewrites links, embeds, headings, and block anchors', () => {
    const notes = [
      note('Readme.md', '---\ntags: [work]\n---'),
      note('Plan.md', '# Next'),
      note('Quoted note.md', 'Quoted'),
    ];
    const assets = [asset('diagram.png'), asset('manual.pdf')];
    const index = buildObsidianIndex(notes, assets);
    const mapping = new Map([
      ['Readme.md', { kind: 'note', targetPath: 'Readme.md' }],
      ['Plan.md', { kind: 'note', targetPath: 'Plan.md' }],
      ['Quoted note.md', { kind: 'note', targetPath: 'Quoted note.md' }],
      ['diagram.png', { kind: 'file', targetPath: 'diagram.png' }],
      ['manual.pdf', { kind: 'file', targetPath: 'manual.pdf' }],
    ]);
    const text = '---\ntags: [work]\n---\n- [ ] Task\n> [!note] Callout\n[[Plan#Next|plan]] ![[diagram.png]] ![[manual.pdf]] ![[Quoted note]]\nBlock ^stable-id';
    const result = rewriteObsidianMarkdown({ sourcePath: 'Readme.md', text, index, mapping });
    expect(result.markdown.startsWith('---\ntags: [work]\n---')).toBe(true);
    expect(result.markdown).toContain('- [ ] Task');
    expect(result.markdown).toContain('> [!note] Callout');
    expect(result.markdown).toContain('[plan](Plan.md#next)');
    expect(result.markdown).toContain('![](../Files/diagram.png)');
    expect(result.markdown).toContain('[manual.pdf](../Files/manual.pdf)');
    expect(result.markdown).toContain('[Quoted note](Quoted%20note.md)');
    expect(result.markdown).toContain('<a id="block-stable-id"></a>\nBlock');
    expect(result.warnings).toEqual([expect.objectContaining({ code: 'obsidian-note-embed-degraded' })]);
  });

  it('uses exact relative paths before aliases and warns on ambiguous basenames', () => {
    const notes = [
      note('A/Plan.md', '---\naliases: [Roadmap]\n---\n# A'),
      note('B/Plan.md', '# B'),
      note('A/Readme.md', ''),
    ];
    const index = buildObsidianIndex(notes, []);
    const mapping = new Map(notes.map((item) => [item.sourcePath, { kind: 'note', targetPath: item.sourcePath }]));
    const result = rewriteObsidianMarkdown({ sourcePath: 'A/Readme.md', text: '[[Plan]] [[Roadmap]] [[B/Plan]]', index, mapping });
    expect(result.markdown).toContain('[Plan](Plan.md)');
    expect(result.markdown).toContain('[Roadmap](Plan.md)');
    expect(result.markdown).toContain('[B/Plan](../B/Plan.md)');
    expect(result.warnings).toEqual([]);

    const ambiguous = rewriteObsidianMarkdown({ sourcePath: 'Root.md', text: '[[Plan]]', index, mapping });
    expect(ambiguous.markdown).toContain('[[Plan]]');
    expect(ambiguous.warnings).toEqual([expect.objectContaining({ code: 'obsidian-ambiguous-link' })]);
  });

  it('does not rewrite fenced or inline code', () => {
    const index = buildObsidianIndex([note('Readme.md', ''), note('Plan.md', '')], []);
    const mapping = new Map([['Readme.md', { kind: 'note', targetPath: 'Readme.md' }], ['Plan.md', { kind: 'note', targetPath: 'Plan.md' }]]);
    const result = rewriteObsidianMarkdown({ sourcePath: 'Readme.md', text: '`[[Plan]]`\n```\n[[Plan]]\n```\n[[Plan]]', index, mapping });
    expect(result.markdown).toBe('`[[Plan]]`\n```\n[[Plan]]\n```\n[Plan](Plan.md)');
  });
});
