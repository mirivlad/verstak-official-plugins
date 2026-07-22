import { describe, expect, it, vi } from 'vitest';
import { buildObsidianGraph } from './adapter.js';

const entry = (path, id = path) => ({ id, path: `Vault/${path}`, kind: 'file', size: 10, modifiedAt: '2026-01-02T03:04:05Z' });

describe('Obsidian graph adapter', () => {
  it('omits .obsidian, keeps nested archives as files, and rewrites note links', async () => {
    const entries = [
      entry('.obsidian/app.json', 'settings'),
      entry('Projects/Readme.md', 'readme'),
      entry('Projects/Plan.md', 'plan'),
      entry('Projects/diagram.png', 'diagram'),
      entry('Projects/backup.zip', 'archive'),
    ];
    const texts = { readme: '[[Plan]] ![[diagram.png]]', plan: '# Plan' };
    const api = { imports: {
      listEntries: vi.fn().mockResolvedValue({ entries, nextCursor: '', fingerprint: 'fp' }),
      readText: vi.fn((_handle, id) => Promise.resolve(texts[id])),
    } };
    const graph = await buildObsidianGraph(api, { sourceHandle: 'h', fingerprint: 'fp', entryCount: entries.length }, { format: 'obsidian', root: 'Vault' });
    expect(graph.nodes.map((node) => node.metadata.originalPath)).toEqual([
      'Projects/backup.zip',
      'Projects/diagram.png',
      'Projects/Plan.md',
      'Projects/Readme.md',
    ]);
    expect(graph.nodes.find((node) => node.metadata.originalPath === 'Projects/backup.zip').role).toBe('asset');
    const readme = graph.nodes.find((node) => node.metadata.originalPath === 'Projects/Readme.md');
    expect(readme.text).toContain('[Plan](Plan.md)');
    expect(readme.links).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'note', sourceTarget: 'Vault/Projects/Plan.md' }),
      expect.objectContaining({ kind: 'file', sourceTarget: 'Vault/Projects/diagram.png' }),
    ]));
    expect(api.imports.readText).not.toHaveBeenCalledWith('h', 'settings');
  });
});
