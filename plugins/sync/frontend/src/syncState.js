export function deriveSyncState(status) {
  const value = status || {};
  if (value.revoked) return { kind: 'revoked' };
  if (value.syncing) return { kind: 'syncing' };
  if (value.lastError) return { kind: 'error' };
  if (!value.configured) return { kind: 'disabled' };
  if (!value.lastSyncAt) return { kind: 'pendingFirst' };
  if (Number(value.unpushedOps) > 0) return { kind: 'pending', count: Number(value.unpushedOps) };
  if (!value.connected) return { kind: 'disconnected' };
  return { kind: 'success' };
}

export function formatRelativeSyncTime(value, locale, now = Date.now()) {
  const timestamp = Date.parse(value || '');
  if (!Number.isFinite(timestamp)) return '';
  const seconds = Math.round((timestamp - now) / 1000);
  const absolute = Math.abs(seconds);
  let divisor = 1;
  let unit = 'second';
  if (absolute >= 86400) {
    divisor = 86400;
    unit = 'day';
  } else if (absolute >= 3600) {
    divisor = 3600;
    unit = 'hour';
  } else if (absolute >= 60) {
    divisor = 60;
    unit = 'minute';
  }
  return new Intl.RelativeTimeFormat(locale || 'en', { numeric: 'auto' }).format(Math.round(seconds / divisor), unit);
}

export function formatExactSyncTime(value, locale) {
  const timestamp = Date.parse(value || '');
  if (!Number.isFinite(timestamp)) return '';
  return new Intl.DateTimeFormat(locale || 'en', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(timestamp));
}

export function createSyncController(options) {
  const api = options.api;
  const now = options.now || Date.now;
  const scheduleTimeout = options.setTimeout || globalThis.setTimeout;
  const cancelTimeout = options.clearTimeout || globalThis.clearTimeout;
  const pollIntervalMs = options.pollIntervalMs || 15000;
  const onStatus = options.onStatus || (() => {});
  const onError = options.onError || (() => {});

  let currentStatus = null;
  let dueTimer = null;
  let pollTimer = null;
  let lastAttemptAt = 0;
  let running = false;
  let destroyed = false;

  function clearDueTimer() {
    if (dueTimer != null) cancelTimeout(dueTimer);
    dueTimer = null;
  }

  function clearPollTimer() {
    if (pollTimer != null) cancelTimeout(pollTimer);
    pollTimer = null;
  }

  function scheduleDueSync() {
    clearDueTimer();
    const intervalMinutes = Number(currentStatus?.syncInterval) || 0;
    if (destroyed || running || currentStatus?.syncing || !currentStatus?.configured || intervalMinutes <= 0) return;
    const intervalMs = intervalMinutes * 60 * 1000;
    const lastSuccessAt = Date.parse(currentStatus?.lastSyncAt || '');
    const baseAt = Number.isFinite(lastSuccessAt) ? lastSuccessAt : lastAttemptAt;
    const dueAt = baseAt > 0 ? baseAt + intervalMs : now();
    dueTimer = scheduleTimeout(async () => {
      dueTimer = null;
      await runAutomaticSync();
    }, Math.max(0, dueAt - now()));
  }

  function schedulePoll() {
    clearPollTimer();
    if (destroyed || pollIntervalMs <= 0) return;
    pollTimer = scheduleTimeout(async () => {
      pollTimer = null;
      await refresh();
      schedulePoll();
    }, pollIntervalMs);
  }

  async function fallbackStatus() {
    const saved = await api?.settings?.read?.();
    const statusLabel = saved?.syncStatus || 'disabled';
    return {
      configured: statusLabel !== 'disabled',
      connected: statusLabel === 'connected',
      revoked: statusLabel === 'revoked',
      lastError: statusLabel === 'error' ? 'sync-status-unavailable' : '',
      statusLabel,
      syncInterval: Number(saved?.syncInterval) || 0,
    };
  }

  async function refresh() {
    if (destroyed) return currentStatus;
    try {
      currentStatus = await api?.sync?.status?.();
      if (!currentStatus) throw new Error('empty sync status');
    } catch (error) {
      try {
        currentStatus = await fallbackStatus();
      } catch (_) {
        currentStatus = { configured: false, lastError: 'sync-status-unavailable' };
      }
      onError(error);
    }
    onStatus(currentStatus);
    scheduleDueSync();
    return currentStatus;
  }

  async function runAutomaticSync() {
    if (destroyed || running || currentStatus?.syncing) return;
    running = true;
    lastAttemptAt = now();
    onStatus({ ...(currentStatus || {}), syncing: true });
    try {
      await api?.sync?.now?.();
    } catch (error) {
      onError(error);
    } finally {
      running = false;
      await refresh();
    }
  }

  return {
    async start() {
      await refresh();
      schedulePoll();
    },
    refresh,
    destroy() {
      destroyed = true;
      clearDueTimer();
      clearPollTimer();
    },
  };
}
