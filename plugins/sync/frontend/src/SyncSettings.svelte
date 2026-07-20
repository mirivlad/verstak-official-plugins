<script>
  import { onDestroy, onMount } from 'svelte'
  import { deriveSyncState, formatExactSyncTime } from './syncState.js'

  export let api = null

  let settings = null
  let loading = false
  let errorMsg = ''
  let resultMsg = ''
  let resultKind = ''
  let conflictDetails = []
  let connectionResult = ''
  let connectionOk = null

  let serverUrl = ''
  let vaultId = ''
  let username = ''
  let password = ''
  let syncInterval = 5
  let autoSync = false
  let locale = api?.i18n?.getLocale?.() || 'en'
  let unsubscribeLocale

  $: settingsPresentation = deriveSyncState(settings)
  $: passwordStored = !!settings?.tokenStored && !password
  $: passwordPlaceholder = passwordStored
    ? tr('ui.passwordStoredPlaceholder', null, '••••••••')
    : ''

  function tr(key, params, fallback) {
    locale
    return api?.i18n?.t?.(key, params, fallback) || fallback || key
  }

  const INPUT_STYLE = 'width:100%;background:#0f3460;border:1px solid #1a3a5c;color:#e0e0f0;padding:8px 10px;border-radius:4px;font-size:0.85rem;box-sizing:border-box;height:36px;'
  const INPUT_FOCUS_STYLE = INPUT_STYLE + 'outline:none;border-color:#4ecca3;'

  function reportError(key, fallback, error) {
    console.warn('[verstak.sync] operation failed:', error)
    const code = String(error?.message || error || '').match(/sync-server:([a-z_]+)/)?.[1]
    const localized = code ? tr(`ui.serverError.${code}`, null, '') : ''
    if (localized && localized !== `ui.serverError.${code}`) return localized
    return tr(key, null, fallback)
  }

  function syncAPI() {
    if (!api?.sync) throw new Error(tr('ui.apiUnavailable', null, 'Plugin API sync namespace not available'))
    return api.sync
  }

  async function load() {
    try {
      if (api?.settings?.read) {
        const saved = await api.settings.read()
        if (saved) {
          serverUrl = saved.serverUrl || ''
          vaultId = saved.vaultId || ''
          username = saved.username || ''
          autoSync = !!saved.autoSync
          syncInterval = saved.syncInterval || 5
        }
      }
    } catch (error) {
      console.warn('[verstak.sync] settings load failed:', error)
    }
    try {
      settings = await syncAPI().status()
      if (settings) {
        if (settings.serverUrl) serverUrl = settings.serverUrl
        if (settings.vaultId) vaultId = settings.vaultId
        if (settings.syncInterval != null) syncInterval = settings.syncInterval
        if (settings.syncInterval > 0) autoSync = true
        if (settings.lastError) console.warn('[verstak.sync] last sync failed:', settings.lastError)
      }
    } catch (error) {
      console.warn('[verstak.sync] status load failed:', error)
      settings = null
    }
  }

  load()

  async function saveSettings() {
    if (syncInterval < 1 || syncInterval > 1440) {
      errorMsg = tr('ui.intervalError', null, 'Sync interval must be between 1 and 1440 minutes.')
      return
    }
    loading = true
    errorMsg = ''
    resultMsg = ''
    try {
      if (api?.settings?.writeAll) {
        await api.settings.writeAll({ serverUrl, vaultId, username, autoSync, syncInterval })
      }
      await syncAPI().setInterval(autoSync ? syncInterval : 0)
      await load()
      resultMsg = tr('ui.settingsSaved', null, 'Settings saved.')
      resultKind = ''
    } catch (e) {
      errorMsg = reportError('ui.saveFailed', 'Could not save sync settings. Please try again.', e)
    }
    loading = false
  }

  async function testConnection() {
    if (!serverUrl) { errorMsg = tr('ui.serverRequired', null, 'Server URL is required.'); return }
    loading = true
    connectionResult = ''
    connectionOk = null
    errorMsg = ''
    try {
      if (passwordStored) {
        const pairedStatus = await syncAPI().status()
        settings = pairedStatus
        if (!pairedStatus?.connected) throw new Error('stored device token is not connected')
      } else {
        await syncAPI().testConnection(serverUrl, username, password)
      }
      connectionOk = true
      connectionResult = tr('ui.connectionSuccessful', null, 'Connection successful.')
    } catch (e) {
      connectionOk = false
      connectionResult = reportError('ui.connectionFailed', 'Could not connect. Check the server address and credentials.', e)
    }
    loading = false
  }

  async function configureSync() {
    if (!serverUrl) { errorMsg = tr('ui.serverRequired', null, 'Server URL is required.'); return }
    loading = true
    errorMsg = ''
    connectionResult = ''
    try {
      await syncAPI().configure(serverUrl, username, password, vaultId)
      if (api?.settings?.writeAll) {
        await api.settings.writeAll({ serverUrl, vaultId, username, autoSync, syncInterval })
      }
      connectionResult = tr('ui.connectedSuccessfully', null, 'Connected successfully.')
      connectionOk = true
      password = ''
      await load()
    } catch (e) {
      errorMsg = reportError('ui.connectFailed', 'Could not connect this device. Please try again.', e)
    }
    loading = false
  }

  function syncResultWarning(result) {
    const conflicts = Array.isArray(result?.conflicts) ? result.conflicts : []
    const applyErrors = Array.isArray(result?.applyErrors) ? result.applyErrors : []
    const parts = []
    if (conflicts.length > 0) parts.push(tr('ui.conflictsCount', { count: conflicts.length }, '{count} conflict(s)'))
    if (applyErrors.length > 0) parts.push(tr('ui.errorsCount', { count: applyErrors.length }, '{count} error(s)'))
    return parts.join(' · ')
  }

  function formatSyncConflict() {
    return tr('ui.syncConflictItem', null, 'A synchronization conflict needs attention.')
  }

  async function runSyncNow() {
    loading = true
    errorMsg = ''
    resultMsg = ''
    conflictDetails = []
    try {
      const r = await syncAPI().now()
      const summary = tr('ui.syncSummary', { pushed: r?.pushed || 0, pulled: r?.pulled || 0 }, 'Pushed {pushed}, pulled {pulled}')
      const warning = syncResultWarning(r)
      const conflicts = Array.isArray(r?.conflicts) ? r.conflicts : []
      conflictDetails = conflicts.slice(0, 5).map(formatSyncConflict)
      resultMsg = warning ? summary + ' · ' + warning : summary
      resultKind = warning ? 'warning' : ''
      await load()
    } catch (e) {
      errorMsg = reportError('ui.syncFailed', 'Could not synchronize. Please try again.', e)
      await load()
    }
    loading = false
  }

  function toggleAutoSync() {
    autoSync = !autoSync
    if (autoSync && syncInterval < 1) syncInterval = 5
    saveSettings()
  }

  function settingsStatusText() {
    const labels = {
      success: tr('ui.status.connected', null, 'Connected'),
      disconnected: tr('ui.status.disconnected', null, 'Disconnected'),
      disabled: tr('ui.status.disabled', null, 'Not configured'),
      error: tr('ui.status.error', null, 'Error'),
      revoked: tr('ui.status.revoked', null, 'Revoked'),
      syncing: tr('ui.status.syncing', null, 'Syncing…'),
      pendingFirst: tr('ui.status.pendingFirst', null, 'First sync pending'),
      pending: tr('ui.status.pending', { count: settingsPresentation.count }, '{count} changes pending'),
    }
    return labels[settingsPresentation.kind] || labels.disabled
  }

  function saveInterval() {
    if (syncInterval < 1 || syncInterval > 1440) {
      errorMsg = tr('ui.intervalError', null, 'Sync interval must be between 1 and 1440 minutes.')
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
      resultMsg = tr('ui.disconnected', null, 'Disconnected from server.')
      resultKind = ''
      settings = null
      await load()
    } catch (e) {
      errorMsg = reportError('ui.disconnectFailed', 'Could not disconnect from the server. Please try again.', e)
    }
    loading = false
  }

  async function resetKey() {
    loading = true
    errorMsg = ''
    resultMsg = ''
    try {
      await syncAPI().resetKey()
      resultMsg = tr('ui.keyReset', null, 'Sync key reset. Connect again to pair this device.')
      resultKind = ''
      await load()
    } catch (e) {
      errorMsg = reportError('ui.resetKeyFailed', 'Could not reset the sync key. Please try again.', e)
    }
    loading = false
  }

  onMount(() => {
    unsubscribeLocale = api?.i18n?.onDidChangeLocale?.((nextLocale) => {
      locale = nextLocale
    })
  })

  onDestroy(() => unsubscribeLocale?.())
