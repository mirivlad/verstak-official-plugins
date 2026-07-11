<script>
  import { onMount, onDestroy } from 'svelte'

  export let api = null

  let status = 'disabled'
  let interval
  let locale = api?.i18n?.getLocale?.() || 'en'
  let unsubscribeLocale

  function tr(key, params, fallback) {
    locale
    return api?.i18n?.t?.(key, params, fallback) || fallback || key
  }

  async function loadStatus() {
    try {
      const s = await api?.settings?.read?.()
      if (s?.syncStatus) {
        status = s.syncStatus
        return
      }
    } catch (_) {}
    try {
      const s = await api?.sync?.status?.()
      if (s?.statusLabel) {
        status = s.statusLabel
      } else if (s?.configured === false) {
        status = 'disabled'
      }
    } catch (_) {}
  }

  function statusColor() {
    if (status === 'connected') return '#34d399'
    if (status === 'error' || status === 'revoked') return '#ff6b6b'
    return '#888'
  }

  function statusText() {
    const labels = {
      connected: tr('ui.status.connected', null, 'Connected'),
      disconnected: tr('ui.status.disconnected', null, 'Disconnected'),
      disabled: tr('ui.status.disabled', null, 'Not configured'),
      error: tr('ui.status.error', null, 'Error'),
      revoked: tr('ui.status.revoked', null, 'Revoked'),
    }
    return labels[status] || status
  }

  function openSettings() {
    if (api?.ui?.openSettings) {
      api.ui.openSettings()
    }
  }

  onMount(() => {
    loadStatus()
    interval = setInterval(loadStatus, 15000)
    unsubscribeLocale = api?.i18n?.onDidChangeLocale?.((nextLocale) => {
      locale = nextLocale
    })
  })

  onDestroy(() => {
    if (interval) clearInterval(interval)
    unsubscribeLocale?.()
  })
</script>

<button class="sync-status-bar" on:click={openSettings} title="{tr('ui.title', null, 'Sync')}: {statusText()}">
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
