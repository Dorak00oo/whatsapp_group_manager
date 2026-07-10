/** Cola en `minecraft_sync_queue` (misma tabla que sync-request; sin migración nueva). */
export const REMOTE_CMD_QUEUE_ID = "panel_remote_cmd";

export const REMOTE_CMD_ACTIONS = [
  "spectator",
  "survival",
  "kill_silverfish",
  "kill_withers",
  "allowlist_sync",
] as const;

export type RemoteCmdAction = (typeof REMOTE_CMD_ACTIONS)[number];

export function isRemoteCmdAction(value: string): value is RemoteCmdAction {
  return (REMOTE_CMD_ACTIONS as readonly string[]).includes(value);
}

export type RemoteCmdQueueData = {
  action?: string;
  targetGamertag?: string | null;
  /** `allowlist_sync`: gamertags a dar de alta (`allowlist add`), p. ej. miembros «nuevos». */
  targetGamertagsAdd?: string[] | null;
  /** `allowlist_sync`: gamertags a dar de baja (`allowlist remove`), p. ej. miembros inactivos o que se salieron. */
  targetGamertagsRemove?: string[] | null;
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
  return action === "allowlist_sync";
}
