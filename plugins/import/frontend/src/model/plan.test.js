import { describe, expect, it } from 'vitest';
import { createSourceGraph, addGraphNode, sortSourceGraph } from './graph.js';
import { editPlanNode, proposePlan, serializeApplyPlan, validateEditablePlan } from './plan.js';

function projectGraph() {
  const graph = createSourceGraph('obsidian', 'Vault');
  graph.sourceHandle = 'source-handle';
  graph.sourceFingerprint = 'fingerprint';
  addGraphNode(graph, { entryId: 'readme', path: 'Projects/App/README.md', sourcePath: 'Vault/Projects/App/README.md', role: 'note', text: '# App\n', metadata: { originalPath: 'Projects/App/README.md' } });
  addGraphNode(graph, { entryId: 'package', path: 'Projects/App/package.json', sourcePath: 'Vault/Projects/App/package.json', role: 'asset', metadata: { originalPath: 'Projects/App/package.json' } });
  addGraphNode(graph, { entryId: 'gitignore', path: 'Projects/App/.gitignore', sourcePath: 'Vault/Projects/App/.gitignore', role: 'asset', metadata: { originalPath: 'Projects/App/.gitignore' } });
  addGraphNode(graph, { entryId: 'main', path: 'Projects/App/src/main.js', sourcePath: 'Vault/Projects/App/src/main.js', role: 'asset', metadata: { originalPath: 'Projects/App/src/main.js' } });
  addGraphNode(graph, { entryId: 'journal', path: 'Journal.md', sourcePath: 'Vault/Journal.md', role: 'note', text: '# Journal\n', metadata: { originalPath: 'Journal.md' } });
  return sortSourceGraph(graph);
}

describe('adaptive import plan', () => {
  it('creates stable folders, Deals, project file trees, and an Unsorted Deal', () => {
    const graph = projectGraph();
    const now = new Date('2026-07-23T04:30:00Z');
    const first = proposePlan(graph, now, { locale: 'en' });
    const second = proposePlan(graph, now, { locale: 'en' });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.runName).toBe('Obsidian — 2026-07-23 12-30-00');
    expect(first.nodes.find((node) => node.sourcePath === 'Projects')).toMatchObject({ kind: 'folder', name: 'Projects' });
    expect(first.nodes.find((node) => node.sourcePath === 'Projects/App')).toMatchObject({ kind: 'workspace', name: 'App', templateId: 'default' });
    expect(first.nodes.find((node) => node.logicalPath === 'Projects/App/src/main.js')).toMatchObject({ kind: 'file', targetSubpath: 'src/main.js' });
    expect(first.nodes.find((node) => node.logicalPath === 'Projects/App/README.md')).toMatchObject({ kind: 'file', targetSubpath: 'README.md' });
    expect(first.nodes.find((node) => node.logicalPath === 'Projects/App/.gitignore')).toMatchObject({ kind: 'file', targetSubpath: '.gitignore' });
    expect(first.nodes.find((node) => node.logicalPath === 'Journal.md').parentId).toBe(first.nodes.find((node) => node.kind === 'workspace' && node.name === 'Unsorted').id);
    expect(validateEditablePlan(first)).toEqual([]);
  });

  it('keeps ordinary Markdown as notes and serializes only backend fields', () => {
    const graph = createSourceGraph('dokuwiki', 'data');
    graph.sourceHandle = 'h';
    graph.sourceFingerprint = 'fp';
    addGraphNode(graph, { entryId: 'page', path: 'Project/Start.md', sourcePath: 'data/pages/project/start.txt', role: 'note', text: '# Start\n', modifiedAt: '2026-01-01T00:00:00Z', metadata: { originalPath: 'Project/Start.md' } });
    const plan = proposePlan(graph, new Date('2026-07-23T04:30:00Z'), { locale: 'en' });
    const note = plan.nodes.find((node) => node.sourceNodeId);
    expect(note).toMatchObject({ kind: 'note', targetSubpath: 'Start.md', text: '# Start\n' });
    const serialized = serializeApplyPlan(plan, 'fresh-fingerprint');
    expect(serialized).toMatchObject({ schemaVersion: 1, sourceHandle: 'h', sourceFingerprint: 'fresh-fingerprint' });
    expect(serialized.nodes.find((node) => node.id === note.id)).toEqual({
      id: note.id,
      parentId: note.parentId,
      kind: 'note',
      name: note.name,
      targetSubpath: 'Start.md',
      text: '# Start\n',
      sourceEntryId: 'page',
      sourcePath: 'data/pages/project/start.txt',
      modifiedAt: '2026-01-01T00:00:00Z',
    });
  });

  it('validates edits, retains skips, and reruns link mapping', () => {
    const graph = createSourceGraph('obsidian', 'Vault');
    graph.sourceHandle = 'h';
    graph.sourceFingerprint = 'fp';
    const source = addGraphNode(graph, { entryId: 'a', path: 'A/One.md', sourcePath: 'Vault/A/One.md', role: 'note', text: '[Two](Two.md)', metadata: { originalPath: 'A/One.md' } });
    addGraphNode(graph, { entryId: 'b', path: 'A/Two.md', sourcePath: 'Vault/A/Two.md', role: 'note', text: 'Two', metadata: { originalPath: 'A/Two.md' } });
    source.links = [{ kind: 'note', target: 'Two.md', sourceTarget: 'Vault/A/Two.md' }];
    const plan = proposePlan(graph, new Date('2026-07-23T04:30:00Z'), { locale: 'en' });
    const two = plan.nodes.find((node) => node.sourcePath === 'Vault/A/Two.md');
    const edited = editPlanNode(plan, two.id, { name: 'Renamed', targetSubpath: 'Renamed.md' });
    expect(edited.nodes.find((node) => node.sourcePath === 'Vault/A/One.md').text).toContain('(Renamed.md)');
    const skipped = editPlanNode(edited, two.id, { kind: 'skip' });
    expect(skipped.nodes.find((node) => node.id === two.id).kind).toBe('skip');
    expect(serializeApplyPlan(skipped).nodes.find((node) => node.id === two.id).kind).toBe('skip');

    const invalid = editPlanNode(plan, two.id, { targetSubpath: '../escape.md' });
    expect(validateEditablePlan(invalid)).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'invalid-target-path', nodeId: two.id })]));
  });
});
