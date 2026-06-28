/* ===========================================================
   File Preview Plugin — Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  var IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'];

  function injectStyles() {
    if (document.getElementById('file-preview-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'file-preview-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  var STYLES = [
    '.fp-root{height:100%;min-height:0;display:flex;flex-direction:column;background:#0d0d1a;color:#d8d8e8;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '.fp-toolbar{display:flex;align-items:center;gap:.5rem;padding:.45rem .75rem;border-bottom:1px solid #16213e;background:#12122a;flex-shrink:0}',
    '.fp-mode{font-size:.72rem;color:#4ecca3;background:#1a2a3a;border-radius:3px;padding:.14rem .45rem}',
    '.fp-path{font-size:.75rem;color:#a0a0bb;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.fp-spacer{flex:1}',
    '.fp-btn{font-size:.75rem;padding:.28rem .58rem;border:1px solid #333;border-radius:4px;background:#1a1a2e;color:#ccc;cursor:pointer}',
    '.fp-btn:hover{background:#2a2a4e;border-color:#4ecca3;color:#4ecca3}',
    '.fp-body{flex:1;min-height:0;overflow:auto;padding:1rem 1.2rem}',
    '.fp-image-wrap{display:flex;align-items:center;justify-content:center;min-height:220px;margin:0 0 1rem;padding:1rem;background:#090914;border:1px solid #16213e;border-radius:6px}',
    '.fp-image{display:block;max-width:100%;max-height:62vh;object-fit:contain}',
    '.fp-meta{display:grid;grid-template-columns:max-content 1fr;gap:.45rem .8rem;max-width:760px;font-size:.86rem}',
    '.fp-meta dt{color:#8b8ba8}.fp-meta dd{margin:0;color:#e0e0e0;word-break:break-word}',
    '.fp-kind{margin:0 0 1rem;color:#f0f0ff;font-size:1.1rem}',
    '.fp-loading,.fp-error{flex:1;display:flex;align-items:center;justify-content:center;color:#777;padding:2rem}.fp-error{color:#e74c3c;flex-direction:column;gap:.5rem}'
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

  function extension(path, explicit) {
    if (explicit) return String(explicit).replace(/^\./, '').toLowerCase();
    var name = String(path || '').split('/').pop() || '';
    var idx = name.lastIndexOf('.');
    return idx === -1 ? '' : name.slice(idx + 1).toLowerCase();
  }

  function formatSize(size) {
    size = Number(size || 0);
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function imageMime(ext, hint) {
    if (hint && String(hint).indexOf('image/') === 0) return String(hint);
    if (ext === 'jpg') return 'image/jpeg';
    if (ext === 'svg') return 'image/svg+xml';
    if (IMAGE_EXTS.indexOf(ext) !== -1) return 'image/' + ext;
    return 'application/octet-stream';
  }

  function renderImage(body, path, meta, ext, bytes) {
    var src = 'data:' + imageMime(ext, bytes && bytes.mimeHint || meta && meta.mimeHint) + ';base64,' + (bytes && bytes.dataBase64 || '');
    var img = el('img', {
      className: 'fp-image',
      src: src,
      alt: path,
      'data-preview-image': 'true'
    });
    var wrap = el('div', { className: 'fp-image-wrap' }, [img]);
    body.appendChild(wrap);
  }

  function renderMeta(body, path, meta, ext) {
    body.className = 'fp-body';
    body.innerHTML = '';
    body.appendChild(el('h2', { className: 'fp-kind' }, [IMAGE_EXTS.indexOf(ext) !== -1 ? 'Image Preview' : 'File Preview']));
    var dl = el('dl', { className: 'fp-meta' }, [
      el('dt', {}, ['Path']), el('dd', {}, [path]),
      el('dt', {}, ['Type']), el('dd', {}, [meta.type || 'file']),
      el('dt', {}, ['Extension']), el('dd', {}, [ext || '-']),
      el('dt', {}, ['Size']), el('dd', {}, [formatSize(meta.size)]),
      el('dt', {}, ['Modified']), el('dd', {}, [meta.modifiedAt || '-'])
    ]);
    body.appendChild(dl);
  }

  var FilePreview = {
    mount: function (containerEl, props, api) {
      injectStyles();
      var request = props && props.request || {};
      var path = request.path || '';
      var ext = extension(path, request.extension);
      containerEl.innerHTML = '';
      containerEl.className = 'fp-root';
      containerEl.setAttribute('data-plugin-id', 'verstak.file-preview');
      containerEl.setAttribute('data-preview-path', path);

      var openButton = el('button', {
        className: 'fp-btn',
        'data-action': 'open-external',
        textContent: 'Open External',
        onClick: function () {
          if (api.files.openExternal) api.files.openExternal(path).catch(function (err) { console.error('[file-preview] openExternal:', err); });
        }
      });
      containerEl.appendChild(el('div', { className: 'fp-toolbar' }, [
        el('span', { className: 'fp-mode' }, ['Preview']),
        el('span', { className: 'fp-path' }, [path]),
        el('span', { className: 'fp-spacer' }),
        openButton
      ]));

      var body = el('div', { className: 'fp-loading' }, ['Loading...']);
      containerEl.appendChild(body);

      api.files.metadata(path).then(function (meta) {
        renderMeta(body, path, meta || {}, ext);
        if (IMAGE_EXTS.indexOf(ext) === -1 || !api.files.readBytes) return null;
        return api.files.readBytes(path).then(function (bytes) {
          if (bytes && bytes.dataBase64) renderImage(body, path, meta || {}, ext, bytes);
          return null;
        });
      }).catch(function (err) {
        body.className = 'fp-error';
        body.textContent = 'Preview error: ' + (err && err.message ? err.message : String(err));
      });
    },
    unmount: function (containerEl) {
      containerEl.innerHTML = '';
    }
  };

  window.VerstakPluginRegister('verstak.file-preview', {
    components: { FilePreview: FilePreview }
  });
})();
