import { isActiveByDaysInactive } from "@/lib/minecraft-active";
import {
  mergeMinecraftListState,
  type MinecraftListState,
} from "@/lib/minecraft-list-merge";

export const DIRECTORY_REVALIDATE_INTERVAL_MS = 30_000;

export type StatusPlayerPayload = {
  name: string;
  lastSeen: number;
  daysInactive: number;
};

export type StoredMinecraftPlayer = {
  id: string;
  gamertag: string;
  isBlacklisted: boolean;
  isWhitelisted: boolean;
  inactivityBlacklistExemptUntilSeen: boolean;
};

export type PlayerMutableFields = {
  lastSeen: Date;
  active: boolean;
  daysInactive: number;
  isBlacklisted: boolean;
  isWhitelisted: boolean;
  inactivityBlacklistExemptUntilSeen: boolean;
};

export type PlannedPlayerWrite =
  | { op: "update"; id: string; gamertag: string; data: PlayerMutableFields }
  | { op: "create"; gamertag: string; data: PlayerMutableFields };

/** Una vez cada 30 s como máximo (el heartbeat llega mucho más seguido). */
export function shouldRevalidateDirectory(
  lastAtMs: number | null,
  nowMs: number,
  intervalMs: number = DIRECTORY_REVALIDATE_INTERVAL_MS,
): boolean {
  if (lastAtMs == null) return true;
  return nowMs - lastAtMs >= intervalMs;
}

function listStateOf(row: StoredMinecraftPlayer): MinecraftListState {
  return {
    isBlacklisted: row.isBlacklisted,
    isWhitelisted: row.isWhitelisted,
    inactivityBlacklistExemptUntilSeen: row.inactivityBlacklistExemptUntilSeen,
  };
}

/**
 * Empareja por gamertag sin distinguir mayúsculas (si hay varios, el id menor).
 * La última fila del payload para el mismo nombre gana.
 */
export function planMinecraftPlayerWrites(input: {
  players: StatusPlayerPayload[];
  existing: StoredMinecraftPlayer[];
  daysInactiveThreshold: number;
  daysBlacklist: number;
}): PlannedPlayerWrite[] {
  const byTag = new Map<string, StoredMinecraftPlayer>();
  const sorted = [...input.existing].sort((a, b) => a.id.localeCompare(b.id));
  for (const row of sorted) {
    const key = row.gamertag.trim().toLowerCase();
    if (!key || byTag.has(key)) continue;
    byTag.set(key, row);
  }

  const planned = new Map<string, PlannedPlayerWrite>();
  for (const player of input.players) {
    const name = player.name.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = byTag.get(key) ?? null;
    const lists = mergeMinecraftListState({
      existing: existing ? listStateOf(existing) : null,
      daysInactive: player.daysInactive,
      daysInactiveThreshold: input.daysInactiveThreshold,
      daysBlacklist: input.daysBlacklist,
    });
    const data: PlayerMutableFields = {
      lastSeen: new Date(player.lastSeen),
      active: isActiveByDaysInactive(
        player.daysInactive,
        input.daysInactiveThreshold,
      ),
      daysInactive: player.daysInactive,
      isBlacklisted: lists.isBlacklisted,
      isWhitelisted: lists.isWhitelisted,
      inactivityBlacklistExemptUntilSeen:
        lists.inactivityBlacklistExemptUntilSeen,
    };
    planned.set(
      key,
      existing
        ? { op: "update", id: existing.id, gamertag: existing.gamertag, data }
        : { op: "create", gamertag: name, data },
    );
  }
  return [...planned.values()];
}

/**
 * Roster completo: quien no vino en el payload de este mundo pasa a inactivo.
 * Un push parcial no toca al resto.
 */
export function planStaleMinecraftPlayers(input: {
  existing: { id: string; gamertag: string }[];
  seenNames: string[];
  totalReported: number;
  reportedCount: number;
}): { ids: string[]; gamertags: string[] } {
  const full =
    input.totalReported > 0 && input.reportedCount >= input.totalReported;
  if (!full) return { ids: [], gamertags: [] };
  const seen = new Set(
    input.seenNames.map((n) => n.trim().toLowerCase()).filter(Boolean),
  );
  const ids: string[] = [];
  const gamertags: string[] = [];
  for (const row of input.existing) {
    if (seen.has(row.gamertag.trim().toLowerCase())) continue;
    ids.push(row.id);
    gamertags.push(row.gamertag);
  }
  return { ids, gamertags };
}
