import type { MinecraftServerId } from "@/lib/minecraft-server";

type MonitorSyncState = {
  syncPending: boolean;
  lastBatchAt: string | null;
};

const byServer = new Map<MinecraftServerId, MonitorSyncState>();

function state(serverId: MinecraftServerId): MonitorSyncState {
  let s = byServer.get(serverId);
  if (!s) {
    s = { syncPending: false, lastBatchAt: null };
    byServer.set(serverId, s);
  }
  return s;
}

export function requestMonitorSync(serverId: MinecraftServerId) {
  state(serverId).syncPending = true;
}

export function isMonitorSyncPending(serverId: MinecraftServerId): boolean {
  return state(serverId).syncPending;
}

export function clearMonitorSyncRequest(serverId: MinecraftServerId) {
  state(serverId).syncPending = false;
}

export function markMonitorBatchReceived(serverId: MinecraftServerId) {
  state(serverId).lastBatchAt = new Date().toISOString();
}

export function getLastMonitorBatchAt(
  serverId: MinecraftServerId,
): string | null {
  return state(serverId).lastBatchAt;
}
