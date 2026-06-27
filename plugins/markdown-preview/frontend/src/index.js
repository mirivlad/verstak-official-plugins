/* ===========================================================
   Markdown Preview Plugin — Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  function injectStyles() {
    if (document.getElementById('md-preview-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'md-preview-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  var STYLES = [
    '.mp-root{height:100%;min-height:0;display:flex;flex-direction:column;background:#0d0d1a;color:#d8d8e8;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '.mp-toolbar{display:flex;align-items:center;gap:.5rem;padding:.45rem .75rem;border-bottom:1px solid #16213e;background:#12122a;flex-shrink:0}',
    '.mp-mode{font-size:.72rem;color:#4ecca3;background:#1a2a3a;border-radius:3px;padding:.14rem .45rem}',
    '.mp-path{font-size:.75rem;color:#a0a0bb;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mp-body{flex:1;min-height:0;overflow:auto;padding:1rem 1.2rem;line-height:1.7;font-size:.93rem}',
    '.mp-body h1,.mp-body h2,.mp-body h3,.mp-body h4{color:#f0f0ff;margin:1rem 0 .5rem}',
    '.mp-body h1{font-size:1.55rem;border-bottom:1px solid #16213e;padding-bottom:.35rem}.mp-body h2{font-size:1.3rem;border-bottom:1px solid #16213e;padding-bottom:.25rem}.mp-body h3{font-size:1.12rem}',
    '.mp-body p{margin:.55rem 0}.mp-body code{background:#1a1a2e;padding:.15rem .35rem;border-radius:3px;font-size:.87em;color:#4ecca3}',
    '.mp-body pre{background:#1a1a2e;padding:.85rem;border-radius:4px;overflow:auto;margin:.8rem 0}.mp-body pre code{background:none;padding:0;color:#d8d8e8}',
    '.mp-body ul,.mp-body ol{padding-left:1.5rem;margin:.55rem 0}.mp-body li{margin:.25rem 0}',
    '.mp-body blockquote{border-left:3px solid #4ecca3;margin:.6rem 0;padding:.25rem .85rem;color:#aaa;background:#101028}',
    '.mp-body a{color:#4ecca3;text-decoration:none}.mp-body a:hover{text-decoration:underline}',
    '.mp-body table{border-collapse:collapse;margin:.8rem 0;max-width:100%;display:block;overflow:auto}.mp-body th,.mp-body td{border:1px solid #333;padding:.35rem .6rem;text-align:left}.mp-body th{background:#1a1a2e}',
    '.mp-loading,.mp-error{flex:1;display:flex;align-items:center;justify-content:center;color:#777;padding:2rem}.mp-error{color:#e74c3c;flex-direction:column;gap:.5rem}'
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

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderInline(text) {
    var html = escapeHtml(text);
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+|mailto:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return html;
  }

  function renderMarkdown(markdown) {
    var lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
    var html = [];
    var inCode = false;
    var code = [];
    var inList = false;

    function closeList() {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
    }
    function closeCode() {
      if (inCode) {
        html.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
        code = [];
        inCode = false;
      }
    }

    lines.forEach(function (line) {
      if (/^```/.test(line)) {
        if (inCode) closeCode();
        else {
          closeList();
          inCode = true;
          code = [];
        }
        return;
      }
      if (inCode) {
        code.push(line);
        return;
      }
      if (!line.trim()) {
        closeList();
        return;
      }
      var heading = /^(#{1,4})\s+(.+)$/.exec(line);
      if (heading) {
        closeList();
        html.push('<h' + heading[1].length + '>' + renderInline(heading[2]) + '</h' + heading[1].length + '>');
        return;
      }
      var quote = /^>\s?(.*)$/.exec(line);
      if (quote) {
        closeList();
        html.push('<blockquote>' + renderInline(quote[1]) + '</blockquote>');
        return;
      }
      var item = /^\s*[-*]\s+(.+)$/.exec(line);
      if (item) {
        if (!inList) {
          html.push('<ul>');
          inList = true;
        }
        html.push('<li>' + renderInline(item[1]) + '</li>');
        return;
      }
      closeList();
      html.push('<p>' + renderInline(line) + '</p>');
    });
    closeCode();
    closeList();
    return html.join('\n');
  }

  var MarkdownPreview = {
    mount: function (containerEl, props, api) {
      injectStyles();
      var request = props && props.request || {};
      var path = request.path || '';
      containerEl.innerHTML = '';
      containerEl.className = 'mp-root';
      containerEl.setAttribute('data-plugin-id', 'verstak.markdown-preview');
      containerEl.setAttribute('data-preview-path', path);
      containerEl.appendChild(el('div', { className: 'mp-toolbar' }, [
        el('span', { className: 'mp-mode' }, ['Preview']),
        el('span', { className: 'mp-path' }, [path])
      ]));
      var body = el('div', { className: 'mp-loading' }, ['Loading...']);
      containerEl.appendChild(body);
      api.files.readText(path).then(function (text) {
        body.className = 'mp-body';
        body.innerHTML = renderMarkdown(text);
      }).catch(function (err) {
        body.className = 'mp-error';
        body.textContent = 'Preview error: ' + (err && err.message ? err.message : String(err));
      });
    },
    unmount: function (containerEl) {
      containerEl.innerHTML = '';
    }
  };

  window.VerstakPluginRegister('verstak.markdown-preview', {
    components: { MarkdownPreview: MarkdownPreview }
  });
})();
