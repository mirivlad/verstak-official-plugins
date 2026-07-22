function warning(code, pageId, detail = '') {
  return { code, pageId, detail };
}

function codeSpan(value) {
  const ticks = value.match(/`+/g) || [];
  const fence = '`'.repeat(Math.max(1, ...ticks.map((item) => item.length + 1)));
  return `${fence}${value}${fence}`;
}

function escapeLabel(value) {
  return String(value).replaceAll('[', '\\[').replaceAll(']', '\\]');
}

function parseTableRow(line) {
  const header = line.startsWith('^');
  const content = line.slice(1, -1);
  const cells = content.split(/[|^]/).map((cell) => cell.trim().replaceAll('|', '\\|'));
  return { header, markdown: `| ${cells.join(' | ')} |`, count: cells.length };
}

function convertBlocks(text) {
  const output = [];
  const lines = text.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
  for (const line of lines) {
    const heading = line.match(/^(={1,6})\s*(.*?)\s*\1\s*$/);
    if (heading) {
      output.push(`${'#'.repeat(7 - heading[1].length)} ${heading[2].trim()}`);
      continue;
    }
    const list = line.match(/^(\s{2,})([*-])\s+(.*)$/);
    if (list) {
      const depth = Math.max(1, Math.floor(list[1].length / 2));
      output.push(`${'  '.repeat(depth - 1)}${list[2] === '*' ? '-' : '1.'} ${list[3]}`);
      continue;
    }
    if (/^\s*-{4,}\s*$/.test(line)) {
      output.push('---');
      continue;
    }
    if ((line.startsWith('^') || line.startsWith('|')) && (line.endsWith('^') || line.endsWith('|'))) {
      const row = parseTableRow(line);
      output.push(row.markdown);
      if (row.header) output.push(`| ${Array(row.count).fill('---').join(' | ')} |`);
      continue;
    }
    output.push(line);
  }
  return output.join('\n');
}

export function convertDokuWikiPage({ pageId, text, resolvePage = () => null, resolveMedia = () => null }) {
  const warnings = [];
  const links = [];
  const protectedValues = [];
  const protect = (value) => {
    const token = `\u0001VERSTAK${protectedValues.length}\u0002`;
    protectedValues.push(value);
    return token;
  };

  let value = String(text || '');
  value = value.replace(/<(code|file)(?:\s+([^>\n]+))?>([\s\S]*?)<\/\1>/gi, (_match, tag, options, body) => {
    const language = tag.toLowerCase() === 'code' ? String(options || '').trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9_+-]/g, '') : 'text';
    return protect(`\n\`\`\`${language}\n${body.replace(/^\n|\n$/g, '')}\n\`\`\`\n`);
  });
  value = value.replace(/<nowiki>([\s\S]*?)<\/nowiki>/gi, (_match, body) => protect(codeSpan(body)));

  const unsupportedTag = value.match(/<\/?[A-Z][A-Z0-9_-]*(?:\s[^>]*)?>/);
  if (unsupportedTag) warnings.push(warning('dokuwiki-unsupported-syntax', pageId, unsupportedTag[0]));

  value = value.replace(/\[\[([^\]]+)\]\]/g, (original, inner) => {
    const separator = inner.indexOf('|');
    const target = (separator === -1 ? inner : inner.slice(0, separator)).trim();
    const label = escapeLabel((separator === -1 ? target : inner.slice(separator + 1)).trim());
    if (/^(?:https?:|ftp:|mailto:)/i.test(target)) {
      links.push({ kind: 'external', raw: target, target });
      return protect(`[${label}](${target.replaceAll(' ', '%20')})`);
    }
    if (target.includes('>')) {
      warnings.push(warning('dokuwiki-interwiki-link', pageId, target));
      return protect(original);
    }
    const resolved = resolvePage(target, pageId);
    if (!resolved) {
      warnings.push(warning('dokuwiki-missing-page', pageId, target));
      return protect(original);
    }
    links.push({ kind: 'page', raw: target, target: resolved });
    return protect(`[${label}](${resolved})`);
  });

  value = value.replace(/\{\{([^}]+)\}\}/g, (original, inner) => {
    const separator = inner.indexOf('|');
    const rawTarget = (separator === -1 ? inner : inner.slice(0, separator)).trim();
    const alt = escapeLabel((separator === -1 ? '' : inner.slice(separator + 1)).trim());
    const queryAt = rawTarget.indexOf('?');
    const target = queryAt === -1 ? rawTarget : rawTarget.slice(0, queryAt);
    const dimensions = queryAt === -1 ? '' : rawTarget.slice(queryAt + 1);
    const resolved = /^(?:https?:|ftp:)/i.test(target) ? target : resolveMedia(target, pageId);
    if (!resolved) {
      warnings.push(warning('dokuwiki-missing-media', pageId, target));
      return protect(original);
    }
    links.push({ kind: 'media', raw: target, target: resolved });
    const sizeComment = /^\d+(?:x\d+)?$/.test(dimensions) ? ` <!-- DokuWiki size: ${dimensions} -->` : '';
    return protect(`![${alt}](${resolved})${sizeComment}`);
  });

  value = convertBlocks(value);
  value = value.replace(/''([^'\n]+)''/g, (_match, body) => codeSpan(body));
  value = value.replace(/__([^_\n]+)__/g, '<u>$1</u>');
  value = value.replace(/(^|[\s([{>])\/\/([^/\n]+?)\/\/(?=$|[\s)\]}.!,;:<])/g, '$1*$2*');
  value = value.replace(/\\\\\s*$/gm, '  ');

  value = value.replace(/\u0001VERSTAK(\d+)\u0002/g, (_match, index) => protectedValues[Number(index)]);
  return { markdown: value.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', warnings, links };
}
