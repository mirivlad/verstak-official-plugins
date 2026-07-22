import { describe, expect, it, vi } from 'vitest';
import { buildDokuWikiGraph, DOKUWIKI_STOCK_RELEASE, isDokuWikiStockPage } from './adapter.js';

const entry = (path, id = path) => ({ id, path: `site/data/${path}`, kind: 'file', size: 10, modifiedAt: '2026-01-02T03:04:05Z' });

describe('DokuWiki graph adapter', () => {
  it('imports only current pages and media, converts links, and leaves sensitive pages ordinary', async () => {
    const entries = [
      entry('pages/project/start.txt', 'start'),
      entry('pages/project/plan.txt', 'plan'),
      entry('pages/private/passwords.txt', 'passwords'),
      entry('media/media/logo.png', 'logo'),
      entry('attic/project/start.1700000000.txt.gz', 'revision'),
      entry('meta/project/start.meta', 'meta'),
    ];
    const texts = {
      start: '====== Start ======\n[[project:plan|Plan]] {{:media:logo.png|Logo}}',
      plan: '====== Plan ======',
      passwords: 'ordinary page',
    };
    const api = { imports: {
      listEntries: vi.fn().mockResolvedValue({ entries, nextCursor: '', fingerprint: 'fp' }),
      readText: vi.fn((_handle, id) => Promise.resolve(texts[id])),
    } };
    const graph = await buildDokuWikiGraph(api, { sourceHandle: 'h', fingerprint: 'fp', entryCount: entries.length }, { format: 'dokuwiki', root: 'site/data' });
    expect(graph.nodes.map((node) => node.metadata.originalPath)).toEqual([
      'media/media/logo.png',
      'pages/private/passwords.txt',
      'pages/project/plan.txt',
      'pages/project/start.txt',
    ]);
    const start = graph.nodes.find((node) => node.metadata.pageId === 'project:start');
    expect(start.text).toContain('[Plan](plan.md)');
    expect(start.text).toContain('![Logo](../../Files/media/logo.png)');
    expect(start.links).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'page', sourceTarget: 'site/data/pages/project/plan.txt' }),
      expect.objectContaining({ kind: 'media', sourceTarget: 'site/data/media/media/logo.png' }),
    ]));
    expect(graph.nodes.find((node) => node.metadata.pageId === 'private:passwords').role).toBe('note');
    expect(api.imports.readText).not.toHaveBeenCalledWith('h', 'revision');
  });

  it('documents and applies only exact current stock fingerprints', async () => {
    expect(DOKUWIKI_STOCK_RELEASE).toBe('2025-05-14b "Librarian"');
    const fakeHash = async () => '119fe963738dca5dd49fb9c596b0f36335bb7604858bbf24d18bf41e2b8aea85';
    expect(await isDokuWikiStockPage('wiki/dokuwiki.txt', 'stock', fakeHash)).toBe(true);
    expect(await isDokuWikiStockPage('wiki/dokuwiki.txt', 'modified', async () => 'different')).toBe(false);
    expect(await isDokuWikiStockPage('custom/dokuwiki.txt', 'stock', fakeHash)).toBe(false);
  });
});
