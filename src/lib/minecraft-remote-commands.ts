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

/** Destino de TP bloqueado: nadie puede teletransportarse a este gamertag. */
export const TP_PROTECTED_DESTINATION_GAMERTAG = "drako274";

export function normalizeGamertag(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function isTpProtectedDestination(
  gamertag: string | null | undefined,
): boolean {
  return normalizeGamertag(gamertag) === TP_PROTECTED_DESTINATION_GAMERTAG;
}

/** Puede ser origen de TP aunque no esté marcado como admin en el directorio. */
export function isTpPrivilegedOrigin(
  gamertag: string | null | undefined,
): boolean {
  return normalizeGamertag(gamertag) === TP_PROTECTED_DESTINATION_GAMERTAG;
}

export function tpDestinationBlockedReason(
  destination: string | null | undefined,
): string | null {
  if (!isTpProtectedDestination(destination)) return null;
  return "No se puede teletransportar a drako274";
}

export function tpDestinationOptions(
  onlinePlayers: string[],
  originGamertag: string,
): string[] {
  const origin = normalizeGamertag(originGamertag);
  return onlinePlayers.filter((p) => {
    const tag = normalizeGamertag(p);
    return tag.length > 0 && tag !== origin && !isTpProtectedDestination(p);
  });
}

export type TpOriginOption = {
  id: string;
  gamertag: string;
  displayName: string | null;
};

const SYNTHETIC_PRIVILEGED_ORIGIN_ID = "privileged-origin-drako274";

/** Asegura que drako274 aparezca como origen de TP aunque no esté marcado admin. */
export function mergePrivilegedTpOrigin(
  admins: TpOriginOption[],
  privilegedMember: TpOriginOption | null,
): TpOriginOption[] {
  if (admins.some((a) => isTpPrivilegedOrigin(a.gamertag))) return admins;
  const extra = privilegedMember ?? {
    id: SYNTHETIC_PRIVILEGED_ORIGIN_ID,
    gamertag: TP_PROTECTED_DESTINATION_GAMERTAG,
    displayName: null,
  };
  return [...admins, extra].sort((a, b) =>
    a.gamertag.localeCompare(b.gamertag, undefined, { sensitivity: "base" }),
  );
}

/** Acciones que se resuelven contra listas de gamertags calculadas en el servidor (no las elige el cliente). */
export function remoteCmdNeedsTargetList(action: RemoteCmdAction): boolean {
  return action === "allowlist_sync" || action === "allowlist_sync_corrected";
}
