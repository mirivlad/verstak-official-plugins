// Platform Test Plugin — Runtime Diagnostics Panel
// Renders inside the Plugin Manager UI via the contributions system.

class DiagnosticsPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.runTests();
  }

  async runTests() {
    const results = [];
    const tests = [
      { name: 'manifest loaded', run: () => this.manifest !== null },
      { name: 'api version >= 0.1.0', run: () => this.compareVersions(this.apiVersion, '0.1.0') >= 0 },
      { name: 'capability registered', run: () => this.checkCapability('verstak/platform-test/v1') },
      { name: 'container exists', run: () => !!document.getElementById('platform-test-root') },
    ];

    for (const test of tests) {
      try {
        const passed = await test.run();
        results.push({ name: test.name, passed, error: null });
      } catch (e) {
        results.push({ name: test.name, passed: false, error: e.message });
      }
    }

    this.renderResults(results);
  }

  compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) > (pb[i] || 0)) return 1;
      if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    }
    return 0;
  }

  async checkCapability(name) {
    try {
      const caps = await window.go.api.App.GetCapabilities();
      return caps.some(c => c.name === name);
    } catch {
      return false;
    }
  }

  get manifest() {
    try {
      return window.__VERSTAK_PLUGIN_MANIFEST__ || null;
    } catch {
      return null;
    }
  }

  get apiVersion() {
    return this.manifest?.apiVersion || '0.0.0';
  }

  render() {
    this.shadowRoot.innerHTML = `
      <div style="padding: 1rem;">
        <h3 style="color: #e94560; margin: 0 0 0.5rem 0;">🧪 Platform Diagnostics</h3>
        <p style="color: #a0a0b8; font-size: 0.85rem; margin: 0 0 1rem 0;">
          Runtime tests for plugin infrastructure
        </p>
        <div id="test-results">
          <p style="color: #a0a0b8;">Running tests...</p>
        </div>
      </div>
    `;
  }

  renderResults(results) {
    const container = this.shadowRoot.getElementById('test-results');
    const allPassed = results.every(r => r.passed);

    container.innerHTML = `
      <div style="margin-bottom: 0.75rem; font-size: 0.9rem; color: ${allPassed ? '#4ecca3' : '#e94560'};">
        ${allPassed ? '✅ All Tests Pass' : '❌ Some Tests Failed'} — ${results.filter(r => r.passed).length}/${results.length}
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
        <thead>
          <tr style="border-bottom: 1px solid #0f3460;">
            <th style="text-align: left; padding: 0.3rem; color: #a0a0b8;">Test</th>
            <th style="text-align: left; padding: 0.3rem; color: #a0a0b8;">Result</th>
          </tr>
        </thead>
        <tbody>
          ${results.map(r => `
            <tr style="border-bottom: 1px solid #0f3460;">
              <td style="padding: 0.3rem;">${r.name}</td>
              <td style="padding: 0.3rem; color: ${r.passed ? '#4ecca3' : '#e94560'};">
                ${r.passed ? '✓ PASS' : '✗ FAIL'}${r.error ? ` — ${r.error}` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 1rem; padding: 0.5rem; background: #16213e; border-radius: 4px; font-size: 0.75rem; color: #a0a0b8;">
        <strong>Plugin Info:</strong> ${this.manifest ? JSON.stringify(this.manifest, null, 2) : 'Not available'}
      </div>
    `;
  }
}

customElements.define('platform-test-diagnostics', DiagnosticsPanel);

// Auto-mount if we detect we're standalone
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}

function mount() {
  const root = document.getElementById('platform-test-root');
  if (root && !root.querySelector('platform-test-diagnostics')) {
    const panel = document.createElement('platform-test-diagnostics');
    root.appendChild(panel);
  }
}
