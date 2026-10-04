import type { MinecraftServerId } from "./minecraft-server";

/** Cola en `minecraft_sync_queue` (misma tabla que sync-request). */
export function remoteCmdQueueId(serverId: MinecraftServerId): string {
  return `${serverId}:panel_remote_cmd`;
}

/** @deprecated Usar remoteCmdQueueId(serverId). Legacy vanilla. */
export const REMOTE_CMD_QUEUE_ID = "panel_remote_cmd";

export const REMOTE_CMD_ACTIONS = [
  "spectator",
  "survival",
  "tp",
  "kill_silverfish",
  "kill_withers",
  "extinguish_fire",
  "sync_config",
  "allowlist_sync",
  "allowlist_sync_corrected",
] as const;

export type RemoteCmdAction = (typeof REMOTE_CMD_ACTIONS)[number];

export function isRemoteCmdAction(value: string): value is RemoteCmdAction {
  return (REMOTE_CMD_ACTIONS as readonly string[]).includes(value);
}

/** El addon solo necesita add/remove; esta acción se expone como `allowlist_sync` en GET. */
export function remoteCmdActionForAddon(storedAction: string | undefined): RemoteCmdAction | null {
  if (!storedAction || !isRemoteCmdAction(storedAction)) return null;
  if (storedAction === "allowlist_sync_corrected") return "allowlist_sync";
  return storedAction;
}

export type RemoteCmdQueueData = {
  action?: string;
  targetGamertag?: string | null;
  /** `tp`: gamertag destino (a quién se teletransporta el origen). */
  destinationGamertag?: string | null;
  /** `tp` a coordenadas: eje X (`~` = no cambiar). */
  destinationX?: string | null;
  /** `tp` a coordenadas: eje Y (`~` = no cambiar). */
  destinationY?: string | null;
  /** `tp` a coordenadas: eje Z (`~` = no cambiar). */
  destinationZ?: string | null;
  /** `allowlist_sync` / `allowlist_sync_corrected`: gamertags a dar de alta (`allowlist add`). */
  targetGamertagsAdd?: string[] | null;
  /** `allowlist_sync` / `allowlist_sync_corrected`: gamertags a dar de baja (`allowlist remove`). */
  targetGamertagsRemove?: string[] | null;
  /** `allowlist_sync_corrected`: IDs de correcciones pendientes que se marcan como sincronizadas al confirmar el addon. */
  pendingCorrectionIds?: string[] | null;
  requestedAt?: string;
  handledAt?: string | null;
};

/** Número absoluto, `~` o relativo `~10` / `~-4`. */
const TP_COORD_RE = /^(?:~|-?\d+(?:\.\d+)?|~-?\d+(?:\.\d+)?)$/;

export function normalizeTpCoord(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return "~";
  const trimmed = value.trim();
  return trimmed.length === 0 ? "~" : trimmed;
}

export function isValidTpCoord(value: string): boolean {
  return TP_COORD_RE.test(value);
}

export function parseTpCoords(input: {
  x?: unknown;
  y?: unknown;
  z?: unknown;
}): { x: string; y: string; z: string } | { error: string } {
  const x = normalizeTpCoord(input.x);
  const y = normalizeTpCoord(input.y);
  const z = normalizeTpCoord(input.z);
  if (!isValidTpCoord(x) || !isValidTpCoord(y) || !isValidTpCoord(z)) {
    return {
      error: "Cada coordenada debe ser un número, ~ o un relativo (~10, ~-4)",
    };
  }
  return { x, y, z };
}

export function asRemoteCmdQueueData(value: unknown): RemoteCmdQueueData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as RemoteCmdQueueData;
}

export function remoteCmdNeedsTarget(action: RemoteCmdAction): boolean {
  return (
    action === "spectator" ||
    action === "survival" ||
    action === "tp" ||
    action === "extinguish_fire"
  );
}

export function remoteCmdNeedsDestination(action: RemoteCmdAction): boolean {
  return action === "tp";
}

export function normalizeGamertag(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Destinos de TP: cualquier otro jugador en línea, incluido el dueño. */
export function tpDestinationOptions(
  onlinePlayers: string[],
  originGamertag: string,
): string[] {
  const origin = normalizeGamertag(originGamertag);
  return onlinePlayers.filter((player) => {
    const tag = normalizeGamertag(player);
    return tag.length > 0 && tag !== origin;
  });
}

/** La cuenta queda primera; el resto conserva el orden del roster. */
export function orderAccountFirst(
  players: readonly string[],
  accountGamertag: string,
): string[] {
  const key = normalizeGamertag(accountGamertag);
  if (!key) return [...players];
  const hit = players.find((player) => normalizeGamertag(player) === key);
  if (!hit) return [...players];
  return [hit, ...players.filter((player) => player !== hit)];
}

/** Nombre tal como está en el roster, o `null` si ese jugador no está en línea. */
export function listedGamertag(
  roster: readonly string[],
  gamertag: string,
): string | null {
  const key = normalizeGamertag(gamertag);
  if (!key) return null;
  return roster.find((player) => normalizeGamertag(player) === key) ?? null;
}

const REMOTE_CMD_LABELS: Record<RemoteCmdAction, string> = {
  spectator: "Modo espectador",
  survival: "Modo survival",
  tp: "TP",
  kill_silverfish: "Eliminar silverfish",
  kill_withers: "Eliminar withers",
  extinguish_fire: "Apagar fuego",
  sync_config: "Sincronizar ajustes",
  allowlist_sync: "Sincronizar allowlist",
  allowlist_sync_corrected: "Corregir allowlist",
};

export function remoteCmdLabel(action: RemoteCmdAction): string {
  return REMOTE_CMD_LABELS[action];
}

/** Texto de `details.destination` para el historial (`remote.cmd`). */
export function remoteCmdDestinationDetail(input: {
  action: RemoteCmdAction;
  destinationGamertag?: string | null;
  destinationX?: string | null;
  destinationY?: string | null;
  destinationZ?: string | null;
  addedCount?: number;
  removedCount?: number;
}): string | null {
  if (input.action === "tp") {
    const player = input.destinationGamertag?.trim();
    if (player) return player;
    if (
      input.destinationX != null ||
      input.destinationY != null ||
      input.destinationZ != null
    ) {
      return `${input.destinationX ?? "~"} ${input.destinationY ?? "~"} ${input.destinationZ ?? "~"}`;
    }
    return null;
  }
  if (
    input.action === "allowlist_sync" ||
    input.action === "allowlist_sync_corrected"
  ) {
    const added = input.addedCount ?? 0;
    const removed = input.removedCount ?? 0;
    if (added === 0 && removed === 0) return null;
    return `+${added} / -${removed}`;
  }
  return null;
}

/** Acciones que se resuelven contra listas de gamertags calculadas en el servidor (no las elige el cliente). */
export function remoteCmdNeedsTargetList(action: RemoteCmdAction): boolean {
  return action === "allowlist_sync" || action === "allowlist_sync_corrected";
}
