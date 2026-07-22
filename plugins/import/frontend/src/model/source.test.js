import { describe, expect, it, vi } from 'vitest';
import { stableGraphId } from './graph.js';
import { detectCandidates, loadAllEntries, readCandidate } from './source.js';

const file = (path, id = path) => ({ id, path, kind: 'file', size: 1, modifiedAt: '', mediaHint: '' });

describe('source inventory', () => {
  it('loads every page and returns stable path order', async () => {
    const listEntries = vi.fn()
      .mockResolvedValueOnce({ entries: [file('z.md')], nextCursor: '1', fingerprint: 'fp' })
      .mockResolvedValueOnce({ entries: [file('a.md')], nextCursor: '', fingerprint: 'fp' });
    const progress = [];
    const entries = await loadAllEntries({ imports: { listEntries } }, { sourceHandle: 'h', fingerprint: 'fp', entryCount: 2 }, (item) => progress.push(item.completed));
    expect(entries.map((entry) => entry.path)).toEqual(['a.md', 'z.md']);
    expect(listEntries).toHaveBeenNthCalledWith(2, 'h', '1');
    expect(progress).toEqual([1, 2]);
  });

  it('detects wrapped and direct current data roots deterministically', () => {
    const entries = [
      file('wiki/html/data/pages/start.txt'),
      file('wiki/html/data/media/logo.png'),
      file('Notes/.obsidian/app.json'),
      file('Notes/Start.md'),
    ];
    expect(detectCandidates(entries)).toEqual([
      { id: 'dokuwiki:wiki/html/data', format: 'dokuwiki', root: 'wiki/html/data', label: 'DokuWiki — wiki/html/data' },
      { id: 'obsidian:Notes', format: 'obsidian', root: 'Notes', label: 'Obsidian — Notes' },
    ]);
    expect(detectCandidates([file('pages/start.txt')])[0]).toEqual({ id: 'dokuwiki:.', format: 'dokuwiki', root: '', label: 'DokuWiki — /' });
  });

  it('detects a one-wrapper Markdown vault without service settings', () => {
    expect(detectCandidates([file('Vault/Start.md'), file('Vault/Folder/Plan.md')])).toEqual([
      { id: 'obsidian:Vault', format: 'obsidian', root: 'Vault', label: 'Obsidian — Vault' },
    ]);
  });

  it('builds a content-free binary graph with deterministic IDs', async () => {
    const entries = [file('Vault/.obsidian/app.json'), file('Vault/Start.md', 'note'), file('Vault/archive.zip', 'archive')];
    const api = { imports: {
      listEntries: vi.fn().mockResolvedValue({ entries, nextCursor: '', fingerprint: 'fp' }),
      readText: vi.fn().mockResolvedValue('# Start'),
    } };
    const graph = await readCandidate(api, { sourceHandle: 'h', fingerprint: 'fp', entryCount: 3 }, detectCandidates(entries)[0]);
    expect(graph.nodes.map((node) => node.path)).toEqual(['archive.zip', 'Start.md']);
    expect(graph.nodes[0]).not.toHaveProperty('text');
    expect(graph.nodes[1].text).toBe('# Start');
    expect(graph.nodes[1].id).toBe(stableGraphId('obsidian', 'Vault/Start.md'));
  });
});
