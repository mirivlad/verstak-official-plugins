import { stableGraphId } from './graph.js';

const FORMAT_LABELS = Object.freeze({ dokuwiki: 'DokuWiki', obsidian: 'Obsidian' });
const PROJECT_MARKERS = new Set(['package.json', 'go.mod', '.gitignore']);
const BACKEND_FIELDS = [
  'id', 'parentId', 'kind', 'name', 'targetSubpath', 'templateId', 'text',
  'sourceEntryId', 'sourcePath', 'modifiedAt',
];

function normalizePath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '').normalize('NFC');
}

function splitPath(value) {
  return normalizePath(value).split('/').filter(Boolean);
}

function joinPath(...values) {
  return values.flatMap(splitPath).join('/');
}

function dirname(value) {
  const parts = splitPath(value);
  return parts.slice(0, -1).join('/');
}

function basename(value) {
  return splitPath(value).at(-1) || '';
}

function withoutExtension(value) {
  const dot = value.lastIndexOf('.');
  return dot > 0 ? value.slice(0, dot) : value;
}

function relativePath(fromDirectory, target) {
  const from = splitPath(fromDirectory);
  const to = splitPath(target);
  while (from.length && to.length && from[0] === to[0]) {
    from.shift();
    to.shift();
  }
  return [...Array(from.length).fill('..'), ...to].join('/') || basename(target);
}

function encodePath(value) {
  return value.split('/').map((part) => part === '..' ? part : encodeURIComponent(part)).join('/');
}

function formatRunName(format, now) {
  const pad = (value) => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  return `${FORMAT_LABELS[format] || format} — ${stamp}`;
}

function makeStructuralNode(format, kind, sourcePath, name, parentId = '', reason = 'coherent-branch', confidence = 0.8) {
  return {
    id: stableGraphId(format, `plan:${kind}:${sourcePath || name}`),
    parentId,
    kind,
    name,
    sourcePath,
    ...(kind === 'workspace' ? { templateId: 'default' } : {}),
    reason,
    confidence,
    warnings: [],
  };
}

function isProjectBranch(items, prefix) {
  const relatives = items.map((node) => splitPath(node.path).slice(splitPath(prefix).length));
  const hasNote = items.some((node) => node.role === 'note');
  const hasMarker = relatives.some((parts) => PROJECT_MARKERS.has(parts.at(-1)?.toLocaleLowerCase('en')) || parts[0]?.toLocaleLowerCase('en') === 'src');
  return hasNote && hasMarker;
}

function addWorkspaceContents(planNodes, graph, workspace, items, prefix, projectLike) {
  const prefixLength = splitPath(prefix).length;
  for (const source of [...items].sort((left, right) => left.path.localeCompare(right.path, 'en'))) {
    const relative = splitPath(source.path).slice(prefixLength).join('/') || basename(source.path);
    const kind = projectLike || source.role !== 'note' ? 'file' : 'note';
    const targetSubpath = relative;
    const name = kind === 'note' ? withoutExtension(basename(relative)) : basename(relative);
    planNodes.push({
      id: stableGraphId(graph.format, `plan:content:${source.id}`),
      parentId: workspace.id,
      kind,
      name,
      targetSubpath,
      ...(kind === 'note' ? { text: source.text || '' } : {}),
      sourceEntryId: source.entryId,
      sourcePath: source.sourcePath,
      logicalPath: source.path,
      ...(source.modifiedAt ? { modifiedAt: source.modifiedAt } : {}),
      sourceNodeId: source.id,
      originalText: source.text,
      links: source.links || [],
      reason: projectLike ? 'project-file-tree' : source.role === 'note' ? 'note-content' : 'attached-file',
      confidence: projectLike ? 0.95 : 0.9,
      warnings: [...(source.warnings || [])],
    });
  }
}

