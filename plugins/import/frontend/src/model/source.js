import { addGraphNode, createSourceGraph, sortSourceGraph } from './graph.js';

function normalizedPath(entry) {
  return String(entry.path || '').replaceAll('\\', '/').replace(/^\.\//, '').normalize('NFC');
}

function withinRoot(path, root) {
  return !root || path === root || path.startsWith(`${root}/`);
}

function relativeToRoot(path, root) {
  return root ? path.slice(root.length + 1) : path;
}

function candidate(format, root) {
  const normalizedRoot = root.replace(/\/$/, '');
  const title = format === 'dokuwiki' ? 'DokuWiki' : 'Obsidian';
  const shownRoot = normalizedRoot || '/';
  return {
    id: `${format}:${normalizedRoot || '.'}`,
    format,
    root: normalizedRoot,
    label: `${title} — ${shownRoot}`,
  };
}

export async function loadAllEntries(api, session, onProgress = () => {}) {
  const entries = [];
  const seenCursors = new Set();
  let cursor = '';
  do {
    if (seenCursors.has(cursor)) throw new Error('import-entry-cursor-cycle');
    seenCursors.add(cursor);
    const page = await api.imports.listEntries(session.sourceHandle, cursor);
    if (!page || page.fingerprint !== session.fingerprint) throw new Error('source-fingerprint-mismatch');
    entries.push(...(page.entries || []));
    onProgress({ phase: 'indexing', completed: entries.length, total: session.entryCount || entries.length });
    cursor = page.nextCursor || '';
  } while (cursor);
  return entries
    .map((entry) => ({ ...entry, path: normalizedPath(entry) }))
    .sort((left, right) => left.path.localeCompare(right.path, 'en'));
}

export function detectCandidates(entries) {
  const paths = entries.filter((entry) => entry.kind === 'file').map(normalizedPath);
  const result = [];
  const dokuRoots = new Set();
  for (const path of paths) {
    const match = path.match(/^(?:(.*)\/)?pages\/[^/].*\.txt$/i);
    if (match) dokuRoots.add(match[1] || '');
  }
  for (const root of dokuRoots) result.push(candidate('dokuwiki', root));

  const obsidianRoots = new Set();
  for (const path of paths) {
    const marker = path.match(/^(?:(.*)\/)?\.obsidian(?:\/|$)/);
    if (marker) obsidianRoots.add(marker[1] || '');
  }
  if (obsidianRoots.size === 0) {
    const markdown = paths.filter((path) => path.toLowerCase().endsWith('.md') && !path.split('/').some((part) => part.startsWith('.')));
    if (markdown.length > 0) {
      const firstSegments = new Set(markdown.filter((path) => path.includes('/')).map((path) => path.split('/')[0]));
      const hasRootMarkdown = markdown.some((path) => !path.includes('/'));
      obsidianRoots.add(!hasRootMarkdown && firstSegments.size === 1 ? [...firstSegments][0] : '');
    }
  }
  for (const root of obsidianRoots) result.push(candidate('obsidian', root));
  return result.sort((left, right) => left.format.localeCompare(right.format, 'en') || left.root.localeCompare(right.root, 'en'));
}

export async function readCandidate(api, session, selected, onProgress = () => {}) {
  const entries = await loadAllEntries(api, session, onProgress);
  const graph = createSourceGraph(selected.format, selected.root);
  const relevant = entries.filter((entry) => entry.kind === 'file' && withinRoot(entry.path, selected.root));
  for (let index = 0; index < relevant.length; index += 1) {
    const entry = relevant[index];
    const relative = relativeToRoot(entry.path, selected.root);
    if (selected.format === 'obsidian' && (relative === '.obsidian' || relative.startsWith('.obsidian/'))) continue;
    const isText = selected.format === 'dokuwiki' ? /^pages\/.+\.txt$/i.test(relative) : relative.toLowerCase().endsWith('.md');
    const text = isText ? await api.imports.readText(session.sourceHandle, entry.id) : undefined;
    addGraphNode(graph, {
      entryId: entry.id,
      path: relative,
      sourcePath: entry.path,
      role: isText ? 'note' : 'asset',
      size: entry.size,
      modifiedAt: entry.modifiedAt,
      text,
    });
    onProgress({ phase: 'analyzing', completed: index + 1, total: relevant.length });
  }
  return sortSourceGraph(graph);
}
