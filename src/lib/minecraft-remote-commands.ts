/** Cola en `minecraft_sync_queue` (misma tabla que sync-request; sin migración nueva). */
export const REMOTE_CMD_QUEUE_ID = "panel_remote_cmd";

export const REMOTE_CMD_ACTIONS = [
  "spectator",
  "survival",
  "kill_endermites",
  "kill_withers",
] as const;

export type RemoteCmdAction = (typeof REMOTE_CMD_ACTIONS)[number];

export function isRemoteCmdAction(value: string): value is RemoteCmdAction {
  return (REMOTE_CMD_ACTIONS as readonly string[]).includes(value);
}

export type RemoteCmdQueueData = {
  action?: string;
  targetGamertag?: string | null;
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
