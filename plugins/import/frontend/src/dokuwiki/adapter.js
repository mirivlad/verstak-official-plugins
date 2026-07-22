import { addGraphNode, createSourceGraph, sortSourceGraph } from '../model/graph.js';
import { loadAllEntries } from '../model/source.js';
import { convertDokuWikiPage } from './convert.js';

export const DOKUWIKI_STOCK_RELEASE = '2025-05-14b "Librarian"';

// Exact bytes from the official release-2025-05-14b tag. Path and digest must
// both match; edited or custom wiki namespace pages are always retained.
export const DOKUWIKI_STOCK_PAGES = Object.freeze({
  'wiki/dokuwiki.txt': '119fe963738dca5dd49fb9c596b0f36335bb7604858bbf24d18bf41e2b8aea85',
  'wiki/syntax.txt': '6bad6fcc84a196a28b32cd381dde5c127a8f13356875a8cbf10f690282463a6b',
  'wiki/welcome.txt': 'aca435aadfe0c8732b78a151c27d67cffa67a954765b0cba7fb8ab78d40519a7',
});

function pathJoin(...values) {
  return values.filter(Boolean).join('/').replace(/\/+/g, '/');
}

function pathDirname(value) {
  const index = value.lastIndexOf('/');
  return index === -1 ? '.' : value.slice(0, index) || '/';
}

function pathBasename(value) {
  return value.slice(value.lastIndexOf('/') + 1);
}

function pathExtension(value) {
  const base = pathBasename(value);
  const index = base.lastIndexOf('.');
  return index <= 0 ? '' : base.slice(index);
}

function pathRelative(from, to) {
  const fromParts = from.split('/').filter(Boolean);
  const toParts = to.split('/').filter(Boolean);
  while (fromParts.length && toParts.length && fromParts[0] === toParts[0]) {
    fromParts.shift();
    toParts.shift();
  }
  return [...Array(fromParts.length).fill('..'), ...toParts].join('/');
}

async function sha256Hex(text) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export async function isDokuWikiStockPage(relativePath, text, hash = sha256Hex) {
  const expected = DOKUWIKI_STOCK_PAGES[relativePath];
  return !!expected && await hash(text) === expected;
}

function decodeSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function sanitizeSegment(value) {
  let result = decodeSegment(value).replaceAll('_', ' ').normalize('NFC');
  result = result.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[ .]+$/g, '').trim();
  if (!result || result === '.' || result === '..') result = 'Без названия';
  if (result.startsWith('.') || result.toLowerCase() === '.verstak') result = `_${result.slice(1)}`;
  return result;
}

function sanitizeRelativePath(relativePath, extension) {
  const segments = relativePath.split('/').map(sanitizeSegment);
  if (extension) segments[segments.length - 1] = segments.at(-1).replace(/\.txt$/i, extension);
  return segments.join('/');
}

function pageIdFromPath(relativePath) {
  return relativePath.replace(/\.txt$/i, '').split('/').map(decodeSegment).join(':').normalize('NFC');
}

function allocatePageTargets(pages) {
  const used = new Set();
  const targets = new Map();
  for (const page of [...pages].sort((left, right) => left.pageId.localeCompare(right.pageId, 'en'))) {
    const initial = sanitizeRelativePath(page.relativePath, '.md');
    let candidate = initial;
    let suffix = 2;
    const namespace = page.pageId.split(':').slice(0, -1).join(' — ') || 'root';
    while (used.has(candidate.toLocaleLowerCase('en').normalize('NFC'))) {
      const extension = pathExtension(initial);
      const stem = initial.slice(0, -extension.length);
      candidate = `${stem} — ${sanitizeSegment(namespace)}${suffix > 2 ? ` (${suffix})` : ''}${extension}`;
      suffix += 1;
    }
    used.add(candidate.toLocaleLowerCase('en').normalize('NFC'));
    targets.set(page.pageId.toLocaleLowerCase('en'), candidate);
  }
  return targets;
}

function resolveNamespacedId(raw, currentPageId) {
  const target = raw.trim().split('#')[0];
  if (!target) return currentPageId;
  const namespace = currentPageId.split(':').slice(0, -1);
  if (target.startsWith(':')) return target.slice(1);
  if (target.startsWith('..:')) {
    const parts = [...namespace];
    let remainder = target;
    while (remainder.startsWith('..:')) {
      parts.pop();
      remainder = remainder.slice(3);
    }
    return [...parts, remainder].filter(Boolean).join(':');
  }
  if (target.startsWith('.:')) return [...namespace, target.slice(2)].filter(Boolean).join(':');
  if (target.includes(':')) return target;
  return [...namespace, target].filter(Boolean).join(':');
}

function anchorFromRaw(raw) {
  const index = raw.indexOf('#');
  if (index === -1) return '';
  const anchor = decodeSegment(raw.slice(index + 1)).toLocaleLowerCase('en').replace(/[\s_]+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '');
  return anchor ? `#${anchor}` : '';
}

