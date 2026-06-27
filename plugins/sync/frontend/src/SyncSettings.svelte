<script>
  export let api = null

  let settings = null
  let loading = false
  let errorMsg = ''
  let resultMsg = ''
  let resultKind = ''
  let connectionResult = ''
  let connectionOk = null

  let serverUrl = ''
  let username = ''
  let password = ''
  let syncInterval = 5
  let autoSync = false

  const INPUT_STYLE = 'width:100%;background:#0f3460;border:1px solid #1a3a5c;color:#e0e0f0;padding:8px 10px;border-radius:4px;font-size:0.85rem;box-sizing:border-box;height:36px;'
  const INPUT_FOCUS_STYLE = INPUT_STYLE + 'outline:none;border-color:#4ecca3;'

  function sanitizeError(msg) {
    if (!msg) return 'Unknown error'
    let s = String(msg).replace(/<[^>]+>/g, '')
    if (s.length > 200) s = s.substring(0, 200) + '...'
    return s
  }

  function syncAPI() {
    if (!api?.sync) throw new Error('Plugin API sync namespace not available')
    return api.sync
  }

  async function load() {
    try {
      if (api?.settings?.read) {
        const saved = await api.settings.read()
        if (saved) {
          serverUrl = saved.serverUrl || ''
          username = saved.username || ''
          autoSync = !!saved.autoSync
          syncInterval = saved.syncInterval || 5
        }
      }
    } catch (_) {}
    try {
      settings = await syncAPI().status()
      if (settings) {
        if (settings.serverUrl) serverUrl = settings.serverUrl
        if (settings.syncInterval != null) syncInterval = settings.syncInterval
        if (settings.syncInterval > 0) autoSync = true
      }
    } catch (_) { settings = null }
  }

  load()

  async function saveSettings() {
    if (syncInterval < 1 || syncInterval > 1440) {
      errorMsg = 'Sync interval must be between 1 and 1440 minutes.'
      return
    }
    loading = true
    errorMsg = ''
    resultMsg = ''
    try {
      if (api?.settings?.writeAll) {
        await api.settings.writeAll({ serverUrl, username, autoSync, syncInterval })
      }
      await syncAPI().setInterval(autoSync ? syncInterval : 0)
      resultMsg = 'Settings saved.'
      resultKind = ''
    } catch (e) {
      errorMsg = sanitizeError(e.message || e)
    }
    loading = false
  }

  async function testConnection() {
    if (!serverUrl) { errorMsg = 'Server URL is required.'; return }
    loading = true
    connectionResult = ''
    connectionOk = null
    errorMsg = ''
    try {
      await syncAPI().testConnection(serverUrl, username, password)
      connectionOk = true
      connectionResult = 'Connection successful.'
    } catch (e) {
      connectionOk = false
      connectionResult = 'Connection failed: ' + sanitizeError(e.message || e)
    }
    loading = false
  }

  async function configureSync() {
    if (!serverUrl) { errorMsg = 'Server URL is required.'; return }
    loading = true
    errorMsg = ''
    connectionResult = ''
    try {
      await syncAPI().configure(serverUrl, username, password)
      connectionResult = 'Connected successfully.'
      connectionOk = true
      username = ''
      password = ''
      await load()
    } catch (e) {
      errorMsg = sanitizeError(e.message || e)
    }
    loading = false
  }

  function syncResultWarning(result) {
    const conflicts = Array.isArray(result?.conflicts) ? result.conflicts : []
    const applyErrors = Array.isArray(result?.applyErrors) ? result.applyErrors : []
    const parts = []
    if (conflicts.length > 0) parts.push(conflicts.length + ' conflict(s)')
    if (applyErrors.length > 0) parts.push(applyErrors.length + ' error(s)')
    return parts.join(' · ')
  }

  async function runSyncNow() {
    loading = true
    errorMsg = ''
    resultMsg = ''
    try {
      const r = await syncAPI().now()
      const summary = 'Pushed ' + (r?.pushed || 0) + ', pulled ' + (r?.pulled || 0)
      const warning = syncResultWarning(r)
      resultMsg = warning ? summary + ' · ' + warning : summary
      resultKind = warning ? 'warning' : ''
      await load()
    } catch (e) {
      errorMsg = sanitizeError(e.message || e)
    }
    loading = false
  }

  function toggleAutoSync() {
    autoSync = !autoSync
    if (autoSync && syncInterval < 1) syncInterval = 5
    saveSettings()
  }

  function saveInterval() {
    if (syncInterval < 1 || syncInterval > 1440) {
      errorMsg = 'Sync interval must be between 1 and 1440 minutes.'
      return
    }
    autoSync = syncInterval > 0
    saveSettings()
  }

  async function doDisconnect() {
    loading = true
    errorMsg = ''
    resultMsg = ''
    try {
      await syncAPI().disconnect()
      resultMsg = 'Disconnected from server.'
      resultKind = ''
      settings = null
      await load()
    } catch (e) {
      errorMsg = sanitizeError(e.message || e)
    }
    loading = false
  }

  async function resetKey() {
    loading = true
    errorMsg = ''
    resultMsg = ''
    try {
      await syncAPI().resetKey()
      resultMsg = 'Sync key reset. Connect again to pair this device.'
      resultKind = ''
      await load()
    } catch (e) {
      errorMsg = sanitizeError(e.message || e)
    }
    loading = false
  }
</script>

