import type { MinecraftServerId } from "@/lib/minecraft-server";

type ParcelSyncState = {
  syncPending: boolean;
  lastBatchAt: string | null;
};

const byServer = new Map<MinecraftServerId, ParcelSyncState>();

function state(serverId: MinecraftServerId): ParcelSyncState {
  let s = byServer.get(serverId);
  if (!s) {
    s = { syncPending: false, lastBatchAt: null };
    byServer.set(serverId, s);
  }
  return s;
}

export function requestParcelSync(serverId: MinecraftServerId) {
  state(serverId).syncPending = true;
}

export function isParcelSyncPending(serverId: MinecraftServerId): boolean {
  return state(serverId).syncPending;
}

export function clearParcelSyncRequest(serverId: MinecraftServerId) {
  state(serverId).syncPending = false;
}

export function markParcelBatchReceived(serverId: MinecraftServerId) {
  state(serverId).lastBatchAt = new Date().toISOString();
}

export function getLastParcelBatchAt(serverId: MinecraftServerId): string | null {
  return state(serverId).lastBatchAt;
}
