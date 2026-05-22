/** Misma regla que el addon PlayerStatus: activo si días sin conectar < umbral. */
export function isActiveByDaysInactive(
  daysInactive: number,
  daysInactiveThreshold: number,
): boolean {
  if (daysInactiveThreshold < 1) return true;
  return daysInactive < daysInactiveThreshold;
}

export type MinecraftSnapshotPlayer = {
  name: string;
  active: boolean;
  daysInactive: number;
  lastSeen?: number;
  isBlacklisted?: boolean;
  isWhitelisted?: boolean;
};

export type MinecraftSnapshotData = {
  players?: MinecraftSnapshotPlayer[];
  serverInfo?: {
    totalPlayers: number;
    activePlayers: number;
    inactivePlayers: number;
  };
};

export function parseMinecraftSnapshotData(
  data: unknown,
): MinecraftSnapshotData | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const d = data as MinecraftSnapshotData;
  if (!Array.isArray(d.players)) return null;
  return d;
}

/** Mapa gamertag (minúsculas) → estado del último POST del servidor. */
export function snapshotStatusByGamertag(
  data: unknown,
): Map<string, MinecraftSnapshotPlayer> {
  const snap = parseMinecraftSnapshotData(data);
  const map = new Map<string, MinecraftSnapshotPlayer>();
  if (!snap?.players) return map;
  for (const p of snap.players) {
    const key = p.name?.trim().toLowerCase();
    if (key) map.set(key, p);
  }
  return map;
}

function lastSeenFromSnapshot(snap: MinecraftSnapshotPlayer): Date {
  if (!snap.lastSeen) return new Date(0);
  const n = snap.lastSeen;
  return new Date(n < 1_000_000_000_000 ? n * 1000 : n);
}

type DbPlayerRow = {
  id: string;
  gamertag: string;
  lastSeen: Date;
  active: boolean;
  daysInactive: number;
  isBlacklisted: boolean;
  isWhitelisted: boolean;
  createdAt: Date;
};

/** Roster del último POST: mezcla BD + filas solo en snapshot. */
export function buildRosterFromSnapshot<T extends DbPlayerRow>(
  dbPlayers: T[],
  snapshotByTag: Map<string, MinecraftSnapshotPlayer>,
  daysInactiveThreshold: number,
): T[] {
  if (snapshotByTag.size === 0) return dbPlayers;

  const dbByTag = new Map(
    dbPlayers.map((p) => [p.gamertag.toLowerCase(), p] as const),
  );
  const out: T[] = [];

  for (const [tag, snap] of snapshotByTag) {
    const active = isActiveByDaysInactive(
      snap.daysInactive,
      daysInactiveThreshold,
    );
    const lastSeen = lastSeenFromSnapshot(snap);
    const existing = dbByTag.get(tag);
    if (existing) {
      out.push({
        ...existing,
        active,
        daysInactive: snap.daysInactive,
        lastSeen: lastSeen.getTime() > 0 ? lastSeen : existing.lastSeen,
      });
    } else {
      out.push({
        id: `snapshot:${tag}`,
        gamertag: snap.name.trim(),
        lastSeen,
        active,
        daysInactive: snap.daysInactive,
        isBlacklisted: snap.isBlacklisted ?? false,
        isWhitelisted: snap.isWhitelisted ?? false,
        createdAt: lastSeen,
      } as T);
    }
  }

  return out.sort(
    (a, b) => b.lastSeen.getTime() - a.lastSeen.getTime(),
  );
}
