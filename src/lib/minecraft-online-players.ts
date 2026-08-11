/** Cola en `minecraft_sync_queue` para roster online reportado por el addon. */
export const ONLINE_PLAYERS_QUEUE_ID = "online_players";

/** Si el reporte es más viejo que esto, el panel lo trata como vacío. */
export const ONLINE_PLAYERS_STALE_MS = 90_000;

export type OnlinePlayersQueueData = {
  players?: string[];
  reportedAt?: string;
};

export function asOnlinePlayersQueueData(value: unknown): OnlinePlayersQueueData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as OnlinePlayersQueueData;
}

export function normalizeOnlinePlayerNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const name = item.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export function isOnlineRosterFresh(reportedAt: string | null | undefined): boolean {
  if (!reportedAt) return false;
  const t = new Date(reportedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= ONLINE_PLAYERS_STALE_MS;
}
