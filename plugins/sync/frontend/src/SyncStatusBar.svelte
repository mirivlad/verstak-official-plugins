<script>
  import { onMount, onDestroy } from 'svelte'
  import { createSyncController, deriveSyncState, formatExactSyncTime, formatRelativeSyncTime } from './syncState.js'

  export let api = null

  let status = { configured: false }
  let controller
  let locale = api?.i18n?.getLocale?.() || 'en'
  let unsubscribeLocale

  function tr(key, params, fallback) {
    locale
    return api?.i18n?.t?.(key, params, fallback) || fallback || key
  }

  $: presentation = deriveSyncState(status)

  function statusColor() {
    if (presentation.kind === 'success') return '#34d399'
    if (presentation.kind === 'error' || presentation.kind === 'revoked') return '#ff6b6b'
    if (presentation.kind === 'syncing') return '#60a5fa'
    if (presentation.kind === 'pending' || presentation.kind === 'pendingFirst') return '#fbbf24'
    return '#8b95a7'
  }

  function statusText() {
    const relative = formatRelativeSyncTime(status?.lastSyncAt, locale)
    const labels = {
      success: relative
        ? tr('ui.status.syncedAt', { relative }, 'Synced {relative}')
        : tr('ui.status.connected', null, 'Connected'),
      disconnected: tr('ui.status.disconnected', null, 'Disconnected'),
      disabled: tr('ui.status.disabled', null, 'Not configured'),
      error: tr('ui.status.error', null, 'Error'),
      revoked: tr('ui.status.revoked', null, 'Revoked'),
      syncing: tr('ui.status.syncing', null, 'Syncing…'),
      pendingFirst: tr('ui.status.pendingFirst', null, 'First sync pending'),
      pending: tr('ui.status.pending', { count: presentation.count }, '{count} changes pending'),
    }
    return labels[presentation.kind] || tr('ui.status.disabled', null, 'Not configured')
  }

  function statusTooltip() {
    const lines = [tr('ui.title', null, 'Sync') + ': ' + statusText()]
    if (status?.serverUrl) lines.push(tr('ui.status.server', { server: status.serverUrl }, 'Server: {server}'))
    const exact = formatExactSyncTime(status?.lastSyncAt, locale)
    if (exact) lines.push(tr('ui.status.lastSuccess', { date: exact }, 'Last successful sync: {date}'))
    if (Number(status?.unpushedOps) > 0) {
      lines.push(tr('ui.status.pendingCount', { count: status.unpushedOps }, 'Pending changes: {count}'))
    }
    if (status?.lastWarning) lines.push(tr('ui.status.warning', null, 'Some files still need attention.'))
    if (status?.lastError) lines.push(tr('ui.status.lastError', null, 'The last synchronization failed.'))
    return lines.join('\n')
  }

  function openSettings() {
    if (api?.ui?.openSettings) {
      api.ui.openSettings()
    }
  }

  onMount(() => {
    controller = createSyncController({
      api,
      onStatus: (nextStatus) => {
        status = { ...(nextStatus || { configured: false }) }
      },
      onError: (error) => console.warn('[verstak.sync] status or automatic sync failed:', error),
    })
    controller.start()
    unsubscribeLocale = api?.i18n?.onDidChangeLocale?.((nextLocale) => {
      locale = nextLocale
    })
  })

  onDestroy(() => {
    controller?.destroy()
    unsubscribeLocale?.()
  })
</script>

<button class="sync-status-bar" on:click={openSettings} title={statusTooltip()}>
  <span class="status-dot" style="background: {statusColor()}"></span>
  <span class="status-label">{statusText()}</span>
</button>

<style>
  .sync-status-bar {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    padding: 4px 10px;
    cursor: pointer;
    font-size: 12px;
    color: var(--text-dim, #888);
    border-radius: 4px;
    transition: background 0.15s;
  }
  .sync-status-bar:hover {
    background: var(--surface-alt, rgba(255,255,255,0.06));
  }
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .status-label {
    white-space: nowrap;
  }
</style>