<div style="padding:1.5rem;max-width:500px;">
  <h2 style="margin:0 0 0.25rem;color:#e0e0f0;font-size:1.2rem;">Sync</h2>
  <p style="color:#a0a0b8;font-size:0.85rem;margin-bottom:1.25rem;">Synchronize your vault across devices.</p>

  {#if errorMsg}
    <div style="padding:0.5rem 0.75rem;margin-bottom:0.75rem;background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.3);border-radius:6px;color:#ff6b6b;font-size:0.85rem;">{errorMsg}</div>
  {/if}
  {#if resultMsg && !errorMsg}
    <div style="padding:0.5rem 0.75rem;margin-bottom:0.75rem;border-radius:6px;font-size:0.85rem;{resultKind === 'warning' ? 'background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);color:#f59e0b;' : 'background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.3);color:#34d399;'}">{resultMsg}</div>
  {/if}

  <div style="background:#16213e;border:1px solid #0f3460;border-radius:8px;padding:1rem 1.25rem;margin-bottom:1rem;">
    <h3 style="margin:0 0 0.75rem;color:#e0e0f0;font-size:0.95rem;">Server</h3>

    <div style="margin-bottom:0.75rem;">
      <label for="sync-server-url" style="display:block;color:#a0a0b8;font-size:0.85rem;margin-bottom:0.35rem;">Server URL</label>
      <input id="sync-server-url" type="text" style={INPUT_STYLE} on:focus={e => e.target.style.cssText = INPUT_FOCUS_STYLE} on:blur={e => e.target.style.cssText = INPUT_STYLE} bind:value={serverUrl} placeholder="https://example.com" />
    </div>

    <div style="margin-bottom:0.75rem;">
      <label for="sync-username" style="display:block;color:#a0a0b8;font-size:0.85rem;margin-bottom:0.35rem;">Username</label>
      <input id="sync-username" type="text" style={INPUT_STYLE} on:focus={e => e.target.style.cssText = INPUT_FOCUS_STYLE} on:blur={e => e.target.style.cssText = INPUT_STYLE} bind:value={username} />
    </div>

    <div style="margin-bottom:0.75rem;">
      <label for="sync-password" style="display:block;color:#a0a0b8;font-size:0.85rem;margin-bottom:0.35rem;">Password</label>
      <input id="sync-password" type="password" style={INPUT_STYLE} on:focus={e => e.target.style.cssText = INPUT_FOCUS_STYLE} on:blur={e => e.target.style.cssText = INPUT_STYLE} bind:value={password} />
    </div>

    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
      <button style="background:#1a1a2e;color:#e0e0f0;border:1px solid #1a3a5c;padding:0.4rem 0.75rem;border-radius:4px;cursor:pointer;font-size:0.85rem;" on:click={testConnection} disabled={loading || !serverUrl}>Test Connection</button>
      <button style="background:#4ecca3;color:#1a1a2e;border:1px solid #4ecca3;padding:0.4rem 0.75rem;border-radius:4px;cursor:pointer;font-size:0.85rem;font-weight:600;" on:click={configureSync} disabled={loading || !serverUrl}>Connect</button>
    </div>

    {#if connectionResult}
      <div style="margin-top:0.75rem;padding:0.5rem 0.75rem;border-radius:6px;font-size:0.85rem;{connectionOk ? 'background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.3);color:#34d399;' : 'background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.3);color:#ff6b6b;'}">{connectionResult}</div>
    {/if}
  </div>

  <div style="background:#16213e;border:1px solid #0f3460;border-radius:8px;padding:1rem 1.25rem;margin-bottom:1rem;">
    <h3 style="margin:0 0 0.75rem;color:#e0e0f0;font-size:0.95rem;">Sync Behavior</h3>

    <div style="margin-bottom:0.75rem;display:flex;align-items:center;gap:0.5rem;">
      <input type="checkbox" id="auto-sync" bind:checked={autoSync} on:change={toggleAutoSync} style="width:16px;height:16px;accent-color:#4ecca3;" />
      <label for="auto-sync" style="color:#e0e0f0;font-size:0.9rem;cursor:pointer;">Enable auto-sync</label>
    </div>

    <div style="margin-bottom:0.75rem;">
      <label for="sync-interval" style="display:block;color:#a0a0b8;font-size:0.85rem;margin-bottom:0.35rem;">Sync interval</label>
      <div style="display:flex;align-items:center;gap:0.5rem;">
        <input id="sync-interval" type="number" min="1" max="1440" bind:value={syncInterval} on:change={saveInterval} style="width:100px;background:#0f3460;border:1px solid #1a3a5c;color:#e0e0f0;padding:8px 10px;border-radius:4px;font-size:0.85rem;height:36px;" />
        <span style="color:#a0a0b8;font-size:0.85rem;">minutes</span>
      </div>
    </div>

    {#if settings && settings.lastSyncAt}
      <div style="color:#a0a0b8;font-size:0.85rem;">
        Last sync: {settings.lastSyncAt}
      </div>
    {/if}
  </div>

  <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
    <button style="background:#4ecca3;color:#1a1a2e;border:1px solid #4ecca3;padding:0.4rem 0.75rem;border-radius:4px;cursor:pointer;font-size:0.85rem;font-weight:600;" on:click={saveSettings} disabled={loading}>Save</button>
    {#if settings && settings.configured}
      <button style="background:#1a1a2e;color:#e0e0f0;border:1px solid #1a3a5c;padding:0.4rem 0.75rem;border-radius:4px;cursor:pointer;font-size:0.85rem;" on:click={runSyncNow} disabled={loading}>Sync Now</button>
      <button style="background:#1a1a2e;color:#e0e0f0;border:1px solid #1a3a5c;padding:0.4rem 0.75rem;border-radius:4px;cursor:pointer;font-size:0.85rem;" on:click={resetKey} disabled={loading}>Reset Key</button>
      <button style="background:#e94560;color:#fff;border:1px solid #e94560;padding:0.4rem 0.75rem;border-radius:4px;cursor:pointer;font-size:0.85rem;" on:click={doDisconnect} disabled={loading}>Disconnect</button>
    {/if}
  </div>
</div>
