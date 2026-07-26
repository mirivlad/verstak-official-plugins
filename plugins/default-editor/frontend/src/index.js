/* ===========================================================
   Default Editor Plugin — Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  function injectStyles() {
    if (document.getElementById('de-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'de-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  var STYLES = [
    '.de-root{display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:#e0e0e0;background:#0d0d1a}',
    '.de-toolbar,.de-md-toolbar{display:flex;align-items:center;gap:.45rem;padding:.45rem .75rem;border-bottom:1px solid #16213e;flex-shrink:0;background:#12122a;flex-wrap:wrap}',
    '.de-md-toolbar{background:#101028;padding:.38rem .75rem}',
    '.de-toolbar-context{font-size:.75rem;color:#a0a0bb;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.de-toolbar-spacer{flex:1}',
    '.de-toolbar-btn,.de-md-btn{font-size:.75rem;padding:.28rem .58rem;border:1px solid #333;border-radius:4px;background:#1a1a2e;color:#ccc;cursor:pointer}',
    '.de-md-btn{min-width:2rem;font-family:inherit}',
    '.de-toolbar-btn:hover,.de-md-btn:hover{background:#2a2a4e;border-color:#4ecca3}',
    '.de-toolbar-btn.active{background:#1a3a2a;border-color:#4ecca3;color:#4ecca3}',
    '.de-toolbar-btn:disabled,.de-md-btn:disabled{opacity:.45;cursor:default}',
    '.de-status{font-size:.72rem;color:#8b8ba8;padding:.15rem .5rem;white-space:nowrap}',
    '.de-status.saved{color:#4ecca3}.de-status.error{color:#e74c3c}.de-status.dirty{color:#f39c12}.de-status.saving{color:#79c0ff}',
    '.de-editor-wrap{flex:1;display:flex;min-height:0;overflow:hidden;background:#0d0d1a}',
    '.de-pane{flex:1;min-width:0;min-height:0;display:flex;overflow:hidden}',
    '.de-pane+.de-pane{border-left:1px solid #16213e}',
    '.de-editor-shell{position:relative;flex:1;display:flex;min-width:0;min-height:0;overflow:hidden;background:#0d0d1a}',
    '.de-lines{flex:0 0 auto;min-width:3rem;padding:.75rem .45rem;text-align:right;background:#0a0a15;color:#555;font-family:"SF Mono","Fira Code","Cascadia Code",Consolas,monospace;font-size:.82rem;line-height:1.6;user-select:none;overflow:hidden;white-space:pre}',
    '.de-textarea{flex:1;width:100%;height:100%;resize:none;border:0;outline:0;padding:.75rem;font-family:"SF Mono","Fira Code","Cascadia Code",Consolas,monospace;font-size:.86rem;line-height:1.6;background:#0d0d1a;color:#e0e0e0;tab-size:2;white-space:pre;overflow:auto}',
    '.de-textarea.de-textarea-wrap{white-space:pre-wrap;overflow-wrap:anywhere;overflow-x:hidden}',
    '.de-preview{flex:1;height:100%;padding:1rem 1.15rem;overflow:auto;background:#0d0d1a;line-height:1.7;font-size:.92rem;color:#d8d8e8}',
    '.de-preview h1,.de-preview h2,.de-preview h3,.de-preview h4,.de-preview h5,.de-preview h6{color:#f0f0ff;margin:1rem 0 .5rem}',
    '.de-preview h1{font-size:1.55rem;border-bottom:1px solid #16213e;padding-bottom:.35rem}.de-preview h2{font-size:1.3rem;border-bottom:1px solid #16213e;padding-bottom:.25rem}.de-preview h3{font-size:1.12rem}',
    '.de-preview p{margin:.55rem 0}.de-preview code{background:#1a1a2e;padding:.15rem .35rem;border-radius:3px;font-size:.87em;color:#4ecca3}',
    '.de-preview pre{background:#1a1a2e;padding:.85rem;border-radius:4px;overflow:auto;margin:.8rem 0}.de-preview pre code{background:none;padding:0;color:#d8d8e8}',
    '.de-preview ul,.de-preview ol{padding-left:1.5rem;margin:.55rem 0}.de-preview li{margin:.25rem 0}',
    '.de-preview blockquote{border-left:3px solid #4ecca3;margin:.6rem 0;padding:.25rem .85rem;color:#aaa;background:#101028}',
    '.de-preview a{color:#4ecca3;text-decoration:none}.de-preview a:hover{text-decoration:underline}',
    '.de-preview table{border-collapse:collapse;margin:.8rem 0;max-width:100%;display:block;overflow:auto}.de-preview th,.de-preview td{border:1px solid #333;padding:.35rem .6rem;text-align:left}.de-preview th{background:#1a1a2e}',
    '.de-preview img{max-width:100%;height:auto;border-radius:4px}.de-preview .task{margin-right:.4rem}',
    '.de-outline{flex:0 0 15rem;max-width:40%;min-height:0;display:flex;flex-direction:column;border-right:1px solid #16213e;background:#0a0a15}',
    '.de-outline-title{flex:0 0 auto;padding:.5rem .75rem;font-size:.7rem;letter-spacing:.04em;text-transform:uppercase;color:#8b8ba8;border-bottom:1px solid #16213e}',
    '.de-outline-list{flex:1;min-height:0;overflow:auto;padding:.35rem 0}',
    '.de-outline-item{display:block;width:100%;text-align:left;border:0;background:transparent;color:#b8b8d0;cursor:pointer;font-size:.78rem;line-height:1.35;padding:.22rem .75rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.de-outline-item:hover{background:#16213e;color:#f0f0ff}',
    '.de-outline-item.is-current{color:#4ecca3;background:#101f1a}',
    '.de-outline-item[data-level="2"]{padding-left:1.5rem}.de-outline-item[data-level="3"]{padding-left:2.25rem}',
    '.de-outline-item[data-level="4"]{padding-left:3rem}.de-outline-item[data-level="5"]{padding-left:3.75rem}.de-outline-item[data-level="6"]{padding-left:4.5rem}',
    '.de-outline-empty{padding:.6rem .75rem;font-size:.75rem;color:#6b6b85;line-height:1.4}',
    '@media(max-width:780px){.de-outline{flex-basis:auto;max-width:none;max-height:9rem;border-right:0;border-bottom:1px solid #16213e}}',
    '.de-suggest{position:absolute;z-index:40;min-width:12rem;max-width:22rem;max-height:13rem;overflow:auto;border:1px solid #2c456a;border-radius:5px;background:#12122a;box-shadow:0 8px 22px rgba(0,0,0,.5);padding:.2rem 0}',
    '.de-suggest-item{display:block;width:100%;text-align:left;border:0;background:transparent;color:#d8d8e8;cursor:pointer;font-size:.8rem;padding:.28rem .6rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.de-suggest-item:hover,.de-suggest-item.is-active{background:#1a3a2a;color:#4ecca3}',
    '.de-suggest-empty{padding:.35rem .6rem;font-size:.76rem;color:#6b6b85}',
    '.de-notes-badge{font-size:.65rem;padding:.1rem .4rem;border-radius:3px;background:#2a1a3a;color:#b388ff}',
    '.de-loading,.de-error{flex:1;display:flex;align-items:center;justify-content:center;color:#777;padding:2rem}.de-error{color:#e74c3c;flex-direction:column;gap:.5rem}.de-error-msg{font-size:.85rem;color:#aaa;max-width:420px;text-align:center}',
    '@media(max-width:780px){.de-editor-wrap{flex-direction:column}.de-pane+.de-pane{border-left:0;border-top:1px solid #16213e}.de-toolbar-context{max-width:100%}}'
  ].join('\n');

  function el(tag, attrs, children) {
    var elem = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') elem.className = attrs[k];
        else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(elem.style, attrs[k]);
        else if (k.slice(0, 2) === 'on') elem.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (k === 'innerHTML') elem.innerHTML = attrs[k];
        else if (k === 'textContent') elem.textContent = attrs[k];
        else elem.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        elem.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return elem;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  // Heading slugs come from user text, so they reach querySelector as data.
  // CSS.escape is not available in every host this bundle runs in.
  function cssEscape(value) {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function cleanPath(path) {
    return String(path || '').split('/').filter(Boolean).join('/');
  }

  function normalizeNoteFilename(title) {
    var value = String(title == null ? '' : title).trim();
    if (/\.markdown$/i.test(value) && value.length > 9) value = value.slice(0, -9);
    else if (/\.md$/i.test(value) && value.length > 3) value = value.slice(0, -3);
    if (!value) throw new Error('note title must not be empty');
    value = value.replace(/\s+/g, '_');
    value = value.replace(/[\u2012\u2013\u2014\u2015\u2212]/g, '-');
    value = value.replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, '');
    var out = '';
    for (var i = 0; i < value.length; i++) {
      var ch = value.charAt(i);
      if (/[A-Za-z0-9._-]/.test(ch) || /[\p{L}\p{N}]/u.test(ch)) out += ch;
      else if (/\S/.test(ch)) out += '_';
    }
    out = out.replace(/[_.-]+/g, '_').replace(/^[._\-\s]+|[._\-\s]+$/g, '');
    if (!out) throw new Error('note title normalizes to an empty filename');
    return out + '.md';
  }

  // A heading's anchor. Both the rendered preview and the outline derive it
  // from the same function, because an outline entry that scrolls nowhere is
  // worse than no outline. Repeated headings get a numeric suffix so two
  // sections called "Notes" remain separately reachable.
  function headingSlug(text, counts) {
    var base = String(text || '')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\*\*?([^*]*)\*?\*/g, '$1')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '');
    if (!base) base = 'section';
    var seen = counts[base] || 0;
    counts[base] = seen + 1;
    return seen === 0 ? base : base + '-' + seen;
  }

  // The outline of a document: every heading, its level, its anchor and the
  // line it sits on. Fenced code is skipped, so a commented-out '# heading'
  // inside a code block does not appear as a section.
  function headingOutline(text) {
    var counts = {};
    var entries = [];
    var inCode = false;
    String(text || '').split(/\r?\n/).forEach(function (line, index) {
      if (/^```/.test(line.trim())) { inCode = !inCode; return; }
      if (inCode) return;
      var match = line.match(/^(#{1,6})\s+(.+)$/);
      if (!match) return;
      entries.push({
        level: match[1].length,
        title: match[2].replace(/\s*#+\s*$/, '').trim(),
        slug: headingSlug(match[2], counts),
        line: index
      });
    });
    return entries;
  }

  function renderInline(text, isNotesContext, secretLinksAvailable) {
    var html = escapeHtml(text);
    // Internal wiki links [[Title]] — only render in notes context
    if (isNotesContext) {
      html = html.replace(/\[\[([^\]]+)\]\]/g, '<a href="#" class="internal-link" data-note-link="$1">$1</a>');
    }
    if (secretLinksAvailable) {
      html = html.replace(/\[([^\]]+)\]\(verstak-secret:\/\/([^)]+)\)/g, '<a href="#" class="secret-link" data-secret-id="$2">$1</a>');
    }
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, '<img alt="$1" src="$2">');
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+|mailto:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return html;
  }

  function renderMarkdown(text, isNotesContext, secretLinksAvailable) {
    var slugCounts = {};
    var lines = String(text || '').split(/\r?\n/);
    var out = [];
    var inCode = false;
    var codeLang = '';
    var code = [];
    var listType = '';
    var table = [];

    function closeList() {
      if (listType) {
        out.push('</' + listType + '>');
        listType = '';
      }
    }
    function closeTable() {
      if (!table.length) return;
      out.push('<table><tbody>' + table.map(function (row) {
        return '<tr>' + row.map(function (cell) { return '<td>' + renderInline(cell.trim(), isNotesContext, secretLinksAvailable) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table>');
      table = [];
    }
    function pushParagraph(line) {
      closeList();
      closeTable();
      if (line.trim()) out.push('<p>' + renderInline(line, isNotesContext, secretLinksAvailable) + '</p>');
    }

    lines.forEach(function (line) {
      var fence = line.match(/^```(\w*)\s*$/);
      if (fence) {
        if (inCode) {
          out.push('<pre><code class="language-' + escapeAttr(codeLang || 'text') + '">' + escapeHtml(code.join('\n')) + '</code></pre>');
          inCode = false;
          code = [];
          codeLang = '';
        } else {
          closeList();
          closeTable();
          inCode = true;
          codeLang = fence[1] || 'text';
        }
        return;
      }
      if (inCode) {
        code.push(line);
        return;
      }

      if (!line.trim()) {
        closeList();
        closeTable();
        return;
      }

      var heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        closeList();
        closeTable();
        var level = heading[1].length;
        // The anchor is what the outline scrolls to, so it has to be derived
        // the same way in both places — see headingOutline below.
        var slug = headingSlug(heading[2], slugCounts);
        out.push('<h' + level + ' id="' + escapeAttr(slug) + '" data-heading-slug="' + escapeAttr(slug) + '">'
          + renderInline(heading[2], isNotesContext, secretLinksAvailable) + '</h' + level + '>');
        return;
      }

      if (/^\|.+\|$/.test(line) && !/^\|\s*-+/.test(line)) {
        closeList();
        table.push(line.replace(/^\||\|$/g, '').split('|'));
        return;
      }
      if (/^\|\s*-+/.test(line)) return;

      var quote = line.match(/^>\s+(.+)$/);
      if (quote) {
        closeList();
        closeTable();
        out.push('<blockquote>' + renderInline(quote[1], isNotesContext, secretLinksAvailable) + '</blockquote>');
        return;
      }

      var task = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
      var unordered = line.match(/^[-*]\s+(.+)$/);
      var ordered = line.match(/^\d+\.\s+(.+)$/);
      if (task || unordered || ordered) {
        closeTable();
        var desired = ordered ? 'ol' : 'ul';
        if (listType !== desired) {
          closeList();
          out.push('<' + desired + '>');
          listType = desired;
        }
        if (task) {
          out.push('<li><input class="task" type="checkbox" disabled ' + (task[1].toLowerCase() === 'x' ? 'checked' : '') + '> ' + renderInline(task[2], isNotesContext, secretLinksAvailable) + '</li>');
        } else {
          out.push('<li>' + renderInline((ordered || unordered)[1], isNotesContext, secretLinksAvailable) + '</li>');
        }
        return;
      }

      pushParagraph(line);
    });
    if (inCode) out.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
    closeList();
    closeTable();
    return out.join('\n');
  }

  function detectMode(props) {
    var ctx = props.request && props.request.context;
    if (ctx && (ctx.notesMode || ctx.isInsideNotesFolder)) return 'notes-markdown';
    var ext = (props.request && props.request.extension || '').toLowerCase();
    if (ext === '.md' || ext === '.markdown') return 'generic-markdown';
    return 'text';
  }

  function fileName(path) {
    var parts = String(path || '').split('/');
    return parts[parts.length - 1] || '';
  }

  function insertAround(textarea, before, after, placeholder) {
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var value = textarea.value;
    var selected = value.slice(start, end) || placeholder || '';
    textarea.value = value.slice(0, start) + before + selected + after + value.slice(end);
    textarea.selectionStart = start + before.length;
    textarea.selectionEnd = start + before.length + selected.length;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  }

  function prefixLines(textarea, prefix, placeholder) {
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var value = textarea.value;
    var lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    var lineEnd = value.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = value.length;
    var selected = value.slice(lineStart, lineEnd) || placeholder || '';
    var replacement = selected.split('\n').map(function (line) { return prefix + line; }).join('\n');
    textarea.value = value.slice(0, lineStart) + replacement + value.slice(lineEnd);
    textarea.selectionStart = lineStart;
    textarea.selectionEnd = lineStart + replacement.length;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  }

  var DefaultEditor = {
    mount: function (containerEl, props, api) {
      injectStyles();
      containerEl.innerHTML = '';
      containerEl.className = 'de-root';

      var request = props.request || {};
      var resourcePath = request.path || '';
      var requestedMode = request.mode || 'view';
      var editorMode = detectMode(props);
      var isMarkdown = editorMode === 'generic-markdown' || editorMode === 'notes-markdown';
      var viewMode = isMarkdown ? (requestedMode === 'edit' ? 'edit' : 'preview') : 'edit';
      var currentContent = '';
      var savedContent = '';
      var dirty = false;
      var saveState = '';
      var lastSavedAt = '';
      var saveTimer = null;
      var disposed = false;
      var textarea = null;
      var linesEl = null;
      var previewEl = null;
      var secretLinksAvailable = false;
      var wrapLongLines = true;
      function tr(key, params, fallback) {
        if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
        return fallback || key;
      }

      // Shortcut matching belongs to the host, which compares event.code so a
      // non-Latin keyboard layout does not break the binding. The fallback
      // keeps the editor working on a host that predates api.keys, and is
      // deliberately code-based for the same reason.
      function matchesShortcut(event, spec) {
        if (api && api.keys && typeof api.keys.matches === 'function') {
          return api.keys.matches(event, spec);
        }
        if (!event || !spec || event.code !== spec.code) return false;
        if (spec.ctrlOrMeta) return Boolean(event.ctrlKey || event.metaKey);
        return true;
      }

      containerEl.setAttribute('data-editor-mode', editorMode);
      containerEl.setAttribute('data-resource-path', resourcePath);
      containerEl.setAttribute('data-request-mode', requestedMode);

      var contextLabel = el('span', { className: 'de-toolbar-context', title: resourcePath }, [resourcePath || fileName(resourcePath)]);
      var notesBadge = editorMode === 'notes-markdown' ? el('span', { className: 'de-notes-badge', 'data-notes-badge': '' }, [tr('ui.note', null, 'Note')]) : null;
      var spacer = el('span', { className: 'de-toolbar-spacer' });
      var editBtn = isMarkdown ? el('button', { className: 'de-toolbar-btn', 'data-editor-mode-button': 'edit' }, [tr('ui.edit', null, 'Edit')]) : null;
      var previewBtn = isMarkdown ? el('button', { className: 'de-toolbar-btn', 'data-editor-mode-button': 'preview' }, [tr('ui.preview', null, 'Preview')]) : null;
      var splitBtn = isMarkdown ? el('button', { className: 'de-toolbar-btn', 'data-editor-mode-button': 'split' }, [tr('ui.split', null, 'Split')]) : null;
      var reloadBtn = el('button', { className: 'de-toolbar-btn', 'data-editor-action': 'reload' }, [tr('ui.reload', null, 'Reload')]);
      var saveBtn = el('button', { className: 'de-toolbar-btn', 'data-editor-action': 'save' }, [tr('ui.save', null, 'Save')]);
      var wrapBtn = el('button', { className: 'de-toolbar-btn', type: 'button', 'data-editor-action': 'toggle-wrap', 'aria-pressed': 'true' }, [tr('ui.wrapLongLines', null, 'Wrap long lines')]);
      var outlineBtn = isMarkdown ? el('button', {
        className: 'de-toolbar-btn',
        type: 'button',
        'data-editor-action': 'toggle-outline',
        'aria-pressed': 'false',
        title: tr('ui.outlineHint', null, 'Show the headings of this note as a navigable outline')
      }, [tr('ui.outline', null, 'Outline')]) : null;
      var statusEl = el('span', { className: 'de-status', 'data-save-state': '' });
      var toolbarChildren = [contextLabel];
      if (notesBadge) toolbarChildren.push(notesBadge);
      toolbarChildren.push(spacer);
      [editBtn, previewBtn, splitBtn, outlineBtn, wrapBtn, reloadBtn, saveBtn, statusEl].forEach(function (node) { if (node) toolbarChildren.push(node); });
      containerEl.appendChild(el('div', { className: 'de-toolbar' }, toolbarChildren));

      var mdToolbar = null;
      if (isMarkdown) {
        mdToolbar = el('div', { className: 'de-md-toolbar' });
        [
          ['heading', 'H', 'ui.md.heading', 'Heading'],
          ['bold', 'B', 'ui.md.bold', 'Bold'],
          ['italic', 'I', 'ui.md.italic', 'Italic'],
          ['link', 'Link', 'ui.md.link', 'Link'],
          ['code', 'Code', 'ui.md.inlineCode', 'Inline code'],
          ['code-block', '```', 'ui.md.codeBlock', 'Code block'],
          ['bullet', '• List', 'ui.md.bulletList', 'Bullet list'],
          ['numbered', '1. List', 'ui.md.numberedList', 'Numbered list'],
          ['quote', 'Quote', 'ui.md.quote', 'Quote'],
          ['task', 'Task', 'ui.md.taskItem', 'Task item']
        ].forEach(function (item) {
          mdToolbar.appendChild(el('button', { className: 'de-md-btn', type: 'button', 'data-md-action': item[0], title: tr(item[2], null, item[3]), 'aria-label': tr(item[2], null, item[3]) }, [item[1]]));
        });
        containerEl.appendChild(mdToolbar);
      }

      var editorWrap = el('div', { className: 'de-editor-wrap' });
      containerEl.appendChild(editorWrap);

      var outlineVisible = false;
      var outlineListEl = null;

      // Long notes are navigated by their headings. Without this the only way
      // to reach a section is to scroll and read, which is exactly the problem
      // in the notes worth having an outline for.
      function makeOutlinePane() {
        var pane = el('div', { className: 'de-outline', 'data-outline': '' });
        pane.appendChild(el('div', { className: 'de-outline-title' }, [tr('ui.outline', null, 'Outline')]));
        outlineListEl = el('div', { className: 'de-outline-list' });
        pane.appendChild(outlineListEl);
        renderOutline();
        return pane;
      }

      function renderOutline() {
        if (!outlineListEl) return;
        outlineListEl.innerHTML = '';
        var entries = headingOutline(currentContent);
        if (entries.length === 0) {
          outlineListEl.appendChild(el('div', { className: 'de-outline-empty' }, [
            tr('ui.outlineEmpty', null, 'No headings yet. Start a line with # to create one.')
          ]));
          return;
        }
        entries.forEach(function (entry) {
          outlineListEl.appendChild(el('button', {
            className: 'de-outline-item',
            type: 'button',
            'data-outline-slug': entry.slug,
            'data-outline-line': String(entry.line),
            'data-level': String(entry.level),
            title: entry.title,
            onClick: function () { goToHeading(entry); }
          }, [entry.title]));
        });
      }

      // Jump to a heading in whichever pane the reader is actually looking at.
      function goToHeading(entry) {
        if (previewEl) {
          var target = previewEl.querySelector('[data-heading-slug="' + cssEscape(entry.slug) + '"]');
          if (target && typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ block: 'start' });
          }
        }
        if (textarea) {
          var lines = textarea.value.split('\n');
          var offset = 0;
          for (var i = 0; i < entry.line && i < lines.length; i += 1) offset += lines[i].length + 1;
          textarea.focus();
          textarea.setSelectionRange(offset, offset + (lines[entry.line] || '').length);
          // Put the heading near the top rather than wherever the caret lands.
          var lineHeight = textarea.scrollHeight / Math.max(lines.length, 1);
          textarea.scrollTop = Math.max(0, entry.line * lineHeight - lineHeight);
          if (linesEl) linesEl.scrollTop = textarea.scrollTop;
        }
        markCurrentHeading(entry.slug);
      }

      function markCurrentHeading(slug) {
        if (!outlineListEl) return;
        Array.prototype.forEach.call(outlineListEl.children, function (node) {
          if (!node.getAttribute) return;
          var isCurrent = node.getAttribute('data-outline-slug') === slug;
          node.className = 'de-outline-item' + (isCurrent ? ' is-current' : '');
        });
      }

      function updateLineNumbers() {
        if (!linesEl || !textarea) return;
        var count = textarea.value.split('\n').length;
        var numbers = [];
        for (var i = 1; i <= count; i += 1) numbers.push(String(i));
        linesEl.textContent = numbers.join('\n');
      }

      function updateStatus() {
        if (saveState === 'saving') {
          statusEl.textContent = tr('ui.saving', null, 'Saving...');
          statusEl.className = 'de-status saving';
        } else if (saveState === 'error') {
          statusEl.textContent = tr('ui.saveError', null, 'Error saving');
          statusEl.className = 'de-status error';
        } else if (dirty) {
          statusEl.textContent = tr('ui.modified', null, 'Modified');
          statusEl.className = 'de-status dirty';
        } else if (lastSavedAt) {
          statusEl.textContent = saveState === 'saved' ? tr('ui.savedAt', { time: lastSavedAt }, 'Saved ' + lastSavedAt) : tr('ui.saved', null, 'Saved');
          statusEl.className = 'de-status saved';
        } else {
          statusEl.textContent = '';
          statusEl.className = 'de-status';
        }
        saveBtn.disabled = !dirty || saveState === 'saving';
      }

      function updatePreview() {
        if (previewEl) previewEl.innerHTML = isMarkdown ? renderMarkdown(currentContent, editorMode === 'notes-markdown', secretLinksAvailable) : '<pre>' + escapeHtml(currentContent) + '</pre>';
      }

      function loadSecretProviderAvailability() {
        if (!isMarkdown || !api.contributions || typeof api.contributions.list !== 'function') return;
        api.contributions.list('openProviders').then(function (providers) {
          if (disposed) return;
          secretLinksAvailable = (providers || []).some(function (provider) {
            return (provider.supports || []).some(function (support) {
              return support.kind === 'secret';
            });
          });
          updatePreview();
        }).catch(function () {
          secretLinksAvailable = false;
          updatePreview();
        });
      }

      function syncFromTextarea() {
        if (!textarea) return;
        currentContent = textarea.value;
        dirty = currentContent !== savedContent;
        saveState = '';
        updateLineNumbers();
        updateStatus();
        updatePreview();
        renderOutline();
      }

      function updateWrapPresentation() {
        wrapBtn.setAttribute('aria-pressed', wrapLongLines ? 'true' : 'false');
        wrapBtn.className = 'de-toolbar-btn' + (wrapLongLines ? ' active' : '');
        if (textarea) {
          textarea.className = 'de-textarea' + (wrapLongLines ? ' de-textarea-wrap' : '');
          textarea.setAttribute('wrap', wrapLongLines ? 'soft' : 'off');
        }
      }

      // ── Wiki-link completion ────────────────────────────────────────────
      // Typing [[ offers the notes of this Deal. Without it a link is only
      // usable by someone who already remembers the exact title, which is not
      // how anyone actually writes notes.
      var noteTitles = null;
      var noteTitlesPromise = null;
      var suggestEl = null;
      var suggestItems = [];
      var suggestIndex = 0;
      var suggestStart = -1;

      function notesFolderPath() {
        var current = cleanPath(resourcePath);
        var index = current.indexOf('/Notes/');
        if (index !== -1) return current.slice(0, index) + '/Notes';
        return current.indexOf('/') === -1 ? 'Notes' : current.slice(0, current.lastIndexOf('/'));
      }

      function loadNoteTitles() {
        if (noteTitlesPromise) return noteTitlesPromise;
        noteTitlesPromise = api.files.list(notesFolderPath()).then(function (entries) {
          noteTitles = (entries || [])
            .filter(function (entry) { return entry.type === 'file' && /\.md$/i.test(entry.name || ''); })
            .map(function (entry) { return String(entry.name).replace(/\.md$/i, ''); })
            .filter(function (title) { return title && title !== fileName(resourcePath).replace(/\.md$/i, ''); })
            .sort(function (a, b) { return a.localeCompare(b); });
          return noteTitles;
        }).catch(function () {
          noteTitles = [];
          return noteTitles;
        });
        return noteTitlesPromise;
      }

      function hideSuggestions() {
        if (suggestEl && suggestEl.parentNode) suggestEl.parentNode.removeChild(suggestEl);
        suggestEl = null;
        suggestItems = [];
        suggestIndex = 0;
        suggestStart = -1;
      }

      function suggestionsOpen() {
        return Boolean(suggestEl);
      }

      // The query is the text between the nearest unclosed [[ and the caret.
      function activeLinkQuery() {
        if (!textarea) return null;
        var caret = textarea.selectionStart;
        if (caret !== textarea.selectionEnd) return null;
        var before = textarea.value.slice(0, caret);
        var open = before.lastIndexOf('[[');
        if (open === -1) return null;
        var fragment = before.slice(open + 2);
        // A closed link or a line break means the caret is no longer inside it.
        if (fragment.indexOf(']]') !== -1 || fragment.indexOf('\n') !== -1) return null;
        return { start: open + 2, query: fragment };
      }

      function refreshSuggestions() {
        if (editorMode !== 'notes-markdown' || !textarea) { hideSuggestions(); return; }
        var active = activeLinkQuery();
        if (!active) { hideSuggestions(); return; }
        loadNoteTitles().then(function (titles) {
          if (disposed || !textarea) return;
          // The caret may have moved while the listing was in flight.
          var current = activeLinkQuery();
          if (!current) { hideSuggestions(); return; }
          var needle = current.query.trim().toLowerCase();
          var matches = (titles || []).filter(function (title) {
            return !needle || title.toLowerCase().indexOf(needle) !== -1;
          }).slice(0, 12);
          showSuggestions(current.start, matches);
        });
      }

      function showSuggestions(start, matches) {
        hideSuggestions();
        if (!textarea || !textarea.parentNode) return;
        suggestStart = start;
        suggestItems = matches;
        suggestIndex = 0;
        suggestEl = el('div', { className: 'de-suggest', 'data-note-suggest': '', role: 'listbox' });
        if (matches.length === 0) {
          suggestEl.appendChild(el('div', { className: 'de-suggest-empty' }, [
            tr('ui.linkNoMatches', null, 'No matching note in this Deal')
          ]));
        } else {
          matches.forEach(function (title, index) {
            suggestEl.appendChild(el('button', {
              className: 'de-suggest-item' + (index === 0 ? ' is-active' : ''),
              type: 'button',
              role: 'option',
              'data-note-suggestion': title,
              onMouseDown: function (event) { event.preventDefault(); acceptSuggestion(index); }
            }, [title]));
          });
        }
        positionSuggestions();
        textarea.parentNode.appendChild(suggestEl);
      }

      // Placed under the caret's line. Column-accurate placement would need a
      // mirrored copy of the textarea; the line is enough to keep the list out
      // of the way of what is being typed.
      function positionSuggestions() {
        if (!suggestEl || !textarea) return;
        var upToCaret = textarea.value.slice(0, textarea.selectionStart);
        var line = upToCaret.split('\n').length - 1;
        var totalLines = Math.max(textarea.value.split('\n').length, 1);
        var lineHeight = textarea.scrollHeight / totalLines;
        var top = (line + 1) * lineHeight - textarea.scrollTop + 4;
        suggestEl.style.top = Math.max(4, top) + 'px';
        suggestEl.style.left = '3.5rem';
      }

      function moveSuggestion(delta) {
        if (!suggestEl || suggestItems.length === 0) return;
        suggestIndex = (suggestIndex + delta + suggestItems.length) % suggestItems.length;
        Array.prototype.forEach.call(suggestEl.children, function (node, index) {
          if (!node.className) return;
          node.className = 'de-suggest-item' + (index === suggestIndex ? ' is-active' : '');
        });
      }

      function acceptSuggestion(index) {
        if (!textarea || suggestStart < 0) return;
        var title = suggestItems[typeof index === 'number' ? index : suggestIndex];
        if (!title) return;
        var caret = textarea.selectionStart;
        var before = textarea.value.slice(0, suggestStart);
        var after = textarea.value.slice(caret);
        // Swallow a closing ]] the user already typed rather than doubling it.
        var closing = after.slice(0, 2) === ']]' ? 2 : 0;
        textarea.value = before + title + ']]' + after.slice(closing);
        var position = before.length + title.length + 2;
        textarea.setSelectionRange(position, position);
        hideSuggestions();
        syncFromTextarea();
      }

      function makeEditorPane() {
        var pane = el('div', { className: 'de-pane' });
        var shell = el('div', { className: 'de-editor-shell' });
        linesEl = el('div', { className: 'de-lines' });
        textarea = el('textarea', { className: 'de-textarea', spellcheck: 'false', 'data-editor-textarea': '' });
        textarea.value = currentContent;
        updateWrapPresentation();
        textarea.addEventListener('input', function () {
          syncFromTextarea();
          refreshSuggestions();
        });
        textarea.addEventListener('scroll', function () {
          if (linesEl) linesEl.scrollTop = textarea.scrollTop;
          positionSuggestions();
        });
        textarea.addEventListener('blur', hideSuggestions);
        textarea.addEventListener('click', hideSuggestions);
        textarea.addEventListener('keydown', function (event) {
          // The completion list owns these keys while it is open, so arrows do
          // not move the caret out from under the list the user is reading.
          if (suggestionsOpen()) {
            if (event.key === 'ArrowDown') { event.preventDefault(); moveSuggestion(1); return; }
            if (event.key === 'ArrowUp') { event.preventDefault(); moveSuggestion(-1); return; }
            if (event.key === 'Escape') { event.preventDefault(); hideSuggestions(); return; }
            if ((event.key === 'Enter' || event.key === 'Tab') && suggestItems.length > 0) {
              event.preventDefault();
              acceptSuggestion();
              return;
            }
          }
          if (matchesShortcut(event, { code: 'KeyS', ctrlOrMeta: true })) {
            event.preventDefault();
            save();
          }
          if (event.key === 'Tab') {
            event.preventDefault();
            insertAround(textarea, '  ', '', '');
          }
        });
        shell.appendChild(linesEl);
        shell.appendChild(textarea);
        pane.appendChild(shell);
        updateLineNumbers();
        return pane;
      }

      function makePreviewPane() {
        var pane = el('div', { className: 'de-pane' });
        previewEl = el('div', { className: 'de-preview', 'data-preview': '' });
        pane.appendChild(previewEl);
        updatePreview();
        return pane;
      }

      function rebuildEditorArea() {
        hideSuggestions();
        editorWrap.innerHTML = '';
        textarea = null;
        linesEl = null;
        previewEl = null;
        outlineListEl = null;
        if (isMarkdown && outlineVisible) editorWrap.appendChild(makeOutlinePane());
        if (!isMarkdown || viewMode === 'edit') editorWrap.appendChild(makeEditorPane());
        if (isMarkdown && viewMode === 'preview') editorWrap.appendChild(makePreviewPane());
        if (isMarkdown && viewMode === 'split') {
          editorWrap.appendChild(makeEditorPane());
          editorWrap.appendChild(makePreviewPane());
        }
        if (editBtn) editBtn.className = 'de-toolbar-btn' + (viewMode === 'edit' ? ' active' : '');
        if (previewBtn) previewBtn.className = 'de-toolbar-btn' + (viewMode === 'preview' ? ' active' : '');
        if (splitBtn) splitBtn.className = 'de-toolbar-btn' + (viewMode === 'split' ? ' active' : '');
        if (outlineBtn) {
          outlineBtn.className = 'de-toolbar-btn' + (outlineVisible ? ' active' : '');
          outlineBtn.setAttribute('aria-pressed', outlineVisible ? 'true' : 'false');
        }
        updateStatus();
      }

      function save() {
        if (!dirty || disposed) return Promise.resolve();
        saveState = 'saving';
        updateStatus();
        var savePromise = api.files.writeText(resourcePath, currentContent, { createIfMissing: false, overwrite: true });
        return savePromise.then(function () {
          if (disposed) return;
          savedContent = currentContent;
          dirty = false;
          saveState = 'saved';
          lastSavedAt = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
          updateStatus();
          if (saveTimer) clearTimeout(saveTimer);
          saveTimer = setTimeout(function () {
            if (!disposed) {
              saveState = '';
              updateStatus();
            }
          }, 2500);
        }).catch(function (err) {
          if (disposed) return;
          saveState = 'error';
          updateStatus();
          console.error('[default-editor] save error:', err);
        });
      }

      function reloadFromDisk() {
        if (dirty && !window.confirm(tr('ui.discardConfirm', null, 'Discard unsaved changes and reload from disk?'))) return;
        editorWrap.innerHTML = '';
        editorWrap.appendChild(el('div', { className: 'de-loading' }, [tr('ui.loading', null, 'Loading...')]));
        var readPromise = api.files.readText(resourcePath);
        readPromise.then(function (content) {
          if (disposed) return;
          currentContent = String(content == null ? '' : content);
          savedContent = currentContent;
          dirty = false;
          saveState = '';
          rebuildEditorArea();
        }).catch(function (err) {
          if (disposed) return;
          console.warn('[default-editor] load error:', err);
          editorWrap.innerHTML = '';
          editorWrap.appendChild(el('div', { className: 'de-error' }, [
            el('div', {}, [tr('ui.loadFailed', null, 'Could not load the file. Please try again.')])
          ]));
        });
      }

      function setMode(nextMode) {
        if (!isMarkdown || viewMode === nextMode) return;
        viewMode = nextMode;
        rebuildEditorArea();
      }

      function applyMarkdownAction(action) {
        if (!textarea && viewMode === 'preview') {
          setMode('edit');
        }
        if (!textarea) return;
        if (action === 'heading') prefixLines(textarea, '# ', '');
        else if (action === 'bold') insertAround(textarea, '**', '**', 'bold text');
        else if (action === 'italic') insertAround(textarea, '*', '*', 'italic text');
        else if (action === 'link') insertAround(textarea, '[', '](https://)', 'link text');
        else if (action === 'code') insertAround(textarea, '`', '`', 'code');
        else if (action === 'code-block') insertAround(textarea, '```\n', '\n```', 'code');
        else if (action === 'bullet') prefixLines(textarea, '- ', 'item');
        else if (action === 'numbered') prefixLines(textarea, '1. ', 'item');
        else if (action === 'quote') prefixLines(textarea, '> ', 'quote');
        else if (action === 'task') prefixLines(textarea, '- [ ] ', 'task');
      }

      saveBtn.addEventListener('click', save);
      wrapBtn.addEventListener('click', function () {
        wrapLongLines = !wrapLongLines;
        updateWrapPresentation();
        if (api.settings && typeof api.settings.write === 'function') {
          api.settings.write('wrapLongLines', wrapLongLines).catch(function () {});
        }
      });
      reloadBtn.addEventListener('click', reloadFromDisk);
      if (editBtn) editBtn.addEventListener('click', function () { setMode('edit'); });
      if (previewBtn) previewBtn.addEventListener('click', function () { setMode('preview'); });
      if (splitBtn) splitBtn.addEventListener('click', function () { setMode('split'); });
      if (outlineBtn) outlineBtn.addEventListener('click', function () {
        outlineVisible = !outlineVisible;
        rebuildEditorArea();
        if (api.settings && typeof api.settings.write === 'function') {
          api.settings.write('outlineVisible', outlineVisible).catch(function () {});
        }
      });
      if (mdToolbar) {
        mdToolbar.addEventListener('click', function (event) {
          var button = event.target.closest('[data-md-action]');
          if (!button) return;
          applyMarkdownAction(button.getAttribute('data-md-action'));
        });
      }

      loadSecretProviderAvailability();
      if (api.settings && typeof api.settings.read === 'function') {
        api.settings.read('wrapLongLines').then(function (stored) {
          if (disposed) return;
          wrapLongLines = stored === undefined || stored === null ? true : stored !== false;
          updateWrapPresentation();
        }).catch(function () {
          wrapLongLines = true;
          updateWrapPresentation();
        });
        api.settings.read('outlineVisible').then(function (stored) {
          if (disposed || stored !== true) return;
          outlineVisible = true;
          rebuildEditorArea();
        }).catch(function () {});
      }
      reloadFromDisk();
      var localeUnsubscribe = api.i18n && typeof api.i18n.onDidChangeLocale === 'function'
        ? api.i18n.onDidChangeLocale(function () {
          if (notesBadge) notesBadge.textContent = tr('ui.note', null, 'Note');
          if (editBtn) editBtn.textContent = tr('ui.edit', null, 'Edit');
          if (previewBtn) previewBtn.textContent = tr('ui.preview', null, 'Preview');
          if (splitBtn) splitBtn.textContent = tr('ui.split', null, 'Split');
          reloadBtn.textContent = tr('ui.reload', null, 'Reload');
          saveBtn.textContent = tr('ui.save', null, 'Save');
          wrapBtn.textContent = tr('ui.wrapLongLines', null, 'Wrap long lines');
          if (mdToolbar) {
            [
              ['heading', 'ui.md.heading', 'Heading'], ['bold', 'ui.md.bold', 'Bold'], ['italic', 'ui.md.italic', 'Italic'],
              ['link', 'ui.md.link', 'Link'], ['code', 'ui.md.inlineCode', 'Inline code'], ['code-block', 'ui.md.codeBlock', 'Code block'],
              ['bullet', 'ui.md.bulletList', 'Bullet list'], ['numbered', 'ui.md.numberedList', 'Numbered list'], ['quote', 'ui.md.quote', 'Quote'], ['task', 'ui.md.taskItem', 'Task item']
            ].forEach(function (item) {
              var button = mdToolbar.querySelector('[data-md-action="' + item[0] + '"]');
              if (!button) return;
              var label = tr(item[1], null, item[2]);
              button.setAttribute('title', label);
              button.setAttribute('aria-label', label);
            });
          }
          updateStatus();
        })
        : null;

      containerEl.addEventListener('click', function (event) {
        var secretLink = event.target.closest('.secret-link');
        if (secretLink) {
          event.preventDefault();
          if (!secretLinksAvailable) return;
          var secretID = secretLink.getAttribute('data-secret-id');
          if (!secretID) return;
          api.workbench.openResource({
            kind: 'secret',
            path: decodeURIComponent(secretID),
            mode: 'view',
            context: {
              sourcePluginId: 'verstak.default-editor',
              sourceView: 'editor'
            }
          }).catch(function (err) {
            console.error('[default-editor] open secret link:', err);
          });
          return;
        }
        var link = event.target.closest('.internal-link');
        if (!link) return;
        event.preventDefault();
        var noteTitle = link.getAttribute('data-note-link');
        if (!noteTitle) return;
        var currentPath = cleanPath(resourcePath);
        var notesIdx = currentPath.indexOf('/Notes/');
        var notesRoot = notesIdx === -1 ? 'Notes' : currentPath.slice(0, notesIdx) + '/Notes';
        var targetPath = cleanPath(notesRoot + '/' + normalizeNoteFilename(noteTitle));
        api.workbench.openResource({
          kind: 'vault-file',
          path: targetPath,
          mode: 'view',
          extension: '.md',
          context: {
            sourcePluginId: 'verstak.default-editor',
            sourceView: 'editor',
            isInsideNotesFolder: true,
            notesMode: true
          }
        }).catch(function (err) {
          console.error('[default-editor] open internal link:', err);
        });
      });

      containerEl.__deCleanup = function () {
        disposed = true;
        hideSuggestions();
        if (typeof localeUnsubscribe === 'function') localeUnsubscribe();
        if (saveTimer) clearTimeout(saveTimer);
      };
    },

    unmount: function (containerEl) {
      if (containerEl.__deCleanup) {
        containerEl.__deCleanup();
        containerEl.__deCleanup = null;
      }
      containerEl.innerHTML = '';
    }
  };

  window.VerstakPluginRegister('verstak.default-editor', {
    components: { DefaultEditor: DefaultEditor }
  });
})();