function buildInitialNodes(graph, locale) {
  const nodes = [];
  const unsortedName = String(locale || '').toLocaleLowerCase('en').startsWith('ru') ? 'Без папки' : 'Unsorted';
  const rootItems = graph.nodes.filter((node) => splitPath(node.path).length === 1);
  if (rootItems.length) {
    const workspace = makeStructuralNode(graph.format, 'workspace', '', unsortedName, '', 'loose-root-content', 0.7);
    nodes.push(workspace);
    addWorkspaceContents(nodes, graph, workspace, rootItems, '', false);
  }

  const topNames = [...new Set(graph.nodes.map((node) => splitPath(node.path)[0]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'en'));
  for (const top of topNames) {
    const topItems = graph.nodes.filter((node) => splitPath(node.path)[0] === top && splitPath(node.path).length > 1);
    if (!topItems.length) continue;
    const childNames = [...new Set(topItems.filter((node) => splitPath(node.path).length > 2).map((node) => splitPath(node.path)[1]))]
      .sort((a, b) => a.localeCompare(b, 'en'));
    if (!childNames.length) {
      const workspace = makeStructuralNode(graph.format, 'workspace', top, top, '', 'coherent-branch', 0.85);
      nodes.push(workspace);
      addWorkspaceContents(nodes, graph, workspace, topItems, top, isProjectBranch(topItems, top));
      continue;
    }

    const folder = makeStructuralNode(graph.format, 'folder', top, top, '', 'top-level-branch', 0.85);
    nodes.push(folder);
    const directItems = topItems.filter((node) => splitPath(node.path).length === 2);
    if (directItems.length) {
      const sourcePath = `${top}/${unsortedName}`;
      const workspace = makeStructuralNode(graph.format, 'workspace', sourcePath, unsortedName, folder.id, 'loose-branch-content', 0.7);
      nodes.push(workspace);
      addWorkspaceContents(nodes, graph, workspace, directItems, top, false);
    }
    for (const child of childNames) {
      const prefix = `${top}/${child}`;
      const items = topItems.filter((node) => splitPath(node.path)[1] === child && splitPath(node.path).length > 2);
      const workspace = makeStructuralNode(graph.format, 'workspace', prefix, child, folder.id, 'coherent-branch', 0.85);
      nodes.push(workspace);
      addWorkspaceContents(nodes, graph, workspace, items, prefix, isProjectBranch(items, prefix));
    }
  }
  return nodes;
}

function structuralPath(node, byId) {
  const parts = [];
  let current = node;
  const seen = new Set();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.kind === 'folder' || current.kind === 'workspace') parts.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : null;
  }
  return parts.join('/');
}

function contentTargetPath(node, byId) {
  const workspace = byId.get(node.parentId);
  const base = structuralPath(workspace, byId);
  const area = node.kind === 'note' ? 'Notes' : 'Files';
  return joinPath(base, area, node.targetSubpath || node.name);
}

function relinkPlan(plan) {
  const byId = new Map(plan.nodes.map((node) => [node.id, node]));
  const bySourcePath = new Map(plan.nodes.filter((node) => node.sourceNodeId).map((node) => [normalizePath(node.sourcePath).toLocaleLowerCase('en'), node]));
  return {
    ...plan,
    nodes: plan.nodes.map((node) => {
      if (node.kind !== 'note' || typeof node.originalText !== 'string' || !node.links?.length) return node;
      let text = node.originalText;
      for (const link of node.links) {
        if (!link.sourceTarget || !link.target) continue;
        const targetNode = bySourcePath.get(normalizePath(link.sourceTarget).toLocaleLowerCase('en'));
        if (!targetNode || targetNode.kind === 'skip' || !['note', 'file'].includes(targetNode.kind)) continue;
        const oldTarget = String(link.target);
        const hashIndex = oldTarget.indexOf('#');
        const anchor = hashIndex === -1 ? '' : oldTarget.slice(hashIndex);
        const from = dirname(contentTargetPath(node, byId));
        const to = contentTargetPath(targetNode, byId);
        const nextTarget = encodePath(relativePath(from, to)) + anchor;
        text = text.split(`(${oldTarget})`).join(`(${nextTarget})`);
      }
      return { ...node, text };
    }),
  };
}

export function proposePlan(graph, now = new Date(), options = {}) {
  return relinkPlan({
    format: graph.format,
    sourceHandle: graph.sourceHandle || '',
    sourceFingerprint: graph.sourceFingerprint || '',
    runName: formatRunName(graph.format, now),
    nodes: buildInitialNodes(graph, options.locale),
  });
}

export function editPlanNode(plan, nodeId, patch) {
  const nodes = plan.nodes.map((node) => node.id === nodeId ? { ...node, ...patch, id: node.id } : node);
  return relinkPlan({ ...plan, nodes });
}

