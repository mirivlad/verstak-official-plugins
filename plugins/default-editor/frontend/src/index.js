/* ===========================================================
   Default Editor Plugin — Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  /* ── Style injection ─────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('de-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'de-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  var STYLES = [
    '.de-root { display:flex; flex-direction:column; height:100%; min-height:0; overflow:hidden; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif; color:#e0e0e0; }',
    '.de-toolbar { display:flex; align-items:center; gap:0.5rem; padding:0.5rem 0.75rem; border-bottom:1px solid #16213e; flex-shrink:0; background:#12122a; }',
    '.de-toolbar-mode { font-size:0.75rem; color:#4ecca3; padding:0.15rem 0.5rem; border-radius:3px; background:#1a2a3a; }',
    '.de-toolbar-context { font-size:0.7rem; color:#8b8ba8; margin-left:0.25rem; }',
    '.de-toolbar-spacer { flex:1; }',
    '.de-toolbar-btn { font-size:0.75rem; padding:0.25rem 0.6rem; border:1px solid #333; border-radius:4px; background:#1a1a2e; color:#ccc; cursor:pointer; }',
    '.de-toolbar-btn:hover { background:#2a2a4e; border-color:#4ecca3; }',
    '.de-toolbar-btn.active { background:#1a3a2a; border-color:#4ecca3; color:#4ecca3; }',
    '.de-toolbar-btn:disabled { opacity:0.4; cursor:default; }',
    '.de-status { font-size:0.7rem; color:#8b8ba8; padding:0.15rem 0.5rem; }',
    '.de-status.saved { color:#4ecca3; }',
    '.de-status.error { color:#e74c3c; }',
    '.de-status.dirty { color:#f39c12; }',
    '.de-editor-wrap { flex:1; display:flex; min-height:0; overflow:hidden; }',
    '.de-textarea { flex:1; width:100%; height:100%; resize:none; border:none; outline:none; padding:0.75rem; font-family:"SF Mono","Fira Code","Cascadia Code",monospace; font-size:0.85rem; line-height:1.6; background:#0d0d1a; color:#e0e0e0; tab-size:2; }',
    '.de-textarea:focus { outline:none; }',
    '.de-preview { flex:1; height:100%; padding:0.75rem 1rem; overflow-y:auto; background:#0d0d1a; line-height:1.7; font-size:0.9rem; }',
    '.de-preview h1,.de-preview h2,.de-preview h3,.de-preview h4,.de-preview h5,.de-preview h6 { color:#e0e0f0; margin:1rem 0 0.5rem; }',
    '.de-preview h1 { font-size:1.5rem; border-bottom:1px solid #16213e; padding-bottom:0.3rem; }',
    '.de-preview h2 { font-size:1.25rem; border-bottom:1px solid #16213e; padding-bottom:0.25rem; }',
    '.de-preview h3 { font-size:1.1rem; }',
    '.de-preview p { margin:0.5rem 0; }',
    '.de-preview code { background:#1a1a2e; padding:0.15rem 0.35rem; border-radius:3px; font-size:0.85em; color:#4ecca3; }',
    '.de-preview pre { background:#1a1a2e; padding:0.75rem; border-radius:4px; overflow-x:auto; margin:0.75rem 0; }',
    '.de-preview pre code { background:none; padding:0; }',
    '.de-preview ul,.de-preview ol { padding-left:1.5rem; margin:0.5rem 0; }',
    '.de-preview li { margin:0.25rem 0; }',
    '.de-preview blockquote { border-left:3px solid #4ecca3; margin:0.5rem 0; padding:0.25rem 0.75rem; color:#aaa; }',
    '.de-preview a { color:#4ecca3; text-decoration:none; }',
    '.de-preview a:hover { text-decoration:underline; }',
    '.de-preview hr { border:none; border-top:1px solid #16213e; margin:1rem 0; }',
    '.de-preview table { border-collapse:collapse; margin:0.75rem 0; }',
    '.de-preview th,.de-preview td { border:1px solid #333; padding:0.35rem 0.6rem; text-align:left; }',
    '.de-preview th { background:#1a1a2e; }',
    '.de-notes-badge { font-size:0.65rem; padding:0.1rem 0.4rem; border-radius:3px; background:#2a1a3a; color:#b388ff; margin-left:0.5rem; }',
    '.de-notes-info { padding:0.5rem 0.75rem; background:#1a1a2a; border-top:1px solid #16213e; font-size:0.75rem; color:#8b8ba8; flex-shrink:0; }',
    '.de-loading { flex:1; display:flex; align-items:center; justify-content:center; color:#666; }',
    '.de-error { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#e74c3c; gap:0.5rem; }',
    '.de-error-msg { font-size:0.85rem; color:#aaa; max-width:400px; text-align:center; }',
  ].join('\n');

  /* ── Simple markdown renderer (no raw HTML) ──────────────── */
  function renderMarkdown(text) {
    if (!text) return '';
    var html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks (``` ... ```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (_, lang, code) {
      return '<pre><code class="lang-' + (lang || 'text') + '">' + code.trimEnd() + '</code></pre>';
    });

    // Inline code
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // Headings
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Horizontal rule
    html = html.replace(/^---+$/gm, '<hr>');
    html = html.replace(/^\*\*\*+$/gm, '<hr>');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Blockquote
    html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>');

    // Unordered list items
    html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');

    // Ordered list items
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Links [text](url) — render as text since we can't navigate internally
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a title="Link: $2">$1</a>');

    // Images ![alt](src) — render as placeholder
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<span title="Image: $2" style="color:#666">[image: $1]</span>');

    // Paragraphs: double newlines
    html = html.replace(/\n\n+/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>\s*(<(?:h[1-6]|ul|ol|pre|blockquote|hr))/g, '$1');
    html = html.replace(/(<\/(?:h[1-6]|ul|ol|pre|blockquote|hr)>)\s*<\/p>/g, '$1');

    return html;
  }

  /* ── Utilities ──────────────────────────────────────────── */
  function el(tag, attrs, children) {
    var elem = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') elem.className = attrs[k];
        else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(elem.style, attrs[k]);
        else if (k.slice(0, 2) === 'on') elem.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (k === 'innerHTML') elem.innerHTML = attrs[k];
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

  function detectMode(props) {
    var ctx = props.request && props.request.context;
    if (ctx && (ctx.notesMode || ctx.isInsideNotesFolder)) return 'notes-markdown';
    var ext = (props.request && props.request.extension || '').toLowerCase();
    if (ext === '.md' || ext === '.markdown') return 'generic-markdown';
    return 'text';
  }

  function detectContextLabel(mode) {
    if (mode === 'notes-markdown') return 'notes';
    if (mode === 'generic-markdown') return 'markdown';
    return 'text';
  }

  function fileName(path) {
    if (!path) return '';
    var parts = path.split('/');
    return parts[parts.length - 1];
  }

  /* ── DefaultEditor component ─────────────────────────────── */
  var DefaultEditor = {
    mount: function (containerEl, props, api) {
      injectStyles();
      containerEl.innerHTML = '';
      containerEl.className = 'de-root';

      var request = props.request || {};
      var resourcePath = request.path || '';
      var mode = request.mode || 'view';
      var editorMode = detectMode(props);
      var isMarkdown = editorMode === 'generic-markdown' || editorMode === 'notes-markdown';
      var previewVisible = isMarkdown && mode === 'view';

      var currentContent = '';
      var savedContent = '';
      var dirty = false;
      var saveState = ''; // '' | 'saved' | 'error'
      var saveTimer = null;
      var disposed = false;

      // ── Toolbar ──────────────────────────────────────────
      var modeLabel = el('span', { className: 'de-toolbar-mode' }, [editorMode]);
      var contextLabel = el('span', { className: 'de-toolbar-context' }, [fileName(resourcePath)]);

      var notesBadge = null;
      if (editorMode === 'notes-markdown') {
        notesBadge = el('span', { className: 'de-notes-badge' }, ['notes context']);
      }

      var spacer = el('span', { className: 'de-toolbar-spacer' });

      var editBtn = null;
      var previewBtn = null;
      var saveBtn = el('button', { className: 'de-toolbar-btn' }, ['Save']);
      saveBtn.disabled = true;

      if (isMarkdown) {
        editBtn = el('button', { className: 'de-toolbar-btn' + (mode === 'edit' ? ' active' : '') }, ['Edit']);
        previewBtn = el('button', { className: 'de-toolbar-btn' + (previewVisible ? ' active' : '') }, ['Preview']);
        if (mode === 'edit') {
          previewBtn.classList.remove('active');
        }
      }

      var statusEl = el('span', { className: 'de-status' });

      var toolbarChildren = [modeLabel, contextLabel];
      if (notesBadge) toolbarChildren.push(notesBadge);
      toolbarChildren.push(spacer);
      if (editBtn) toolbarChildren.push(editBtn);
      if (previewBtn) toolbarChildren.push(previewBtn);
      toolbarChildren.push(saveBtn);
      toolbarChildren.push(statusEl);

      var toolbar = el('div', { className: 'de-toolbar' }, toolbarChildren);
      containerEl.appendChild(toolbar);

      // ── Editor area ──────────────────────────────────────
      var editorWrap = el('div', { className: 'de-editor-wrap' });
      containerEl.appendChild(editorWrap);

      var textarea = null;
      var previewEl = null;

      if (mode === 'edit' || !isMarkdown) {
        textarea = el('textarea', { className: 'de-textarea', spellcheck: 'false' });
        textarea.value = '';
        editorWrap.appendChild(textarea);

        textarea.addEventListener('input', function () {
          currentContent = textarea.value;
          dirty = currentContent !== savedContent;
          updateStatus();
        });

        textarea.addEventListener('keydown', function (e) {
          if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            save();
          }
          // Tab support
          if (e.key === 'Tab') {
            e.preventDefault();
            var start = textarea.selectionStart;
            var end = textarea.selectionEnd;
            textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + 2;
            textarea.dispatchEvent(new Event('input'));
          }
        });
      }

      if (isMarkdown && previewVisible) {
        previewEl = el('div', { className: 'de-preview' });
        editorWrap.appendChild(previewEl);
      }

      // ── Notes info bar ───────────────────────────────────
      if (editorMode === 'notes-markdown') {
        var notesInfo = el('div', { className: 'de-notes-info' }, [
          'Notes context active — internal links, backlinks, and widgets deferred.'
        ]);
        containerEl.appendChild(notesInfo);
      }

      // ── Status helpers ───────────────────────────────────
      function updateStatus() {
        if (saveState === 'error') {
          statusEl.textContent = 'Error saving';
          statusEl.className = 'de-status error';
        } else if (saveState === 'saved') {
          statusEl.textContent = 'Saved';
          statusEl.className = 'de-status saved';
        } else if (dirty) {
          statusEl.textContent = 'Modified';
          statusEl.className = 'de-status dirty';
        } else {
          statusEl.textContent = '';
          statusEl.className = 'de-status';
        }
        saveBtn.disabled = !dirty;
      }

      function updatePreview() {
        if (previewEl) {
          previewEl.innerHTML = renderMarkdown(currentContent);
        }
      }

      // ── Save ─────────────────────────────────────────────
      function save() {
        if (!dirty || disposed) return;
        saveState = '';
        updateStatus();
        api.files.writeText(resourcePath, currentContent, {
          createIfMissing: false,
          overwrite: true
        }).then(function () {
          if (disposed) return;
          savedContent = currentContent;
          dirty = false;
          saveState = 'saved';
          updateStatus();
          if (saveTimer) clearTimeout(saveTimer);
          saveTimer = setTimeout(function () {
            if (!disposed) { saveState = ''; updateStatus(); }
          }, 2000);
        }).catch(function (err) {
          if (disposed) return;
          saveState = 'error';
          updateStatus();
          console.error('[default-editor] save error:', err);
        });
      }

      // ── Toolbar events ───────────────────────────────────
      saveBtn.addEventListener('click', save);

      if (editBtn) {
        editBtn.addEventListener('click', function () {
          if (mode === 'edit') return;
          mode = 'edit';
          previewVisible = false;
          rebuildEditorArea();
        });
      }

      if (previewBtn) {
        previewBtn.addEventListener('click', function () {
          if (previewVisible) return;
          previewVisible = true;
          mode = isMarkdown ? 'view' : mode;
          rebuildEditorArea();
        });
      }

      function rebuildEditorArea() {
        editorWrap.innerHTML = '';
        textarea = null;
        previewEl = null;

        if (mode === 'edit' || !isMarkdown) {
          textarea = el('textarea', { className: 'de-textarea', spellcheck: 'false' });
          textarea.value = currentContent;
          editorWrap.appendChild(textarea);

          textarea.addEventListener('input', function () {
            currentContent = textarea.value;
            dirty = currentContent !== savedContent;
            updateStatus();
          });

          textarea.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault();
              save();
            }
            if (e.key === 'Tab') {
              e.preventDefault();
              var start = textarea.selectionStart;
              var end = textarea.selectionEnd;
              textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
              textarea.selectionStart = textarea.selectionEnd = start + 2;
              textarea.dispatchEvent(new Event('input'));
            }
          });
        }

        if (isMarkdown && previewVisible) {
          previewEl = el('div', { className: 'de-preview' });
          editorWrap.appendChild(previewEl);
          updatePreview();
        }

        // Update toolbar button states
        if (editBtn) {
          editBtn.className = 'de-toolbar-btn' + (mode === 'edit' ? ' active' : '');
        }
        if (previewBtn) {
          previewBtn.className = 'de-toolbar-btn' + (previewVisible ? ' active' : '');
        }
        updateStatus();
      }

      // ── Load file ────────────────────────────────────────
      editorWrap.appendChild(el('div', { className: 'de-loading' }, ['Loading...']));

      api.files.readText(resourcePath).then(function (content) {
        if (disposed) return;
        editorWrap.innerHTML = '';
        currentContent = content;
        savedContent = content;
        dirty = false;
        rebuildEditorArea();
      }).catch(function (err) {
        if (disposed) return;
        editorWrap.innerHTML = '';
        var msg = (err && err.message) ? err.message : String(err);
        editorWrap.appendChild(el('div', { className: 'de-error' }, [
          el('div', {}, ['Failed to load file']),
          el('div', { className: 'de-error-msg' }, [msg])
        ]));
      });

      // ── Cleanup ──────────────────────────────────────────
      containerEl.__deCleanup = function () {
        disposed = true;
        if (saveTimer) clearTimeout(saveTimer);
      };

      // Set data attributes for testability
      containerEl.setAttribute('data-editor-mode', editorMode);
      containerEl.setAttribute('data-resource-path', resourcePath);
      containerEl.setAttribute('data-request-mode', mode);
    },

    unmount: function (containerEl) {
      if (containerEl.__deCleanup) {
        containerEl.__deCleanup();
        containerEl.__deCleanup = null;
      }
      containerEl.innerHTML = '';
    }
  };

  /* ── Register ────────────────────────────────────────────── */
  window.VerstakPluginRegister('verstak.default-editor', {
    components: {
      DefaultEditor: DefaultEditor
    }
  });

})();
