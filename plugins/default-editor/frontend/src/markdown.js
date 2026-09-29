import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype, { defaultHandlers } from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';

export function titleKey(title) {
  return String(title || '').replace(/_/g, ' ').trim().toLocaleLowerCase();
}

export function readAliases(content) {
  const match = /^<!-- verstak-note-aliases-v1: (\[[^\r\n]*\]) -->\r?\n/.exec(content);
  if (match) {
    try {
      const aliases = JSON.parse(match[1]);
      if (Array.isArray(aliases) && aliases.every(alias => typeof alias === 'string' && alias.trim())) {
        return { header: match[0], aliases, body: content.slice(match[0].length) };
      }
    } catch (_) { /* A malformed header remains editable text, never discarded. */ }
  }
  return { header: '', aliases: [], body: content };
}

const parser = unified().use(remarkParse).use(remarkGfm);
const plain = node => typeof node.value === 'string' ? node.value : (node.children || []).map(plain).join('');
const text = value => ({ type: 'text', value });
const element = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });

function sourcePosition(result, node) {
  if (result?.type === 'element' && node.position) {
    result.properties ||= {};
    result.properties.dataSourceFrom = node.position.start.offset;
    result.properties.dataSourceTo = node.position.end.offset;
  }
  return result;
}

function safeURL(value, image = false) {
  // Relative vault paths are resolved by the host, never by the web page URL.
  const url = String(value || '').trim();
  if (/^(https?:|mailto:)/i.test(url)) return !image || /^https?:/i.test(url);
  return !image && /^#[^\s]*$/.test(url);
}

export function parseMarkdown(content, { notes = true, secrets = false, copyLabel = 'Copy code' } = {}) {
  const tree = parser.parse(content);
  const headings = [];
  const tasks = [];
  const links = [];
  const codeBlocks = [];
  const slugCounts = new Map();
  if (notes) {
    // Only text nodes are eligible: code, HTML and link destinations stay literal.
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || ['link', 'linkReference'].includes(parent.type)) return;
      const pattern = /\[\[([^\]\n]+)\]\]/g;
      const children = [];
      let last = 0;
      for (const match of node.value.matchAll(pattern)) {
        if (match.index > last) children.push(text(node.value.slice(last, match.index)));
        const title = match[1].trim();
        children.push({ type: 'noteLink', title, children: [text(title)] });
        links.push(title);
        last = match.index + match[0].length;
      }
      if (!children.length) return;
      if (last < node.value.length) children.push(text(node.value.slice(last)));
      parent.children.splice(index, 1, ...children);
      return index + children.length;
    });
  }
  const handlers = {
    noteLink: (_, node) => element('a', { href: '#', className: ['internal-link'], dataNoteLink: node.title }, node.children),
    heading(state, node) {
      const title = plain(node);
      const base = title.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-') || 'heading';
      const count = slugCounts.get(base) || 0;
      slugCounts.set(base, count + 1);
      const slug = count ? `${base}-${count}` : base;
      headings.push({ title, level: node.depth, slug, from: node.position.start.offset });
      const result = defaultHandlers.heading(state, node);
      result.properties.id = slug;
      result.properties.dataHeadingSlug = slug;
      return sourcePosition(result, node);
    },
    paragraph: (state, node) => sourcePosition(defaultHandlers.paragraph(state, node), node),
    blockquote: (state, node) => sourcePosition(defaultHandlers.blockquote(state, node), node),
    listItem(state, node, parent) {
      const result = sourcePosition(defaultHandlers.listItem(state, node, parent), node);
      if (typeof node.checked !== 'boolean') return result;
      const start = node.position.start.offset;
      const marker = /^(?:[-+*]|\d+[.)])\s+\[([ xX])\]/.exec(content.slice(start));
      if (!marker) return result;
      const offset = start + marker[0].lastIndexOf('[') + 1;
      const label = plain(node);
      tasks.push({ offset, checked: node.checked, label });
      visit(result, 'element', child => {
        if (child.tagName !== 'input' || child.properties.dataTaskOffset !== undefined) return;
        delete child.properties.disabled;
        child.properties.dataTaskOffset = offset;
        child.properties.ariaLabel = label;
      });
      return result;
    },
    code(state, node) {
      const result = sourcePosition(defaultHandlers.code(state, node), node);
      const index = codeBlocks.push(node.value) - 1;
      return element('div', { className: ['de-code-block'], dataSourceFrom: node.position.start.offset }, [
        element('div', { className: ['de-code-header'] }, [
          element('span', {}, [text(node.lang || 'text')]),
          element('button', { type: 'button', dataCodeCopy: index, ariaLabel: copyLabel }, [text(copyLabel)]),
        ]), result,
      ]);
    },
    link(state, node) {
      if (node.url.startsWith('verstak-secret://')) {
        if (!secrets) return element('span', {}, state.all(node));
        return element('a', { href: '#', className: ['secret-link'], dataSecretId: node.url.slice('verstak-secret://'.length) }, state.all(node));
      }
      if (!safeURL(node.url)) return element('span', {}, state.all(node));
      const result = defaultHandlers.link(state, node);
      if (!node.url.startsWith('#')) { result.properties.target = '_blank'; result.properties.rel = ['noopener', 'noreferrer']; }
      return result;
    },
    image(state, node) {
      if (!safeURL(node.url, true)) return element('span', { className: ['de-image-alt'] }, [text(node.alt || '')]);
      const result = defaultHandlers.image(state, node);
      result.properties.loading = 'lazy';
      return result;
    },
    linkReference(state, node) {
      const definition = state.definitionById.get(node.identifier.toUpperCase());
      if (definition && !safeURL(definition.url)) return element('span', {}, state.all(node));
      return defaultHandlers.linkReference(state, node);
    },
    imageReference(state, node) {
      const definition = state.definitionById.get(node.identifier.toUpperCase());
      if (definition && !safeURL(definition.url, true)) return element('span', {}, [text(node.alt || '')]);
      return defaultHandlers.imageReference(state, node);
    },
  };
  const renderer = unified().use(remarkRehype, { handlers }).use(rehypeStringify);
  const html = renderer.stringify(renderer.runSync(tree));
  tasks.sort((a, b) => a.offset - b.offset);
  return { html, headings, tasks, links, codeBlocks };
}

// Preserve the original bytes on no-op saves, including CRLF and alias metadata.
export function noteFile(content) {
  const parsed = readAliases(content);
  const body = parsed.body.replace(/\r\n/g, '\n');
  const newline = parsed.body.includes('\r\n') ? '\r\n' : '\n';
  return {
    ...parsed, text: body,
    serialize(value) { return value === body ? content : parsed.header + value.replace(/\n/g, newline); },
  };
}
