/** Solicitud manual desde el panel: el addon envía el lote al ver esto en true. */
let syncPending = false;

/** Marca cuándo llegó el último lote del addon (memoria; sin BD). */
let lastBatchAt: string | null = null;

export function requestParcelSync() {
  syncPending = true;
}

export function isParcelSyncPending(): boolean {
  return syncPending;
}

export function clearParcelSyncRequest() {
  syncPending = false;
}

export function markParcelBatchReceived() {
  lastBatchAt = new Date().toISOString();
}

export function getLastParcelBatchAt(): string | null {
  return lastBatchAt;
}
