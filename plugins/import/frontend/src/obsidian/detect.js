function normalize(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '').normalize('NFC');
}

function makeCandidate(root) {
  return { id: `obsidian:${root || '.'}`, format: 'obsidian', root, label: `Obsidian — ${root || '/'}` };
}

export function detectObsidianCandidates(entries) {
  const files = entries.filter((entry) => entry.kind === 'file').map((entry) => normalize(entry.path));
  const roots = new Set();
  for (const file of files) {
    const marker = file.match(/^(?:(.*)\/)?\.obsidian(?:\/|$)/);
    if (marker) roots.add(marker[1] || '');
  }
  if (roots.size === 0) {
    const markdown = files.filter((file) => file.toLowerCase().endsWith('.md') && !file.split('/').some((part) => part.startsWith('.')));
    if (markdown.length > 0) {
      const hasRootMarkdown = markdown.some((file) => !file.includes('/'));
      const wrappers = new Set(markdown.filter((file) => file.includes('/')).map((file) => file.split('/')[0]));
      roots.add(!hasRootMarkdown && wrappers.size === 1 ? [...wrappers][0] : '');
    }
  }
  return [...roots].sort((left, right) => left.localeCompare(right, 'en')).map(makeCandidate);
}
