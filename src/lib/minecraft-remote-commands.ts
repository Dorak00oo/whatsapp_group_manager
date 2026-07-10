/** Cola en `minecraft_sync_queue` (misma tabla que sync-request; sin migración nueva). */
export const REMOTE_CMD_QUEUE_ID = "panel_remote_cmd";

export const REMOTE_CMD_ACTIONS = [
  "spectator",
  "survival",
  "kill_silverfish",
  "kill_withers",
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
  /** `allowlist_sync` / `allowlist_sync_corrected`: gamertags a dar de alta (`allowlist add`). */
  targetGamertagsAdd?: string[] | null;
  /** `allowlist_sync` / `allowlist_sync_corrected`: gamertags a dar de baja (`allowlist remove`). */
  targetGamertagsRemove?: string[] | null;
  /** `allowlist_sync_corrected`: IDs de correcciones pendientes que se marcan como sincronizadas al confirmar el addon. */
  pendingCorrectionIds?: string[] | null;
  requestedAt?: string;
  handledAt?: string | null;
};

export function asRemoteCmdQueueData(value: unknown): RemoteCmdQueueData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as RemoteCmdQueueData;
}

export function remoteCmdNeedsTarget(action: RemoteCmdAction): boolean {
  return action === "spectator" || action === "survival";
}

/** Acciones que se resuelven contra listas de gamertags calculadas en el servidor (no las elige el cliente). */
export function remoteCmdNeedsTargetList(action: RemoteCmdAction): boolean {
  return action === "allowlist_sync" || action === "allowlist_sync_corrected";
}
