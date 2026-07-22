function normalizePath(value) {
  const parts = [];
  for (const part of String(value || '').replaceAll('\\', '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join('/').normalize('NFC');
}

function dirname(value) {
  const index = value.lastIndexOf('/');
  return index === -1 ? '' : value.slice(0, index);
}

function basename(value) {
  return value.slice(value.lastIndexOf('/') + 1);
}

function withoutMarkdownExtension(value) {
  return value.replace(/\.md$/i, '');
}

function canonical(value) {
  return normalizePath(value).toLocaleLowerCase('en');
}

function relativePath(fromDirectory, target) {
  const from = normalizePath(fromDirectory).split('/').filter(Boolean);
  const to = normalizePath(target).split('/').filter(Boolean);
  while (from.length && to.length && from[0] === to[0]) {
    from.shift();
    to.shift();
  }
  return [...Array(from.length).fill('..'), ...to].join('/');
}

function encodePath(value) {
  return value.split('/').map((part) => encodeURIComponent(part)).join('/');
}

function headingSlug(value) {
  return value.toLocaleLowerCase('en').trim().replace(/[\s_]+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '');
}

function parseAliases(text) {
  if (!String(text).startsWith('---\n')) return [];
  const end = text.indexOf('\n---', 4);
  if (end === -1) return [];
  const frontmatter = text.slice(4, end).split('\n');
  const aliases = [];
  let collecting = false;
  for (const line of frontmatter) {
    const inline = line.match(/^aliases?:\s*\[(.*)]\s*$/i);
    if (inline) {
      aliases.push(...inline[1].split(',').map((item) => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean));
      collecting = false;
      continue;
    }
    const scalar = line.match(/^aliases?:\s+(.+)$/i);
    if (scalar) {
      aliases.push(scalar[1].trim().replace(/^['"]|['"]$/g, ''));
      collecting = false;
      continue;
    }
    if (/^aliases?:\s*$/i.test(line)) {
      collecting = true;
      continue;
    }
    const item = collecting && line.match(/^\s*-\s+(.+)$/);
    if (item) {
      aliases.push(item[1].trim().replace(/^['"]|['"]$/g, ''));
    } else if (collecting && line.trim()) {
      collecting = false;
    }
  }
  return aliases;
}

function addBucket(map, key, value) {
  const normalized = String(key || '').toLocaleLowerCase('en').normalize('NFC');
  if (!normalized) return;
  const bucket = map.get(normalized) || [];
  bucket.push(value);
  map.set(normalized, bucket);
}

export function buildObsidianIndex(notes, assets) {
  const index = {
    notesByPath: new Map(),
    assetsByPath: new Map(),
    noteBasenames: new Map(),
    assetBasenames: new Map(),
    aliases: new Map(),
  };
  for (const note of notes) {
    const item = {
      ...note,
      sourcePath: normalizePath(note.sourcePath),
      aliases: parseAliases(note.text),
      headings: [...String(note.text || '').matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => headingSlug(match[1])),
      blockIds: [...String(note.text || '').matchAll(/(?:^|\s)\^([a-zA-Z0-9-]+)\s*$/gm)].map((match) => match[1]),
    };
    index.notesByPath.set(canonical(item.sourcePath), item);
    addBucket(index.noteBasenames, withoutMarkdownExtension(basename(item.sourcePath)), item);
    item.aliases.forEach((alias) => addBucket(index.aliases, alias, item));
  }
  for (const asset of assets) {
    const item = { ...asset, sourcePath: normalizePath(asset.sourcePath) };
    index.assetsByPath.set(canonical(item.sourcePath), item);
    addBucket(index.assetBasenames, basename(item.sourcePath), item);
  }
  return index;
}

function exactLookup(index, sourcePath, rawPath) {
  if (!rawPath) return index.notesByPath.get(canonical(sourcePath)) || null;
  const decoded = (() => { try { return decodeURIComponent(rawPath); } catch { return rawPath; } })();
  const relative = normalizePath(`${dirname(sourcePath)}/${decoded}`);
  const vault = normalizePath(decoded.replace(/^\//, ''));
  for (const candidate of [relative, vault]) {
    const note = index.notesByPath.get(canonical(candidate)) || index.notesByPath.get(canonical(`${candidate}.md`));
    if (note) return note;
    const asset = index.assetsByPath.get(canonical(candidate));
    if (asset) return asset;
  }
  return null;
}

function resolveTarget(index, sourcePath, rawPath) {
  const exact = exactLookup(index, sourcePath, rawPath);
  if (exact) return { item: exact };
  const name = withoutMarkdownExtension(basename(rawPath));
  const aliasMatches = index.aliases.get(name.toLocaleLowerCase('en').normalize('NFC')) || [];
  if (aliasMatches.length === 1) return { item: aliasMatches[0] };
  if (aliasMatches.length > 1) return { ambiguous: true };
  const noteMatches = index.noteBasenames.get(name.toLocaleLowerCase('en').normalize('NFC')) || [];
  if (noteMatches.length === 1) return { item: noteMatches[0] };
  if (noteMatches.length > 1) return { ambiguous: true };
  const assetMatches = index.assetBasenames.get(basename(rawPath).toLocaleLowerCase('en').normalize('NFC')) || [];
  if (assetMatches.length === 1) return { item: assetMatches[0] };
  if (assetMatches.length > 1) return { ambiguous: true };
  return { missing: true };
}

function mappingValue(mapping, sourcePath) {
  if (mapping.has(sourcePath)) return mapping.get(sourcePath);
  const key = canonical(sourcePath);
  for (const [path, value] of mapping) {
    if (canonical(path) === key) return value;
  }
  return null;
}

function targetURL(sourcePath, target, mapping, subpath) {
  const sourceMapping = mappingValue(mapping, sourcePath) || { kind: 'note', targetPath: sourcePath };
  const targetMapping = mappingValue(mapping, target.sourcePath);
  if (!targetMapping) return null;
  const from = dirname(`Notes/${sourceMapping.targetPath}`);
  const area = targetMapping.kind === 'note' ? 'Notes' : 'Files';
  const relative = relativePath(from, `${area}/${targetMapping.targetPath}`);
  let anchor = '';
  if (subpath.startsWith('#^')) anchor = `#block-${headingSlug(subpath.slice(2))}`;
  else if (subpath.startsWith('#')) anchor = `#${headingSlug(subpath.slice(1))}`;
  return encodePath(relative) + anchor;
}

function isImage(path) {
  return /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(path);
}

function splitFrontmatter(text) {
  if (!text.startsWith('---\n')) return { prefix: '', body: text };
  const end = text.indexOf('\n---', 4);
  if (end === -1) return { prefix: '', body: text };
  const after = end + 4;
  return { prefix: text.slice(0, after), body: text.slice(after) };
}

export function rewriteObsidianMarkdown({ sourcePath, text, index, mapping }) {
  const warnings = [];
  const links = [];
  const { prefix, body } = splitFrontmatter(String(text || '').replaceAll('\r\n', '\n').replaceAll('\r', '\n'));
  const output = [];
  let fenced = false;
  let fenceMarker = '';

  const rewriteLine = (line) => {
    const protectedCode = [];
    let value = line.replace(/(`+)(.*?)\1/g, (match) => {
      const token = `\u0001CODE${protectedCode.length}\u0002`;
      protectedCode.push(match);
      return token;
    });
    value = value.replace(/(!)?\[\[([^\]]+)\]\]/g, (original, embed, inner) => {
      const aliasAt = inner.indexOf('|');
      const targetWithSubpath = (aliasAt === -1 ? inner : inner.slice(0, aliasAt)).trim();
      const label = (aliasAt === -1 ? targetWithSubpath.split('#')[0] : inner.slice(aliasAt + 1)).trim();
      const hashAt = targetWithSubpath.indexOf('#');
      const rawPath = hashAt === -1 ? targetWithSubpath : targetWithSubpath.slice(0, hashAt);
      const subpath = hashAt === -1 ? '' : targetWithSubpath.slice(hashAt);
      const resolved = resolveTarget(index, sourcePath, rawPath);
      if (!resolved.item) {
        warnings.push({ code: resolved.ambiguous ? 'obsidian-ambiguous-link' : 'obsidian-missing-link', sourcePath, target: targetWithSubpath });
        return original;
      }
      const url = targetURL(sourcePath, resolved.item, mapping, subpath);
      if (!url) {
        warnings.push({ code: 'obsidian-missing-mapping', sourcePath, target: targetWithSubpath });
        return original;
      }
      const targetMapping = mappingValue(mapping, resolved.item.sourcePath);
      const noteTarget = targetMapping.kind === 'note';
      links.push({ kind: noteTarget ? 'note' : 'file', raw: targetWithSubpath, target: url, sourceTarget: resolved.item.sourcePath });
      if (embed && noteTarget) {
        warnings.push({ code: 'obsidian-note-embed-degraded', sourcePath, target: targetWithSubpath });
        return `[${label || withoutMarkdownExtension(basename(resolved.item.sourcePath))}](${url})`;
      }
      if (embed && isImage(resolved.item.sourcePath)) return `![](${url})`;
      return `[${label || basename(resolved.item.sourcePath)}](${url})`;
    });
    return value.replace(/\u0001CODE(\d+)\u0002/g, (_match, index) => protectedCode[Number(index)]);
  };

  for (const line of body.split('\n')) {
    const opening = line.match(/^\s*(```+|~~~+)/);
    if (opening) {
      if (!fenced) {
        fenced = true;
        fenceMarker = opening[1][0];
      } else if (opening[1][0] === fenceMarker) {
        fenced = false;
        fenceMarker = '';
      }
      output.push(line);
      continue;
    }
    if (fenced) {
      output.push(line);
      continue;
    }
    const standalone = line.match(/^\s*\^([a-zA-Z0-9-]+)\s*$/);
    if (standalone && output.length > 0) {
      output.splice(output.length - 1, 0, `<a id="block-${headingSlug(standalone[1])}"></a>`);
      continue;
    }
    const block = line.match(/^(.*?)(?:\s+)\^([a-zA-Z0-9-]+)\s*$/);
    if (block) {
      output.push(`<a id="block-${headingSlug(block[2])}"></a>`);
      output.push(rewriteLine(block[1]));
    } else {
      output.push(rewriteLine(line));
    }
  }
  const rewrittenBody = output.join('\n');
  return { markdown: prefix + rewrittenBody, warnings, links };
}
