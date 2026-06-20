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
    '.de-toolbar-mode{font-size:.75rem;color:#4ecca3;padding:.15rem .5rem;border-radius:3px;background:#1a2a3a}',
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
    '.de-editor-shell{flex:1;display:flex;min-width:0;min-height:0;overflow:hidden;background:#0d0d1a}',
    '.de-lines{flex:0 0 auto;min-width:3rem;padding:.75rem .45rem;text-align:right;background:#0a0a15;color:#555;font-family:"SF Mono","Fira Code","Cascadia Code",Consolas,monospace;font-size:.82rem;line-height:1.6;user-select:none;overflow:hidden;white-space:pre}',
    '.de-textarea{flex:1;width:100%;height:100%;resize:none;border:0;outline:0;padding:.75rem;font-family:"SF Mono","Fira Code","Cascadia Code",Consolas,monospace;font-size:.86rem;line-height:1.6;background:#0d0d1a;color:#e0e0e0;tab-size:2;white-space:pre;overflow:auto}',
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
    '.de-notes-badge{font-size:.65rem;padding:.1rem .4rem;border-radius:3px;background:#2a1a3a;color:#b388ff}',
    '.de-notes-info{padding:.45rem .75rem;background:#111126;border-top:1px solid #16213e;font-size:.75rem;color:#8b8ba8;flex-shrink:0}',
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

  function renderInline(text) {
    var html = escapeHtml(text);
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, '<img alt="$1" src="$2">');
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+|mailto:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return html;
  }

  function renderMarkdown(text) {
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
        return '<tr>' + row.map(function (cell) { return '<td>' + renderInline(cell.trim()) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table>');
      table = [];
    }
    function pushParagraph(line) {
      closeList();
      closeTable();
      if (line.trim()) out.push('<p>' + renderInline(line) + '</p>');
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
        out.push('<h' + heading[1].length + '>' + renderInline(heading[2]) + '</h' + heading[1].length + '>');
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
        out.push('<blockquote>' + renderInline(quote[1]) + '</blockquote>');
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
          out.push('<li><input class="task" type="checkbox" disabled ' + (task[1].toLowerCase() === 'x' ? 'checked' : '') + '> ' + renderInline(task[2]) + '</li>');
        } else {
          out.push('<li>' + renderInline((ordered || unordered)[1]) + '</li>');
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
    var selected = value.slice(start, end) || placeholder || '';
    var replacement = selected.split('\n').map(function (line) { return prefix + line; }).join('\n');
    textarea.value = value.slice(0, start) + replacement + value.slice(end);
    textarea.selectionStart = start;
    textarea.selectionEnd = start + replacement.length;
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

      containerEl.setAttribute('data-editor-mode', editorMode);
      containerEl.setAttribute('data-resource-path', resourcePath);
      containerEl.setAttribute('data-request-mode', requestedMode);

      var modeLabel = el('span', { className: 'de-toolbar-mode' }, [editorMode]);
      var contextLabel = el('span', { className: 'de-toolbar-context', title: resourcePath }, [resourcePath || fileName(resourcePath)]);
      var notesBadge = editorMode === 'notes-markdown' ? el('span', { className: 'de-notes-badge', 'data-notes-badge': '' }, ['notes context']) : null;
      var spacer = el('span', { className: 'de-toolbar-spacer' });
      var editBtn = isMarkdown ? el('button', { className: 'de-toolbar-btn', 'data-editor-mode-button': 'edit' }, ['Edit']) : null;
      var previewBtn = isMarkdown ? el('button', { className: 'de-toolbar-btn', 'data-editor-mode-button': 'preview' }, ['Preview']) : null;
      var splitBtn = isMarkdown ? el('button', { className: 'de-toolbar-btn', 'data-editor-mode-button': 'split' }, ['Split']) : null;
      var reloadBtn = el('button', { className: 'de-toolbar-btn', 'data-editor-action': 'reload' }, ['Reload']);
      var saveBtn = el('button', { className: 'de-toolbar-btn', 'data-editor-action': 'save' }, ['Save']);
      var statusEl = el('span', { className: 'de-status', 'data-save-state': '' });
      var toolbarChildren = [modeLabel, contextLabel];
      if (notesBadge) toolbarChildren.push(notesBadge);
      toolbarChildren.push(spacer);
      [editBtn, previewBtn, splitBtn, reloadBtn, saveBtn, statusEl].forEach(function (node) { if (node) toolbarChildren.push(node); });
      containerEl.appendChild(el('div', { className: 'de-toolbar' }, toolbarChildren));

      var mdToolbar = null;
      if (isMarkdown) {
        mdToolbar = el('div', { className: 'de-md-toolbar' });
        [
          ['heading', 'H', 'Heading'],
          ['bold', 'B', 'Bold'],
          ['italic', 'I', 'Italic'],
          ['link', 'Link', 'Link'],
          ['code', 'Code', 'Inline code'],
          ['code-block', '```', 'Code block'],
          ['bullet', '• List', 'Bullet list'],
          ['numbered', '1. List', 'Numbered list'],
          ['quote', 'Quote', 'Quote'],
          ['task', 'Task', 'Task item']
        ].forEach(function (item) {
          mdToolbar.appendChild(el('button', { className: 'de-md-btn', 'data-md-action': item[0], title: item[2] }, [item[1]]));
        });
        containerEl.appendChild(mdToolbar);
      }

      var editorWrap = el('div', { className: 'de-editor-wrap' });
      containerEl.appendChild(editorWrap);

      if (editorMode === 'notes-markdown') {
        containerEl.appendChild(el('div', { className: 'de-notes-info' }, ['Notes context active. Note actions, backlinks, and graph tools are reserved for the future Notes plugin.']));
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
          statusEl.textContent = 'Saving...';
          statusEl.className = 'de-status saving';
        } else if (saveState === 'error') {
          statusEl.textContent = 'Error saving';
          statusEl.className = 'de-status error';
        } else if (dirty) {
          statusEl.textContent = 'Modified';
          statusEl.className = 'de-status dirty';
        } else if (lastSavedAt) {
          statusEl.textContent = saveState === 'saved' ? 'Saved ' + lastSavedAt : 'Saved';
          statusEl.className = 'de-status saved';
        } else {
          statusEl.textContent = '';
          statusEl.className = 'de-status';
        }
        saveBtn.disabled = !dirty || saveState === 'saving';
      }

      function updatePreview() {
        if (previewEl) previewEl.innerHTML = isMarkdown ? renderMarkdown(currentContent) : '<pre>' + escapeHtml(currentContent) + '</pre>';
      }

      function syncFromTextarea() {
        if (!textarea) return;
        currentContent = textarea.value;
        dirty = currentContent !== savedContent;
        saveState = '';
        updateLineNumbers();
        updateStatus();
        updatePreview();
      }

      function makeEditorPane() {
        var pane = el('div', { className: 'de-pane' });
        var shell = el('div', { className: 'de-editor-shell' });
        linesEl = el('div', { className: 'de-lines' });
        textarea = el('textarea', { className: 'de-textarea', spellcheck: 'false', 'data-editor-textarea': '' });
        textarea.value = currentContent;
        textarea.addEventListener('input', syncFromTextarea);
        textarea.addEventListener('scroll', function () { if (linesEl) linesEl.scrollTop = textarea.scrollTop; });
        textarea.addEventListener('keydown', function (event) {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
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
        editorWrap.innerHTML = '';
        textarea = null;
        linesEl = null;
        previewEl = null;
        if (!isMarkdown || viewMode === 'edit') editorWrap.appendChild(makeEditorPane());
        if (isMarkdown && viewMode === 'preview') editorWrap.appendChild(makePreviewPane());
        if (isMarkdown && viewMode === 'split') {
          editorWrap.appendChild(makeEditorPane());
          editorWrap.appendChild(makePreviewPane());
        }
        if (editBtn) editBtn.className = 'de-toolbar-btn' + (viewMode === 'edit' ? ' active' : '');
        if (previewBtn) previewBtn.className = 'de-toolbar-btn' + (viewMode === 'preview' ? ' active' : '');
        if (splitBtn) splitBtn.className = 'de-toolbar-btn' + (viewMode === 'split' ? ' active' : '');
        updateStatus();
      }

      function save() {
        if (!dirty || disposed) return Promise.resolve();
        saveState = 'saving';
        updateStatus();
        return api.files.writeText(resourcePath, currentContent, { createIfMissing: false, overwrite: true }).then(function () {
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
        if (dirty && !window.confirm('Discard unsaved changes and reload from disk?')) return;
        editorWrap.innerHTML = '';
        editorWrap.appendChild(el('div', { className: 'de-loading' }, ['Loading...']));
        api.files.readText(resourcePath).then(function (content) {
          if (disposed) return;
          currentContent = String(content == null ? '' : content);
          savedContent = currentContent;
          dirty = false;
          saveState = '';
          rebuildEditorArea();
        }).catch(function (err) {
          if (disposed) return;
          editorWrap.innerHTML = '';
          editorWrap.appendChild(el('div', { className: 'de-error' }, [
            el('div', {}, ['Failed to load file']),
            el('div', { className: 'de-error-msg' }, [(err && err.message) ? err.message : String(err)])
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
      reloadBtn.addEventListener('click', reloadFromDisk);
      if (editBtn) editBtn.addEventListener('click', function () { setMode('edit'); });
      if (previewBtn) previewBtn.addEventListener('click', function () { setMode('preview'); });
      if (splitBtn) splitBtn.addEventListener('click', function () { setMode('split'); });
      if (mdToolbar) {
        mdToolbar.addEventListener('click', function (event) {
          var button = event.target.closest('[data-md-action]');
          if (!button) return;
          applyMarkdownAction(button.getAttribute('data-md-action'));
        });
      }

      reloadFromDisk();

      containerEl.__deCleanup = function () {
        disposed = true;
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
