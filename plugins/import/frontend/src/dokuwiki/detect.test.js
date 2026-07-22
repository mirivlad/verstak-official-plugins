import { describe, expect, it } from 'vitest';
import { detectDokuWikiCandidates } from './detect.js';

const file = (path) => ({ id: path, path, kind: 'file', size: 1 });

describe('DokuWiki detection', () => {
  it('finds current data roots and ignores revision-only trees', () => {
    expect(detectDokuWikiCandidates([
      file('site/data/attic/old.1700000000.txt.gz'),
      file('site/data/meta/start.meta'),
      file('site/data/pages/start.txt'),
      file('site/data/pages/project/plan.txt'),
      file('site/data/media/logo.png'),
    ])).toEqual([
      { id: 'dokuwiki:site/data', format: 'dokuwiki', root: 'site/data', label: 'DokuWiki — site/data' },
    ]);
  });

  it('returns multiple explicit candidates in stable order', () => {
    expect(detectDokuWikiCandidates([file('b/pages/start.txt'), file('a/pages/start.txt')]).map((item) => item.root)).toEqual(['a', 'b']);
  });
});
