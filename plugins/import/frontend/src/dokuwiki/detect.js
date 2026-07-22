function normalize(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '').normalize('NFC');
}

export function detectDokuWikiCandidates(entries) {
  const roots = new Set();
  for (const entry of entries) {
    if (entry.kind !== 'file') continue;
    const match = normalize(entry.path).match(/^(?:(.*)\/)?pages\/[^/].*\.txt$/i);
    if (match) roots.add(match[1] || '');
  }
  return [...roots]
    .sort((left, right) => left.localeCompare(right, 'en'))
    .map((root) => ({
      id: `dokuwiki:${root || '.'}`,
      format: 'dokuwiki',
      root,
      label: `DokuWiki — ${root || '/'}`,
    }));
}