function encodeRelative(relative) {
  return relative.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function relativeLink(fromNotePath, targetPath, area) {
  const from = pathDirname(pathJoin('Notes', fromNotePath));
  const target = pathJoin(area, targetPath);
  return encodeRelative(pathRelative(from, target) || pathBasename(target));
}

export async function buildDokuWikiGraph(api, session, candidate, onProgress = () => {}) {
  const entries = await loadAllEntries(api, session, onProgress);
  const rootPrefix = candidate.root ? `${candidate.root}/` : '';
  const pagesPrefix = `${rootPrefix}pages/`;
  const mediaPrefix = `${rootPrefix}media/`;
  const pages = entries
    .filter((entry) => entry.kind === 'file' && entry.path.startsWith(pagesPrefix) && entry.path.toLowerCase().endsWith('.txt'))
    .map((entry) => ({ entry, relativePath: entry.path.slice(pagesPrefix.length), pageId: pageIdFromPath(entry.path.slice(pagesPrefix.length)) }))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath, 'en'));
  const media = entries
    .filter((entry) => entry.kind === 'file' && entry.path.startsWith(mediaPrefix))
    .map((entry) => ({ entry, relativePath: entry.path.slice(mediaPrefix.length) }))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath, 'en'));

  const pageTexts = new Map();
  const importedPages = [];
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const text = await api.imports.readText(session.sourceHandle, page.entry.id);
    if (!await isDokuWikiStockPage(page.relativePath, text)) {
      pageTexts.set(page.pageId.toLocaleLowerCase('en'), text);
      importedPages.push(page);
    }
    onProgress({ phase: 'analyzing', completed: index + 1, total: pages.length + media.length });
  }

  const pageTargets = allocatePageTargets(importedPages);
  const mediaTargets = new Map(media.map((item) => [pageIdFromPath(item.relativePath).toLocaleLowerCase('en'), sanitizeRelativePath(item.relativePath, '')]));
  const pageSources = new Map(importedPages.map((item) => [item.pageId.toLocaleLowerCase('en'), item.entry.path]));
  const mediaSources = new Map(media.map((item) => [pageIdFromPath(item.relativePath).toLocaleLowerCase('en'), item.entry.path]));
  const graph = createSourceGraph('dokuwiki', candidate.root);
  graph.sourceHandle = session.sourceHandle;
  graph.sourceFingerprint = session.fingerprint;
  graph.stockRelease = DOKUWIKI_STOCK_RELEASE;

  for (const item of media) {
    addGraphNode(graph, {
      entryId: item.entry.id,
      path: sanitizeRelativePath(item.relativePath, ''),
      sourcePath: item.entry.path,
      role: 'asset',
      size: item.entry.size,
      modifiedAt: item.entry.modifiedAt,
      metadata: { originalPath: `media/${item.relativePath}`, mediaId: pageIdFromPath(item.relativePath) },
    });
  }

  for (const page of importedPages) {
    const targetPath = pageTargets.get(page.pageId.toLocaleLowerCase('en'));
    const resolvePage = (raw) => {
      const id = resolveNamespacedId(raw, page.pageId).toLocaleLowerCase('en');
      const target = pageTargets.get(id);
      return target ? relativeLink(targetPath, target, 'Notes') + anchorFromRaw(raw) : null;
    };
    const resolveMedia = (raw) => {
      const id = resolveNamespacedId(raw, page.pageId).toLocaleLowerCase('en');
      const target = mediaTargets.get(id);
      return target ? relativeLink(targetPath, target, 'Files') : null;
    };
    const converted = convertDokuWikiPage({ pageId: page.pageId, text: pageTexts.get(page.pageId.toLocaleLowerCase('en')), resolvePage, resolveMedia });
    const links = converted.links.map((link) => {
      if (link.kind === 'page') {
        return { ...link, sourceTarget: pageSources.get(resolveNamespacedId(link.raw, page.pageId).toLocaleLowerCase('en')) };
      }
      if (link.kind === 'media') {
        return { ...link, sourceTarget: mediaSources.get(resolveNamespacedId(link.raw, page.pageId).toLocaleLowerCase('en')) };
      }
      return link;
    });
    const node = addGraphNode(graph, {
      entryId: page.entry.id,
      path: targetPath,
      sourcePath: page.entry.path,
      role: 'note',
      size: page.entry.size,
      modifiedAt: page.entry.modifiedAt,
      text: converted.markdown,
      links,
      warnings: converted.warnings,
      metadata: { originalPath: `pages/${page.relativePath}`, pageId: page.pageId },
    });
    graph.links.push(...links.map((link) => ({ ...link, from: node.id })));
    graph.warnings.push(...converted.warnings.map((item) => ({ ...item, nodeId: node.id })));
  }
  return sortSourceGraph(graph);
}
