<script>
  export let api = null

  let settings = null
  let loading = false
  let errorMsg = ''
  let resultMsg = ''
  let resultKind = ''

  let serverUrl = ''
  let username = ''
  let password = ''
  let syncInterval = 0
  let autoSync = false
  let showDisconnectConfirm = false
  let showResetKeyConfirm = false
  let connectionOk = null

  async function backendCall(method, ...args) {
    if (api && api.backend && typeof api.backend.call === 'function') {
      return await api.backend.call(method, ...args)
    }
    throw new Error('Plugin API backend.call not available')
  }

  async function load() {
    try {
      settings = await backendCall('SyncStatus')
      if (settings) {
        serverUrl = settings.serverUrl || ''
        syncInterval = settings.syncInterval || 0
        autoSync = settings.syncInterval > 0
      }
    } catch (e) { settings = null }
  }

  load()

  async function testConnection() {
    loading = true
    errorMsg = ''
    resultKind = ''
    connectionOk = null
    try {
      await backendCall('SyncTestConnection', serverUrl, username, password)
      connectionOk = true
      resultMsg = 'connection ok'
    } catch (e) {
      connectionOk = false
      resultMsg = 'connection failed: ' + String(e)
    }
    loading = false
  }

  async function configureSync() {
    loading = true
    errorMsg = ''
    resultKind = ''
    try {
      await backendCall('SyncConfigure', serverUrl, username, password)
      resultMsg = 'configured'
      username = ''
      password = ''
      await load()
    } catch (e) {
      errorMsg = String(e)
    }
    loading = false
  }

  function syncResultWarning(result) {
    const conflicts = Array.isArray(result?.conflicts) ? result.conflicts : []
    const applyErrors = Array.isArray(result?.applyErrors) ? result.applyErrors : []
    const parts = []
    if (conflicts.length > 0) {
      parts.push(conflicts.length + ' conflict(s)')
    }
    if (applyErrors.length > 0) {
      parts.push(applyErrors.length + ' error(s)')
    }
    return parts.join(' · ')
  }

  async function runSyncNow() {
    loading = true
    errorMsg = ''
    resultKind = ''
    try {
      const r = await backendCall('SyncNow')
      const summary = 'pushed ' + (r?.pushed || 0) + ', pulled ' + (r?.pulled || 0)
      const warning = syncResultWarning(r)
      resultMsg = warning ? summary + ' · ' + warning : summary
      resultKind = warning ? 'warning' : ''
      await load()
    } catch (e) {
      errorMsg = String(e)
    }
    loading = false
  }

  async function saveInterval() {
    loading = true
    errorMsg = ''
    resultKind = ''
    try {
      await backendCall('SyncSetInterval', syncInterval)
      resultMsg = 'settings saved'
      resultKind = ''
    } catch (e) {
      errorMsg = String(e)
    }
    loading = false
  }

  async function setAutoSync() {
    const minutes = autoSync ? 5 : 0
    syncInterval = minutes
    loading = true
    errorMsg = ''
    resultKind = ''
    try {
      await backendCall('SyncSetInterval', minutes)
      resultMsg = autoSync ? 'auto-sync enabled' : 'auto-sync disabled'
      resultKind = ''
    } catch (e) {
      errorMsg = String(e)
    }
    loading = false
  }

  function confirmDisconnect() {
    showDisconnectConfirm = true
  }

  async function doDisconnect() {
    showDisconnectConfirm = false
    loading = true
    resultKind = ''
    try {
      await backendCall('SyncDisconnect')
      resultMsg = 'disconnected'
      await load()
    } catch (e) { errorMsg = String(e) }
    loading = false
  }

  function confirmResetKey() {
    showResetKeyConfirm = true
  }

  async function doResetKey() {
    showResetKeyConfirm = false
    loading = true
    resultKind = ''
    try {
      await backendCall('ResetSyncKey')
      resultMsg = 'key reset'
      await load()
    } catch (e) { errorMsg = String(e) }
    loading = false
  }

  function statusLabel(s) {
    if (!s) return 'not configured'
    const labels = {
      'connected': 'connected',
      'disconnected': 'disconnected',
      'disabled': 'not configured',
      'error': 'error',
      'revoked': 'revoked',
    }
    return labels[s] || s
  }
</script>

