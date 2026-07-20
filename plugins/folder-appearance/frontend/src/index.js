(function() {
  const ICON_PATHS = {
    "folder": '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    "briefcase-business": '<path d="M12 12h.01"/><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M22 13a18.15 18.15 0 0 1-20 0"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
    "calendar": '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    "star": '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    "book": '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
    "code": '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
    "database": '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    "file-text": '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    "globe": '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    "heart": '<path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/>',
    "inbox": '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    "palette": '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/>',
    "rocket": '<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09"/><path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05"/>',
    "settings": '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>',
    "tag": '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
    "terminal": '<path d="M12 19h8"/><path d="m4 17 6-6-6-6"/>',
    "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>'
  };
  const LUCIDE_ICONS = Object.keys(ICON_PATHS);

  const COLORS = ["#4ecca3","#e94560","#ffc857","#4da6ff","#b07cd8","#f78c4a","#6b7280","#10b981","#8b5cf6","#f59e0b","#ef4444","#3b82f6"];

  function t(key, locale) {
    const catalogs = {
      en: { title:"Folder Appearance", search:"Search icons", color:"Color", preview:"Preview", save:"Save", cancel:"Cancel", reset:"Reset", noIcon:"Default" },
      ru: { title:"Настройка папки", search:"Поиск значка", color:"Цвет", preview:"Предпросмотр", save:"Сохранить", cancel:"Отмена", reset:"Сбросить", noIcon:"По умолчанию" }
    };
    return (catalogs[locale] || catalogs.en)[key] || key;
  }

  try {
    window.VerstakPluginRegister("verstak.folder-appearance", {
      components: {
        FolderAppearanceAction: {
          mount: function(container, props, api) { return mountAppearance(container, props, api, "action"); }
        }
      }
    });
  } catch(e) {
    console.error("[folder-appearance] registration failed:", e);
  }

  function mountAppearance(container, props, api, mode) {
    var locale = (api.i18n && api.i18n.getLocale) ? api.i18n.getLocale() : 'en';
    var tr = function(k) { return (api.i18n && api.i18n.t) ? api.i18n.t(k, {}, t(k, locale)) : t(k, locale); };

    var selectedIcon = '';
    var selectedColor = '';
    var searchQuery = '';
    var filteredIcons = LUCIDE_ICONS.slice(0, 48);
    var visible = false;

    // Load existing appearance
    if ((api||{}).folders && (api||{}).folders.getAppearance && (props||{}).folderId) {
      (api||{}).folders.getAppearance((props||{}).folderId).then(function(a) {
        if (a) {
          selectedIcon = ICON_PATHS[a.iconId] ? a.iconId : '';
          selectedColor = normalizeColor(a.colorId);
          render();
        }
      }).catch(function(){});
    }

    function render() {
      container.innerHTML = '';
      if (mode === 'action') {
        var btn = document.createElement('button');
        btn.className = 'ti-btn';
        btn.title = tr('title');
        btn.setAttribute('aria-label', tr('title'));
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>';
        btn.addEventListener('click', function(e) { e.stopPropagation(); openPicker(); });
        container.appendChild(btn);
      }
    }

    function openPicker() {
      visible = true;
      filteredIcons = searchQuery ? LUCIDE_ICONS.filter(function(i) { return i.indexOf(searchQuery.toLowerCase()) !== -1; }) : LUCIDE_ICONS.slice(0, 48);

      var overlay = document.createElement('div');
      overlay.className = 'fa-overlay';
      overlay.innerHTML = '<div class="fa-modal"><div class="fa-header"><h2 id="fa-title"></h2><button class="fa-close-btn">×</button></div>' +
        '<label class="fa-field"><span id="fa-search-label"></span><input class="fa-input" id="fa-search" type="text"></label>' +
        '<div class="fa-grid" id="fa-grid"></div>' +
        '<label class="fa-field"><span id="fa-color-label"></span><div class="fa-colors" id="fa-colors"></div><input class="fa-color-input" id="fa-custom-color" type="color"></label>' +
        '<div class="fa-preview"><span class="fa-preview-icon" id="fa-preview-icon"></span><span id="fa-folder-name"></span></div>' +
        '<div class="fa-actions"><button class="vt-btn" id="fa-reset"></button><button class="vt-btn" id="fa-cancel"></button><button class="vt-btn-p" id="fa-save"></button></div></div>';

      document.body.appendChild(overlay);

      overlay.querySelector('#fa-title').textContent = tr('title') + ' «' + (props.folderName || '') + '»';
      overlay.querySelector('#fa-search-label').textContent = tr('search');
      overlay.querySelector('#fa-color-label').textContent = tr('color');
      overlay.querySelector('#fa-folder-name').textContent = props.folderName || '';
      overlay.querySelector('#fa-reset').textContent = tr('reset');
      overlay.querySelector('#fa-cancel').textContent = tr('cancel');
      overlay.querySelector('#fa-save').textContent = tr('save');
      overlay.querySelector('#fa-search').placeholder = tr('search') + '...';
      overlay.querySelector('#fa-search').value = searchQuery;
      overlay.querySelector('#fa-custom-color').value = selectedColor || '#4ecca3';

      overlay.querySelector('.fa-close-btn').addEventListener('click', close);
      overlay.querySelector('#fa-cancel').addEventListener('click', close);
      overlay.querySelector('#fa-reset').addEventListener('click', function() { selectedIcon = ''; selectedColor = ''; close(); save(); });
      overlay.querySelector('#fa-save').addEventListener('click', function() { close(); save(); });
      overlay.querySelector('#fa-search').addEventListener('input', function(e) { searchQuery = e.target.value; refreshGrid(); });
      overlay.querySelector('#fa-custom-color').addEventListener('input', function(e) { selectedColor = e.target.value; updatePreview(); });

      var colorsEl = overlay.querySelector('#fa-colors');
      COLORS.forEach(function(c) {
        var dot = document.createElement('span');
        dot.className = 'fa-color-dot' + (c === selectedColor ? ' selected' : '');
        dot.dataset = { color: c };
        dot.style.backgroundColor = c;
        dot.addEventListener('click', function() { selectedColor = c; updatePreview(); refreshColors(); });
        colorsEl.appendChild(dot);
      });

      function refreshGrid() {
        filteredIcons = searchQuery ? LUCIDE_ICONS.filter(function(i) { return i.indexOf(searchQuery.toLowerCase()) !== -1; }) : LUCIDE_ICONS.slice(0, 48);
        var grid = overlay.querySelector('#fa-grid');
        grid.innerHTML = '';
        filteredIcons.forEach(function(icon) {
          var item = document.createElement('div');
          item.className = 'fa-icon-item' + (icon === selectedIcon ? ' selected' : '');
          item.title = icon;
          item.innerHTML = getIconSvg(icon);
          item.addEventListener('click', function() { selectedIcon = icon; refreshGrid(); updatePreview(); });
          grid.appendChild(item);
        });
      }

      function updatePreview() {
        var prev = overlay.querySelector('#fa-preview-icon');
        prev.style.color = selectedColor || '#4ecca3';
        if (selectedIcon) {
          prev.innerHTML = getIconSvg(selectedIcon);
        } else {
          prev.innerHTML = '';
          prev.textContent = tr('noIcon');
        }
      }

      function refreshColors() {
        var dots = overlay.querySelectorAll('.fa-color-dot');
        dots.forEach(function(d) { d.className = 'fa-color-dot' + (d.dataset.color === selectedColor ? ' selected' : ''); });
      }

      function close() {
        overlay.remove(); visible = false;
      }

      refreshGrid();
      updatePreview();
    }

    function save() {
      if ((api||{}).folders && (api||{}).folders.setAppearance && (props||{}).folderId) {
        (api||{}).folders.setAppearance((props||{}).folderId, { iconId: selectedIcon, colorId: selectedColor }).catch(function(){});
      }
    }

    function getIconSvg(name) {
      return '<svg class="fa-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICON_PATHS[name] || ICON_PATHS.folder) + '</svg>';
    }

    function normalizeColor(color) {
      return /^#[0-9a-f]{6}$/i.test(color || '') ? color : '';
    }

    render();
    return { unmount: function() { container.innerHTML = ''; } };
  }
})();
