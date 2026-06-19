<script>
  import { onMount, onDestroy } from 'svelte'

  export let api = null

  let status = 'disabled'
  let interval

  function wailsCall(method, ...args) {
    try {
      if (window['go'] && window['go']['main'] && window['go']['main']['App']) {
        const fn = window['go']['main']['App'][method]
        if (typeof fn === 'function') return fn(...args)
      }
    } catch (e) { console.error('Wails error:', method, e) }
    return Promise.reject(new Error('Wails not connected: ' + method))
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
      const s = await wailsCall('SyncStatus')
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
      connected: 'Connected',
      disconnected: 'Disconnected',
      disabled: 'Not configured',
      error: 'Error',
      revoked: 'Revoked',
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
  })

  onDestroy(() => {
    if (interval) clearInterval(interval)
  })
</script>

<button class="sync-status-bar" on:click={openSettings} title="Sync: {statusText()}">
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