<div class="settings-section">
  <h2>Sync</h2>
  <p class="section-desc">Synchronize your vault across devices.</p>

  {#if errorMsg}
    <div class="error-msg">{errorMsg}</div>
  {/if}
  {#if resultMsg && !errorMsg}
    <div class="result-msg" class:warning={resultKind === 'warning'}>{resultMsg}</div>
  {/if}

  {#if settings && settings.configured}
    <div class="settings-card">
      <div class="sync-info">
        <div class="info-row">
          <span class="info-label">Status</span>
          <span class="info-value" class:status-ok={settings.statusLabel === 'connected'} class:status-err={settings.statusLabel === 'error' || settings.statusLabel === 'revoked'}>
            {statusLabel(settings.statusLabel)}
          </span>
        </div>
        {#if settings.serverUrl}
          <div class="info-row">
            <span class="info-label">Server URL</span>
            <span class="info-value mono">{settings.serverUrl}</span>
          </div>
        {/if}
        {#if settings.deviceName}
          <div class="info-row">
            <span class="info-label">Device Name</span>
            <span class="info-value">{settings.deviceName}</span>
          </div>
        {/if}
        {#if settings.deviceId}
          <div class="info-row">
            <span class="info-label">Device ID</span>
            <span class="info-value mono">{settings.deviceId}</span>
          </div>
        {/if}
        {#if settings.lastSyncAt}
          <div class="info-row">
            <span class="info-label">Last Sync</span>
            <span class="info-value">{settings.lastSyncAt}</span>
          </div>
        {/if}
        {#if settings.lastError}
          <div class="info-row">
            <span class="info-label">Last Error</span>
            <span class="info-value error">{settings.lastError}</span>
          </div>
        {/if}
      </div>
    </div>

    <div class="sync-actions">
      <button class="btn btn-primary" on:click={runSyncNow} disabled={loading}>
        Sync Now
      </button>
      <button class="btn" on:click={confirmDisconnect} disabled={loading}>
        Disconnect
      </button>
      <button class="btn" on:click={confirmResetKey} disabled={loading}>
        Reset Key
      </button>
    </div>

    <div class="sync-interval">
      <label class="field-label" for="sync-interval">Sync Interval (minutes)</label>
      <div class="interval-row">
        <input id="sync-interval" type="number" bind:value={syncInterval} min="0" placeholder="0" />
        <button class="btn btn-sm" on:click={saveInterval} disabled={loading}>Save</button>
      </div>
    </div>

    <div class="auto-sync-toggle">
      <label class="toggle-label">
        <input type="checkbox" bind:checked={autoSync} on:change={setAutoSync} disabled={loading} />
        <span>Auto-sync</span>
      </label>
    </div>
  {:else}
    <div class="settings-card">
      <div class="sync-setup">
        <div class="form-group">
          <label class="field-label" for="sync-url">Server URL</label>
          <input id="sync-url" type="text" class="field-input" placeholder="https://example.com" bind:value={serverUrl} />
        </div>
        <div class="form-group">
          <label class="field-label" for="sync-user">Username</label>
          <input id="sync-user" type="text" class="field-input" bind:value={username} />
        </div>
        <div class="form-group">
          <label class="field-label" for="sync-pass">Password</label>
          <input id="sync-pass" type="password" class="field-input" bind:value={password} />
        </div>
        <div class="sync-setup-actions">
          <button class="btn" on:click={testConnection} disabled={loading || !serverUrl}>
            Test Connection
          </button>
          <button class="btn btn-primary" on:click={configureSync}
                  disabled={loading || !serverUrl || !username || !password}>
            Connect
          </button>
        </div>
        {#if connectionOk !== null}
          <div class="connection-result" class:ok={connectionOk} class:fail={!connectionOk}>
            {connectionOk ? 'Test OK' : 'Connection failed'}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

{#if showDisconnectConfirm}
  <button class="modal-overlay" on:click={() => showDisconnectConfirm = false}>
    <div class="modal">
      <h3>Disconnect from Sync Server</h3>
      <p class="modal-desc">This will disconnect this device from the sync server and revoke the device token. You can reconnect later.</p>
      <div class="modal-actions">
        <button class="btn btn-danger" on:click={doDisconnect}>Disconnect</button>
        <button class="btn" on:click={() => showDisconnectConfirm = false}>Cancel</button>
      </div>
    </div>
  </button>
{/if}

{#if showResetKeyConfirm}
  <button class="modal-overlay" on:click={() => showResetKeyConfirm = false}>
    <div class="modal">
      <h3>Reset Sync Key</h3>
      <p class="modal-desc">This will remove the stored device token. You will need to re-pair this device with the server.</p>
      <div class="modal-actions">
        <button class="btn btn-danger" on:click={doResetKey}>Reset Key</button>
        <button class="btn" on:click={() => showResetKeyConfirm = false}>Cancel</button>
      </div>
    </div>
  </button>
{/if}

<style>
  .settings-section {
    padding: 1.5rem;
    max-width: 600px;
  }
  .settings-section h2 {
    margin: 0 0 0.25rem 0;
    font-size: 1.2rem;
    color: #e0e0f0;
  }
  .section-desc {
    color: #a0a0b8;
    font-size: 0.85rem;
    margin-bottom: 1.25rem;
    line-height: 1.4;
  }
  .settings-card {
    background: #16213e;
    border: 1px solid #0f3460;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin-bottom: 1rem;
  }
  .field-label {
    display: block;
    color: #a0a0b8;
    font-size: 0.85rem;
    margin-bottom: 0.35rem;
  }
  .field-input {
    display: block;
    width: 100%;
    background: #0f3460;
    border: 1px solid #1a3a5c;
    color: #e0e0f0;
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    font-size: 0.85rem;
    box-sizing: border-box;
  }
  .field-input:focus {
    outline: none;
    border-color: #4ecca3;
  }
  .info-row {
    display: flex;
    padding: 0.4rem 0;
    border-bottom: 1px solid #0f3460;
    font-size: 0.9rem;
  }
  .info-row:last-child { border-bottom: none; }
  .info-label {
    width: 180px;
    min-width: 180px;
    color: #a0a0b8;
  }
  .info-value { color: #e0e0f0; word-break: break-all; }
  .info-value.mono { font-family: monospace; font-size: 0.85rem; }
  .info-value.error { color: #ff6b6b; }
  .status-ok { color: #34d399; font-weight: 600; }
  .status-err { color: #ff6b6b; }
  .sync-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }
  .sync-interval {
    margin-bottom: 0.75rem;
  }
  .interval-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .interval-row input {
    width: 100px;
    background: #0f3460;
    border: 1px solid #1a3a5c;
    color: #e0e0f0;
    padding: 0.35rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }
  .interval-row input:focus {
    outline: none;
    border-color: #4ecca3;
  }
  .auto-sync-toggle {
    margin-bottom: 0;
  }
  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.9rem;
    color: #e0e0f0;
  }
  .toggle-label input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #4ecca3;
  }
  .sync-setup .form-group { margin-bottom: 1rem; }
  .sync-setup .form-group:last-of-type { margin-bottom: 0; }
  .sync-setup-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  .connection-result {
    margin-top: 0.75rem;
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    font-size: 0.85rem;
  }
  .connection-result.ok {
    background: rgba(52, 211, 153, 0.1);
    border: 1px solid rgba(52, 211, 153, 0.3);
    color: #34d399;
  }
  .connection-result.fail {
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid rgba(255, 107, 107, 0.3);
    color: #ff6b6b;
  }
  .error-msg {
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.75rem;
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid rgba(255, 107, 107, 0.3);
    border-radius: 6px;
    color: #ff6b6b;
    font-size: 0.85rem;
  }
  .result-msg {
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.75rem;
    background: rgba(52, 211, 153, 0.1);
    border: 1px solid rgba(52, 211, 153, 0.3);
    border-radius: 6px;
    color: #34d399;
    font-size: 0.85rem;
  }
  .result-msg.warning {
    background: rgba(245, 158, 11, 0.1);
    border-color: rgba(245, 158, 11, 0.3);
    color: #f59e0b;
  }
  .btn {
    background: #1a1a2e;
    color: #e0e0f0;
    border: 1px solid #1a3a5c;
    padding: 0.4rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .btn:hover:not(:disabled) { border-color: #4ecca3; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-sm { padding: 0.3rem 0.6rem; font-size: 0.8rem; }
  .btn-primary {
    background: #4ecca3;
    color: #1a1a2e;
    border-color: #4ecca3;
    font-weight: 600;
  }
  .btn-primary:hover:not(:disabled) { background: #3dbb92; border-color: #3dbb92; }
  .btn-danger {
    background: #e94560;
    color: #fff;
    border-color: #e94560;
  }
  .btn-danger:hover:not(:disabled) { background: #d63851; border-color: #d63851; }
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    border: none;
    padding: 0;
    cursor: pointer;
    width: 100%;
    color: inherit;
    font: inherit;
  }
  .modal {
    background: #16213e;
    border: 1px solid #0f3460;
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 420px;
    width: 90%;
    cursor: default;
  }
  .modal h3 { margin: 0 0 0.75rem 0; color: #e0e0f0; }
  .modal-desc { color: #a0a0b8; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1rem; }
  .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
</style>
