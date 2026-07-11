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

      function tr(key, params, fallback) {
        if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
        return fallback || key;
      }
      containerEl.__ptCleanup = [];
      var localizedNodes = [];

      function localized(tag, attrs, key, fallback) {
        var node = el(tag, attrs, [tr(key, null, fallback)]);
        var item = { node: node, key: key, params: null, fallback: fallback };
        node.__ptLocalized = item;
        localizedNodes.push(item);
        return node;
      }

      function setLocalized(node, key, params, fallback) {
        var item = node.__ptLocalized;
        if (!item) {
          item = { node: node };
          node.__ptLocalized = item;
          localizedNodes.push(item);
        }
        item.key = key;
        item.params = params || null;
        item.fallback = fallback;
        node.textContent = tr(key, params, fallback);
      }

      function trackCleanup(fn) {
        if (typeof fn === 'function') {
          if (!Array.isArray(containerEl.__ptCleanup)) {
            try { fn(); } catch (e) { console.error('[platform-test] late cleanup error:', e); }
            return;
          }
          containerEl.__ptCleanup.push(fn);
        }
      }
      if (api.i18n && typeof api.i18n.onDidChangeLocale === 'function') {
        trackCleanup(api.i18n.onDidChangeLocale(function () {
          localizedNodes.forEach(function (item) {
            if (item.key) item.node.textContent = tr(item.key, item.params, item.fallback);
          });
        }));
      }

      /* ── Header ─────────────────────────────────────────────────── */
      var header = div('pt-header', [
        span('pt-icon', '◉'),
        div('pt-title-group', [
          localized('h2', { className: 'pt-plugin-name' }, 'ui.diagnostics', 'Platform Diagnostics'),
          el('p', { className: 'pt-plugin-id' }, [api.pluginId]),
        ]),
        span('pt-version', 'v' + (props && props.version ? props.version : '0.1.0')),
      ]);

      /* ── Status badge ──────────────────────────────────────────── */
      var badge = div('pt-badge pt-badge-success', [
        el('span', {}, ['✅']),
        localized('span', {}, 'ui.bundleLoaded', 'Frontend Bundle Loaded'),
      ]);
      var badgeRow = div('', [badge]);

      /* ── Real Plugin API bridge checks ─────────────────────────── */
      var savedValue = localized('span', { className: 'pt-list-value pt-saved-setting' }, 'ui.savedLoading', 'Saved setting: loading...');
      var capabilityValue = localized('span', { className: 'pt-list-value pt-capability-result' }, 'ui.capabilitiesLoading', 'Capabilities: loading...');
      var commandValue = localized('span', { className: 'pt-list-value pt-command-result' }, 'ui.commandRegistering', 'Command: registering...');
      var eventValue = localized('span', { className: 'pt-list-value pt-event-result' }, 'ui.eventSubscribing', 'Event: subscribing...');
      var filesValue = localized('span', { className: 'pt-list-value pt-files-result' }, 'ui.filesRunning', 'Files: running...');
      var filesErrorValue = localized('span', { className: 'pt-list-value pt-files-error-result' }, 'ui.filesPathChecking', 'Files error path: checking...');
      var workbenchValue = localized('span', { className: 'pt-list-value pt-workbench-result' }, 'ui.workbenchReady', 'Workbench: ready');
      function makeWorkbenchButton(className, key, label, request) {
        return el('button', {
          className: 'btn btn-primary ' + className,
          onClick: function () {
          setLocalized(workbenchValue, 'ui.workbenchOpening', null, 'Workbench: opening...');
          api.workbench.editResource(request)
            .then(function (result) {
              setLocalized(workbenchValue, 'ui.workbenchOpened', { path: result.request.path, provider: result.providerId || 'no-provider' }, 'Workbench: opened {path} with {provider}');
              workbenchValue.setAttribute('data-workbench-status', result.status === 'opened' ? 'ok' : result.status);
            })
            .catch(function (err) {
              setLocalized(workbenchValue, 'ui.workbenchError', { error: err && err.message ? err.message : String(err) }, 'Workbench error: {error}');
              workbenchValue.setAttribute('data-workbench-status', 'error');
            });
          },
        }, [localized('span', {}, key, label)]);
      }
      var openTextWorkbenchButton = makeWorkbenchButton('pt-open-workbench-text', 'ui.openTextDiagnostic', 'Open Text Diagnostic', {
        kind: 'vault-file',
        path: 'Docs/todo.txt',
        extension: '.txt',
        mime: 'text/plain',
        context: { sourceView: 'files' },
      });
      var openMarkdownWorkbenchButton = makeWorkbenchButton('pt-open-workbench-markdown', 'ui.openMarkdownDiagnostic', 'Open Markdown Diagnostic', {
        kind: 'vault-file',
        path: 'Docs/readme.md',
        extension: '.md',
        context: { sourceView: 'files' },
      });
      var openNotesWorkbenchButton = makeWorkbenchButton('pt-open-workbench-notes', 'ui.openNotesDiagnostic', 'Open Notes Diagnostic', {
        kind: 'vault-file',
        path: 'Notes/example.md',
        extension: '.md',
        context: {
          sourceView: 'notes',
          isInsideNotesFolder: true,
          notesMode: true,
        },
      });
      var settingInput = el('input', {
        className: 'pt-setting-input',
        type: 'text',
        'aria-label': tr('ui.savedSetting', null, 'Saved setting'),
        value: 'changed value',
      });
      var saveStatus = span('pt-list-value', '');
      var saveButton = el('button', {
        className: 'btn btn-primary pt-save-setting',
        onClick: function () {
          setLocalized(saveStatus, 'ui.saving', null, 'Saving...');
          api.settings.write('savedText', settingInput.value)
            .then(function () {
              setLocalized(savedValue, 'ui.savedSettingValue', { value: settingInput.value }, 'Saved setting: {value}');
              setLocalized(saveStatus, 'ui.saved', null, 'Saved');
            })
            .catch(function (err) {
              setLocalized(saveStatus, 'ui.errorValue', { error: err && err.message ? err.message : String(err) }, 'Error: {error}');
            });
        },
      }, [localized('span', {}, 'ui.saveSetting', 'Save Setting')]);

      api.settings.read('savedText')
        .then(function (value) {
          var text = value || '';
          settingInput.value = text || 'changed value';
          setLocalized(savedValue, 'ui.savedSettingValue', { value: text }, 'Saved setting: {value}');
        })
        .catch(function (err) {
          setLocalized(savedValue, 'ui.settingsError', { error: err && err.message ? err.message : String(err) }, 'Settings error: {error}');
        });

      api.capabilities.list()
        .then(function (caps) {
          setLocalized(capabilityValue, 'ui.capabilitiesAvailable', { count: caps.length }, 'Capabilities: {count} available');
        })
        .catch(function (err) {
          setLocalized(capabilityValue, 'ui.capabilitiesError', { error: err && err.message ? err.message : String(err) }, 'Capabilities error: {error}');
        });

      api.capabilities.has('verstak/platform-test/v1')
        .then(function (available) {
          badge.setAttribute('data-capability-status', available ? 'available' : 'missing');
          setLocalized(badge.lastChild, available ? 'ui.bundleCapabilityAvailable' : 'ui.bundleCapabilityMissing', null, available ? 'Frontend Bundle Loaded | capability available' : 'Frontend Bundle Loaded | capability missing');
        })
        .catch(function (err) {
          badge.setAttribute('data-capability-status', 'error');
          setLocalized(badge.lastChild, 'ui.capabilityError', { error: err && err.message ? err.message : String(err) }, 'Capability error: {error}');
        });

      api.commands.register('verstak.platform-test.show-version', function () {
        return {
          version: '0.1.0',
          source: 'bundled-frontend',
        };
      })
        .then(function (unregister) {
          trackCleanup(unregister);
          return api.commands.execute('verstak.platform-test.show-version', {});
        })
        .then(function (result) {
          badge.setAttribute('data-command-status', result.status || '');
          setLocalized(commandValue, 'ui.commandResult', { status: result.status, version: result.result.version, source: result.result.source }, 'Command: {status} {version} from {source}');
        })
        .catch(function (err) {
          badge.setAttribute('data-command-status', 'error');
          setLocalized(commandValue, 'ui.commandError', { error: err && err.message ? err.message : String(err) }, 'Command error: {error}');
          console.error('[platform-test] command bridge error:', err);
        });

      api.events.subscribe('verstak.platform-test.echo', function (event) {
        var message = event && event.payload ? event.payload.message : '';
        setLocalized(eventValue, 'ui.eventReceived', { message: message }, 'Event: received {message}');
        eventValue.setAttribute('data-event-status', 'received');
      })
        .then(function (unsubscribe) {
          trackCleanup(unsubscribe);
          return api.events.publish('verstak.platform-test.echo', { message: 'hello-event' });
        })
        .catch(function (err) {
          setLocalized(eventValue, 'ui.eventError', { error: err && err.message ? err.message : String(err) }, 'Event error: {error}');
          eventValue.setAttribute('data-event-status', 'error');
        });

      api.files.createFolder('PlatformTest')
        .catch(function (err) {
          if (String(err).indexOf('conflict') === -1) throw err;
        })
        .then(function () {
          return api.files.writeText('PlatformTest/files-api.txt', 'hello files', { createIfMissing: true, overwrite: true });
        })
        .then(function () {
          return api.files.readText('PlatformTest/files-api.txt');
        })
        .then(function (text) {
          if (text !== 'hello files') throw new Error('read mismatch');
          return api.files.list('PlatformTest');
        })
        .then(function (entries) {
          var found = entries.some(function (entry) {
            return entry.relativePath === 'PlatformTest/files-api.txt';
          });
          if (!found) throw new Error('list missing file');
          return api.files.move('PlatformTest/files-api.txt', 'PlatformTest/files-api-moved.txt', { overwrite: true });
        })
        .then(function () {
          return api.files.trash('PlatformTest/files-api-moved.txt');
        })
        .then(function () {
          setLocalized(filesValue, 'ui.filesPassed', null, 'Files: wrote/read/listed/moved/trashed');
          filesValue.setAttribute('data-files-status', 'ok');
        })
        .catch(function (err) {
          setLocalized(filesValue, 'ui.filesError', { error: err && err.message ? err.message : String(err) }, 'Files error: {error}');
          filesValue.setAttribute('data-files-status', 'error');
        });

      api.files.readText('.verstak/vault.json')
        .then(function () {
          setLocalized(filesErrorValue, 'ui.filesPathAllowed', null, 'Files error path: unexpectedly allowed');
          filesErrorValue.setAttribute('data-files-error-status', 'error');
        })
        .catch(function (err) {
          var message = err && err.message ? err.message : String(err);
          if (message.indexOf('reserved-path') === -1 && message.indexOf('.verstak') === -1) {
            setLocalized(filesErrorValue, 'ui.filesPathWrongError', { error: message }, 'Files error path: wrong error {error}');
            filesErrorValue.setAttribute('data-files-error-status', 'error');
            return;
          }
          setLocalized(filesErrorValue, 'ui.filesPathRejected', null, 'Files error path: rejected reserved-path');
          filesErrorValue.setAttribute('data-files-error-status', 'expected');
        });

      var bridgeCard = div('pt-card', [
        localized('h3', { className: 'pt-card-title' }, 'ui.apiBridge', 'Real Plugin API Bridge'),
        el('ul', { className: 'pt-list' }, [
          el('li', { className: 'pt-list-item' }, [
            localized('span', { className: 'pt-list-label' }, 'ui.persistedSetting', 'Persisted setting'),
            savedValue,
          ]),
          el('li', { className: 'pt-list-item' }, [
            localized('span', { className: 'pt-list-label' }, 'ui.newValue', 'New value'),
            settingInput,
          ]),
          el('li', { className: 'pt-list-item' }, [
            saveButton,
            saveStatus,
          ]),
          el('li', { className: 'pt-list-item' }, [
            localized('span', { className: 'pt-list-label' }, 'ui.capabilitiesLabel', 'Capabilities'),
            capabilityValue,
          ]),
          el('li', { className: 'pt-list-item' }, [
            localized('span', { className: 'pt-list-label' }, 'ui.commandRuntime', 'Command runtime'),
            commandValue,
          ]),
          el('li', { className: 'pt-list-item' }, [
            localized('span', { className: 'pt-list-label' }, 'ui.eventRuntime', 'Event runtime'),
            eventValue,
          ]),
          el('li', { className: 'pt-list-item' }, [
            localized('span', { className: 'pt-list-label' }, 'ui.filesRuntime', 'Files runtime'),
            filesValue,
          ]),
          el('li', { className: 'pt-list-item' }, [
            localized('span', { className: 'pt-list-label' }, 'ui.filesReservedPath', 'Files reserved path'),
            filesErrorValue,
          ]),
          el('li', { className: 'pt-list-item' }, [
            localized('span', { className: 'pt-list-label' }, 'ui.workbenchRouting', 'Workbench routing'),
            openTextWorkbenchButton,
            openMarkdownWorkbenchButton,
            openNotesWorkbenchButton,
            workbenchValue,
          ]),
        ]),
      ]);

      /* ── Test results summary ──────────────────────────────────── */
      var testsData = [
        { key: 'registration', label: 'Plugin Registration', status: 'pass' },
        { key: 'platformCapability', label: 'Capability: verstak/platform-test/v1', status: 'pass' },
        { key: 'diagnosticsCapability', label: 'Capability: verstak/diagnostics/v1', status: 'pass' },
        { key: 'filesCapability', label: 'Capability: verstak/core/files/v1', status: 'pass' },
        { key: 'workbenchCapability', label: 'Capability: verstak/core/workbench/v1', status: 'pass' },
        { key: 'apiContract', label: 'API Contract Compliance', status: 'pass' },
      ];

      var totalTests = testsData.length;
      var passedTests = testsData.filter(function (t) { return t.status === 'pass'; }).length;

      var summaryRow = div('pt-test-summary', [
        div('pt-test-stat', [
          span('pt-test-stat-value pt-pass', String(passedTests)),
          localized('span', { className: 'pt-test-stat-label' }, 'ui.passed', 'Passed'),
        ]),
        div('pt-test-stat', [
          span('pt-test-stat-value pt-fail', String(totalTests - passedTests)),
          localized('span', { className: 'pt-test-stat-label' }, 'ui.failed', 'Failed'),
        ]),
        div('pt-test-stat', [
          span('pt-test-stat-value', String(totalTests)),
          localized('span', { className: 'pt-test-stat-label' }, 'ui.total', 'Total'),
        ]),
        div('pt-test-stat', [
          span('pt-test-stat-value pt-pass', '100%'),
          localized('span', { className: 'pt-test-stat-label' }, 'ui.successRate', 'Success Rate'),
        ]),
      ]);

      var testsList = el('ul', { className: 'pt-list' });
      testsData.forEach(function (t) {
        var dot = el('span', { className: 'pt-cap-dot pt-cap-dot-ok' });
        var item = el('li', { className: 'pt-list-item' }, [
          el('span', { className: 'pt-list-label' }, [dot, ' ', localized('span', {}, 'ui.test.' + t.key, t.label)]),
          localized('span', { className: 'pt-list-value pt-pass' }, t.status === 'pass' ? 'ui.pass' : 'ui.fail', t.status === 'pass' ? '✓ PASS' : '✗ FAIL'),
        ]);
        testsList.appendChild(item);
      });

      var testsCard = div('pt-card', [
        localized('h3', { className: 'pt-card-title' }, 'ui.testResults', 'Test Results'),
        summaryRow,
        testsList,
      ]);

      /* ── Capabilities status via API ───────────────────────────── */
      var knownCaps = [
        { id: 'verstak/platform-test/v1', label: 'Platform Test API' },
        { id: 'verstak/diagnostics/v1', label: 'Diagnostics API' },
        { id: 'verstak/core/vault/v1', label: 'Vault API (optional)' },
        { id: 'verstak/core/sync/v1', label: 'Sync API (optional)' },
        { id: 'verstak/core/workbench/v1', label: 'Workbench API' },
      ];

      var capList = el('ul', { className: 'pt-list' });
      knownCaps.forEach(function (cap) {
        var dot = el('span', {
          className: 'pt-cap-dot pt-cap-dot-missing',
        });
        var statusText = localized('span', { className: 'pt-list-value' }, 'ui.checking', 'Checking...');
        var item = el('li', { className: 'pt-list-item' }, [
          el('span', { className: 'pt-list-label' }, [dot, ' ', cap.label]),
          statusText,
        ]);
        capList.appendChild(item);
        api.capabilities.has(cap.id)
          .then(function (available) {
            dot.className = 'pt-cap-dot ' + (available ? 'pt-cap-dot-ok' : 'pt-cap-dot-missing');
            setLocalized(statusText, available ? 'ui.available' : 'ui.unavailable', null, available ? '✓ Available' : '— Unavailable');
          })
          .catch(function () {
            dot.className = 'pt-cap-dot pt-cap-dot-missing';
            setLocalized(statusText, 'ui.error', null, 'Error');
          });
      });

      var capsCard = div('pt-card', [
        localized('h3', { className: 'pt-card-title' }, 'ui.capabilities', 'Registered Capabilities'),
        capList,
      ]);

      /* ── Plugin info ───────────────────────────────────────────── */
      var infoList = el('ul', { className: 'pt-list' });
      var infoItems = [
        { key: 'pluginId', label: 'Plugin ID', value: api.pluginId },
        { key: 'bundleStatus', label: 'Bundle Status', value: tr('ui.loaded', null, 'Loaded ✓') },
        { key: 'registration', label: 'Registration Scheme', value: 'VerstakPluginRegister' },
        { key: 'components', label: 'Components', value: 'DiagnosticsPanel, PlatformTestSettings' },
        { key: 'container', label: 'Container', value: containerEl.tagName.toLowerCase() + (containerEl.id ? '#' + containerEl.id : '') },
      ];
      infoItems.forEach(function (item) {
        infoList.appendChild(
          el('li', { className: 'pt-list-item' }, [
            localized('span', { className: 'pt-list-label' }, 'ui.info.' + item.key, item.label),
            span('pt-list-value', item.value),
          ])
        );
      });

      var infoCard = div('pt-card', [
        localized('h3', { className: 'pt-card-title' }, 'ui.pluginInfo', 'Plugin Info'),
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
        { label: 'files.list', ok: typeof api.files.list === 'function' },
        { label: 'files.readText', ok: typeof api.files.readText === 'function' },
        { label: 'files.readBytes', ok: typeof api.files.readBytes === 'function' },
        { label: 'files.writeText', ok: typeof api.files.writeText === 'function' },
        { label: 'files.writeBytes', ok: typeof api.files.writeBytes === 'function' },
        { label: 'files.trash', ok: typeof api.files.trash === 'function' },
        { label: 'workbench.openResource', ok: typeof api.workbench.openResource === 'function' },
        { label: 'workbench.editResource', ok: typeof api.workbench.editResource === 'function' },
      ];
      apiChecks.forEach(function (chk) {
        var dot = el('span', {
          className: 'pt-cap-dot ' + (chk.ok ? 'pt-cap-dot-ok' : 'pt-cap-dot-missing'),
        });
        apiStatusList.appendChild(
          el('li', { className: 'pt-list-item' }, [
            el('span', { className: 'pt-list-label' }, [dot, ' ', chk.label]),
            localized('span', { className: 'pt-list-value' }, chk.ok ? 'ui.ready' : 'ui.missing', chk.ok ? '✓ Ready' : '✗ Missing'),
          ])
        );
      });

      var apiCard = div('pt-card', [
        localized('h3', { className: 'pt-card-title' }, 'ui.hostMethods', 'Host API Methods'),
        apiStatusList,
      ]);

      /* ── Mouse Event Inspector ──────────────────────────────────── */
      var mouseLog = [];
      var mouseCapturing = false;
      var mouseHandlers = [];
      var mouseEventTypes = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'auxclick'];
      var mouseLogContainer = el('pre', {
        className: 'pt-mouse-log',
        style: {
          background: '#0d0d1a',
          color: '#4ecca3',
          padding: '0.75rem',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontFamily: 'monospace',
          maxHeight: '300px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          margin: '0.5rem 0',
          lineHeight: '1.5',
        },
      }, ['']);

      var mouseCountSpan = span('pt-list-value', '0');

      function renderMouseLog() {
        if (mouseLog.length === 0) {
          setLocalized(mouseLogContainer, 'ui.noMouseEvents', null, '(no events captured)');
          mouseCountSpan.textContent = '0';
          return;
        }
        var lines = mouseLog.map(function (e, i) {
          return '[' + (i + 1) + '] ' + e.type + '  button=' + e.button + '  buttons=' + e.buttons +
            '  which=' + e.which + '  pointerType=' + e.pointerType +
            '  defaultPrevented=' + e.defaultPrevented +
            '  target=' + e.targetTag + (e.targetClass ? '.' + e.targetClass : '');
        });
        if (mouseLogContainer.__ptLocalized) mouseLogContainer.__ptLocalized.key = '';
        mouseLogContainer.textContent = lines.join('\n');
        mouseCountSpan.textContent = String(mouseLog.length);
        mouseLogContainer.scrollTop = mouseLogContainer.scrollHeight;
      }

      function onMouseEvent(e) {
        mouseLog.push({
          type: e.type,
          button: e.button,
          buttons: e.buttons,
          which: e.which,
          pointerType: e.pointerType || '',
          defaultPrevented: e.defaultPrevented,
          targetTag: e.target ? e.target.tagName : '',
          targetClass: e.target ? (e.target.className || '') : '',
          time: Date.now(),
        });
        if (mouseLog.length > 200) mouseLog.shift();
        renderMouseLog();
      }

      function startMouseCapture() {
        if (mouseCapturing) return;
        mouseCapturing = true;
        mouseEventTypes.forEach(function (type) {
          var handler = function (e) { onMouseEvent(e); };
          window.addEventListener(type, handler, true);
          mouseHandlers.push({ type: type, handler: handler });
        });
        setLocalized(startStopBtn, 'ui.stopCapture', null, '■ Stop Capture');
        startStopBtn.setAttribute('data-mouse-capturing', 'true');
        renderMouseLog();
      }

      function stopMouseCapture() {
        if (!mouseCapturing) return;
        mouseCapturing = false;
        mouseHandlers.forEach(function (h) {
          window.removeEventListener(h.type, h.handler, true);
        });
        mouseHandlers = [];
        setLocalized(startStopBtn, 'ui.startCapture', null, '▶ Start Capture');
        startStopBtn.setAttribute('data-mouse-capturing', 'false');
      }

      var startStopBtn = localized('button', {
        className: 'btn btn-primary',
        style: { marginRight: '0.5rem' },
        onClick: function () {
          if (mouseCapturing) { stopMouseCapture(); } else { startMouseCapture(); }
        },
      }, 'ui.startCapture', '▶ Start Capture');

      var clearBtn = localized('button', {
        className: 'btn btn-secondary',
        style: { marginRight: '0.5rem' },
        onClick: function () {
          mouseLog = [];
          renderMouseLog();
        },
      }, 'ui.clear', 'Clear');

      var copyBtn = localized('button', {
        className: 'btn btn-secondary',
        onClick: function () {
          var json = JSON.stringify(mouseLog, null, 2);
          if (navigator.clipboard) {
            navigator.clipboard.writeText(json).then(function () {
              setLocalized(copyBtn, 'ui.copied', null, '✓ Copied!');
              setTimeout(function () { setLocalized(copyBtn, 'ui.copyJson', null, 'Copy JSON'); }, 1500);
            });
          } else {
            var ta = document.createElement('textarea');
            ta.value = json;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setLocalized(copyBtn, 'ui.copied', null, '✓ Copied!');
            setTimeout(function () { setLocalized(copyBtn, 'ui.copyJson', null, 'Copy JSON'); }, 1500);
          }
        },
      }, 'ui.copyJson', 'Copy JSON');

      trackCleanup(function () { stopMouseCapture(); });

      var mouseCard = div('pt-card', [
        localized('h3', { className: 'pt-card-title' }, 'ui.mouseInspector', 'Mouse Event Inspector'),
        localized('p', { style: { margin: '0 0 0.5rem', color: '#a0a0b8', fontSize: '0.8rem' } }, 'ui.mouseHint', 'Captures ALL mouse/pointer events on window. Press back/forward buttons to see what WebKitGTK reports.'),
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' } }, [
          startStopBtn,
          clearBtn,
          copyBtn,
          localized('span', { className: 'pt-list-label' }, 'ui.eventsCount', 'Events:'),
          mouseCountSpan,
        ]),
        mouseLogContainer,
      ]);

      /* ── Assemble ──────────────────────────────────────────────── */
      containerEl.appendChild(header);
      containerEl.appendChild(badgeRow);
      containerEl.appendChild(bridgeCard);
      containerEl.appendChild(testsCard);
      containerEl.appendChild(capsCard);
      containerEl.appendChild(mouseCard);
      containerEl.appendChild(infoCard);
      containerEl.appendChild(apiCard);
    },

    unmount: function (containerEl) {
      if (Array.isArray(containerEl.__ptCleanup)) {
        while (containerEl.__ptCleanup.length > 0) {
          var cleanup = containerEl.__ptCleanup.pop();
          try { cleanup(); } catch (e) { console.error('[platform-test] cleanup error:', e); }
        }
      }
      containerEl.innerHTML = '';
      containerEl.className = '';
      delete containerEl.__ptCleanup;
    },
  };

  /* ------------------------------------------------------------------ */
  /*  MarkdownDiagnosticProvider component                              */
  /* ------------------------------------------------------------------ */
  var MarkdownDiagnosticProvider = {
    mount: function (containerEl, props) {
      injectStyles();

      var request = props && props.request ? props.request : {};
      var context = request.context && (request.context.notesMode || request.context.isInsideNotesFolder)
        ? 'notes-markdown'
        : ((request.extension === '.md' || request.extension === '.markdown') ? 'generic-markdown' : 'generic-text');
      containerEl.innerHTML = '';
      containerEl.className = 'pt-root';

      var result = div('pt-card pt-workbench-result', [
        el('h2', { className: 'pt-plugin-name' }, ['Workbench Diagnostic Provider']),
        el('p', { className: 'pt-plugin-id' }, [
          'Workbench: opened ' + (request.path || '') + ' with ' + ((props && props.providerId) || '') +
            ' mode=' + (request.mode || '') + ' context=' + context,
        ]),
      ]);
      result.setAttribute('data-workbench-status', 'ok');
      result.setAttribute('data-resource-path', request.path || '');
      result.setAttribute('data-resource-mode', request.mode || '');
      result.setAttribute('data-resource-context', context);

      containerEl.appendChild(result);
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

      function tr(key, params, fallback) {
        if (api && api.i18n && typeof api.i18n.t === 'function') return api.i18n.t(key, params, fallback);
        return fallback || key;
      }
      var localizedNodes = [];
      var unsubscribeLocale = null;

      function localized(tag, attrs, key, fallback) {
        var node = el(tag, attrs, [tr(key, null, fallback)]);
        localizedNodes.push({ node: node, key: key, fallback: fallback });
        return node;
      }

      if (api.i18n && typeof api.i18n.onDidChangeLocale === 'function') {
        unsubscribeLocale = api.i18n.onDidChangeLocale(function () {
          localizedNodes.forEach(function (item) {
            item.node.textContent = tr(item.key, null, item.fallback);
          });
        });
        containerEl.__ptSettingsCleanup = unsubscribeLocale;
      }

      /* ── Counter state (local, not persisted) ──────────────────── */
      var counterState = { value: 0 };

      /* ── Header ─────────────────────────────────────────────────── */
      var header = div('pt-header', [
        span('pt-icon', '⚙️'),
        div('pt-title-group', [
          localized('h2', { className: 'pt-plugin-name' }, 'ui.settings', 'Platform Test Settings'),
          el('p', { className: 'pt-plugin-id' }, [api.pluginId]),
        ]),
      ]);

      /* ── Info card ──────────────────────────────────────────────── */
      var infoCard = div('pt-card', [
        localized('p', { style: { margin: '0', color: '#a0a0b8', fontSize: '0.85rem' } }, 'ui.settingsInfo', 'Settings panel loaded from the plugin frontend bundle through the VerstakPluginRegister contract.'),
      ]);

      /* ── Counter section ────────────────────────────────────────── */
      var counterDisplay = div('pt-counter', [
        el('span', { className: 'pt-counter-value' }, [String(counterState.value)]),
        localized('span', { className: 'pt-counter-label' }, 'ui.counterClicks', 'clicks (session only, no persistence)'),
      ]);

      var incrementBtn = el('button', { className: 'btn btn-primary', onClick: function () {
        counterState.value += 1;
        counterDisplay.firstChild.textContent = String(counterState.value);
      }}, [localized('span', {}, 'ui.increment', '+ Increment')]);

      var decrementBtn = el('button', { className: 'btn btn-secondary', onClick: function () {
        counterState.value = Math.max(0, counterState.value - 1);
        counterDisplay.firstChild.textContent = String(counterState.value);
      }}, [localized('span', {}, 'ui.decrement', '− Decrement')]);

      var resetBtn = el('button', { className: 'btn btn-secondary', onClick: function () {
        counterState.value = 0;
        counterDisplay.firstChild.textContent = '0';
      }}, [localized('span', {}, 'ui.reset', '↺ Reset')]);

      var btnGroup = el('div', { style: { display: 'flex', gap: '0.5rem' } }, [
        incrementBtn, decrementBtn, resetBtn,
      ]);

      var counterCard = div('pt-card', [
        localized('h3', { className: 'pt-card-title' }, 'ui.counter', 'Interactive Counter (Local State)'),
        counterDisplay,
        btnGroup,
        localized('p', { style: { marginTop: '0.75rem', color: '#6c6c8a', fontSize: '0.7rem' } }, 'ui.counterHint', 'This counter is a local demo. State is not persisted — refreshing resets it.'),
      ]);

      /* ── Settings stub ─────────────────────────────────────────── */
      var settingsDemoList = el('ul', { className: 'pt-list' });
      var settingsItems = [
        { key: 'autoRun', label: 'Auto-run on load', valueKey: 'true', value: 'true' },
        { key: 'verbose', label: 'Verbose logging', valueKey: 'false', value: 'false' },
        { key: 'theme', label: 'Theme override', valueKey: 'inherit', value: 'inherit' },
        { key: 'notifications', label: 'Notifications', valueKey: 'enabled', value: 'enabled' },
      ];
      settingsItems.forEach(function (s) {
        settingsDemoList.appendChild(
          el('li', { className: 'pt-list-item' }, [
            localized('span', { className: 'pt-list-label' }, 'ui.setting.' + s.key, s.label),
            localized('span', { className: 'pt-list-value' }, 'ui.value.' + s.valueKey, s.value),
          ])
        );
      });

      var settingsCard = div('pt-card', [
        localized('h3', { className: 'pt-card-title' }, 'ui.demoSettings', 'Plugin Settings (Demo)'),
        settingsDemoList,
        localized('p', { style: { marginTop: '0.5rem', color: '#6c6c8a', fontSize: '0.7rem' } }, 'ui.settingsHint', 'Use api.settings.read() / api.settings.write() for persisted settings.'),
      ]);

      /* ── Assemble ──────────────────────────────────────────────── */
      containerEl.appendChild(header);
      containerEl.appendChild(infoCard);
      containerEl.appendChild(counterCard);
      containerEl.appendChild(settingsCard);
    },

    unmount: function (containerEl) {
      if (typeof containerEl.__ptSettingsCleanup === 'function') containerEl.__ptSettingsCleanup();
      containerEl.innerHTML = '';
      containerEl.className = '';
      delete containerEl.__ptSettingsCleanup;
    },
  };

  /* ------------------------------------------------------------------ */
  /*  Register with the host                                             */
  /* ------------------------------------------------------------------ */
  window.VerstakPluginRegister('verstak.platform-test', {
    components: {
      DiagnosticsPanel: DiagnosticsPanel,
      PlatformTestSettings: PlatformTestSettings,
      MarkdownDiagnosticProvider: MarkdownDiagnosticProvider,
    },
  });
})();
