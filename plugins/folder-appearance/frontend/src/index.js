(function() {
  const LUCIDE_ICONS = [
    "activity","airplay","alert-circle","alert-octagon","alert-triangle","align-center","align-justify","align-left","align-right",
    "anchor","aperture","archive","arrow-down","arrow-left","arrow-right","arrow-up","at-sign","award",
    "banknote","bar-chart","battery","bell","book","bookmark","box","briefcase","briefcase-business","brush","bug","building",
    "calculator","calendar","camera","car","chart-bar","chart-line","check","check-circle","chevron-down","chevron-left","chevron-right","chevron-up",
    "circle","clipboard","clock","cloud","code","coffee","cog","command","compass","copy","copyright","credit-card","crop","crosshair",
    "database","delete","dollar-sign","download","droplet",
    "edit","external-link","eye","eye-off",
    "file","file-text","film","filter","flag","flame","folder","folder-closed","folder-open","folder-tree","frown","function-square",
    "gift","git-branch","git-commit","git-merge","git-pull-request","globe","grid","grip","group",
    "hard-drive","hash","heart","help-circle","hexagon","home",
    "image","inbox","info","italic",
    "key","keyboard",
    "laptop","layers","layout","life-buoy","lightbulb","link","list","loader","lock","log-in","log-out",
    "mail","map","map-pin","maximize","menu","message-circle","mic","minimize","minus","monitor","moon","more-horizontal","more-vertical","mouse-pointer","move","music",
    "navigation","network",
    "octagon","orbit",
    "package","palette","paperclip","pause","pen-tool","percent","phone","pie-chart","pin","play","plus","plus-circle","power","printer",
    "radio","refresh","repeat","rocket","rotate-ccw","rss",
    "save","scissors","search","send","server","settings","share","shield","shopping-bag","shopping-cart","shuffle","sidebar","sliders","smartphone","smile","sort-asc","sort-desc","speaker","square","star","stop-circle","sun","sunrise","sunset",
    "table","tag","target","terminal","thermometer","thumbs-down","thumbs-up","toggle-left","toggle-right","trash","trello","trending-down","trending-up","triangle","truck","tv","type",
    "umbrella","underline","unlock","upload","user","users",
    "video","voicemail","volume",
    "wallet","watch","wifi","wind","wrench",
    "x","x-circle",
    "zap","zoom-in","zoom-out"
  ];

  const COLORS = ["#4ecca3","#e94560","#ffc857","#4da6ff","#b07cd8","#f78c4a","#6b7280","#10b981","#8b5cf6","#f59e0b","#ef4444","#3b82f6"];

  function t(key, locale) {
    const catalogs = {
      en: { title:"Folder Appearance", search:"Search icons", color:"Color", preview:"Preview", save:"Save", cancel:"Cancel", reset:"Reset", noIcon:"Default" },
      ru: { title:"Настройка папки", search:"Поиск значка", color:"Цвет", preview:"Предпросмотр", save:"Сохранить", cancel:"Отмена", reset:"Сбросить", noIcon:"По умолчанию" }
    };
    return (catalogs[locale] || catalogs.en)[key] || key;
  }

  window.VerstakPluginRegister("verstak.folder-appearance", {
    components: {
      FolderAppearanceAction: {
        mount: function(container, props, api) { return mountAppearance(container, props, api, "action"); }
      }
    }
  });

  function mountAppearance(container, props, api, mode) {
    var locale = (api.i18n && api.i18n.getLocale) ? api.i18n.getLocale() : 'en';
    var tr = function(k) { return (api.i18n && api.i18n.t) ? api.i18n.t(k, {}, t(k, locale)) : t(k, locale); };

    var selectedIcon = '';
    var selectedColor = '';
    var searchQuery = '';
    var filteredIcons = LUCIDE_ICONS.slice(0, 48);
    var visible = false;

    // Load existing appearance
    if (api.folders && api.folders.getAppearance && props.folderId) {
      api.folders.getAppearance(props.folderId).then(function(a) {
        if (a) { selectedIcon = a.icon || ''; selectedColor = a.color || ''; render(); }
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
      overlay.innerHTML = '<div class="fa-modal"><div class="fa-header"><h2>' + tr('title') + ' «' + (props.folderName || '') + '»</h2><button class="fa-close-btn">×</button></div>' +
        '<label class="fa-field"><span>' + tr('search') + '</span><input class="fa-input" id="fa-search" type="text" placeholder="' + tr('search') + '..." value="' + searchQuery + '"></label>' +
        '<div class="fa-grid" id="fa-grid"></div>' +
        '<label class="fa-field"><span>' + tr('color') + '</span><div class="fa-colors" id="fa-colors"></div><input class="fa-color-input" id="fa-custom-color" type="color" value="' + (selectedColor || '#4ecca3') + '"></label>' +
        '<div class="fa-preview"><span class="fa-preview-icon" id="fa-preview-icon" style="color:' + (selectedColor || '#4ecca3') + '">' + (selectedIcon ? getIconSvg(selectedIcon) : tr('noIcon')) + '</span><span>' + (props.folderName || '') + '</span></div>' +
        '<div class="fa-actions"><button class="vt-btn" id="fa-reset">' + tr('reset') + '</button><button class="vt-btn" id="fa-cancel">' + tr('cancel') + '</button><button class="vt-btn-p" id="fa-save">' + tr('save') + '</button></div></div>';

      document.body.appendChild(overlay);

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
        prev.innerHTML = selectedIcon ? getIconSvg(selectedIcon) : tr('noIcon');
      }

      function refreshColors() {
        var dots = overlay.querySelectorAll('.fa-color-dot');
        dots.forEach(function(d) { d.className = 'fa-color-dot' + (d.style.backgroundColor === rgbToHex(selectedColor) ? ' selected' : ''); });
      }

      function close() {
        overlay.remove(); visible = false;
      }

      refreshGrid();
    }

    function save() {
      if (api.folders && api.folders.setAppearance && props.folderId) {
        api.folders.setAppearance(props.folderId, { icon: selectedIcon, color: selectedColor }).catch(function(){});
      }
    }

    function getIconSvg(name) {
      return '<svg class="fa-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>';
    }

    function rgbToHex(color) {
      if (!color || !color.startsWith('#')) return color;
      return color;
    }

    render();
    return { unmount: function() { container.innerHTML = ''; } };
  }
})();
