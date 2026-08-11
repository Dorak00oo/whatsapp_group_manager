/** Solicitud manual desde el panel: el addon envía el lote de monitoreo. */
let syncPending = false;
let lastBatchAt: string | null = null;

export function requestMonitorSync() {
  syncPending = true;
}

export function isMonitorSyncPending(): boolean {
  return syncPending;
}

export function clearMonitorSyncRequest() {
  syncPending = false;
}

export function markMonitorBatchReceived() {
  lastBatchAt = new Date().toISOString();
}

export function getLastMonitorBatchAt(): string | null {
  return lastBatchAt;
}
