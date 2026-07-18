// Verstak Workspace Folders Plugin
// Full nested folder tree with icons, colors, drag-and-drop.
// Replaces the default WorkspaceTree via workspaceTree contribution.

(function () {
  'use strict';

  // ─── Icon data ───────────────────────────────────────────
  var ICONS = ["a-arrow-down","a-arrow-up","accessibility","activity","airplay","air-vent","a-large-small","alarm-clock","alarm-clock-check","alarm-clock-minus","alarm-clock-off","alarm-clock-plus","alarm-smoke","album","align-center-horizontal","align-center-vertical","align-end-horizontal","align-end-vertical","align-horizontal-distribute-center","align-horizontal-distribute-end","align-horizontal-distribute-start","align-horizontal-justify-center","align-horizontal-justify-end","align-horizontal-justify-start","align-horizontal-space-around","align-horizontal-space-between","align-start-horizontal","align-start-vertical","align-vertical-distribute-center","align-vertical-distribute-end","align-vertical-distribute-start","align-vertical-justify-center","align-vertical-justify-end","align-vertical-justify-start","align-vertical-space-around","align-vertical-space-between","ambulance","ampersand","ampersands","amphora","anchor","angry","annoyed","antenna","anvil","aperture","app-window","app-window-mac","apple","archive","archive-restore","archive-x","area-chart","armchair","arrow-big-down","arrow-big-down-dash","arrow-big-left","arrow-big-left-dash","arrow-big-right","arrow-big-right-dash","arrow-big-up","arrow-big-up-dash","arrow-down","arrow-down-0-1","arrow-down-1-0","arrow-down-a-z","arrow-down-az","arrow-down-from-line","arrow-down-left","arrow-down-left-from-circle","arrow-down-left-from-square","arrow-down-left-square","arrow-down-narrow-wide","arrow-down-right","arrow-down-right-from-circle","arrow-down-right-from-square","arrow-down-right-square","arrow-down-to-dot","arrow-down-to-line","arrow-down-up","arrow-down-wide-narrow","arrow-down-z-a","arrow-down-za","arrow-left","arrow-left-from-line","arrow-left-right","arrow-left-to-line","arrow-right","arrow-right-from-line","arrow-right-left","arrow-right-to-line","arrow-up","arrow-up-0-1","arrow-up-1-0","arrow-up-a-z","arrow-up-az","arrow-up-down","arrow-up-from-dot","arrow-up-from-line","arrow-up-left","arrow-up-left-from-circle","arrow-up-left-from-square","arrow-up-left-square","arrow-up-narrow-wide","arrow-up-right","arrow-up-right-from-circle","arrow-up-right-from-square","arrow-up-right-square","arrow-up-to-line","arrow-up-wide-narrow","arrow-up-z-a","arrow-up-za","arrows-up-from-line","asterisk","asterisk-square","at-sign","atom","audio-lines","audio-waveform","award","axe","axis-3d","baby","backpack","badge","badge-alert","badge-cent","badge-check","badge-dollar-sign","badge-euro","badge-help","badge-indian-rupee","badge-info","badge-japanese-yen","badge-minus","badge-percent","badge-plus","badge-pound-sterling","badge-russian-ruble","badge-swiss-franc","badge-x","baggage-claim","ban","banana","bandage","banknote","bar-chart","bar-chart-2","bar-chart-3","bar-chart-4","bar-chart-big","barcode","baseline","bath","battery","battery-charging","battery-full","battery-low","battery-medium","battery-warning","beaker","bean","bean-off","bed","bed-double","bed-single","beef","beer","beer-off","bell","bell-dot","bell-electric","bell-minus","bell-off","bell-plus","bell-ring","between-horizontal-end","between-horizontal-start","between-vertical-end","between-vertical-start","biceps-flexed","bike","binary","binoculars","biohazard","bird","bitcoin","blend","blinds","blocks","bluetooth","bluetooth-connected","bluetooth-off","bluetooth-searching","bold","bolt","bomb","bone","book","book-a","book-audio","book-check","book-copy","book-dashed","book-down","book-headphones","book-heart","book-image","book-key","book-lock","book-marked","book-minus","book-open","book-open-check","book-open-text","book-plus","book-text","book-type","book-up","book-up-2","book-user","book-x","bookmark","bookmark-check","bookmark-minus","bookmark-plus","bookmark-x","boom-box","bot","bot-message-square","bot-off","box","box-select","boxes","braces","brackets","brain","brain-circuit","brain-cog","brick-wall","briefcase","briefcase-business","briefcase-conveyor-belt","briefcase-medical","bring-to-front","brush","bug","bug-off","bug-play","building","building-2","bus","bus-front","cable","cable-car","cake","cake-slice","calculator","calendar","calendar-1","calendar-arrow-down","calendar-arrow-up","calendar-check","calendar-check-2","calendar-clock","calendar-cog","calendar-days","calendar-fold","calendar-heart","calendar-minus","calendar-minus-2","calendar-off","calendar-plus","calendar-plus-2","calendar-range","calendar-search","calendar-sync","calendar-x","calendar-x-2","camera","camera-off","candlestick-chart","candy","candy-cane","candy-off","cannabis","captions","captions-off","car","car-front","car-taxi-front","caravan","carrot","case-lower","case-sensitive","case-upper","cassette-tape","cast","castle","cat","cctv","chart-area","chart-bar","chart-bar-big","chart-bar-decreasing","chart-bar-increasing","chart-bar-stacked","chart-candlestick","chart-column","chart-column-big","chart-column-decreasing","chart-column-increasing","chart-column-stacked","chart-gantt","chart-line","chart-network","chart-no-axes-column","chart-no-axes-column-decreasing","chart-no-axes-column-increasing","chart-no-axes-combined","chart-no-axes-gantt","chart-pie","chart-scatter","chart-spline","check","check-check","checkbox-checked","check-circle","check-circle-2","check-square","check-square-2","chef-hat","cherry","chevron-down","chevron-down-circle","chevron-first","chevron-last","chevron-left","chevron-left-circle","chevron-right","chevron-right-circle","chevron-up","chevron-up-circle","chevrons-down","chevrons-down-up","chevrons-left","chevrons-left-right","chevrons-left-right-ellipsis","chevrons-right","chevrons-right-left","chevrons-up","chevrons-up-down","chrome","church","cigarette","cigarette-off","circle","circle-alert","circle-arrow-down","circle-arrow-left","circle-arrow-out-down-left","circle-arrow-out-down-right","circle-arrow-out-up-left","circle-arrow-out-up-right","circle-arrow-right","circle-arrow-up","circle-check","circle-check-big","circle-chevron-down","circle-chevron-left","circle-chevron-right","circle-chevron-up","circle-dashed","circle-divide","circle-dollar-sign","circle-dot","circle-dot-dashed","circle-ellipsis","circle-equal","circle-fading-arrow-up","circle-fading-plus","circle-gauge","circle-help","circle-minus","circle-off","circle-parking","circle-parking-off","circle-pause","circle-percent","circle-play","circle-plus","circle-power","circle-slash","circle-slash-2","circle-small","circle-stop","circle-user","circle-user-round","circle-x","circuit-board","citrus","clapperboard","clipboard","clipboard-check","clipboard-copy","clipboard-edit","clipboard-list","clipboard-minus","clipboard-paste","clipboard-pen","clipboard-pen-line","clipboard-plus","clipboard-type","clipboard-x","clock","clock-1","clock-10","clock-11","clock-12","clock-2","clock-3","clock-4","clock-5","clock-6","clock-7","clock-8","clock-9","clock-alert","clock-arrow-down","clock-arrow-up","clock-fading","cloud","cloud-alert","cloud-cog","cloud-download","cloud-drizzle","cloud-fog","cloud-hail","cloud-lightning","cloud-moon","cloud-moon-rain","cloud-off","cloud-rain","cloud-rain-wind","cloud-snow","cloud-sun","cloud-sun-rain","cloud-upload","cloudy","clover","club","code","code-readonly","code-square","code-xml","codepen","codesandbox","coffee","cog","coins","columns","columns-2","columns-3","columns-4","combine","command","compass","component","computer","concierge-bell","cone","construction","contact","contact-round","container","contrast","cookie","cooking-pot","copy","copy-check","copy-minus","copy-plus","copy-slash","copy-x","copyleft","copyright","corner-down-left","corner-down-right","corner-left-down","corner-left-up","corner-right-down","corner-right-up","corner-up-left","corner-up-right","cpu","creative-commons","credit-card","crest","croissant","crop","cross","crosshair","crown","cuboid","cup-soda","currency","cursor-click","cylinder","database","database-backup","database-zap","delete","dessert","diameter","diamond","diamond-minus","diamond-percent","diamond-plus","dice-1","dice-2","dice-3","dice-4","dice-5","dice-6","dices","diff","disc","disc-2","disc-3","disc-album","divide","divide-circle","dna","dock","dog","dollar-sign","donut","door-closed","door-open","dot","dot-square","download","download-cloud","drafting-compass","drama","dribbble","drill","droplet","droplets","drum","drumstick","dumbbell","ear","ear-off","earth","earth-lock","eclipse","egg","egg-fried","egg-off","ellipsis","ellipsis-vertical","equal","equal-not","eraser","euro","expand","external-link","eye","eye-off","facebook","factory","fan","fast-forward","feather","fence","ferris-wheel","figma","file","file-archive","file-audio","file-axis-3d","file-badge","file-badge-2","file-bar-chart","file-bar-chart-2","file-box","file-chart-column","file-chart-column-increasing","file-chart-line","file-chart-pie","file-check","file-check-2","file-clock","file-code","file-code-2","file-cog","file-diff","file-digit","file-down","file-heart","file-image","file-input","file-json","file-json-2","file-key","file-key-2","file-line-chart","file-lock","file-lock-2","file-minus","file-minus-2","file-music","file-output","file-pen","file-pen-line","file-pie-chart","file-plus","file-plus-2","file-question","file-scan","file-search","file-search-2","file-signature","file-sliders","file-spreadsheet","file-stack","file-symlink","file-terminal","file-text","file-type","file-type-2","file-up","file-user","file-video","file-video-2","file-volume","file-volume-2","file-warning","file-x","file-x-2","files","film","filter","filter-x","fingerprint","fire-extinguisher","fish","fish-off","fish-symbol","flag","flag-off","flag-triangle-left","flag-triangle-right","flame","flame-kindling","flashlight","flashlight-off","flask-conical","flask-conical-off","flask-round","flip-horizontal","flip-horizontal-2","flip-vertical","flip-vertical-2","flower","flower-2","focus","fold-horizontal","fold-vertical","folder","folder-archive","folder-check","folder-clock","folder-closed","folder-code","folder-cog","folder-dot","folder-down","folder-edit","folder-git","folder-git-2","folder-heart","folder-input","folder-kanban","folder-key","folder-lock","folder-minus","folder-open","folder-open-dot","folder-output","folder-pen","folder-plus","folder-root","folder-search","folder-search-2","folder-symlink","folder-sync","folder-tree","folder-up","folder-x","footprints","fork-knife","fork-knife-crossed","forklift","form-input","forward","frame","framer","frown","fuel","fullscreen","function-square","gallery-horizontal","gallery-horizontal-end","gallery-thumbnails","gallery-vertical","gallery-vertical-end","gamepad","gamepad-2","gantt-chart","gantt-chart-square","gauge","gavel","gem","ghost","gift","git-branch","git-branch-plus","git-commit-horizontal","git-commit-vertical","git-compare","git-compare-arrows","git-fork","git-graph","git-merge","git-pull-request","git-pull-request-arrow","git-pull-request-closed","git-pull-request-create-arrow","git-pull-request-create","git-pull-request-draft","github","gitlab","glass-water","glasses","globe","globe-lock","goal","grab","graduation-cap","grape","grid","grid-2x2","grid-2x2-check","grid-2x2-plus","grid-2x2-x","grid-3x3","grip","grip-horizontal","grip-vertical","group","guitar","hammer","hand","hand-coins","hand-heart","hand-helping","hand-metal","hand-platter","handshake","hard-drive","hard-drive-download","hard-drive-upload","hard-hat","hash","haze","hdmi-port","heading","heading-1","heading-2","heading-3","heading-4","heading-5","heading-6","headphone-off","headphones","headset","heart","heart-crack","heart-handshake","heart-off","heart-pulse","heater","help-circle","helping-hand","hexagon","highlighter","history","home","hop","hop-off","hospital","hotel","hourglass","house","house-plug","house-plus","ice-cream","ice-cream-2","ice-cream-bowl","ice-cream-cone","id-card","image","image-down","image-minus","image-off","image-play","image-plus","image-up","images","import","inbox","indent","indent-decrease","indent-increase","indian-rupee","infinity","info","inspection-panel","instagram","italic","iteration-ccw","iteration-cw","japanese-yen","joystick","kanban","kanban-square","kanban-square-dashed","key","key-round","key-square","keyboard","keyboard-music","keyboard-off","lamp","lamp-ceiling","lamp-desk","lamp-floor","lamp-wall-down","lamp-wall-up","land-plot","landmark","languages","laptop","laptop-minimal","lasso","lasso-select","laugh","layers","layers-2","layers-3","layout-dashboard","layout-grid","layout-list","layout-panel-left","layout-panel-top","layout-template","leaf","leafy-green","lectern","letter-text","library","library-big","life-buoy","ligature","lightbulb","lightbulb-off","line-chart","link","link-2","link-2-off","linkedin","list","list-check","list-checks","list-collapse","list-end","list-filter","list-minus","list-music","list-ordered","list-plus","list-restart","list-start","list-todo","list-tree","list-video","list-x","loader","loader-circle","loader-pinwheel","locate","locate-fixed","locate-off","lock","lock-keyhole","lock-keyhole-open","lock-open","log-in","log-out","logs","lollipop","luggage","m-square","magnet","mail","mail-check","mail-minus","mail-open","mail-plus","mail-question","mail-search","mail-warning","mail-x","mailbox","mails","map","map-pin","map-pin-check","map-pin-check-inside","map-pin-house","map-pin-minus","map-pin-minus-inside","map-pin-off","map-pin-plus","map-pin-plus-inside","map-pin-x","map-pin-x-inside","map-pinned","mars","mars-stroke","martini","maximize","maximize-2","medal","megaphone","megaphone-off","meh","memory-stick","menu","menu-square","merge","message-circle","message-circle-code","message-circle-dashed","message-circle-heart","message-circle-more","message-circle-off","message-circle-plus","message-circle-question","message-circle-reply","message-circle-warning","message-circle-x","message-square","message-square-code","message-square-dashed","message-square-diff","message-square-dot","message-square-heart","message-square-lock","message-square-more","message-square-off","message-square-plus","message-square-quote","message-square-reply","message-square-share","message-square-text","message-square-warning","message-square-x","messages-square","mic","mic-off","mic-vocal","microchip","microscope","microwave","milestone","milk","milk-off","minimize","minimize-2","minus","minus-circle","minus-square","monitor","monitor-check","monitor-cog","monitor-dot","monitor-down","monitor-off","monitor-pause","monitor-play","monitor-smartphone","monitor-speaker","monitor-stop","monitor-up","monitor-x","moon","moon-star","mountain","mountain-snow","mouse","mouse-off","mouse-pointer","mouse-pointer-2","mouse-pointer-ban","mouse-pointer-click","move","move-3d","move-diagonal","move-diagonal-2","move-down","move-down-left","move-down-right","move-horizontal","move-left","move-right","move-up","move-up-left","move-up-right","move-vertical","music","music-2","music-3","music-4","navigation","navigation-2","navigation-2-off","navigation-off","network","newspaper","nfc","notebook","notebook-pen","notebook-tabs","notebook-text","notepad-text","notepad-text-dashed","nut","nut-off","octagon","octagon-alert","octagon-minus","octagon-pause","octagon-x","omega","option","orbit","origami","outdent","package","package-2","package-check","package-minus","package-open","package-plus","package-search","package-x","paint-bucket","paint-roller","paintbrush","paintbrush-vertical","palette","palmtree","panel-bottom","panel-bottom-close","panel-bottom-dashed","panel-bottom-open","panel-left","panel-left-close","panel-left-dashed","panel-left-open","panel-right","panel-right-close","panel-right-dashed","panel-right-open","panel-top","panel-top-close","panel-top-dashed","panel-top-open","panels-left-bottom","panels-left-right","panels-right-bottom","panels-top-left","paperclip","parentheses","parking-circle","parking-circle-off","parking-meter","party-popper","pause","pause-circle","paw-print","pc-case","pen","pen-box","pen-line","pen-off","pen-tool","pencil","pencil-line","pencil-off","pencil-ruler","pentagon","percent","percent-circle","percent-diamond","percent-square","person-standing","phone","phone-call","phone-forwarded","phone-incoming","phone-missed","phone-off","phone-outgoing","ph","pi","pi-square","piano","pickaxe","picture-in-picture","picture-in-picture-2","pie-chart","piggy-bank","pilcrow","pilcrow-left","pilcrow-right","pilcrow-square","pill","pill-bottle","pin","pin-off","pipette","pizza","plane","plane-landing","plane-takeoff","play","play-circle","plug","plug-2","plug-zap","plus","plus-circle","plus-square","pocket","pocket-knife","podcast","pointer","pointer-off","popcorn","popsicle","pound-sterling","power","power-circle","power-off","power-square","presentation","printer","printer-check","projector","proportions","puzzle","pyramid","qr-code","quarter","quote","rabbit","radar","radiation","radical","radio","radio-receiver","radio-tower","radius","rail-symbol","rainbow","rat","ratio","receipt","receipt-cent","receipt-euro","receipt-indian-rupee","receipt-japanese-yen","receipt-pound-sterling","receipt-russian-ruble","receipt-swiss-franc","receipt-text","rectangle-ellipsis","rectangle-horizontal","rectangle-vertical","recycle","redo","redo-2","redo-dot","refresh-ccw","refresh-ccw-dot","refresh-cw","refresh-cw-dot","refresh-cw-off","refrigerator","regex","remove-formatting","repeat","repeat-1","repeat-2","replace","replace-all","reply","reply-all","rewind","ribbon","rocket","rocking-chair","roller-coaster","rotate-3d","rotate-ccw","rotate-ccw-square","rotate-cw","rotate-cw-square","route","route-off","router","rows","rows-2","rows-3","rows-4","rss","ruler","russian-ruble","sailboat","salad","sandwich","satellite","satellite-dish","save","save-all","save-off","scale","scale-3d","scaling","scan","scan-barcode","scan-eye","scan-face","scan-line","scan-search","scan-text","scatter-chart","school","school-2","scissors","scissors-line-dashed","scissors-square","scissors-square-dashed","screen-share","screen-share-off","scroll","scroll-text","search","search-check","search-code","search-slash","search-x","section","send","send-horizontal","send-to-back","separator-horizontal","separator-vertical","server","server-cog","server-crash","server-off","settings","settings-2","shapes","share","share-2","sheet","shell","shield","shield-alert","shield-ban","shield-check","shield-ellipsis","shield-half","shield-minus","shield-off","shield-plus","shield-question","shield-x","ship","ship-wheel","shirt","shopping-bag","shopping-basket","shopping-cart","shovel","shower-head","shrink","shrub","shuffle","sigma","sigma-square","signal","signal-high","signal-low","signal-medium","signal-zero","signature","signpost","signpost-big","siren","skip-back","skip-forward","skull","slack","slash","slash-square","sliders","sliders-horizontal","sliders-vertical","smartphone","smartphone-charging","smartphone-nfc","smile","smile-plus","snowflake","sofa","sort-asc","sort-desc","soup","space","spade","sparkle","sparkles","speaker","speech","spell-check","spell-check-2","spline","split","split-square-horizontal","split-square-vertical","spray-can","sprout","square","square-alert","square-arrow-down","square-arrow-down-left","square-arrow-down-right","square-arrow-left","square-arrow-out-down-left","square-arrow-out-down-right","square-arrow-out-up-left","square-arrow-out-up-right","square-arrow-right","square-arrow-up","square-arrow-up-left","square-arrow-up-right","square-asterisk","square-chart-gantt","square-check","square-check-big","square-chevron-down","square-chevron-left","square-chevron-right","square-chevron-up","square-code","square-dashed","square-dashed-bottom","square-dashed-bottom-code","square-dashed-kanban","square-dashed-mouse-pointer","square-divide","square-dot","square-equal","square-function","square-gantt-chart","square-kanban","square-library","square-m","square-menu","square-minus","square-mouse-pointer","square-parking","square-parking-off","square-pen","square-percent","square-pi","square-pilcrow","square-play","square-plus","square-power","square-radical","square-scissors","square-sigma","square-slash","square-split-horizontal","square-split-vertical","square-square","square-stack","square-terminal","square-user","square-user-round","square-x","squircle","squirrel","stamp","star","star-half","star-off","starts-with","step-back","step-forward","stethoscope","sticker","sticky-note","stop-circle","store","stretch-horizontal","stretch-vertical","strikethrough","subscript","subtitles","sun","sun-dim","sun-medium","sun-moon","sun-snow","sunrise","sunset","superscript","swatch-book","swiss-franc","switch-camera","sword","swords","syringe","table","table-2","table-cells-merge","table-cells-split","table-columns-split","table-of-contents","table-properties","table-rows-split","tablet","tablet-smartphone","tablets","tag","tags","tally-1","tally-2","tally-3","tally-4","tally-5","tangent","target","telescope","tent","tent-tree","terminal","terminal-square","test-tube","test-tube-2","test-tube-diagonal","test-tubes","text","text-cursor","text-cursor-input","text-quote","text-search","text-select","text-selection","theater","thermometer","thermometer-snowflake","thermometer-sun","thumbs-down","thumbs-up","ticket","ticket-check","ticket-minus","ticket-percent","ticket-plus","ticket-slash","ticket-x","tickets","tickets-plane","timer","timer-off","timer-reset","toggle-left","toggle-right","tornado","torus","touchpad","touchpad-off","tower-control","toy-brick","tractor","traffic-cone","train","train-front","train-front-tunnel","train-track","tram-front","trash","trash-2","tree-deciduous","tree-palm","tree-pine","trees","trello","trending-down","trending-up","trending-up-down","triangle","triangle-alert","triangle-right","trophy","truck","turtle","tv","tv-2","tv-minimal","tv-minimal-play","twitch","twitter","type","type-outline","umbrella","umbrella-off","underline","undo","undo-2","undo-dot","unfold-horizontal","unfold-vertical","ungroup","university","unlink","unlink-2","unlock","unlock-keyhole","unplug","upload","upload-cloud","usb","user","user-check","user-cog","user-minus","user-pen","user-plus","user-round","user-round-check","user-round-cog","user-round-minus","user-round-pen","user-round-plus","user-round-search","user-round-x","user-search","user-x","users","users-round","utensils","utensils-crossed","utility-pole","variable","vault","vegan","venetian-mask","venus","venus-and-mars","vibrate","vibrate-off","video","video-off","videotape","view","voicemail","volleyball","volume","volume-1","volume-2","volume-off","volume-x","vote","wallet","wallet-cards","wallet-minimal","wallpaper","wand","wand-sparkles","warehouse","washing-machine","watch","waves","waypoints","webcam","webhook","webhook-off","weight","wheat","wheat-off","whole-word","wifi","wifi-high","wifi-low","wifi-off","wifi-zero","wind","wine","wine-off","workflow","worm","wrap-text","wrench","x","x-circle","x-square","youtube","zap","zap-off","zoom-in","zoom-out"];

  // ─── Color palette ────────────────────────────────────────
  var FOLDER_COLORS = [
    { name: 'Default', value: '' },
    { name: 'Red', value: '#e94560' },
    { name: 'Orange', value: '#f09a36' },
    { name: 'Amber', value: '#e8bc63' },
    { name: 'Green', value: '#4ecca3' },
    { name: 'Teal', value: '#4ecdc4' },
    { name: 'Blue', value: '#4ea8de' },
    { name: 'Indigo', value: '#7b6cf6' },
    { name: 'Purple', value: '#b388eb' },
    { name: 'Pink', value: '#f472b6' },
    { name: 'Gray', value: '#8b8ba8' },
    { name: 'White', value: '#e4e4e7' }
  ];

  var PLUGIN_ID = 'verstak.workspace-folders';
  var api = null;
  var tr = null;
  var treeData = { nodes: [], currentId: '' };
  var expandedFolders = {};
  var dragState = null;

  // ─── DOM helpers ──────────────────────────────────────────
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function(k) {
        if (k === 'className') el.className = attrs[k];
        else if (k === 'style' && typeof attrs[k] === 'object') {
          Object.keys(attrs[k]).forEach(function(s) { el.style[s] = attrs[k][s]; });
        }
        else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else el.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      if (Array.isArray(children)) children.forEach(function(c) { if (c) el.appendChild(c); });
      else if (typeof children === 'string') el.textContent = children;
      else el.appendChild(children);
    }
    return el;
  }

  function t(key, fallback, params) {
    if (tr) return tr(key, params, fallback);
    return fallback || key;
  }

  // ─── SVG icon renderer (Lucide-inspired minimal) ──────────
  function renderIconSVG(name, size, color) {
    size = size || 14;
    color = color || 'currentColor';
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', color);
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.style.flexShrink = '0';
    svg.style.display = 'block';

    // Common icon paths (subset of Lucide)
    var paths = {};
    paths.folder = 'M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z';
    paths['folder-open'] = 'M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2ZM4 13h16';
    paths['chevron-down'] = 'm6 9 6 6 6-6';
    paths['chevron-right'] = 'm9 18 6-6-6-6';
    paths['layout-grid'] = 'M3 3h7v7H3V3Zm11 0h7v7h-7V3Zm-11 11h7v7H3v-7Zm11 0h7v7h-7v-7Z';
    paths['plus'] = 'M12 5v14m-7-7h14';
    paths['trash'] = 'M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2';
    paths['pencil'] = 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z';
    paths['check'] = 'M20 6 9 17l-5-5';
    paths['x'] = 'M18 6 6 18M6 6l12 12';
    paths['search'] = 'M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z';
    paths['grip-vertical'] = 'M9 5h2v2H9Zm0 6h2v2H9Zm0 6h2v2H9Zm-6-6h2v2H3Zm0-6h2v2H3Zm0 12h2v2H3Z';
    paths['palette'] = 'M12 2a10 10 0 0 0 0 20c.73 0 1.4-.5 1.4-1.2 0-.3-.1-.6-.3-.8-.2-.3-.3-.6-.3-1 0-.8.7-1.5 1.5-1.5H16a6 6 0 0 0 6-6c0-5-4.5-9.5-10-9.5Z';
    paths['circle'] = 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z';
    paths['briefcase'] = 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16M2 21h20M12 3v4M4 9h16';

    var pathData = paths[name];
    if (!pathData) {
      // Generic fallback: circle
      pathData = paths.circle;
    }
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    svg.appendChild(path);
    return svg;
  }

  // ─── Icon Picker ──────────────────────────────────────────
  function showIconPicker(currentIcon, onSelect) {
    var overlay = h('div', { className: 'wf-overlay', onClick: function(e) { if (e.target === overlay) overlay.remove(); } });
    var modal = h('div', { className: 'wf-modal wf-icon-picker-modal' });

    var header = h('div', { className: 'wf-modal-header' });
    header.appendChild(h('h2', null, t('folder.iconPickerTitle', 'Choose Icon')));
    var closeBtn = h('button', { className: 'wf-btn', onClick: function() { overlay.remove(); } }, t('common.close', 'Close'));
    header.appendChild(closeBtn);
    modal.appendChild(header);

    var searchInput = h('input', { className: 'wf-input', type: 'text', placeholder: t('folder.iconSearch', 'Search icons...'), autocomplete: 'off' });

    var grid = h('div', { className: 'wf-icon-grid' });
    var selectedIcon = currentIcon || 'folder';

    function renderIcons(filter) {
      grid.innerHTML = '';
      var filtered = filter ? ICONS.filter(function(name) { return name.toLowerCase().indexOf(filter.toLowerCase()) !== -1; }) : ICONS;
      var limit = Math.min(filtered.length, 300);
      for (var i = 0; i < limit; i++) {
        (function(iconName) {
          var item = h('div', {
            className: 'wf-icon-item' + (iconName === selectedIcon ? ' selected' : ''),
            title: iconName,
            onClick: function() {
              selectedIcon = iconName;
              var items = grid.querySelectorAll('.wf-icon-item');
              items.forEach(function(el) { el.classList.remove('selected'); });
              item.classList.add('selected');
            }
          });
          item.appendChild(renderIconSVG(iconName, 18));
          item.appendChild(h('span', { className: 'wf-icon-name' }, iconName));
          grid.appendChild(item);
        })(filtered[i]);
      }
    }

    renderIcons('');
    searchInput.addEventListener('input', function() { renderIcons(searchInput.value); });
    modal.appendChild(searchInput);
    modal.appendChild(grid);

    var actions = h('div', { className: 'wf-modal-actions' });
    actions.appendChild(h('button', { className: 'wf-btn-primary', onClick: function() { overlay.remove(); onSelect(selectedIcon); } }, t('common.select', 'Select')));
    actions.appendChild(h('button', { className: 'wf-btn', onClick: function() { overlay.remove(); } }, t('common.cancel', 'Cancel')));
    modal.appendChild(actions);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    setTimeout(function() { searchInput.focus(); }, 50);
  }

  // ─── Color Picker ─────────────────────────────────────────
  function showColorPicker(currentColor, onSelect) {
    var overlay = h('div', { className: 'wf-overlay', onClick: function(e) { if (e.target === overlay) overlay.remove(); } });
    var modal = h('div', { className: 'wf-modal wf-color-picker-modal' });

    var header = h('div', { className: 'wf-modal-header' });
    header.appendChild(h('h2', null, t('folder.colorPickerTitle', 'Choose Color')));
    var closeBtn = h('button', { className: 'wf-btn', onClick: function() { overlay.remove(); } }, t('common.close', 'Close'));
    header.appendChild(closeBtn);
    modal.appendChild(header);

    var grid = h('div', { className: 'wf-color-grid' });
    FOLDER_COLORS.forEach(function(c) {
      var item = h('div', {
        className: 'wf-color-item' + (c.value === currentColor ? ' selected' : ''),
        title: c.name,
        onClick: function() { overlay.remove(); onSelect(c.value); }
      });
      var swatch = h('div', { className: 'wf-color-swatch', style: { backgroundColor: c.value || 'var(--vt-color-text-muted)' } });
      item.appendChild(swatch);
      item.appendChild(h('span', { className: 'wf-color-name' }, c.name));
      grid.appendChild(item);
    });
    modal.appendChild(grid);

    var actions = h('div', { className: 'wf-modal-actions' });
    actions.appendChild(h('button', { className: 'wf-btn', onClick: function() { overlay.remove(); } }, t('common.cancel', 'Cancel')));
    modal.appendChild(actions);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // ─── Create Folder Modal ──────────────────────────────────
  function showCreateFolderModal(parentId, onCreated) {
    var overlay = h('div', { className: 'wf-overlay', onClick: function(e) { if (e.target === overlay) overlay.remove(); } });
    var modal = h('div', { className: 'wf-modal' });

    var header = h('div', { className: 'wf-modal-header' });
    header.appendChild(h('h2', null, t('folder.create', 'Create Folder')));
    header.appendChild(h('button', { className: 'wf-btn', onClick: function() { overlay.remove(); } }, t('common.close', 'Close')));
    modal.appendChild(header);

    var nameInput = h('input', { className: 'wf-input', type: 'text', placeholder: t('folder.namePlaceholder', 'Folder name'), autocomplete: 'off' });
    modal.appendChild(nameInput);

    var iconRow = h('div', { className: 'wf-icon-row' });
    var currentIcon = 'folder';
    var iconPreview = renderIconSVG(currentIcon, 20);
    iconRow.appendChild(h('span', null, t('folder.icon', 'Icon') + ': '));
    iconRow.appendChild(iconPreview);
    iconRow.appendChild(h('button', { className: 'wf-btn', onClick: function() {
      showIconPicker(currentIcon, function(icon) { currentIcon = icon; iconPreview.innerHTML = ''; iconPreview.appendChild(renderIconSVG(icon, 20)); });
    } }, t('folder.chooseIcon', 'Choose...')));
    modal.appendChild(iconRow);

    var colorRow = h('div', { className: 'wf-icon-row' });
    var currentColor = '';
    var colorPreview = h('div', { className: 'wf-color-swatch', style: { backgroundColor: 'var(--vt-color-text-muted)' } });
    colorPreview.style.width = '20px';
    colorPreview.style.height = '20px';
    colorRow.appendChild(h('span', null, t('folder.color', 'Color') + ': '));
    colorRow.appendChild(colorPreview);
    colorRow.appendChild(h('button', { className: 'wf-btn', onClick: function() {
      showColorPicker(currentColor, function(color) { currentColor = color; colorPreview.style.backgroundColor = color || 'var(--vt-color-text-muted)'; });
    } }, t('folder.chooseColor', 'Choose...')));
    modal.appendChild(colorRow);

    var errorEl = h('div', { className: 'wf-error' });
    modal.appendChild(errorEl);

    var actions = h('div', { className: 'wf-modal-actions' });
    actions.appendChild(h('button', { className: 'wf-btn-primary', onClick: function() {
      var name = nameInput.value.trim();
      if (!name) { errorEl.textContent = t('folder.nameRequired', 'Name is required'); return; }
      if (!api) return;
      var path = parentId ? parentId + '/' + name : name;
      api.folders.setMetadata(path, { icon: currentIcon, color: currentColor, order: 0 }).then(function(err) {
        if (err) { errorEl.textContent = err; return; }
        overlay.remove();
        if (onCreated) onCreated(path);
      });
    } }, t('common.create', 'Create')));
    actions.appendChild(h('button', { className: 'wf-btn', onClick: function() { overlay.remove(); } }, t('common.cancel', 'Cancel')));
    modal.appendChild(actions);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    setTimeout(function() { nameInput.focus(); }, 50);
  }

  // ─── Drag and Drop ────────────────────────────────────────
  function setupDragDrop(el, node, onDrop) {
    el.setAttribute('draggable', 'true');
    el.addEventListener('dragstart', function(e) {
      dragState = { node: node, el: el };
      el.classList.add('wf-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', node.id);
    });
    el.addEventListener('dragend', function() {
      el.classList.remove('wf-dragging');
      dragState = null;
    });
    el.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      el.classList.add('wf-drag-over');
    });
    el.addEventListener('dragleave', function() {
      el.classList.remove('wf-drag-over');
    });
    el.addEventListener('drop', function(e) {
      e.preventDefault();
      el.classList.remove('wf-drag-over');
      if (dragState && dragState.node.id !== node.id) {
        onDrop(dragState.node, node);
      }
    });
  }

  // ─── Tree Renderer ────────────────────────────────────────
  function renderTree(container) {
    container.innerHTML = '';

    // Header
    var header = h('div', { className: 'wt-header' });
    header.appendChild(h('span', { className: 'wt-title' }, t('workspaceTree.title', 'Deals')));
    var addBtn = h('button', { className: 'wt-btn', title: t('workspaceTree.new', 'New Deal'), type: 'button' }, '+');
    addBtn.addEventListener('click', function() { showCreateDealModal(''); });
    header.appendChild(addBtn);
    var folderBtn = h('button', { className: 'wt-btn', title: t('folder.create', 'Create Folder'), type: 'button', style: { marginLeft: '2px' } });
    folderBtn.textContent = '📁';
    folderBtn.addEventListener('click', function() { showCreateFolderModal('', function() { loadAndRender(container); }); });
    header.appendChild(folderBtn);
    container.appendChild(header);

    // Tree list
    var list = h('div', { className: 'wt-list' });
    renderNodeChildren(list, '', 0);
    container.appendChild(list);
  }

  function renderNodeChildren(parent, parentId, depth) {
    var children = treeData.nodes.filter(function(n) { return (n.parentId || '') === parentId; });
    children.sort(function(a, b) { return (a.order || 0) - (b.order || 0) || String(a.title || a.name).localeCompare(String(b.title || b.name)); });

    children.forEach(function(node) {
      if (node.type === 'folder') {
        renderFolderNode(parent, node, depth);
      } else {
        renderWorkspaceNode(parent, node, depth);
      }
    });
  }

  function renderFolderNode(parent, node, depth) {
    var isExpanded = expandedFolders[node.id] !== false;
    var row = h('div', { className: 'wt-row wt-folder-row' });
    var indent = h('span', { style: { width: (depth * 16) + 'px', flexShrink: '0' } });
    row.appendChild(indent);

    var chevron = h('span', { className: 'wt-chevron' }, isExpanded ? '\u25BE' : '\u25B8');
    row.appendChild(chevron);

    var icon = renderIconSVG(node.icon || 'folder', 13, node.color || undefined);
    icon.classList.add('wf-folder-icon');
    if (node.color) icon.setAttribute('stroke', node.color);
    row.appendChild(icon);

    var label = h('span', { className: 'wt-label wt-folder-label' }, node.title || node.name);
    row.appendChild(label);

    // Actions (visible on hover)
    var actions = h('span', { className: 'wf-folder-actions' });
    var editBtn = h('button', { className: 'wt-icon-btn', title: t('folder.edit', 'Edit'), type: 'button' });
    editBtn.appendChild(renderIconSVG('pencil', 11));
    editBtn.addEventListener('click', function(e) { e.stopPropagation(); showEditFolderModal(node); });
    actions.appendChild(editBtn);
    var delBtn = h('button', { className: 'wt-icon-btn danger', title: t('folder.delete', 'Delete'), type: 'button' });
    delBtn.appendChild(renderIconSVG('trash', 11));
    delBtn.addEventListener('click', function(e) { e.stopPropagation(); deleteFolder(node); });
    actions.appendChild(delBtn);
    var addWsBtn = h('button', { className: 'wt-icon-btn', title: t('workspaceTree.new', 'New Deal'), type: 'button' });
    addWsBtn.appendChild(renderIconSVG('plus', 11));
    addWsBtn.addEventListener('click', function(e) { e.stopPropagation(); showCreateDealModal(node.id); });
    actions.appendChild(addWsBtn);
    row.appendChild(actions);

    row.addEventListener('click', function() {
      expandedFolders[node.id] = !isExpanded;
      var containerEl = row.closest('.wf-tree-container');
      if (containerEl) {
        var treeContainer = containerEl.closest('div');
        if (treeContainer) loadAndRender(treeContainer);
      }
    });

    setupDragDrop(row, node, function(dragged, target) {
      if (!api) return;
      if (dragged.type === 'space') {
        api.MoveWorkspace(dragged.id, target.id).then(function(err) {
          if (!err) loadAndRender(row.closest('.wf-tree-container'));
        });
      }
    });

    parent.appendChild(row);

    if (isExpanded) {
      var childContainer = h('div', { className: 'wf-folder-children', style: { paddingLeft: '0' } });
      renderNodeChildren(childContainer, node.id, depth + 1);
      parent.appendChild(childContainer);
    }
  }

  function renderWorkspaceNode(parent, node, depth) {
    var wsNode = h('div', { className: 'wt-node vt-list-row' + (treeData.currentId === node.id ? ' selected' : '') });
    var row = h('div', { className: 'wt-row' });

    var indent = h('span', { style: { width: (depth * 16 + 12) + 'px', flexShrink: '0' } });
    row.appendChild(indent);

    var icon = renderIconSVG('layout-grid', 13);
    row.appendChild(icon);

    var label = h('button', { className: 'wt-label', type: 'button' }, node.title || node.name);
    label.addEventListener('click', function() {
      if (api) {
        window.dispatchEvent(new CustomEvent('verstak:open-view', {
          detail: { viewId: '__overview', pluginId: 'verstak.shell', workspaceName: node.id, workspacePath: node.id }
        }));
        api.SetCurrentWorkspace(node.id);
      }
    });
    row.appendChild(label);

    var trashBtn = h('button', { className: 'wt-icon-btn danger', title: t('workspaceTree.trash', 'Move to trash'), type: 'button' });
    trashBtn.appendChild(renderIconSVG('trash', 11));
    trashBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (api) api.TrashWorkspace(node.id).then(function() { loadAndRender(wsNode.closest('.wf-tree-container')); });
    });
    row.appendChild(trashBtn);

    wsNode.appendChild(row);
    setupDragDrop(wsNode, node, function(dragged, target) {
      if (!api) return;
      if (dragged.type === 'space' && target.type === 'folder') {
        api.MoveWorkspace(dragged.id, target.id).then(function(err) {
          if (!err) loadAndRender(wsNode.closest('.wf-tree-container'));
        });
      }
    });

    parent.appendChild(wsNode);
  }

  function showEditFolderModal(node) {
    var overlay = h('div', { className: 'wf-overlay', onClick: function(e) { if (e.target === overlay) overlay.remove(); } });
    var modal = h('div', { className: 'wf-modal' });

    var header = h('div', { className: 'wf-modal-header' });
    header.appendChild(h('h2', null, t('folder.edit', 'Edit Folder')));
    header.appendChild(h('button', { className: 'wf-btn', onClick: function() { overlay.remove(); } }, t('common.close', 'Close')));
    modal.appendChild(header);

    var currentIcon = node.icon || 'folder';
    var currentColor = node.color || '';

    var iconRow = h('div', { className: 'wf-icon-row' });
    var iconPreview = renderIconSVG(currentIcon, 20, currentColor || undefined);
    iconRow.appendChild(h('span', null, t('folder.icon', 'Icon') + ': '));
    iconRow.appendChild(iconPreview);
    iconRow.appendChild(h('button', { className: 'wf-btn', onClick: function() {
      showIconPicker(currentIcon, function(icon) { currentIcon = icon; iconPreview.innerHTML = ''; iconPreview.appendChild(renderIconSVG(icon, 20, currentColor || undefined)); });
    } }, t('folder.chooseIcon', 'Choose...')));
    modal.appendChild(iconRow);

    var colorRow = h('div', { className: 'wf-icon-row' });
    var colorPreview = h('div', { className: 'wf-color-swatch', style: { backgroundColor: currentColor || 'var(--vt-color-text-muted)', width: '20px', height: '20px' } });
    colorRow.appendChild(h('span', null, t('folder.color', 'Color') + ': '));
    colorRow.appendChild(colorPreview);
    colorRow.appendChild(h('button', { className: 'wf-btn', onClick: function() {
      showColorPicker(currentColor, function(color) { currentColor = color; colorPreview.style.backgroundColor = color || 'var(--vt-color-text-muted)'; iconPreview.innerHTML = ''; iconPreview.appendChild(renderIconSVG(currentIcon, 20, color || undefined)); });
    } }, t('folder.chooseColor', 'Choose...')));
    modal.appendChild(colorRow);

    var actions = h('div', { className: 'wf-modal-actions' });
    actions.appendChild(h('button', { className: 'wf-btn-primary', onClick: function() {
      if (!api) return;
      api.folders.setMetadata(node.id, { icon: currentIcon, color: currentColor, order: 0 }).then(function(err) {
        if (err) return;
        overlay.remove();
        var treeContainer = overlay.closest('.wf-tree-container');
        if (treeContainer) loadAndRender(treeContainer);
      });
    } }, t('common.save', 'Save')));
    actions.appendChild(h('button', { className: 'wf-btn', onClick: function() { overlay.remove(); } }, t('common.cancel', 'Cancel')));
    modal.appendChild(actions);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function deleteFolder(node) {
    if (!confirm(t('folder.deleteConfirm', 'Delete folder? Deals inside will move to the parent folder.'))) return;
    if (!api) return;
    // Remove folder metadata
    api.folders.setMetadata(node.id, { icon: '', color: '', order: 0 }).then(function() {
      var treeContainer = document.querySelector('.wf-tree-container');
      if (treeContainer) loadAndRender(treeContainer);
    });
  }

  function showCreateDealModal(parentId) {
    // Delegate to the existing workspace create flow
    // For now, trigger the default modal with parent path
    var overlay = h('div', { className: 'wf-overlay', onClick: function(e) { if (e.target === overlay) overlay.remove(); } });
    var modal = h('div', { className: 'wf-modal' });

    var header = h('div', { className: 'wf-modal-header' });
    header.appendChild(h('h2', null, t('workspaceTree.new', 'New Deal')));
    header.appendChild(h('button', { className: 'wf-btn', onClick: function() { overlay.remove(); } }, t('common.close', 'Close')));
    modal.appendChild(header);

    var nameField = h('div', { className: 'wf-field' });
    nameField.appendChild(h('span', null, t('pluginCard.name', 'Name')));
    var nameInput = h('input', { className: 'wf-input', type: 'text', placeholder: t('workspaceTree.namePlaceholder', 'Deal name'), autocomplete: 'off' });
    nameField.appendChild(nameInput);
    modal.appendChild(nameField);

    // Template selector
    var tmplField = h('div', { className: 'wf-field' });
    tmplField.appendChild(h('span', null, t('workspaceTree.template', 'Template')));
    var tmplSelect = h('select', { className: 'wf-input' });
    tmplSelect.innerHTML = '<option value="default">General</option><option value="project">Project</option><option value="writing">Writing</option><option value="admin">Admin</option><option value="minimal">Minimal</option>';
    tmplField.appendChild(tmplSelect);
    modal.appendChild(tmplField);

    var errorEl = h('div', { className: 'wf-error' });
    modal.appendChild(errorEl);

    var actions = h('div', { className: 'wf-modal-actions' });
    actions.appendChild(h('button', { className: 'wf-btn-primary', onClick: function() {
      var name = nameInput.value.trim();
      if (!name) { errorEl.textContent = t('workspaceTree.nameRequired', 'Name is required'); return; }
      if (!api) return;
      var path = parentId ? parentId + '/' + name : name;
      api.CreateWorkspace(path, tmplSelect.value).then(function(result) {
        if (typeof result === 'string' || (Array.isArray(result) && result[1])) {
          errorEl.textContent = typeof result === 'string' ? result : result[1];
          return;
        }
        overlay.remove();
        var treeContainer = document.querySelector('.wf-tree-container');
        if (treeContainer) loadAndRender(treeContainer);
      });
    } }, t('workspaceTree.create', 'Create Deal')));
    actions.appendChild(h('button', { className: 'wf-btn', onClick: function() { overlay.remove(); } }, t('common.cancel', 'Cancel')));
    modal.appendChild(actions);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    setTimeout(function() { nameInput.focus(); }, 50);
  }

  // ─── Data loading ─────────────────────────────────────────
  function loadAndRender(container) {
    if (!api) return;
    container.classList.add('wf-tree-container');

    Promise.all([
      api.Promise.resolve(api.listWorkspaces ? api.listWorkspaces() : Promise.resolve([])),
      api.Promise.resolve(api.getCurrentWorkspace ? api.getCurrentWorkspace() : Promise.resolve({})),
      api.Promise.resolve(api.getTree ? api.getTree() : Promise.resolve({ nodes: [] }))
    ]).then(function(results) {
      var workspaces = results[0] || [];
      var current = results[1] || {};
      var tree = results[2] || {};

      // Build tree data from API response
      var nodes = [];

      // Add folder nodes from accumulated parent paths
      var folderSet = {};
      (workspaces || []).forEach(function(ws) {
        var wsPath = ws.path || ws.rootPath || ws.name || '';
        var parts = wsPath.split('/');
        if (parts.length > 1) {
          var currentPath = '';
          for (var i = 0; i < parts.length - 1; i++) {
            currentPath = currentPath ? currentPath + '/' + parts[i] : parts[i];
            if (!folderSet[currentPath]) {
              folderSet[currentPath] = { id: currentPath, type: 'folder', title: parts[i], name: parts[i], parentId: i > 0 ? parts.slice(0, i).join('/') : '', order: 0 };
            }
          }
          nodes.push({ id: wsPath, type: 'space', title: parts[parts.length - 1], name: parts[parts.length - 1], parentId: parts.slice(0, -1).join('/') || '', order: nodes.length });
        } else {
          nodes.push({ id: wsPath, type: 'space', title: ws.name || wsPath, name: ws.name || wsPath, parentId: '', order: nodes.length });
        }
      });

      // Add folder nodes
      Object.keys(folderSet).forEach(function(id) {
        nodes.push(folderSet[id]);
      });

      // Load folder metadata
      Object.keys(folderSet).forEach(function(id) {
        if (api && api.folders && api.folders.getMetadata) {
          api.folders.getMetadata(id).then(function(meta) {
            if (meta && (meta.icon || meta.color)) {
              var idx = nodes.findIndex(function(n) { return n.id === id && n.type === 'folder'; });
              if (idx >= 0) {
                if (meta.icon) nodes[idx].icon = meta.icon;
                if (meta.color) nodes[idx].color = meta.color;
              }
            }
          }).catch(function() {});
        }
      });

      treeData = {
        nodes: nodes,
        currentId: current.path || current.rootPath || ''
      };

      renderTree(container);
    }).catch(function() {
      container.innerHTML = '<div class="wt-error">Failed to load Deals</div>';
    });
  }

  // ─── API bridge helpers ───────────────────────────────────
  function buildPluginAPI(pluginApi) {
    // Wrap API methods to return Promises compatible with the plugin
    var wrapped = {
      Promise: Promise,
      listWorkspaces: function() { return pluginApi.commands.executeFor ? Promise.resolve([]) : Promise.resolve([]); },
      getCurrentWorkspace: function() { return Promise.resolve({}); },
      getTree: function() { return Promise.resolve({ nodes: [] }); },
      SetCurrentWorkspace: function(path) { return Promise.resolve(''); },
      TrashWorkspace: function(path) { return Promise.resolve(''); },
      CreateWorkspace: function(path, template) { return Promise.resolve(''); },
      MoveWorkspace: function(id, parentId) { return Promise.resolve(''); },
      folders: {
        setMetadata: function(path, meta) { return Promise.resolve(''); },
        getMetadata: function(path) { return Promise.resolve({}); }
      }
    };
    return wrapped;
  }

  // ─── Plugin registration ──────────────────────────────────
  window.VerstakPluginRegister(PLUGIN_ID, {
    components: {
      FolderTreeView: {
        mount: function(containerEl, props, pluginApi) {
          api = buildPluginAPI(pluginApi);

          // Try to use real API if available via VerstakPluginAPI
          if (pluginApi && pluginApi.workspaces && pluginApi.workspaces.list) {
            api.listWorkspaces = function() { return pluginApi.workspaces.list(); };
            api.getCurrentWorkspace = function() { return pluginApi.workspaces.getCurrent(); };
            api.getTree = function() { return pluginApi.workspaces.getTree(); };
            api.SetCurrentWorkspace = function(path) { return pluginApi.workspaces.select(path); };
            api.TrashWorkspace = function(path) { return pluginApi.workspaces.trash(path); };
            api.CreateWorkspace = function(path, tmpl) { return pluginApi.workspaces.create(path, tmpl); };
            api.MoveWorkspace = function(id, parentId) { return pluginApi.workspaces.move(id, parentId); };
            api.folders.setMetadata = function(path, meta) { return pluginApi.folders.setMetadata(path, meta); };
            api.folders.getMetadata = function(path) { return pluginApi.folders.getMetadata(path); };
          }

          // i18n
          if (pluginApi && pluginApi.i18n) {
            tr = function(key, params, fallback) {
              return pluginApi.i18n.t(key, params, fallback);
            };
          }

          // Add plugin CSS
          var styleEl = document.createElement('style');
          styleEl.textContent = getPluginCSS();
          containerEl.appendChild(styleEl);

          loadAndRender(containerEl);
        },
        unmount: function(containerEl) {
          containerEl.innerHTML = '';
          api = null;
          tr = null;
        }
      }
    }
  });

  // ─── CSS ──────────────────────────────────────────────────
  function getPluginCSS() {
    return '\n' +
      '.wf-overlay { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 1rem; background: rgba(4,8,18,0.7); }\n' +
      '.wf-modal { width: min(36rem, 100%); display: grid; gap: 0.85rem; padding: 1rem; border: 1px solid var(--vt-color-border-strong, #2a2a4a); border-radius: var(--vt-radius-lg, 8px); background: var(--vt-color-surface, #1a1a2e); box-shadow: 0 18px 44px rgba(0,0,0,0.38); max-height: 90vh; overflow-y: auto; }\n' +
      '.wf-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }\n' +
      '.wf-modal-header h2 { margin: 0; font-size: 1rem; color: var(--vt-color-text-primary, #e4e4e7); }\n' +
      '.wf-modal-actions { display: flex; gap: 0.4rem; justify-content: flex-end; }\n' +
      '.wf-input { width: 100%; min-height: 2rem; box-sizing: border-box; border: 1px solid var(--vt-color-border-strong, #2a2a4a); border-radius: var(--vt-radius-sm, 4px); background: #0f1424; color: var(--vt-color-text-primary, #e4e4e7); padding: 0.35rem 0.5rem; font: inherit; font-size: 0.84rem; }\n' +
      '.wf-input:focus { outline: none; border-color: var(--vt-color-accent, #4ecca3); box-shadow: var(--vt-focus-ring, 0 0 0 2px rgba(78,204,163,0.3)); }\n' +
      '.wf-field { display: grid; gap: 0.35rem; color: var(--vt-color-text-muted, #8b8ba8); font-size: 0.75rem; }\n' +
      '.wf-field select { width: 100%; min-height: 2rem; box-sizing: border-box; border: 1px solid var(--vt-color-border-strong, #2a2a4a); border-radius: var(--vt-radius-sm, 4px); background: #0f1424; color: var(--vt-color-text-primary, #e4e4e7); padding: 0.35rem 0.5rem; font: inherit; font-size: 0.84rem; }\n' +
      '.wf-error { color: var(--vt-color-danger, #e94560); font-size: 0.78rem; min-height: 1rem; }\n' +
      '.wf-btn { min-height: 1.55rem; background: transparent; border: 1px solid transparent; color: var(--vt-color-text-muted, #8b8ba8); cursor: pointer; font-size: 0.78rem; padding: 0.12rem 0.38rem; border-radius: var(--vt-radius-sm, 4px); }\n' +
      '.wf-btn:hover:not(:disabled) { color: var(--vt-color-accent, #4ecca3); }\n' +
      '.wf-btn-primary { background: var(--vt-color-accent, #4ecca3); color: #101827; border: none; padding: 0.3rem 0.6rem; border-radius: var(--vt-radius-sm, 4px); cursor: pointer; font-size: 0.75rem; font-weight: 600; }\n' +
      '.wf-btn-primary:hover:not(:disabled) { background: #3dbb92; }\n' +
      '.wf-icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 0.35rem; max-height: 320px; overflow-y: auto; padding: 0.25rem; }\n' +
      '.wf-icon-item { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding: 0.35rem 0.2rem; border: 1px solid var(--vt-color-border, #2a2a4a); border-radius: var(--vt-radius-sm, 4px); cursor: pointer; color: var(--vt-color-text-muted, #8b8ba8); }\n' +
      '.wf-icon-item:hover { border-color: var(--vt-color-accent, #4ecca3); color: var(--vt-color-text-primary, #e4e4e7); background: var(--vt-color-surface-hover, #16213e); }\n' +
      '.wf-icon-item.selected { border-color: var(--vt-color-accent, #4ecca3); background: var(--vt-color-accent-muted, rgba(78,204,163,0.1)); }\n' +
      '.wf-icon-name { font-size: 0.6rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }\n' +
      '.wf-icon-row { display: flex; align-items: center; gap: 0.5rem; color: var(--vt-color-text-muted, #8b8ba8); font-size: 0.75rem; }\n' +
      '.wf-color-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.35rem; }\n' +
      '.wf-color-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.5rem; border: 1px solid var(--vt-color-border, #2a2a4a); border-radius: var(--vt-radius-sm, 4px); cursor: pointer; }\n' +
      '.wf-color-item:hover { border-color: var(--vt-color-accent, #4ecca3); }\n' +
      '.wf-color-item.selected { border-color: var(--vt-color-accent, #4ecca3); background: var(--vt-color-accent-muted, rgba(78,204,163,0.1)); }\n' +
      '.wf-color-swatch { width: 18px; height: 18px; border-radius: 50%; border: 1px solid var(--vt-color-border-strong, #2a2a4a); flex-shrink: 0; }\n' +
      '.wf-color-name { font-size: 0.75rem; color: var(--vt-color-text-secondary, #a1a1aa); }\n' +
      '.wf-folder-actions { display: flex; gap: 0.1rem; margin-left: auto; opacity: 0; }\n' +
      '.wt-row:hover .wf-folder-actions { opacity: 1; }\n' +
      '.wf-folder-children { padding-left: 0; }\n' +
      '.wf-dragging { opacity: 0.4; }\n' +
      '.wf-drag-over { outline: 2px dashed var(--vt-color-accent, #4ecca3); outline-offset: -2px; border-radius: var(--vt-radius-sm, 4px); }\n' +
      '.wf-icon-picker-modal { width: min(48rem, 100%); }\n' +
      '.wf-color-picker-modal { width: min(28rem, 100%); }\n' +
      '.wf-tree-container { display: flex; flex-direction: column; flex: 1; overflow: hidden; }\n' +
      '.wf-tree-container .wt-header { display: flex; align-items: center; gap: 0.3rem; padding: 0.7rem 0.6rem 0.35rem; border-bottom: 1px solid var(--vt-color-border, #2a2a4a); flex-shrink: 0; }\n' +
      '.wf-tree-container .wt-title { color: var(--vt-color-text-muted, #8b8ba8); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; flex: 1; }\n' +
      '.wf-tree-container .wt-list { min-height: 0; overflow-y: auto; padding: 0.2rem 0.6rem; }\n' +
      '.wf-tree-container .wt-row { display: flex; align-items: center; gap: 0.35rem; padding: 0.15rem 0.4rem; min-height: 1.75rem; border-radius: var(--vt-radius-sm, 4px); cursor: pointer; }\n' +
      '.wf-tree-container .wt-row:hover { background: var(--vt-color-surface-hover, #16213e); }\n' +
      '.wf-tree-container .wt-folder-row:hover { color: var(--vt-color-accent, #4ecca3); }\n' +
      '.wf-tree-container .wt-chevron { width: 0.7rem; font-size: 0.6rem; color: var(--vt-color-text-muted, #8b8ba8); flex-shrink: 0; user-select: none; }\n' +
      '.wf-tree-container .wt-label { flex: 1; min-width: 0; background: none; border: none; color: var(--vt-color-text-secondary, #a1a1aa); font-size: 0.78rem; text-align: left; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n' +
      '.wf-tree-container .wt-folder-label { color: var(--vt-color-text-secondary, #a1a1aa); font-weight: 500; }\n' +
      '.wf-tree-container .wt-node.selected > .wt-row { background: var(--vt-color-surface-selected, rgba(78,204,163,0.08)); box-shadow: inset 2px 0 0 var(--vt-color-accent, #4ecca3); }\n' +
      '.wf-tree-container .wt-icon-btn { width: 1.35rem; height: 1.35rem; min-height: 0; padding: 0; border: none; background: transparent; color: var(--vt-color-text-muted, #8b8ba8); cursor: pointer; border-radius: var(--vt-radius-sm, 4px); display: inline-flex; align-items: center; justify-content: center; }\n' +
      '.wf-tree-container .wt-icon-btn:hover { color: var(--vt-color-accent, #4ecca3); }\n' +
      '.wf-tree-container .wt-icon-btn.danger:hover { color: var(--vt-color-danger, #e94560); }\n' +
      '.wf-tree-container .wt-btn { min-height: 1.45rem; background: transparent; border: 1px solid transparent; color: var(--vt-color-text-muted, #8b8ba8); cursor: pointer; font-size: 0.78rem; padding: 0.1rem 0.35rem; border-radius: var(--vt-radius-sm, 4px); }\n' +
      '.wf-tree-container .wt-btn:hover { color: var(--vt-color-accent, #4ecca3); }\n' +
      '.wf-tree-container .wt-error { padding: 0.5rem; font-size: 0.75rem; color: var(--vt-color-danger, #e94560); }\n' +
    '';
  }
})();
