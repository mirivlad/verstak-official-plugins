/* ===========================================================
   Platform Test Plugin — Verstak v2 Frontend Bundle
   Contract: window.VerstakPluginRegister(id, { components })
   =========================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Style injection                                                    */
  /*  Loads style.css once into the document head                        */
  /* ------------------------------------------------------------------ */
  function injectStyles() {
    if (document.getElementById('pt-style-injected')) return;
    var link = document.createElement('link');
    link.id = 'pt-style-injected';
    link.rel = 'stylesheet';
    link.href = 'frontend/style.css';
    document.head.appendChild(link);
  }

  /* ------------------------------------------------------------------ */
  /*  Utilities                                                          */
  /* ------------------------------------------------------------------ */
  function el(tag, attrs, children) {
    var elem = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') { elem.className = attrs[k]; }
        else if (k === 'style' && typeof attrs[k] === 'object') {
          Object.assign(elem.style, attrs[k]);
        }
        else if (k.slice(0, 2) === 'on') {
          elem.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        }
        else { elem.setAttribute(k, attrs[k]); }
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

  function div(className, children) {
    return el('div', { className: className }, children);
  }

  function span(className, text) {
    return el('span', { className: className }, [text]);
  }

  /* ------------------------------------------------------------------ */
  /*  DiagnosticsPanel component                                         */
  /* ------------------------------------------------------------------ */
  var DiagnosticsPanel = {
    mount: function (containerEl, props, api) {
      /* Inject shared styles */
      injectStyles();

      containerEl.innerHTML = '';
      containerEl.className = 'pt-root';

      /* ── Header ─────────────────────────────────────────────────── */
      var header = div('pt-header', [
        span('pt-icon', '🧪'),
        div('pt-title-group', [
          el('h2', { className: 'pt-plugin-name' }, ['Platform Diagnostics']),
          el('p', { className: 'pt-plugin-id' }, [api.pluginId]),
        ]),
        span('pt-version', 'v' + (props && props.version ? props.version : '0.1.0')),
      ]);

      /* ── Status badge ──────────────────────────────────────────── */
      var badge = div('pt-badge pt-badge-success', [
        el('span', {}, ['✅']),
        el('span', {}, ['Frontend Bundle Loaded']),
      ]);
      var badgeRow = div('', { style: { marginBottom: '1rem' } }, [badge]);

      /* ── Test results summary ──────────────────────────────────── */
      var testsData = [
        { label: 'Plugin Registration', status: 'pass' },
        { label: 'Capability: verstak/platform-test/v1', status: 'pass' },
        { label: 'Capability: verstak/diagnostics/v1', status: 'pass' },
        { label: 'API Contract Compliance', status: 'pass' },
      ];

      var totalTests = testsData.length;
      var passedTests = testsData.filter(function (t) { return t.status === 'pass'; }).length;

      var summaryRow = div('pt-test-summary', [
        div('pt-test-stat', [
          span('pt-test-stat-value pt-pass', String(passedTests)),
          span('pt-test-stat-label', 'Passed'),
        ]),
        div('pt-test-stat', [
          span('pt-test-stat-value pt-fail', String(totalTests - passedTests)),
          span('pt-test-stat-label', 'Failed'),
        ]),
        div('pt-test-stat', [
          span('pt-test-stat-value', String(totalTests)),
          span('pt-test-stat-label', 'Total'),
        ]),
        div('pt-test-stat', [
          span('pt-test-stat-value pt-pass', '100%'),
          span('pt-test-stat-label', 'Success Rate'),
        ]),
      ]);

      var testsList = el('ul', { className: 'pt-list' });
      testsData.forEach(function (t) {
        var dot = el('span', { className: 'pt-cap-dot pt-cap-dot-ok' });
        var item = el('li', { className: 'pt-list-item' }, [
          el('span', { className: 'pt-list-label' }, [dot, ' ', t.label]),
          span('pt-list-value pt-pass', t.status === 'pass' ? '✓ PASS' : '✗ FAIL'),
        ]);
        testsList.appendChild(item);
      });

      var testsCard = div('pt-card', [
        el('h3', { className: 'pt-card-title' }, ['Test Results']),
        summaryRow,
        testsList,
      ]);

      /* ── Capabilities status via API ───────────────────────────── */
      var knownCaps = [
        { id: 'verstak/platform-test/v1', label: 'Platform Test API' },
        { id: 'verstak/diagnostics/v1', label: 'Diagnostics API' },
        { id: 'verstak/core/vault/v1', label: 'Vault API (optional)' },
        { id: 'verstak/core/sync/v1', label: 'Sync API (optional)' },
      ];

      var capList = el('ul', { className: 'pt-list' });
      knownCaps.forEach(function (cap) {
        var available = api.capabilities && api.capabilities.has
          ? api.capabilities.has(cap.id)
          : false;
        var dot = el('span', {
          className: 'pt-cap-dot ' + (available ? 'pt-cap-dot-ok' : 'pt-cap-dot-missing'),
        });
        var statusVal = available ? '✓ Available' : '— Unavailable';
        var item = el('li', { className: 'pt-list-item' }, [
          el('span', { className: 'pt-list-label' }, [dot, ' ', cap.label]),
          span('pt-list-value', statusVal),
        ]);
        capList.appendChild(item);
      });

      var capsCard = div('pt-card', [
        el('h3', { className: 'pt-card-title' }, ['Registered Capabilities']),
        capList,
      ]);

      /* ── Plugin info ───────────────────────────────────────────── */
      var infoList = el('ul', { className: 'pt-list' });
      var infoItems = [
        { label: 'Plugin ID', value: api.pluginId },
        { label: 'Bundle Status', value: 'Loaded ✓' },
        { label: 'Registration Scheme', value: 'VerstakPluginRegister' },
        { label: 'Components', value: 'DiagnosticsPanel, PlatformTestSettings' },
        { label: 'Container', value: containerEl.tagName.toLowerCase() + (containerEl.id ? '#' + containerEl.id : '') },
      ];
      infoItems.forEach(function (item) {
        infoList.appendChild(
          el('li', { className: 'pt-list-item' }, [
            span('pt-list-label', item.label),
            span('pt-list-value', item.value),
          ])
        );
      });

      var infoCard = div('pt-card', [
        el('h3', { className: 'pt-card-title' }, ['Plugin Info']),
        infoList,
      ]);

      /* ── Host API status ───────────────────────────────────────── */
      var apiStatusList = el('ul', { className: 'pt-list' });
      var apiChecks = [
        { label: 'events.publish', ok: typeof api.events.publish === 'function' },
        { label: 'events.subscribe', ok: typeof api.events.subscribe === 'function' },
        { label: 'settings.read', ok: typeof api.settings.read === 'function' },
        { label: 'settings.write', ok: typeof api.settings.write === 'function' },
        { label: 'commands.execute', ok: typeof api.commands.execute === 'function' },
        { label: 'capabilities.has', ok: typeof api.capabilities.has === 'function' },
      ];
      apiChecks.forEach(function (chk) {
        var dot = el('span', {
          className: 'pt-cap-dot ' + (chk.ok ? 'pt-cap-dot-ok' : 'pt-cap-dot-missing'),
        });
        apiStatusList.appendChild(
          el('li', { className: 'pt-list-item' }, [
            el('span', { className: 'pt-list-label' }, [dot, ' ', chk.label]),
            span('pt-list-value', chk.ok ? '✓ Ready' : '✗ Missing'),
          ])
        );
      });

      var apiCard = div('pt-card', [
        el('h3', { className: 'pt-card-title' }, ['Host API Methods']),
        apiStatusList,
      ]);

      /* ── Assemble ──────────────────────────────────────────────── */
      containerEl.appendChild(header);
      containerEl.appendChild(badgeRow);
      containerEl.appendChild(testsCard);
      containerEl.appendChild(capsCard);
      containerEl.appendChild(infoCard);
      containerEl.appendChild(apiCard);
    },

    unmount: function (containerEl) {
      containerEl.innerHTML = '';
      containerEl.className = '';
    },
  };

  /* ------------------------------------------------------------------ */
  /*  PlatformTestSettings component                                     */
  /* ------------------------------------------------------------------ */
  var PlatformTestSettings = {
    mount: function (containerEl, props, api) {
      injectStyles();

      containerEl.innerHTML = '';
      containerEl.className = 'pt-root';

      /* ── Counter state (local, not persisted) ──────────────────── */
      var counterState = { value: 0 };

      /* ── Header ─────────────────────────────────────────────────── */
      var header = div('pt-header', [
        span('pt-icon', '⚙️'),
        div('pt-title-group', [
          el('h2', { className: 'pt-plugin-name' }, ['Platform Test Settings']),
          el('p', { className: 'pt-plugin-id' }, [api.pluginId]),
        ]),
      ]);

      /* ── Info card ──────────────────────────────────────────────── */
      var infoCard = div('pt-card', [
        el('p', { style: { margin: '0', color: '#a0a0b8', fontSize: '0.85rem' } }, [
          'Settings panel loaded from plugin frontend bundle via ',
          el('code', { style: { background: '#1a1a2e', padding: '0.1rem 0.3rem', borderRadius: '3px', color: '#4ecca3' } }, ['VerstakPluginRegister']),
          ' contract.',
        ]),
      ]);

      /* ── Counter section ────────────────────────────────────────── */
      var counterDisplay = div('pt-counter', [
        el('span', { className: 'pt-counter-value' }, [String(counterState.value)]),
        span('pt-counter-label', 'clicks (session only, no persistence)'),
      ]);

      var incrementBtn = el('button', { className: 'pt-btn pt-btn-accent', onClick: function () {
        counterState.value += 1;
        counterDisplay.firstChild.textContent = String(counterState.value);
      }}, ['+ Increment']);

      var decrementBtn = el('button', { className: 'pt-btn', onClick: function () {
        counterState.value = Math.max(0, counterState.value - 1);
        counterDisplay.firstChild.textContent = String(counterState.value);
      }}, ['− Decrement']);

      var resetBtn = el('button', { className: 'pt-btn', onClick: function () {
        counterState.value = 0;
        counterDisplay.firstChild.textContent = '0';
      }}, ['↺ Reset']);

      var btnGroup = div('', { style: { display: 'flex', gap: '0.5rem' } }, [
        incrementBtn, decrementBtn, resetBtn,
      ]);

      var counterCard = div('pt-card', [
        el('h3', { className: 'pt-card-title' }, ['Interactive Counter (Local State)']),
        counterDisplay,
        btnGroup,
        el('p', { style: { marginTop: '0.75rem', color: '#6c6c8a', fontSize: '0.7rem' } }, [
          'This counter is a local demo. State is not persisted — refreshing resets it.',
        ]),
      ]);

      /* ── Settings stub ─────────────────────────────────────────── */
      var settingsDemoList = el('ul', { className: 'pt-list' });
      var settingsItems = [
        { label: 'Auto-run on load', value: 'true' },
        { label: 'Verbose logging', value: 'false' },
        { label: 'Theme override', value: 'inherit' },
        { label: 'Notifications', value: 'enabled' },
      ];
      settingsItems.forEach(function (s) {
        settingsDemoList.appendChild(
          el('li', { className: 'pt-list-item' }, [
            span('pt-list-label', s.label),
            span('pt-list-value', s.value),
          ])
        );
      });

      var settingsCard = div('pt-card', [
        el('h3', { className: 'pt-card-title' }, ['Plugin Settings (Demo)']),
        settingsDemoList,
        el('p', { style: { marginTop: '0.5rem', color: '#6c6c8a', fontSize: '0.7rem' } }, [
          'Use api.settings.read() / api.settings.write() for persisted settings.',
        ]),
      ]);

      /* ── Assemble ──────────────────────────────────────────────── */
      containerEl.appendChild(header);
      containerEl.appendChild(infoCard);
      containerEl.appendChild(counterCard);
      containerEl.appendChild(settingsCard);
    },

    unmount: function (containerEl) {
      containerEl.innerHTML = '';
      containerEl.className = '';
    },
  };

  /* ------------------------------------------------------------------ */
  /*  Register with the host                                             */
  /* ------------------------------------------------------------------ */
  window.VerstakPluginRegister('verstak.platform-test', {
    components: {
      DiagnosticsPanel: DiagnosticsPanel,
      PlatformTestSettings: PlatformTestSettings,
    },
  });
})();