function isSafeName(value) {
  const name = String(value || '');
  return !!name && name !== '.' && name !== '..' && name.toLocaleLowerCase('en') !== '.verstak'
    && !name.startsWith('.') && !/[<>:"/\\|?*\u0000-\u001f]/.test(name) && !/[ .]$/.test(name);
}

function isPortableSegment(value) {
  const segment = String(value || '');
  if (!segment || segment === '.' || segment === '..' || /[\u0000-\u001f]/.test(segment) || /[ .]$/.test(segment)) return false;
  const stem = segment.split('.')[0].toLocaleUpperCase('en');
  return !['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'].includes(stem)
    && segment.toLocaleLowerCase('en') !== '.verstak';
}

function isSafeTargetPath(value) {
  const path = String(value || '');
  const parts = path.split('/');
  return !!path && !path.startsWith('/') && !path.includes('\\') && parts.every(isPortableSegment);
}

function validationError(code, nodeId, message) {
  return { code, nodeId, message };
}

export function validateEditablePlan(plan) {
  const errors = [];
  const byId = new Map();
  for (const node of plan.nodes || []) {
    if (byId.has(node.id)) errors.push(validationError('duplicate-node-id', node.id, 'Node identifiers must be unique.'));
    byId.set(node.id, node);
  }
  for (const node of plan.nodes || []) {
    if (node.kind === 'skip') continue;
    if (!['folder', 'workspace', 'note', 'file'].includes(node.kind)) {
      errors.push(validationError('invalid-kind', node.id, 'Unsupported import node kind.'));
      continue;
    }
    const validName = ['folder', 'workspace'].includes(node.kind)
      ? isSafeName(node.name)
      : !!String(node.name || '').trim() && !/[\u0000-\u001f]/.test(String(node.name));
    if (!validName) errors.push(validationError('invalid-name', node.id, 'Name is not safe for the target filesystem.'));
    const parent = node.parentId ? byId.get(node.parentId) : null;
    if (node.parentId && !parent) errors.push(validationError('missing-parent', node.id, 'Parent node does not exist.'));
    if (node.kind === 'folder' && parent && parent.kind !== 'folder') errors.push(validationError('invalid-parent', node.id, 'Folders can only be nested in folders.'));
    if (node.kind === 'workspace' && parent && parent.kind !== 'folder') errors.push(validationError('invalid-parent', node.id, 'A Deal can only be nested in a folder.'));
    if (['note', 'file'].includes(node.kind) && (!parent || parent.kind !== 'workspace')) errors.push(validationError('invalid-parent', node.id, 'Content must belong to a Deal.'));
    if (['note', 'file'].includes(node.kind) && !isSafeTargetPath(node.targetSubpath)) errors.push(validationError('invalid-target-path', node.id, 'Target path must be a safe relative path.'));
    if (node.kind === 'note' && typeof node.text !== 'string') errors.push(validationError('missing-note-text', node.id, 'A note must contain text.'));
    if (node.kind === 'file' && !node.sourceEntryId) errors.push(validationError('missing-source-entry', node.id, 'A file must refer to a source entry.'));

    const seen = new Set([node.id]);
    let ancestor = parent;
    while (ancestor) {
      if (seen.has(ancestor.id)) {
        errors.push(validationError('parent-cycle', node.id, 'Parent relationships contain a cycle.'));
        break;
      }
      seen.add(ancestor.id);
      ancestor = ancestor.parentId ? byId.get(ancestor.parentId) : null;
    }
  }

  const paths = new Map();
  for (const node of plan.nodes || []) {
    if (node.kind === 'skip') continue;
    let target = '';
    if (node.kind === 'folder' || node.kind === 'workspace') target = structuralPath(node, byId);
    else if (['note', 'file'].includes(node.kind)) target = contentTargetPath(node, byId);
    if (!target) continue;
    const key = target.toLocaleLowerCase('en').normalize('NFC');
    if (paths.has(key)) errors.push(validationError('duplicate-target-path', node.id, 'Two nodes resolve to the same target path.'));
    else paths.set(key, node.id);
  }
  return errors;
}

export function serializeApplyPlan(plan, sourceFingerprint = plan.sourceFingerprint) {
  return {
    schemaVersion: 1,
    sourceHandle: plan.sourceHandle,
    sourceFingerprint,
    runName: plan.runName,
    nodes: (plan.nodes || []).map((node) => Object.fromEntries(
      BACKEND_FIELDS.filter((field) => node[field] !== undefined && node[field] !== '').map((field) => [field, node[field]]),
    )),
  };
}
