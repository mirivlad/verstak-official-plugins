function normalizeGraphPath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '').normalize('NFC');
}

export function stableGraphId(format, sourcePath) {
  const input = new TextEncoder().encode(`${format}:${normalizeGraphPath(sourcePath)}`);
  let hash = 0x811c9dc5;
  for (const byte of input) {
    hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  }
  return `node-${hash.toString(16).padStart(8, '0')}`;
}

export function createSourceGraph(format, root = '') {
  return {
    format,
    root: normalizeGraphPath(root),
    nodes: [],
    links: [],
    warnings: [],
  };
}

export function addGraphNode(graph, node) {
  const sourcePath = normalizeGraphPath(node.sourcePath || node.path);
  const value = {
    id: node.id || stableGraphId(graph.format, sourcePath),
    entryId: node.entryId || '',
    path: normalizeGraphPath(node.path),
    sourcePath,
    role: node.role,
    size: Number(node.size || 0),
    modifiedAt: node.modifiedAt || '',
    links: Array.isArray(node.links) ? node.links : [],
    warnings: Array.isArray(node.warnings) ? node.warnings : [],
    metadata: node.metadata || {},
  };
  if (typeof node.text === 'string') value.text = node.text;
  graph.nodes.push(value);
  return value;
}

export function sortSourceGraph(graph) {
  graph.nodes.sort((left, right) => left.path.localeCompare(right.path, 'en'));
  graph.links.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right), 'en'));
  return graph;
}