</script>

<div class="sync-settings-surface">
  <h2 style="margin:0 0 0.25rem;color:#e0e0f0;font-size:1.2rem;">{tr('ui.title', null, 'Sync')}</h2>
  <p style="color:#a0a0b8;font-size:0.85rem;margin-bottom:1.25rem;">{tr('ui.description', null, 'Synchronize your vault across devices.')}</p>

  {#if errorMsg}
    <div style="padding:0.5rem 0.75rem;margin-bottom:0.75rem;background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.3);border-radius:6px;color:#ff6b6b;font-size:0.85rem;">{errorMsg}</div>
  {/if}
  {#if resultMsg && !errorMsg}
    <div style="padding:0.5rem 0.75rem;margin-bottom:0.75rem;border-radius:6px;font-size:0.85rem;{resultKind === 'warning' ? 'background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);color:#f59e0b;' : 'background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.3);color:#34d399;'}">{resultMsg}</div>
  {/if}
  {#if conflictDetails.length > 0 && !errorMsg}
    <div style="padding:0.5rem 0.75rem;margin-bottom:0.75rem;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:6px;color:#f59e0b;font-size:0.85rem;">
      <div style="font-weight:600;margin-bottom:0.35rem;">{tr('ui.syncConflicts', null, 'Sync conflicts')}</div>
      {#each conflictDetails as detail}
        <div>{detail}</div>
      {/each}
    </div>
  {/if}
  {#if settings && settings.lastError && !errorMsg}
    <div style="padding:0.5rem 0.75rem;margin-bottom:0.75rem;background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.3);border-radius:6px;color:#ff6b6b;font-size:0.85rem;">
      {tr('ui.lastSyncError', null, 'The last synchronization did not finish. Try again.')}
    </div>
  {/if}
  {#if settings && settings.lastWarning && !errorMsg}
    <div style="padding:0.5rem 0.75rem;margin-bottom:0.75rem;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:6px;color:#f59e0b;font-size:0.85rem;">
      {tr('ui.unresolvedFilesWarning', null, 'Some files are not synchronized yet. Resolve the file warning and run sync again.')}
    </div>
  {/if}

  {#if settings}
    <div class="sync-settings-summary">
      <strong>{settingsStatusText()}</strong>
      {#if settings.lastSyncAt}
        <span>{tr('ui.status.lastSuccess', { date: formatExactSyncTime(settings.lastSyncAt, locale) }, 'Last successful sync: {date}')}</span>
      {/if}
      {#if Number(settings.unpushedOps) > 0}
        <span>{tr('ui.status.pendingCount', { count: settings.unpushedOps }, 'Pending changes: {count}')}</span>
      {/if}
    </div>
  {/if}

  <div style="background:#16213e;border:1px solid #0f3460;border-radius:8px;padding:1rem 1.25rem;margin-bottom:1rem;">
    <h3 style="margin:0 0 0.75rem;color:#e0e0f0;font-size:0.95rem;">{tr('ui.server', null, 'Server')}</h3>

    <div style="margin-bottom:0.75rem;">
      <label for="sync-server-url" style="display:block;color:#a0a0b8;font-size:0.85rem;margin-bottom:0.35rem;">{tr('ui.serverUrl', null, 'Server URL')}</label>
      <input id="sync-server-url" type="text" style={INPUT_STYLE} on:focus={e => e.target.style.cssText = INPUT_FOCUS_STYLE} on:blur={e => e.target.style.cssText = INPUT_STYLE} bind:value={serverUrl} placeholder="https://example.com" />
    </div>

    <div style="margin-bottom:0.75rem;">
      <label for="sync-vault-id" style="display:block;color:#a0a0b8;font-size:0.85rem;margin-bottom:0.35rem;">{tr('ui.remoteVaultId', null, 'Remote vault ID (optional)')}</label>
      <input id="sync-vault-id" type="text" style={INPUT_STYLE} on:focus={e => e.target.style.cssText = INPUT_FOCUS_STYLE} on:blur={e => e.target.style.cssText = INPUT_STYLE} bind:value={vaultId} />
      <div style="color:#a0a0b8;font-size:0.78rem;margin-top:0.3rem;">{tr('ui.remoteVaultHint', null, 'Leave empty for this vault. Enter an existing remote vault ID to restore it on this device.')}</div>
    </div>

    <div style="margin-bottom:0.75rem;">
      <label for="sync-username" style="display:block;color:#a0a0b8;font-size:0.85rem;margin-bottom:0.35rem;">{tr('ui.username', null, 'Username')}</label>
      <input id="sync-username" type="text" style={INPUT_STYLE} on:focus={e => e.target.style.cssText = INPUT_FOCUS_STYLE} on:blur={e => e.target.style.cssText = INPUT_STYLE} bind:value={username} />
    </div>

    <div style="margin-bottom:0.75rem;">
      <label for="sync-password" style="display:block;color:#a0a0b8;font-size:0.85rem;margin-bottom:0.35rem;">{tr('ui.password', null, 'Password')}</label>
      <input id="sync-password" type="password" style={INPUT_STYLE} on:focus={e => e.target.style.cssText = INPUT_FOCUS_STYLE} on:blur={e => e.target.style.cssText = INPUT_STYLE} bind:value={password} placeholder={passwordPlaceholder} />
      {#if settings?.tokenStored}
        <div style="color:#a0a0b8;font-size:0.78rem;margin-top:0.3rem;">{tr('ui.passwordStoredHint', null, 'The paired device credential is stored. Enter a new password only to reconnect this device.')}</div>
      {/if}
    </div>

    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
      <button style="background:#1a1a2e;color:#e0e0f0;border:1px solid #1a3a5c;padding:0.4rem 0.75rem;border-radius:4px;cursor:pointer;font-size:0.85rem;" on:click={testConnection} disabled={loading || !serverUrl}>{tr('ui.testConnection', null, 'Test Connection')}</button>
      <button style="background:#4ecca3;color:#1a1a2e;border:1px solid #4ecca3;padding:0.4rem 0.75rem;border-radius:4px;cursor:pointer;font-size:0.85rem;font-weight:600;" on:click={configureSync} disabled={loading || !serverUrl}>{tr('ui.connect', null, 'Connect')}</button>
    </div>

    {#if connectionResult}
      <div style="margin-top:0.75rem;padding:0.5rem 0.75rem;border-radius:6px;font-size:0.85rem;{connectionOk ? 'background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.3);color:#34d399;' : 'background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.3);color:#ff6b6b;'}">{connectionResult}</div>
    {/if}
  </div>

  <div style="background:#16213e;border:1px solid #0f3460;border-radius:8px;padding:1rem 1.25rem;margin-bottom:1rem;">
    <h3 style="margin:0 0 0.75rem;color:#e0e0f0;font-size:0.95rem;">{tr('ui.behavior', null, 'Sync Behavior')}</h3>

    <div style="margin-bottom:0.75rem;display:flex;align-items:center;gap:0.5rem;">
      <input type="checkbox" id="auto-sync" bind:checked={autoSync} on:change={toggleAutoSync} style="width:16px;height:16px;accent-color:#4ecca3;" />
      <label for="auto-sync" style="color:#e0e0f0;font-size:0.9rem;cursor:pointer;">{tr('ui.enableAutoSync', null, 'Enable auto-sync')}</label>
    </div>

    <div style="margin-bottom:0.75rem;">
      <label for="sync-interval" style="display:block;color:#a0a0b8;font-size:0.85rem;margin-bottom:0.35rem;">{tr('ui.interval', null, 'Sync interval')}</label>
      <div style="display:flex;align-items:center;gap:0.5rem;">
        <input id="sync-interval" type="number" min="1" max="1440" bind:value={syncInterval} on:change={saveInterval} style="width:100px;background:#0f3460;border:1px solid #1a3a5c;color:#e0e0f0;padding:8px 10px;border-radius:4px;font-size:0.85rem;height:36px;" />
        <span style="color:#a0a0b8;font-size:0.85rem;">{tr('ui.minutes', null, 'minutes')}</span>
      </div>
    </div>

    {#if settings && settings.lastSyncAt}
      <div style="color:#a0a0b8;font-size:0.85rem;">
        {tr('ui.lastSync', { date: formatExactSyncTime(settings.lastSyncAt, locale) }, 'Last sync: {date}')}
      </div>
    {/if}
  </div>

  <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
    <button style="background:#4ecca3;color:#1a1a2e;border:1px solid #4ecca3;padding:0.4rem 0.75rem;border-radius:4px;cursor:pointer;font-size:0.85rem;font-weight:600;" on:click={saveSettings} disabled={loading}>{tr('ui.save', null, 'Save')}</button>
    {#if settings && settings.configured}
      <button style="background:#1a1a2e;color:#e0e0f0;border:1px solid #1a3a5c;padding:0.4rem 0.75rem;border-radius:4px;cursor:pointer;font-size:0.85rem;" on:click={runSyncNow} disabled={loading}>{tr('ui.syncNow', null, 'Sync Now')}</button>
      <button style="background:#1a1a2e;color:#e0e0f0;border:1px solid #1a3a5c;padding:0.4rem 0.75rem;border-radius:4px;cursor:pointer;font-size:0.85rem;" on:click={resetKey} disabled={loading}>{tr('ui.resetKey', null, 'Reset Key')}</button>
      <button style="background:#e94560;color:#fff;border:1px solid #e94560;padding:0.4rem 0.75rem;border-radius:4px;cursor:pointer;font-size:0.85rem;" on:click={doDisconnect} disabled={loading}>{tr('ui.disconnect', null, 'Disconnect')}</button>
    {/if}
  </div>
</div>

<style>
  .sync-settings-surface {
    width: 100%;
    max-width: none;
    box-sizing: border-box;
  }
  .sync-settings-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    margin-bottom: 0.75rem;
    padding: 0.65rem 0.75rem;
    border: 1px solid #0f3460;
    border-radius: 6px;
    background: rgba(15, 52, 96, 0.3);
    color: #a0a0b8;
    font-size: 0.82rem;
  }
  .sync-settings-summary strong {
    color: #e0e0f0;
  }
</style>
