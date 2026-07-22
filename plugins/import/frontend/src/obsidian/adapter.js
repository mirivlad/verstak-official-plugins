import { addGraphNode, createSourceGraph, sortSourceGraph } from '../model/graph.js';
import { loadAllEntries } from '../model/source.js';
import { buildObsidianIndex, rewriteObsidianMarkdown } from './links.js';

function sanitizeSegment(value) {
  let result = value.normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[ .]+$/g, '').trim();
  if (!result || result === '.' || result === '..') result = 'Untitled';
  if (result.toLowerCase() === '.verstak') result = '_verstak';
  return result;
}

function sanitizePath(value) {
  return value.split('/').map(sanitizeSegment).join('/');
}

function allocateTargets(items) {
  const result = new Map();
  const used = new Set();
  for (const item of [...items].sort((left, right) => left.relativePath.localeCompare(right.relativePath, 'en'))) {
    const initial = sanitizePath(item.relativePath);
    let target = initial;
    let suffix = 2;
    while (used.has(target.toLocaleLowerCase('en'))) {
      const dot = initial.lastIndexOf('.');
      const stem = dot > initial.lastIndexOf('/') ? initial.slice(0, dot) : initial;
      const extension = dot > initial.lastIndexOf('/') ? initial.slice(dot) : '';
      target = `${stem} (${suffix})${extension}`;
      suffix += 1;
    }
    used.add(target.toLocaleLowerCase('en'));
    result.set(item.relativePath, target);
  }
  return result;
}

export async function buildObsidianGraph(api, session, candidate, onProgress = () => {}) {
  const entries = await loadAllEntries(api, session, onProgress);
  const rootPrefix = candidate.root ? `${candidate.root}/` : '';
  const sourceItems = entries
    .filter((entry) => entry.kind === 'file' && (!rootPrefix || entry.path.startsWith(rootPrefix)))
    .map((entry) => ({ entry, relativePath: rootPrefix ? entry.path.slice(rootPrefix.length) : entry.path }))
    .filter((item) => item.relativePath !== '.obsidian' && !item.relativePath.startsWith('.obsidian/'))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath, 'en'));
  const notes = sourceItems.filter((item) => item.relativePath.toLowerCase().endsWith('.md'));
  const assets = sourceItems.filter((item) => !item.relativePath.toLowerCase().endsWith('.md'));

  const noteTexts = new Map();
  for (let index = 0; index < notes.length; index += 1) {
    const item = notes[index];
    noteTexts.set(item.relativePath, await api.imports.readText(session.sourceHandle, item.entry.id));
    onProgress({ phase: 'analyzing', completed: index + 1, total: notes.length + assets.length });
  }
  const noteTargets = allocateTargets(notes);
  const assetTargets = allocateTargets(assets);
  const index = buildObsidianIndex(
    notes.map((item) => ({ sourcePath: item.relativePath, text: noteTexts.get(item.relativePath) })),
    assets.map((item) => ({ sourcePath: item.relativePath })),
  );
  const mapping = new Map([
    ...notes.map((item) => [item.relativePath, { kind: 'note', targetPath: noteTargets.get(item.relativePath) }]),
    ...assets.map((item) => [item.relativePath, { kind: 'file', targetPath: assetTargets.get(item.relativePath) }]),
  ]);

  const graph = createSourceGraph('obsidian', candidate.root);
  graph.sourceHandle = session.sourceHandle;
  graph.sourceFingerprint = session.fingerprint;
  for (const item of assets) {
    addGraphNode(graph, {
      entryId: item.entry.id,
      path: assetTargets.get(item.relativePath),
      sourcePath: item.entry.path,
      role: 'asset',
      size: item.entry.size,
      modifiedAt: item.entry.modifiedAt,
      metadata: { originalPath: item.relativePath },
    });
  }
  for (const item of notes) {
    const rewritten = rewriteObsidianMarkdown({ sourcePath: item.relativePath, text: noteTexts.get(item.relativePath), index, mapping });
    const links = rewritten.links.map((link) => ({ ...link, sourceTarget: `${rootPrefix}${link.sourceTarget}` }));
    const node = addGraphNode(graph, {
      entryId: item.entry.id,
      path: noteTargets.get(item.relativePath),
      sourcePath: item.entry.path,
      role: 'note',
      size: item.entry.size,
      modifiedAt: item.entry.modifiedAt,
      text: rewritten.markdown,
      links,
      warnings: rewritten.warnings,
      metadata: { originalPath: item.relativePath },
    });
    graph.links.push(...links.map((link) => ({ ...link, from: node.id })));
    graph.warnings.push(...rewritten.warnings.map((warning) => ({ ...warning, nodeId: node.id })));
  }
  return sortSourceGraph(graph);
}
