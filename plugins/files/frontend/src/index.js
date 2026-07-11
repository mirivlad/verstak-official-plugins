/* ===========================================================
   Files Plugin — Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  function injectStyles() {
    if (document.getElementById('files-style-injected')) return;
    var style = document.createElement('style');
    style.id = 'files-style-injected';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  var STYLES = [
    '.files-root{display:flex;flex-direction:column;height:100%;min-height:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:var(--vt-color-text-primary,#f4f7fb);background:var(--vt-color-background,#101020);outline:none}',
    '.files-toolbar{display:flex;align-items:center;gap:.5rem;min-height:2.75rem;padding:.5rem .75rem;border-bottom:1px solid var(--vt-color-border,#202b46);flex-shrink:0;background:var(--vt-color-surface-muted,#111629);flex-wrap:wrap}',
    '.files-toolbar-group{display:inline-flex;align-items:center;gap:.25rem;padding-right:.5rem;border-right:1px solid var(--vt-color-border,#202b46)}',
    '.files-toolbar-group:last-child{border-right:0;padding-right:0}',
    '.files-toolbar-spacer{flex:1}',
    '.files-toolbar-btn,.files-row-btn{display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-secondary,#b7c0d4);cursor:pointer;line-height:1}',
    '.files-toolbar-btn{width:2rem;height:2rem;padding:0}',
    '.files-row-btn{width:1.75rem;height:1.75rem;padding:0}',
    '.files-panel .files-toolbar-btn{width:auto;min-width:4.5rem;padding:0 .65rem}',
    '.files-toolbar-btn svg,.files-row-btn svg{width:16px;height:16px;display:block;fill:currentColor}',
    '.files-toolbar-btn:hover,.files-row-btn:hover{background:var(--vt-color-surface-hover,#1b2440);border-color:var(--vt-color-accent,#4ecca3);color:var(--vt-color-text-primary,#f4f7fb)}',
    '.files-toolbar-btn:focus-visible,.files-row-btn:focus-visible{outline:0;box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34))}',
    '.files-toolbar-btn:disabled,.files-row-btn:disabled{opacity:.45;cursor:default;border-color:var(--vt-color-border,#202b46)}',
    '.files-toolbar-btn.danger,.files-row-btn.danger{color:#ff9aaa;border-color:rgba(233,69,96,.42)}',
    '.files-breadcrumb{display:flex;align-items:center;gap:.25rem;font-size:.8rem;color:var(--vt-color-text-muted,#7f8aa3);min-width:160px;flex:1;overflow:hidden}',
    '.files-breadcrumb-item{color:var(--vt-color-accent,#4ecca3);cursor:pointer;padding:.1rem .3rem;border-radius:var(--vt-radius-sm,4px);white-space:nowrap}',
    '.files-breadcrumb-item:hover{background:var(--vt-color-accent-muted,rgba(78,204,163,.14))}',
    '.files-breadcrumb-current{color:var(--vt-color-text-primary,#f4f7fb);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.files-breadcrumb-sep{color:var(--vt-color-text-muted,#7f8aa3)}',
    '.files-filter,.files-sort,.files-create-input,.files-rename-input{font-size:.78rem;padding:.32rem .5rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-sm,4px);background:#0f1424;color:var(--vt-color-text-primary,#f4f7fb);outline:none}',
    '.files-filter{width:11rem}',
    '.files-sort{width:9.5rem;appearance:none;background-color:#0f1424;background-image:linear-gradient(45deg,transparent 50%,#8b8ba8 50%),linear-gradient(135deg,#8b8ba8 50%,transparent 50%);background-position:calc(100% - 14px) 50%,calc(100% - 9px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;padding-right:1.6rem}',
    '.files-filter:focus,.files-sort:focus,.files-create-input:focus,.files-rename-input:focus{border-color:var(--vt-color-accent,#4ecca3);box-shadow:var(--vt-focus-ring,0 0 0 2px rgba(78,204,163,.34))}',
    '.files-list{flex:1;overflow:auto;min-height:0}',
    '.files-header,.files-item{display:grid;grid-template-columns:minmax(160px,1fr) 90px 90px 150px 220px;align-items:center;gap:.5rem;padding:.38rem .75rem;border-bottom:1px solid rgba(22,33,62,.55)}',
    '.files-header{position:sticky;top:0;background:var(--vt-color-surface-muted,#111629);color:var(--vt-color-text-muted,#7f8aa3);font-size:.7rem;text-transform:uppercase;letter-spacing:.04em;z-index:1}',
    '.files-item{font-size:.84rem;cursor:pointer}',
    '.files-item:hover{background:var(--vt-color-surface-hover,#1b2440)}',
    '.files-item.selected{background:var(--vt-color-surface-selected,rgba(78,204,163,.14));box-shadow:inset 2px 0 0 var(--vt-color-accent,#4ecca3)}',
    '.files-namecell{display:flex;align-items:center;gap:.55rem;min-width:0}',
    '.files-item-icon{width:1.25rem;height:1.25rem;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--vt-color-text-muted,#7f8aa3)}',
    '.files-item-icon svg{display:block;width:16px;height:16px}',
    '.files-item-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.files-item-meta{font-size:.74rem;color:var(--vt-color-text-muted,#7f8aa3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.files-row-actions{display:flex;align-items:center;justify-content:flex-end;gap:.35rem;white-space:nowrap;opacity:.28;transition:opacity .12s ease}',
    '.files-item:hover .files-row-actions,.files-item.selected .files-row-actions{opacity:1}',
    '.files-empty,.files-loading{flex:1;display:flex;align-items:center;justify-content:center;color:var(--vt-color-text-muted,#7f8aa3);font-size:.9rem;padding:2rem}',
    '.files-empty{flex-direction:column;gap:.75rem;text-align:center}',
    '.files-empty-title{color:var(--vt-color-text-secondary,#b7c0d4);font-weight:650}',
    '.files-empty-actions{display:flex;align-items:center;justify-content:center;gap:.5rem;flex-wrap:wrap}',
    '.files-empty-btn{display:inline-flex;align-items:center;justify-content:center;gap:.35rem;min-height:2rem;padding:.35rem .6rem;border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-md,6px);background:var(--vt-color-surface-hover,#1b2440);color:var(--vt-color-text-secondary,#b7c0d4);cursor:pointer;font-size:.78rem}',
    '.files-empty-btn:hover{background:var(--vt-color-surface-hover,#1b2440);border-color:var(--vt-color-accent,#4ecca3)}',
    '.files-empty-btn svg{width:15px;height:15px;display:block;fill:currentColor}',
    '.files-error{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--vt-color-danger,#e94560);gap:.5rem;padding:1rem}',
    '.files-error-msg{font-size:.85rem;color:var(--vt-color-text-secondary,#b7c0d4);max-width:420px;text-align:center}',
    '.files-panel{display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;border-top:1px solid var(--vt-color-border,#202b46);flex-shrink:0;background:var(--vt-color-surface-muted,#111629)}',
    '.files-field-stack{display:flex;flex:1;min-width:160px;flex-direction:column;gap:.25rem}',
    '.files-panel-error{display:none;color:#ff9aaa;font-size:.72rem;line-height:1.2}',
    '.files-create-input,.files-rename-input{flex:1;min-width:160px}',
    '@media(max-width:760px){.files-header,.files-item{grid-template-columns:minmax(130px,1fr) 70px 0 0 150px}.files-header span:nth-child(3),.files-header span:nth-child(4),.files-item-meta.hide-narrow{display:none}.files-toolbar{align-items:stretch}.files-filter,.files-sort{width:100%}}',
    '.files-ctx-menu{position:fixed;z-index:9999;min-width:180px;background:var(--vt-color-surface,#15152c);border:1px solid var(--vt-color-border-strong,#2c456a);border-radius:var(--vt-radius-md,6px);padding:6px 0;box-shadow:var(--vt-elevation-menu,0 14px 32px rgba(0,0,0,.42));font-size:.84rem;color:var(--vt-color-text-primary,#f4f7fb);user-select:none}',
    '.files-ctx-menu-item{padding:6px 16px;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:.5rem}',
    '.files-ctx-menu-item svg{width:14px;height:14px;fill:currentColor;opacity:.9}',
    '.files-ctx-menu-item:hover{background:var(--vt-color-surface-hover,#1b2440)}',
    '.files-ctx-menu-item.danger{color:#ff9aaa}',
    '.files-ctx-menu-item.danger:hover{background:var(--vt-color-danger-muted,rgba(233,69,96,.14));color:#ffc6ce}',
    '.files-ctx-menu-sep{height:1px;background:var(--vt-color-border,#202b46);margin:4px 8px}',
    '.files-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center}',
    '.files-modal{width:400px;max-width:90vw;padding:24px;background:#1a1a2e;border:1px solid #333;border-radius:12px;color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.5)}',
    '.files-modal-title{font-size:.95rem;line-height:1.5;margin-bottom:20px;word-wrap:break-word}',
    '.files-modal-actions{display:flex;justify-content:flex-end;gap:8px}',
    '.files-modal-btn{font-size:.82rem;padding:.4rem 1rem;border:1px solid #333;border-radius:6px;cursor:pointer;font-family:inherit}',
    '.files-modal-btn.cancel{background:#2a2a4e;color:#ccc;border-color:#444}',
    '.files-modal-btn.cancel:hover{background:#3a3a5e}',
    '.files-modal-btn.confirm{background:#4ecca3;color:#111;border-color:#4ecca3}',
    '.files-modal-btn.confirm:hover{background:#3dbb92}',
    '.files-modal-btn.danger{background:#e74c3c;color:#fff;border-color:#e74c3c}',
    '.files-modal-btn.danger:hover{background:#c0392b}',
    '.files-dragging{opacity:.5}',
    '.files-drag-over{outline:2px dashed #4ecca3;outline-offset:-2px;background:rgba(78,204,163,.08)}'
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

  function svgIcon(path) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="' + path + '" fill="currentColor"/></svg>';
  }

  var ACTION_ICONS = {
    back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z',
    forward: 'M4 13h12.17l-5.59 5.59L12 20l8-8-8-8-1.42 1.41L16.17 11H4v2z',
    up: 'M4 12l1.41 1.41L11 7.83V20h2V7.83l5.59 5.58L20 12 12 4l-8 8z',
    refresh: 'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
    folderAdd: 'M20 6h-8.17l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3v2z',
    markdownAdd: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 8V4l5 5h-5zm-6 6h2v-3l2 3h1l2-3v3h2v-6h-2l-2.5 3.5L9 10H7v6z',
    textAdd: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 8V4l5 5h-5zM8 13h8v2H8v-2zm0 4h8v2H8v-2z',
    open: 'M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zM5 5h6V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6h-2v6H5V5z',
    rename: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5-1-1h-5l-1 1H5v2h14V4z',
    trashView: 'M4 4h16v2H4V4zm2 4h12v12H6V8zm2 2v8h8v-8H8zm2 1.5h4V13h-4v-1.5zm0 3h4V16h-4v-1.5zM9 1h6l1 2H8l1-2z',
    external: 'M14 3h7v7h-2V6.41l-9.83 9.83-1.41-1.41L17.59 5H14V3zM5 5h6v2H7v10h10v-4h2v6H5V5z',
    explorer: 'M3 5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v1H3V5Zm0 6h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7Z',
    duplicate: 'M5 3h10v2H5v10H3V5c0-1.1.9-2 2-2zm4 4h10c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H9c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2zm1 2v10h9V9h-9zm3 3h3v2h2v3h-2v2h-3v-2h-2v-3h2v-2z',
    cut: 'M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3L9.64 7.64zM6 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-8.5c-.28 0-.5.22-.5.5s.22.5.5.5.5-.22.5-.5-.22-.5-.5-.5zM19 3l-6 6 2 2 7-8h-3z',
    copy: 'M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
    paste: 'M19 2h-4.18C14.4.84 13.3 0 12 0S9.6.84 9.18 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z',
    restore: 'M13 3a9 9 0 1 1-8.95 8H2l3-3 3 3H6.06A7 7 0 1 0 13 5V3zm-1 5h2v5h4v2h-6V8z'
  };

  function iconButton(action, title, iconKey, onClick, extraClass) {
    iconKey = iconKey || action;
    return el('button', {
      className: (extraClass || 'files-toolbar-btn'),
      'data-files-action': action,
      'data-files-icon': iconKey,
      title: title,
      'aria-label': title,
      innerHTML: svgIcon(ACTION_ICONS[iconKey] || ACTION_ICONS.open),
      onClick: onClick
    });
  }

  function cleanPath(path) {
    return String(path || '').split('/').filter(Boolean).join('/');
  }

  function parentPath(path) {
    path = cleanPath(path);
    var idx = path.lastIndexOf('/');
    return idx === -1 ? '' : path.slice(0, idx);
  }

  function baseName(path) {
    path = cleanPath(path);
    var idx = path.lastIndexOf('/');
    return idx === -1 ? path : path.slice(idx + 1);
  }

  function extension(name) {
    var dot = String(name || '').lastIndexOf('.');
    return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
  }

  function isConflictError(err) {
    var msg = (err && err.message) ? err.message : String(err || '');
    return /conflict|already exists|exists/i.test(msg);
  }

  var FILE_ICONS = {
    folder: 'M3 5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v1H3V5Zm0 6h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7Z',
    markdown: 'M5 3h10l4 4v14H5V3Zm9 1.5V8h3.5L14 4.5ZM8 11h8v2H8v-2Zm0 4h8v2H8v-2Z',
    image: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
    video: 'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z',
    audio: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
    archive: 'M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM6.24 5h11.52l.81.97H5.44l.8-.97zM5 19V8h14v11H5zm8.5-8v-1.5h-3V11H8l4 4 4-4h-2.5z',
    pdf: 'M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM5 6H3v14c0 1.1.9 2 2 2h14v-2H5V6zm10 5.5h1v-3h-1v3z',
    text: 'M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5ZM8 12h8v1.5H8V12Zm0 3h8v1.5H8V15Zm0 3h5v1.5H8V18Z',
    document: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z',
    spreadsheet: 'M8 2h8l6 6v12c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm7 1.5V8h4.5L15 3.5zM10 14l-2 4h1.5l.5-1h2l.5 1h1.5l-2-4H10zm.8 2L12 14.3 13.2 16h-2.4z',
    presentation: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-6-3.5V13h-1.5v4h-1V13H8v-1.5h4V16.5zm1.5 0V13H15c.5 0 .75-.25.75-.5s-.25-.5-.75-.5h-1.5v-1.5H15c1.1 0 2 .9 2 2s-.9 2-2 2h-.5v1.5h-1z',
    code: 'M22 21H2V3h20v18zM4 5v14h16V5H4zm3 4h10v2H7V9zm0 4h6v2H7v-2z',
    database: 'M12 2C7.58 2 4 3.79 4 6v12c0 2.21 3.58 4 8 4s8-1.79 8-4V6c0-2.21-3.58-4-8-4zm0 2c3.87 0 6 1.5 6 2s-2.13 2-6 2-6-1.5-6-2 2.13-2 6-2zM4 13.5V10c0 .5 2.13 2 6 2v3.5c-2.14-.39-3.5-1.14-4-1.67z',
    font: 'M10 4v4h-4v2h4v10h2V10h4V8h-4V4h-2z',
    config: 'M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5Z',
    generic: 'M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5Z'
  };

  var EXT_MAP = {
    md: 'markdown', markdown: 'markdown',
    txt: 'text', text: 'text', log: 'text', rtf: 'text',
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image', bmp: 'image', ico: 'image',
    mp4: 'video', webm: 'video', mkv: 'video', avi: 'video', mov: 'video',
    mp3: 'audio', wav: 'audio', flac: 'audio', ogg: 'audio', m4a: 'audio', aac: 'audio',
    zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive', bz2: 'archive',
    pdf: 'pdf',
    doc: 'document', docx: 'document',
    xls: 'spreadsheet', xlsx: 'spreadsheet', csv: 'spreadsheet', tsv: 'spreadsheet',
    ppt: 'presentation', pptx: 'presentation',
    js: 'code', jsx: 'code', mjs: 'code', cjs: 'code', ts: 'code', tsx: 'code',
    py: 'code', go: 'code', rs: 'code',
    c: 'code', cpp: 'code', h: 'code', hpp: 'code',
    css: 'code', scss: 'code', sass: 'code', less: 'code',
    html: 'code', htm: 'code', php: 'code',
    java: 'code', swift: 'code', kotlin: 'code', rb: 'code',
    sh: 'code', bash: 'code', zsh: 'code',
    json: 'json', yaml: 'json', yml: 'json', toml: 'json',
    xml: 'code',
    sql: 'database', db: 'database', sqlite: 'database',
    env: 'config', ini: 'config', cfg: 'config', conf: 'config',
    ttf: 'font', otf: 'font', woff: 'font', woff2: 'font'
  };

  function fileIconCategory(entry) {
    if (entry.type === 'folder') return 'folder';
    var ext = (entry.extension || extension(entry.name)).toLowerCase();
    return EXT_MAP[ext] || 'generic';
  }

  function fileIconLabel(category) {
    var labels = {
      folder: 'Folder',
      markdown: 'Markdown file',
      image: 'Image file',
      video: 'Video file',
      audio: 'Audio file',
      archive: 'Archive file',
      pdf: 'PDF file',
      text: 'Text file',
      document: 'Document file',
      spreadsheet: 'Spreadsheet file',
      presentation: 'Presentation file',
      code: 'Code file',
      database: 'Database file',
      font: 'Font file',
      config: 'Config file',
      json: 'JSON file',
      generic: 'File'
    };
    return labels[category] || labels.generic;
  }

  function fileIcon(entry) {
    var category = fileIconCategory(entry);
    if (category === 'json') return '{ }';
    return svgIcon(FILE_ICONS[category] || FILE_ICONS.generic);
  }

  function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function formatDate(value) {
    if (!value) return '';
    var date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function typeLabel(entry) {
    if (entry.type === 'folder') return 'folder';
    return (entry.extension || extension(entry.name) || 'file').toLowerCase();
  }

  function confirmModal(message, options) {
    options = options || {};
    var confirmText = options.confirmText || 'Confirm';
    var cancelText = options.cancelText || 'Cancel';
    var isDanger = !!options.danger;
    return new Promise(function (resolve) {
      var overlay = el('div', { className: 'files-modal-overlay' });
      var modal = el('div', { className: 'files-modal' }, [
        el('div', { className: 'files-modal-title', textContent: message }),
        el('div', { className: 'files-modal-actions' }, [
          el('button', { className: 'files-modal-btn cancel', textContent: cancelText, onClick: function () { cleanup(); resolve(false); } }),
          el('button', { className: 'files-modal-btn confirm' + (isDanger ? ' danger' : ''), textContent: confirmText, onClick: function () { cleanup(); resolve(true); } })
        ])
      ]);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      overlay.querySelector('.files-modal-btn').focus();
      function onKeydown(e) {
        if (e.key === 'Escape') { cleanup(); resolve(false); }
      }
      document.addEventListener('keydown', onKeydown);
      function cleanup() {
        document.removeEventListener('keydown', onKeydown);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }
    });
  }

  function copyTextToClipboard(text) {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    if (document && document.createElement && document.body && document.execCommand) {
      var input = document.createElement('textarea');
      input.value = text;
      input.setAttribute('readonly', 'readonly');
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.select();
      try {
        document.execCommand('copy');
        return Promise.resolve();
      } finally {
        if (input.parentNode) input.parentNode.removeChild(input);
      }
    }
    return Promise.reject(new Error('clipboard unavailable'));
  }

  function showExternalFallback(entry, mode, reason) {
    if (!entry) return;
    var pathToShow = entry.relativePath;
    if (mode === 'explorer' && entry.type !== 'folder') {
      pathToShow = parentPath(entry.relativePath) || entry.relativePath;
    }
    var title = mode === 'explorer' ? 'Show in Explorer' : 'Open External';
    var message = title + ' failed.\n' + (reason ? String(reason) + '\n' : '') + 'Vault-relative path:\n' + pathToShow;
    confirmModal(message, { confirmText: 'Copy Path', cancelText: 'Close' }).then(function (copy) {
      if (!copy) return;
      copyTextToClipboard(pathToShow).catch(function (err) {
        console.error('[files] copy path failed:', err);
      });
    });
  }

  var FilesView = {
    mount: function (containerEl, props, api) {
      injectStyles();
      containerEl.innerHTML = '';
      containerEl.className = 'files-root';
      containerEl.setAttribute('tabindex', '0');
      containerEl.setAttribute('data-plugin-id', 'verstak.files');

      var workspaceNode = props && props.workspaceNode;
      var workspaceRoot = cleanPath(props && (props.workspaceRootPath || (workspaceNode && (workspaceNode.rootPath || workspaceNode.name || workspaceNode.id))) || '');
      var workspaceName = workspaceRoot || (workspaceNode && (workspaceNode.name || workspaceNode.title || workspaceNode.id)) || 'Workspace';
      window.__filesHistoryByWorkspace = window.__filesHistoryByWorkspace || {};
      var historyKey = workspaceRoot || workspaceName;
      var savedHistory = window.__filesHistoryByWorkspace[historyKey] || { stack: [''], index: 0, currentPath: '' };
      var currentPath = cleanPath(savedHistory.currentPath || '');
      var entries = [];
      var selectedPaths = {};
      var lastClickedPath = '';
      var filterText = '';
      var sortMode = 'folder-name';
      var createMode = '';
      var renameTarget = null;
      var disposed = false;
      var fileActions = [];
      var contextMenuEntries = [];
      var historyStack = Array.isArray(savedHistory.stack) && savedHistory.stack.length ? savedHistory.stack.map(cleanPath) : [currentPath];
      var historyIndex = Math.max(0, Math.min(Number(savedHistory.index) || 0, historyStack.length - 1));
      if (historyStack[historyIndex] !== currentPath) {
        historyStack = [currentPath];
        historyIndex = 0;
      }
      var navigatingHistory = false;

      function tr(key, params, fallback) {
        if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
        return fallback || key;
      }

      function scopedPath(local) {
        local = cleanPath(local);
        return workspaceRoot ? (local ? workspaceRoot + '/' + local : workspaceRoot) : local;
      }

      function localPath(full) {
        full = cleanPath(full);
        if (!workspaceRoot) return full;
        if (full === workspaceRoot) return '';
        return full.indexOf(workspaceRoot + '/') === 0 ? full.slice(workspaceRoot.length + 1) : full;
      }

      function isWorkspaceEvent(event) {
        var payload = (event && event.payload) || {};
        var path = cleanPath(payload.path || '');
        if (!path) return true;
        return !workspaceRoot || path === workspaceRoot || path.indexOf(workspaceRoot + '/') === 0;
      }

      var toolbar = el('div', { className: 'files-toolbar' });
      var breadcrumb = el('div', { className: 'files-breadcrumb' });
      var backBtn = iconButton('back', tr('ui.back', null, 'Back'), 'back', goBack);
      var forwardBtn = iconButton('forward', tr('ui.forward', null, 'Forward'), 'forward', goForward);
      var upBtn = iconButton('up', tr('ui.up', null, 'Up'), 'up', goUp);
      var refreshBtn = iconButton('refresh', tr('ui.refresh', null, 'Refresh'), 'refresh', loadEntries);
      var newFolderBtn = iconButton('new-folder', tr('ui.newFolder', null, 'New folder'), 'folderAdd', function () { startCreate('folder'); });
      var newMdBtn = iconButton('new-markdown', tr('ui.newMarkdown', null, 'New markdown file'), 'markdownAdd', function () { startCreate('markdown'); });
      var newTextBtn = iconButton('new-text', tr('ui.newText', null, 'New text file'), 'textAdd', function () { startCreate('text'); });
      var openBtn = iconButton('open', tr('ui.open', null, 'Open'), 'open', function () { openEntry(selectedEntry()); });
      var renameBtn = iconButton('rename', tr('ui.rename', null, 'Rename'), 'rename', function () { beginRename(); });
      var trashBtn = iconButton('trash', tr('ui.trash', null, 'Move to trash'), 'trash', function () { trashEntry(); });
      var cutBtn = iconButton('cut', tr('ui.cut', null, 'Cut'), 'cut', function () { cutSelection(); });
      var copyBtn = iconButton('copy', tr('ui.copy', null, 'Copy'), 'copy', function () { copySelection(); });
      var pasteBtn = iconButton('paste', tr('ui.paste', null, 'Paste'), 'paste', function () { pasteEntry(); });
      var filterInput = el('input', { className: 'files-filter', 'data-files-filter': '', placeholder: tr('ui.filter', null, 'Filter current folder') });
      var sortSelect = el('select', { className: 'files-sort', 'data-files-sort': '' }, [
        el('option', { value: 'folder-name' }, [tr('ui.sort.foldersName', null, 'Folders + name')]),
        el('option', { value: 'name-asc' }, [tr('ui.column.name', null, 'Name')]),
        el('option', { value: 'type' }, [tr('ui.column.type', null, 'Type')]),
        el('option', { value: 'modified-desc' }, [tr('ui.column.modified', null, 'Modified')]),
        el('option', { value: 'size-desc' }, [tr('ui.column.size', null, 'Size')])
      ]);
      trashBtn.classList.add('danger');
      toolbar.appendChild(breadcrumb);
      [
        el('div', { className: 'files-toolbar-group', 'aria-label': 'Navigation' }, [backBtn, forwardBtn, upBtn, refreshBtn]),
        el('div', { className: 'files-toolbar-group', 'aria-label': 'Create' }, [newFolderBtn, newMdBtn, newTextBtn]),
        el('div', { className: 'files-toolbar-group', 'aria-label': 'Selection actions' }, [openBtn, renameBtn, trashBtn]),
        el('div', { className: 'files-toolbar-group', 'aria-label': 'Clipboard' }, [cutBtn, copyBtn, pasteBtn]),
        el('span', { className: 'files-toolbar-spacer' }),
        el('div', { className: 'files-toolbar-group', 'aria-label': 'Filter and sort' }, [filterInput, sortSelect])
      ].forEach(function (node) { toolbar.appendChild(node); });
      containerEl.appendChild(toolbar);

      var listContainer = el('div', { className: 'files-list', 'data-files-list': '' });
      containerEl.appendChild(listContainer);

      var createPanel = el('div', { className: 'files-panel', style: { display: 'none' } });
      var createField = el('div', { className: 'files-field-stack' });
      var createInput = el('input', { className: 'files-create-input', 'data-files-create-input': '' });
      var createError = el('div', { className: 'files-panel-error', 'data-files-create-error': '', role: 'alert' });
      var createConfirm = el('button', { className: 'files-toolbar-btn', 'data-files-create-confirm': '' }, [tr('ui.create', null, 'Create')]);
      var createCancel = el('button', { className: 'files-toolbar-btn' }, [tr('ui.cancel', null, 'Cancel')]);
      createField.appendChild(createInput);
      createField.appendChild(createError);
      createPanel.appendChild(createField);
      createPanel.appendChild(createConfirm);
      createPanel.appendChild(createCancel);
      containerEl.appendChild(createPanel);

      var renamePanel = el('div', { className: 'files-panel', style: { display: 'none' } });
      var renameField = el('div', { className: 'files-field-stack' });
      var renameInput = el('input', { className: 'files-rename-input', 'data-files-rename-input': '' });
      var renameError = el('div', { className: 'files-panel-error', 'data-files-rename-error': '', role: 'alert' });
      var renameConfirm = el('button', { className: 'files-toolbar-btn', 'data-files-rename-confirm': '' }, [tr('ui.rename', null, 'Rename')]);
      var renameCancel = el('button', { className: 'files-toolbar-btn' }, [tr('ui.cancel', null, 'Cancel')]);
      renameField.appendChild(renameInput);
      renameField.appendChild(renameError);
      renamePanel.appendChild(renameField);
      renamePanel.appendChild(renameConfirm);
      renamePanel.appendChild(renameCancel);
      containerEl.appendChild(renamePanel);

      function selectedEntry() {
        var keys = Object.keys(selectedPaths);
        if (keys.length === 0) return null;
        return entries.find(function (entry) { return entry.relativePath === keys[0]; }) || null;
      }

      function selectedEntries() {
        return Object.keys(selectedPaths).map(function (path) {
          return entries.find(function (entry) { return entry.relativePath === path; }) || null;
        }).filter(Boolean);
      }

      function selectedCount() {
        return Object.keys(selectedPaths).length;
      }

      function updateButtons() {
        var count = selectedCount();
        upBtn.disabled = !currentPath;
        newFolderBtn.disabled = false;
        newMdBtn.disabled = false;
        newTextBtn.disabled = false;
        openBtn.disabled = count !== 1;
        renameBtn.disabled = count !== 1;
        trashBtn.disabled = count === 0;
        cutBtn.disabled = count === 0;
        copyBtn.disabled = count === 0;
        pasteBtn.disabled = !(window.__filesClipboard && window.__filesClipboard.items && window.__filesClipboard.items.length);
      }

      function updateHistoryButtons() {
        backBtn.disabled = historyIndex <= 0;
        forwardBtn.disabled = historyIndex >= historyStack.length - 1;
      }

      function saveHistoryState() {
        window.__filesHistoryByWorkspace[historyKey] = {
          stack: historyStack.slice(),
          index: historyIndex,
          currentPath: currentPath
        };
      }

      function updateBreadcrumb() {
        breadcrumb.innerHTML = '';
        var root = el('span', { className: currentPath ? 'files-breadcrumb-item' : 'files-breadcrumb-current', onClick: function () { navigateTo(''); } }, [workspaceName]);
        breadcrumb.appendChild(root);
        if (!currentPath) {
          updateButtons();
          return;
        }
        var parts = currentPath.split('/');
        var acc = '';
        parts.forEach(function (part, index) {
          breadcrumb.appendChild(el('span', { className: 'files-breadcrumb-sep' }, ['/']));
          acc += (acc ? '/' : '') + part;
          var cls = index === parts.length - 1 ? 'files-breadcrumb-current' : 'files-breadcrumb-item';
          (function (path) {
            breadcrumb.appendChild(el('span', { className: cls, onClick: function () { if (cls !== 'files-breadcrumb-current') navigateTo(path); } }, [part]));
          })(acc);
        });
        updateButtons();
      }

      function visibleEntries() {
        var q = filterText.trim().toLowerCase();
        var out = entries.filter(function (entry) {
          if (entry.isHidden || entry.isReserved || entry.name === '.verstak') return false;
          return !q || entry.name.toLowerCase().indexOf(q) !== -1;
        });
        out.sort(function (a, b) {
          if (sortMode === 'folder-name') {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
          }
          if (sortMode === 'type') {
            var typeCmp = typeLabel(a).localeCompare(typeLabel(b));
            if (typeCmp) return typeCmp;
          }
          if (sortMode === 'modified-desc') {
            var timeCmp = new Date(b.modifiedAt || 0).getTime() - new Date(a.modifiedAt || 0).getTime();
            if (timeCmp) return timeCmp;
          }
          if (sortMode === 'size-desc') {
            var sizeCmp = (b.size || 0) - (a.size || 0);
            if (sizeCmp) return sizeCmp;
          }
          return a.name.localeCompare(b.name);
        });
        return out;
      }

      function selectEntry(entry, event) {
        if (!entry) {
          selectedPaths = {};
          lastClickedPath = '';
          renderList();
          return;
        }
        var targetPath = entry.relativePath;
        var visible = visibleEntries();

        if (event && (event.ctrlKey || event.metaKey)) {
          if (selectedPaths[targetPath]) {
            delete selectedPaths[targetPath];
          } else {
            selectedPaths[targetPath] = true;
          }
          lastClickedPath = targetPath;
        } else if (event && event.shiftKey && lastClickedPath) {
          var lastIdx = -1;
          var targetIdx = -1;
          for (var i = 0; i < visible.length; i++) {
            if (visible[i].relativePath === lastClickedPath) lastIdx = i;
            if (visible[i].relativePath === targetPath) targetIdx = i;
          }
          if (lastIdx !== -1 && targetIdx !== -1) {
            var lo = Math.min(lastIdx, targetIdx);
            var hi = Math.max(lastIdx, targetIdx);
            for (var j = lo; j <= hi; j++) {
              selectedPaths[visible[j].relativePath] = true;
            }
          }
        } else {
          selectedPaths = {};
          selectedPaths[targetPath] = true;
          lastClickedPath = targetPath;
        }
        renderList();
      }

      function emptyCreateAction(action, label, mode, iconKey) {
        return el('button', {
          className: 'files-empty-btn',
          'data-files-empty-action': action,
          'data-files-icon': iconKey,
          type: 'button',
          title: label,
          'aria-label': label,
          innerHTML: svgIcon(ACTION_ICONS[iconKey]) + '<span>' + label + '</span>',
          onClick: function () { startCreate(mode); }
        });
      }

      function renderEmptyFolderState() {
        return el('div', { className: 'files-empty' }, [
          el('div', { className: 'files-empty-title' }, [tr('ui.emptyFolder', null, 'Empty folder')]),
          el('div', { className: 'files-empty-actions' }, [
            emptyCreateAction('new-folder', tr('ui.newFolder', null, 'New folder'), 'folder', 'folderAdd'),
            emptyCreateAction('new-markdown', tr('ui.newMarkdown', null, 'New markdown file'), 'markdown', 'markdownAdd'),
            emptyCreateAction('new-text', tr('ui.newText', null, 'New text file'), 'text', 'textAdd')
          ])
        ]);
      }

      function renderNoMatchesState() {
        return el('div', { className: 'files-empty' }, [
          el('div', { className: 'files-empty-title' }, [tr('ui.noMatches', null, 'No matches')]),
          el('div', { className: 'files-empty-actions' }, [
            el('button', {
              className: 'files-empty-btn',
              'data-files-empty-action': 'clear-filter',
              'data-files-icon': 'refresh',
              type: 'button',
              title: tr('ui.clearFilter', null, 'Clear filter'),
              'aria-label': tr('ui.clearFilter', null, 'Clear filter'),
              innerHTML: svgIcon(ACTION_ICONS.refresh) + '<span>' + tr('ui.clearFilter', null, 'Clear filter') + '</span>',
              onClick: function () {
                filterText = '';
                filterInput.value = '';
                renderList();
                listContainer.focus();
              }
            })
          ])
        ]);
      }

      function renderList() {
        listContainer.innerHTML = '';
        var header = el('div', { className: 'files-header' }, [
          el('span', {}, [tr('ui.column.name', null, 'Name')]),
          el('span', {}, [tr('ui.column.type', null, 'Type')]),
          el('span', {}, [tr('ui.column.size', null, 'Size')]),
          el('span', {}, [tr('ui.column.modified', null, 'Modified')]),
          el('span', {}, [tr('ui.column.actions', null, 'Actions')])
        ]);
        listContainer.appendChild(header);

        var shown = visibleEntries();
        if (shown.length === 0) {
          listContainer.appendChild(filterText ? renderNoMatchesState() : renderEmptyFolderState());
          updateButtons();
          return;
        }

        shown.forEach(function (entry) {
          var iconCategory = fileIconCategory(entry);
          var iconLabel = fileIconLabel(iconCategory);
          var row = el('div', {
            className: 'files-item' + (selectedPaths[entry.relativePath] ? ' selected' : ''),
            'data-file-name': entry.name,
            'data-file-type': entry.type,
            'data-file-path': entry.relativePath,
            draggable: 'true',
            tabindex: '0',
            onClick: function (e) {
              selectEntry(entry, e);
            },
            onDblclick: function () { openEntry(entry); },
            onDragstart: function (e) {
              var paths = [];
              if (selectedPaths[entry.relativePath] && selectedCount() > 1) {
                paths = Object.keys(selectedPaths);
              } else {
                selectedPaths = {};
                selectedPaths[entry.relativePath] = true;
                lastClickedPath = entry.relativePath;
                renderList();
                paths = [entry.relativePath];
              }
              e.dataTransfer.setData('application/files-paths', JSON.stringify(paths));
              e.dataTransfer.effectAllowed = 'move';
              row.classList.add('files-dragging');
            },
            onDragend: function () { row.classList.remove('files-dragging'); }
          }, [
            el('div', { className: 'files-namecell' }, [
              el('span', { className: 'files-item-icon', 'data-file-icon': iconCategory, title: iconLabel, 'aria-label': iconLabel, innerHTML: fileIcon(entry) }),
              el('span', { className: 'files-item-name', textContent: entry.name, title: entry.name })
            ]),
            el('span', { className: 'files-item-meta' }, [typeLabel(entry)]),
            el('span', { className: 'files-item-meta hide-narrow' }, [entry.type === 'folder' ? '' : formatSize(entry.size)]),
            el('span', { className: 'files-item-meta hide-narrow' }, [formatDate(entry.modifiedAt)]),
            el('div', { className: 'files-row-actions' }, [
              iconButton('row-open', tr('ui.open', null, 'Open'), 'open', function (event) { event.stopPropagation(); openEntry(entry); }, 'files-row-btn'),
              iconButton('row-rename', tr('ui.rename', null, 'Rename'), 'rename', function (event) { event.stopPropagation(); beginRename(entry); }, 'files-row-btn'),
              iconButton('row-trash', tr('ui.trash', null, 'Move to trash'), 'trash', function (event) { event.stopPropagation(); trashEntry(entry); }, 'files-row-btn danger')
            ])
          ]);
          listContainer.appendChild(row);
        });
        updateButtons();
      }

      function loadEntries() {
        selectedPaths = {};
        lastClickedPath = '';
        listContainer.innerHTML = '';
        listContainer.appendChild(el('div', { className: 'files-loading' }, [tr('ui.loading', null, 'Loading...')]));
        updateBreadcrumb();
        api.files.list(scopedPath(currentPath)).then(function (result) {
          if (disposed) return;
          entries = result || [];
          renderList();
        }).catch(function (err) {
          if (disposed) return;
          listContainer.innerHTML = '';
          listContainer.appendChild(el('div', { className: 'files-error' }, [
            el('div', {}, [tr('ui.loadFailed', null, 'Failed to load files')]),
            el('div', { className: 'files-error-msg' }, [(err && err.message) ? err.message : String(err)])
          ]));
        });
      }

      function contributionContextMatches(item, entry) {
        var context = String(item && item.context || '').toLowerCase();
        if (!context || context === '*' || context === 'files' || context === 'vault-entry') return true;
        if (context === 'file') return !entry || entry.type !== 'folder';
        if (context === 'folder' || context === 'directory') return !entry || entry.type === 'folder';
        return false;
      }

      function loadContributionActions() {
        var contributions = api && api.contributions;
        if (!contributions || typeof contributions.list !== 'function') return;
        Promise.all([
          contributions.list('fileActions'),
          contributions.list('contextMenuEntries')
        ]).then(function (result) {
          if (disposed) return;
          fileActions = (result[0] || []).filter(function (item) {
            return item && item.pluginId && item.handler && item.label;
          });
          contextMenuEntries = (result[1] || []).filter(function (item) {
            return item && item.pluginId && item.handler && item.label && contributionContextMatches(item, null);
          });
          renderList();
        }).catch(function (err) {
          console.error('[files] contribution actions:', err);
        });
      }

      function navigateTo(path) {
        var newPath = cleanPath(path);
        if (!navigatingHistory) {
          if (historyIndex < historyStack.length - 1) {
            historyStack = historyStack.slice(0, historyIndex + 1);
          }
          if (historyStack[historyStack.length - 1] !== newPath) {
            historyStack.push(newPath);
            historyIndex = historyStack.length - 1;
          }
        }
        currentPath = newPath;
        cancelCreate();
        cancelRename();
        updateHistoryButtons();
        saveHistoryState();
        loadEntries();
      }

      function goBack() {
        if (historyIndex <= 0) return;
        historyIndex--;
        navigatingHistory = true;
        navigateTo(historyStack[historyIndex]);
        navigatingHistory = false;
      }

      function goForward() {
        if (historyIndex >= historyStack.length - 1) return;
        historyIndex++;
        navigatingHistory = true;
        navigateTo(historyStack[historyIndex]);
        navigatingHistory = false;
      }

      function goUp() {
        if (currentPath) navigateTo(parentPath(currentPath));
      }

      function openEntry(entry) {
        if (!entry) return;
        if (entry.type === 'folder') {
          navigateTo(localPath(entry.relativePath));
          return;
        }
        var ext = entry.extension ? '.' + entry.extension : (extension(entry.name) ? '.' + extension(entry.name) : '');
        var entryLocalPath = localPath(entry.relativePath);
        var isMd = ext === '.md' || ext === '.markdown';
        var isNotes = entryLocalPath.split('/')[0] === 'Notes';
        var context = { sourcePluginId: 'verstak.files', sourceView: 'files' };
        if (isMd && isNotes) {
          context.isInsideNotesFolder = true;
          context.notesMode = true;
        }
        api.workbench.openResource({
          kind: 'vault-file',
          path: entry.relativePath,
          mode: 'view',
          extension: ext,
          context: context
        }).catch(function (err) { console.error('[files] openResource error:', err); });
      }

      function startCreate(mode) {
        createMode = mode;
        createInput.value = '';
        createInput.placeholder = mode === 'folder' ? 'Folder name' : (mode === 'markdown' ? 'Markdown file name' : 'Text file name');
        setCreateError('');
        createPanel.style.display = 'flex';
        createInput.focus();
      }

      function setCreateError(message) {
        createError.textContent = message || '';
        createError.style.display = message ? 'block' : 'none';
        createInput.setAttribute('aria-invalid', message ? 'true' : 'false');
      }

      function validateCreateName(name) {
        if (!name) return 'Name is required';
        if (/[\\/:*?"<>|\x00-\x1f]/.test(name)) return 'Invalid characters in name';
        if (name === '.' || name === '..' || name[0] === ' ' || name[name.length - 1] === ' ' || name[name.length - 1] === '.') return 'Invalid name';
        return '';
      }

      function cancelCreate() {
        createMode = '';
        setCreateError('');
        createPanel.style.display = 'none';
      }

      function confirmCreate() {
        var name = createInput.value.trim();
        var validationError = validateCreateName(name);
        if (validationError) {
          setCreateError(validationError);
          return;
        }
        var mode = createMode;
        if (createMode === 'markdown' && !/\.(md|markdown)$/i.test(name)) name += '.md';
        if (createMode === 'text' && !/\.[^/.]+$/.test(name)) name += '.txt';
        var full = scopedPath(currentPath ? currentPath + '/' + name : name);
        var promise = mode === 'folder'
          ? api.files.createFolder(full)
          : api.files.writeText(full, '', { createIfMissing: true, overwrite: false });
        promise.then(function () {
          cancelCreate();
          loadEntries();
          if (mode !== 'folder') {
            var ext = extension(name);
            api.workbench.openResource({ kind: 'vault-file', path: full, mode: 'edit', extension: ext ? '.' + ext : '', context: { sourcePluginId: 'verstak.files', sourceView: 'files' } }).catch(function () {});
          }
        }).catch(function (err) {
          setCreateError('Error: ' + ((err && err.message) ? err.message : String(err)));
        });
      }

      function beginRename(entry) {
        entry = entry || selectedEntry();
        if (!entry) return;
        renameTarget = entry;
        renameInput.value = entry.name;
        setRenameError('');
        renamePanel.style.display = 'flex';
        renameInput.focus();
        renameInput.select();
      }

      function cancelRename() {
        renameTarget = null;
        setRenameError('');
        renamePanel.style.display = 'none';
      }

      function setRenameError(message) {
        renameError.textContent = message || '';
        renameError.style.display = message ? 'block' : 'none';
        renameInput.setAttribute('aria-invalid', message ? 'true' : 'false');
      }

      function confirmRename() {
        if (!renameTarget) return;
        var newName = renameInput.value.trim();
        if (!newName || newName === renameTarget.name) {
          cancelRename();
          return;
        }
        if (/[\\/:*?"<>|\x00-\x1f]/.test(newName)) {
          setRenameError('Invalid characters in name');
          return;
        }
        if (newName === '.' || newName === '..' || newName[0] === ' ' || newName[newName.length - 1] === ' ' || newName[newName.length - 1] === '.') {
          setRenameError('Invalid name');
          return;
        }
        var from = renameTarget.relativePath;
        var targetParent = parentPath(from);
        var to = targetParent ? targetParent + '/' + newName : newName;
        api.files.metadata(to).then(function () {
          if (to.toLowerCase() === from.toLowerCase() && to !== from) {
            setRenameError('Name differs only by case');
            return;
          }
          setRenameError('A file with that name already exists');
        }, function () {
          api.files.move(from, to, { overwrite: false }).then(function () {
            cancelRename();
            loadEntries();
          }).catch(function (err) {
            if (isConflictError(err)) {
              setRenameError('A file with that name already exists');
              return;
            }
            setRenameError('Error: ' + ((err && err.message) ? err.message : String(err)));
          });
        });
      }

      function trashEntry(entry) {
        var count = selectedCount();
        if (entry) {
          confirmModal('Move "' + entry.name + '" to trash?', { danger: true }).then(function (ok) {
            if (!ok) return;
            api.files.trash(entry.relativePath).then(function () {
              loadEntries();
            }).catch(function (err) { window.alert((err && err.message) ? err.message : String(err)); });
          });
        } else if (count > 1) {
          confirmModal('Move ' + count + ' items to trash?', { danger: true }).then(function (ok) {
            if (!ok) return;
            var paths = Object.keys(selectedPaths);
            Promise.allSettled(paths.map(function (p) { return api.files.trash(p); })).then(function () {
              loadEntries();
            });
          });
        } else {
          var single = selectedEntry();
          if (!single) return;
          trashEntry(single);
        }
      }

      filterInput.addEventListener('input', function () { filterText = filterInput.value; renderList(); });
      sortSelect.addEventListener('change', function () { sortMode = sortSelect.value; renderList(); });
      createConfirm.addEventListener('click', confirmCreate);
      createCancel.addEventListener('click', cancelCreate);
      renameConfirm.addEventListener('click', confirmRename);
      renameCancel.addEventListener('click', cancelRename);
      createInput.addEventListener('input', function () { setCreateError(''); });
      createInput.addEventListener('keydown', function (event) { if (event.key === 'Enter') confirmCreate(); if (event.key === 'Escape') cancelCreate(); });
      renameInput.addEventListener('input', function () { setRenameError(''); });
      renameInput.addEventListener('keydown', function (event) { if (event.key === 'Enter') confirmRename(); if (event.key === 'Escape') cancelRename(); });
      /* --- Context menu --- */
      var ctxMenu = el('div', { className: 'files-ctx-menu', style: { display: 'none' } });
      document.body.appendChild(ctxMenu);

      var ctxTarget = null;

      function hideCtxMenu() {
        ctxMenu.style.display = 'none';
        ctxTarget = null;
      }

      function ctxItem(label, cls, onClick, action, iconKey) {
        return el('div', {
          className: 'files-ctx-menu-item' + (cls ? ' ' + cls : ''),
          'data-files-menu-action': action || '',
          'data-files-menu-icon': iconKey || '',
          onClick: function (e) { e.stopPropagation(); hideCtxMenu(); onClick(); }
        }, [
          iconKey ? el('span', { innerHTML: svgIcon(ACTION_ICONS[iconKey] || ACTION_ICONS.open) }) : null,
          label
        ]);
      }

      function ctxSep() {
        return el('div', { className: 'files-ctx-menu-sep' });
      }

      function openExternalEntry(entry, mode) {
        if (!entry) return;
        var filesApi = api && api.files;
        var action = mode === 'explorer' ? filesApi && filesApi.showInFolder : filesApi && filesApi.openExternal;
        if (typeof action !== 'function') {
          showExternalFallback(entry, mode, 'files external-open API is unavailable.');
          return;
        }
        action(entry.relativePath).catch(function (err) {
          showExternalFallback(entry, mode, err && err.message ? err.message : err);
        });
      }

      function executeContributionAction(action, entry) {
        if (!action || !entry || !api.commands || typeof api.commands.executeFor !== 'function') return;
        api.commands.executeFor(action.pluginId, action.handler, {
          source: 'files',
          actionId: action.id,
          path: entry.relativePath,
          entry: entry,
          currentPath: scopedPath(currentPath),
          workspaceRootPath: workspaceRoot
        }).catch(function (err) {
          console.error('[files] contribution action failed:', err);
        });
      }

      function appendContributionMenuItems(entry) {
        var menuItems = [];
        fileActions.forEach(function (action) {
          menuItems.push(action);
        });
        contextMenuEntries.forEach(function (action) {
          if (contributionContextMatches(action, entry)) menuItems.push(action);
        });
        if (menuItems.length === 0) return;
        ctxMenu.appendChild(ctxSep());
        menuItems.forEach(function (action) {
          ctxMenu.appendChild(ctxItem(action.label, '', function () {
            executeContributionAction(action, entry);
          }, 'contribution-' + action.id, action.icon || 'open'));
        });
      }

      function showCtxMenu(x, y, entry) {
        ctxTarget = entry;
        ctxMenu.innerHTML = '';
        if (entry) {
          if (!selectedPaths[entry.relativePath]) {
            selectedPaths = {};
            selectedPaths[entry.relativePath] = true;
            lastClickedPath = entry.relativePath;
            renderList();
          }
          var isFolder = entry.type === 'folder';
          ctxMenu.appendChild(ctxItem(isFolder ? 'Open Folder' : 'Open', '', function () { openEntry(entry); }, 'open', 'open'));
          ctxMenu.appendChild(ctxItem('Open External', '', function () { openExternalEntry(entry, 'external'); }, 'open-external', 'external'));
          ctxMenu.appendChild(ctxItem('Show in Explorer', '', function () { openExternalEntry(entry, 'explorer'); }, 'show-in-explorer', 'explorer'));
          appendContributionMenuItems(entry);
          ctxMenu.appendChild(ctxSep());
          ctxMenu.appendChild(ctxItem('Rename', '', function () { beginRename(entry); }, 'rename', 'rename'));
          if (entry.type !== 'folder') {
            ctxMenu.appendChild(ctxItem('Duplicate', '', function () { duplicateEntry(entry); }, 'duplicate', 'duplicate'));
          }
          ctxMenu.appendChild(ctxSep());
          ctxMenu.appendChild(ctxItem('Cut', '', function () { cutSelection(); }, 'cut', 'cut'));
          ctxMenu.appendChild(ctxItem('Copy', '', function () { copySelection(); }, 'copy', 'copy'));
          ctxMenu.appendChild(ctxSep());
          ctxMenu.appendChild(ctxItem('Move to Trash', 'danger', function () { trashEntry(); }, 'trash', 'trash'));
        } else {
          ctxMenu.appendChild(ctxItem('New Folder', '', function () { startCreate('folder'); }, 'new-folder', 'folderAdd'));
          ctxMenu.appendChild(ctxItem('New Markdown', '', function () { startCreate('markdown'); }, 'new-markdown', 'markdownAdd'));
          ctxMenu.appendChild(ctxItem('New Text', '', function () { startCreate('text'); }, 'new-text', 'textAdd'));
          if (window.__filesClipboard && window.__filesClipboard.items && window.__filesClipboard.items.length) {
            ctxMenu.appendChild(ctxSep());
            ctxMenu.appendChild(ctxItem('Paste', '', function () { pasteEntry(); }, 'paste', 'paste'));
          }
        }
        ctxMenu.style.display = 'block';
        var mw = ctxMenu.offsetWidth;
        var mh = ctxMenu.offsetHeight;
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        if (x + mw > vw) x = vw - mw - 4;
        if (y + mh > vh) y = vh - mh - 4;
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        ctxMenu.style.left = x + 'px';
        ctxMenu.style.top = y + 'px';
      }

      function duplicateEntry(entry) {
        if (!entry) return;
        console.log('[files] Duplicate:', entry.relativePath);
        var name = entry.name;
        var dot = name.lastIndexOf('.');
        var base = dot > 0 ? name.slice(0, dot) : name;
        var ext = dot > 0 ? name.slice(dot) : '';
        var from = scopedPath(currentPath ? currentPath + '/' + name : name);
        var maxAttempts = 100;

        function tryName(n) {
          var newName = n === 1 ? base + ' (copy)' + ext : base + ' (copy ' + n + ')' + ext;
          var to = scopedPath(currentPath ? currentPath + '/' + newName : newName);
          return api.files.metadata(to).then(function () {
            if (n >= maxAttempts) {
              console.error('[files] Duplicate failed: all ' + maxAttempts + ' name variations are taken');
              return null;
            }
            return tryName(n + 1);
          }, function () {
            return api.files.readText(from).then(function (content) {
              return api.files.writeText(to, content, { createIfMissing: true, overwrite: false });
            });
          });
        }

        tryName(1).then(function (result) {
          if (result !== null) loadEntries();
        }).catch(function (err) {
          console.error('[files] Duplicate failed:', err);
        });
      }

      function clipboardItemsFromSelection() {
        var selected = selectedEntries();
        if (selected.length === 0) return [];
        return selected.map(function (entry) {
          return { path: entry.relativePath, name: entry.name, type: entry.type };
        });
      }

      function setClipboard(action, items) {
        if (!items || !items.length) return;
        window.__filesClipboard = {
          action: action,
          workspaceRoot: workspaceRoot,
          items: items
        };
        updateButtons();
      }

      function cutSelection() {
        setClipboard('cut', clipboardItemsFromSelection());
      }

      function copySelection() {
        var items = clipboardItemsFromSelection().filter(function (item) { return item.type !== 'folder'; });
        if (items.length === 0) return;
        setClipboard('copy', items);
      }

      function uniqueDestinationName(name, occupied) {
        if (!occupied[name]) return name;
        var dot = name.lastIndexOf('.');
        var base = dot > 0 ? name.slice(0, dot) : name;
        var ext = dot > 0 ? name.slice(dot) : '';
        for (var i = 2; i < 100; i += 1) {
          var candidate = base + ' (' + i + ')' + ext;
          if (!occupied[candidate]) return candidate;
        }
        return base + ' (' + Date.now() + ')' + ext;
      }

      function pasteEntry() {
        var clip = window.__filesClipboard;
        if (!clip || !clip.items || clip.items.length === 0) return;
        if (clip.workspaceRoot && clip.workspaceRoot !== workspaceRoot) {
          window.alert('Clipboard items belong to another workspace.');
          return;
        }
        var destinationDir = scopedPath(currentPath);
        var occupied = {};
        entries.forEach(function (entry) { occupied[entry.name] = true; });

        var tasks = clip.items.map(function (item) {
          var newName = uniqueDestinationName(item.name, occupied);
          occupied[newName] = true;
          var to = destinationDir ? destinationDir + '/' + newName : newName;
          if (clip.action === 'cut') {
            if (item.path === to || to.indexOf(item.path + '/') === 0) return Promise.resolve();
            return api.files.move(item.path, to, { overwrite: false });
          }
          return api.files.readText(item.path).then(function (content) {
            return api.files.writeText(to, content, { createIfMissing: true, overwrite: false });
          });
        });

        Promise.allSettled(tasks).then(function () {
          if (clip.action === 'cut') window.__filesClipboard = null;
          loadEntries();
        }).catch(function (err) {
          console.error('[files] Paste failed:', err);
        });
      }

      var onDocClick = function (e) {
        if (!ctxMenu.contains(e.target)) hideCtxMenu();
      };
      var onDocKeydown = function (e) {
        if (e.key === 'Escape') hideCtxMenu();
      };
      document.addEventListener('click', onDocClick);
      document.addEventListener('keydown', onDocKeydown);

      listContainer.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        var row = e.target.closest('.files-item');
        var entry = null;
        if (row) {
          var fp = row.getAttribute('data-file-path');
          entry = entries.find(function (en) { return en.relativePath === fp; }) || null;
        }
        showCtxMenu(e.clientX, e.clientY, entry);
      });

      listContainer.addEventListener('click', function (e) {
        if (!e.target.closest('.files-item')) {
          selectEntry(null);
        }
      });

      function moveFiles(sourcePaths, targetDirPath) {
        var promises = sourcePaths.filter(function (p) { return parentPath(p) !== targetDirPath; }).map(function (p) {
          var name = baseName(p);
          var to = targetDirPath ? targetDirPath + '/' + name : name;
          return api.files.move(p, to, { overwrite: false });
        });
        if (promises.length === 0) return Promise.resolve();
        return Promise.allSettled(promises).then(function () { loadEntries(); });
      }

      listContainer.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var row = e.target.closest('.files-item');
        if (row) {
          row.classList.add('files-drag-over');
        } else {
          listContainer.classList.add('files-drag-over');
        }
      });

      listContainer.addEventListener('dragleave', function (e) {
        var row = e.target.closest('.files-item');
        if (row) row.classList.remove('files-drag-over');
        if (!row) listContainer.classList.remove('files-drag-over');
      });

      listContainer.addEventListener('drop', function (e) {
        e.preventDefault();
        listContainer.classList.remove('files-drag-over');
        var rows = listContainer.querySelectorAll('.files-drag-over');
        for (var i = 0; i < rows.length; i++) rows[i].classList.remove('files-drag-over');
        var raw = e.dataTransfer.getData('application/files-paths');
        if (!raw) return;
        var sourcePaths;
        try { sourcePaths = JSON.parse(raw); } catch (err) { return; }
        if (!sourcePaths || !sourcePaths.length) return;
        var row = e.target.closest('.files-item');
        if (row && row.getAttribute('data-file-type') === 'folder') {
          moveFiles(sourcePaths, row.getAttribute('data-file-path'));
        } else {
          moveFiles(sourcePaths, scopedPath(currentPath));
        }
      });

      var lastMouseHistoryAt = 0;
      var lastMouseHistoryButton = 0;
      function mouseHistoryButton(event) {
        if (event.button === 3 || event.button === 8 || event.buttons === 8 || event.buttons === 128 || event.which === 8) return 'back';
        if (event.button === 4 || event.button === 9 || event.buttons === 16 || event.buttons === 256 || event.which === 9) return 'forward';
        return '';
      }

      function handleMouseHistory(event) {
        var button = mouseHistoryButton(event);
        if (!button) return;

        event.preventDefault();
        event.stopPropagation();

        var now = Date.now();
        if (button === lastMouseHistoryButton && now - lastMouseHistoryAt < 120) return;
        lastMouseHistoryButton = button;
        lastMouseHistoryAt = now;

        try {
          if (window.localStorage && window.localStorage.getItem('verstak-debug') === 'true') {
            console.log('[debug] [Files] mouse history event', {
              type: event.type,
              direction: button,
              button: event.button,
              buttons: event.buttons,
              which: event.which,
              pointerType: event.pointerType || '',
              currentPath: currentPath
            });
          }
        } catch (err) {}

        if (button === 'back') goBack();
        else goForward();
      }

      function handleWindowHistoryKey(event) {
        if (event.defaultPrevented) return;
        if (event.target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].indexOf(event.target.tagName) !== -1) return;

        var key = event.key || '';
        var ctrl = event.ctrlKey || event.metaKey;
        var direction = '';
        if (key === 'ArrowLeft' && event.altKey) direction = 'back';
        else if (key === 'ArrowRight' && event.altKey) direction = 'forward';
        else if (key === '[' && ctrl) direction = 'back';
        else if (key === ']' && ctrl) direction = 'forward';
        else if (key === 'BrowserBack' || key === 'XF86Back' || event.keyCode === 166) direction = 'back';
        else if (key === 'BrowserForward' || key === 'XF86Forward' || event.keyCode === 167) direction = 'forward';
        if (!direction) return;

        event.preventDefault();
        event.stopPropagation();
        if (direction === 'back') goBack();
        else goForward();
      }

      containerEl.addEventListener('mousedown', handleMouseHistory, true);
      containerEl.addEventListener('pointerdown', handleMouseHistory, true);
      window.addEventListener('pointerdown', handleMouseHistory, true);
      document.addEventListener('pointerdown', handleMouseHistory, true);
      window.addEventListener('mousedown', handleMouseHistory, true);
      document.addEventListener('mousedown', handleMouseHistory, true);
      window.addEventListener('mouseup', handleMouseHistory, true);
      window.addEventListener('auxclick', handleMouseHistory, true);
      window.addEventListener('keydown', handleWindowHistoryKey);

      containerEl.addEventListener('keydown', function (event) {
        if (event.target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].indexOf(event.target.tagName) !== -1) return;

        var ITEM_HEIGHT = 38;
        var PAGE_ITEMS = 10;

        function findCurrentIndex(visible) {
          if (lastClickedPath) {
            for (var i = 0; i < visible.length; i++) {
              if (visible[i].relativePath === lastClickedPath) return i;
            }
          }
          var selKeys = Object.keys(selectedPaths);
          if (selKeys.length > 0) {
            for (var j = 0; j < visible.length; j++) {
              if (selectedPaths[visible[j].relativePath]) return j;
            }
          }
          return 0;
        }

        function clamp(val, lo, hi) {
          return val < lo ? lo : (val > hi ? hi : val);
        }

        function scrollToRow(idx) {
          var rows = listContainer.querySelectorAll('.files-item');
          if (rows[idx]) rows[idx].scrollIntoView({ block: 'nearest' });
        }

        function scrollToItem(idx) {
          var rows = listContainer.querySelectorAll('.files-item');
          if (rows[idx]) {
            var row = rows[idx];
            var offset = row.offsetTop - listContainer.offsetTop;
            if (row.offsetTop < listContainer.scrollTop) {
              listContainer.scrollTop = offset;
            } else if (row.offsetTop + row.offsetHeight > listContainer.scrollTop + listContainer.clientHeight) {
              listContainer.scrollTop = offset + row.offsetHeight - listContainer.clientHeight;
            }
          }
        }

        function navigateToIndex(targetIdx, extend) {
          var visible = visibleEntries();
          if (visible.length === 0) return;
          targetIdx = clamp(targetIdx, 0, visible.length - 1);
          if (extend) {
            var anchorIdx = findCurrentIndex(visible);
            var lo = Math.min(anchorIdx, targetIdx);
            var hi = Math.max(anchorIdx, targetIdx);
            for (var k = lo; k <= hi; k++) {
              selectedPaths[visible[k].relativePath] = true;
            }
          } else {
            selectedPaths = {};
            selectedPaths[visible[targetIdx].relativePath] = true;
            lastClickedPath = visible[targetIdx].relativePath;
          }
          renderList();
          scrollToRow(targetIdx);
        }

        function scrollOnly(idx) {
          var visible = visibleEntries();
          if (visible.length === 0) return;
          idx = clamp(idx, 0, visible.length - 1);
          scrollToItem(idx);
        }

        var key = event.key;
        var shift = event.shiftKey;
        var ctrl = event.ctrlKey || event.metaKey;

        if (key === 'Enter') {
          openEntry(selectedEntry());
          return;
        }
        if (key === 'Delete' || key === 'Backspace') {
          trashEntry();
          return;
        }
        if (key === 'F2') {
          beginRename();
          return;
        }
        if (key === 'ArrowLeft' && event.altKey) { event.preventDefault(); goBack(); return; }
        if (key === 'ArrowRight' && event.altKey) { event.preventDefault(); goForward(); return; }
        if (key === '[' && ctrl) { event.preventDefault(); goBack(); return; }
        if (key === ']' && ctrl) { event.preventDefault(); goForward(); return; }

        if (key === 'a' && (ctrl || event.metaKey)) {
          event.preventDefault();
          var vis = visibleEntries();
          selectedPaths = {};
          vis.forEach(function (entry) { selectedPaths[entry.relativePath] = true; });
          lastClickedPath = vis.length > 0 ? vis[vis.length - 1].relativePath : '';
          renderList();
          return;
        }
        if (ctrl && key.toLowerCase() === 'x') {
          event.preventDefault();
          cutSelection();
          return;
        }
        if (ctrl && key.toLowerCase() === 'c') {
          event.preventDefault();
          copySelection();
          return;
        }
        if (ctrl && key.toLowerCase() === 'v') {
          event.preventDefault();
          pasteEntry();
          return;
        }
        if (key === 'Escape') {
          event.preventDefault();
          selectedPaths = {};
          lastClickedPath = '';
          renderList();
          return;
        }

        if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End' || key === 'PageDown' || key === 'PageUp') {
          event.preventDefault();
        }

        var visible = visibleEntries();
        if (visible.length === 0) return;
        var curIdx = findCurrentIndex(visible);

        if (ctrl && (key === 'ArrowDown' || key === 'ArrowUp')) {
          var scrollIdx = key === 'ArrowDown' ? clamp(curIdx + 1, 0, visible.length - 1) : clamp(curIdx - 1, 0, visible.length - 1);
          scrollOnly(scrollIdx);
          return;
        }

        if (key === 'ArrowDown') {
          navigateToIndex(curIdx + 1, shift);
        } else if (key === 'ArrowUp') {
          navigateToIndex(curIdx - 1, shift);
        } else if (key === 'Home') {
          navigateToIndex(0, shift);
        } else if (key === 'End') {
          navigateToIndex(visible.length - 1, shift);
        } else if (key === 'PageDown') {
          var pageSize = listContainer.clientHeight ? Math.floor(listContainer.clientHeight / ITEM_HEIGHT) : PAGE_ITEMS;
          navigateToIndex(curIdx + pageSize, shift);
        } else if (key === 'PageUp') {
          var pageSizeUp = listContainer.clientHeight ? Math.floor(listContainer.clientHeight / ITEM_HEIGHT) : PAGE_ITEMS;
          navigateToIndex(curIdx - pageSizeUp, shift);
        }
      });

      updateHistoryButtons();
      loadContributionActions();
      loadEntries();

      var localeUnsubscribe = null;
      if (api.i18n && typeof api.i18n.onDidChangeLocale === 'function') {
        localeUnsubscribe = api.i18n.onDidChangeLocale(function () {
          [
            [backBtn, 'ui.back', 'Back'], [forwardBtn, 'ui.forward', 'Forward'], [upBtn, 'ui.up', 'Up'],
            [refreshBtn, 'ui.refresh', 'Refresh'], [newFolderBtn, 'ui.newFolder', 'New folder'],
            [newMdBtn, 'ui.newMarkdown', 'New markdown file'], [newTextBtn, 'ui.newText', 'New text file'],
            [openBtn, 'ui.open', 'Open'], [renameBtn, 'ui.rename', 'Rename'], [trashBtn, 'ui.trash', 'Move to trash'],
            [cutBtn, 'ui.cut', 'Cut'], [copyBtn, 'ui.copy', 'Copy'], [pasteBtn, 'ui.paste', 'Paste']
          ].forEach(function (item) {
            var label = tr(item[1], null, item[2]);
            item[0].setAttribute('title', label);
            item[0].setAttribute('aria-label', label);
          });
          filterInput.setAttribute('placeholder', tr('ui.filter', null, 'Filter current folder'));
          createConfirm.textContent = tr('ui.create', null, 'Create');
          createCancel.textContent = tr('ui.cancel', null, 'Cancel');
          renameConfirm.textContent = tr('ui.rename', null, 'Rename');
          renameCancel.textContent = tr('ui.cancel', null, 'Cancel');
          renderList();
        });
      }

      var fileChangedUnsubscribe = null;
      if (api.events && typeof api.events.subscribe === 'function') {
        api.events.subscribe('file.changed', function (event) {
          if (disposed || !isWorkspaceEvent(event)) return;
          loadEntries();
        }).then(function (unsubscribe) {
          fileChangedUnsubscribe = unsubscribe;
        }).catch(function (err) {
          console.error('[files] file.changed subscription:', err);
        });
      }

      containerEl.__filesCleanup = function () {
        disposed = true;
        if (typeof localeUnsubscribe === 'function') localeUnsubscribe();
        if (typeof fileChangedUnsubscribe === 'function') fileChangedUnsubscribe();
        document.removeEventListener('click', onDocClick);
        document.removeEventListener('keydown', onDocKeydown);
        window.removeEventListener('mousedown', handleMouseHistory, true);
        window.removeEventListener('pointerdown', handleMouseHistory, true);
        document.removeEventListener('pointerdown', handleMouseHistory, true);
        containerEl.removeEventListener('pointerdown', handleMouseHistory, true);
        document.removeEventListener('mousedown', handleMouseHistory, true);
        window.removeEventListener('mouseup', handleMouseHistory, true);
        window.removeEventListener('auxclick', handleMouseHistory, true);
        window.removeEventListener('keydown', handleWindowHistoryKey);
        if (ctxMenu && ctxMenu.parentNode) ctxMenu.parentNode.removeChild(ctxMenu);
      };
    },

    unmount: function (containerEl) {
      if (containerEl.__filesCleanup) {
        containerEl.__filesCleanup();
        containerEl.__filesCleanup = null;
      }
      containerEl.innerHTML = '';
    }
  };

  window.VerstakPluginRegister('verstak.files', {
    components: { FilesView: FilesView }
  });
})();
