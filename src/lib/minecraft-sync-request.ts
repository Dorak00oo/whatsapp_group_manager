import {
  upsertMinecraftQueue,
} from "@/lib/minecraft-queue";
import type { MinecraftServerId } from "@/lib/minecraft-server";

export const MINECRAFT_SYNC_QUEUE_ID = "minecraft_sync_request";

export type MinecraftPanelCommand = "syncall" | "synclists" | "syncconfig";

/**
 * Encola un comando de panel para el addon (`synclists`, `syncconfig` o `syncall`).
 */
export async function enqueueMinecraftPanelCommand(
  command: MinecraftPanelCommand = "syncall",
  serverId: MinecraftServerId = "vanilla",
): Promise<{ command: MinecraftPanelCommand; requestedAt: string }> {
  const requestedAt = new Date().toISOString();

  await upsertMinecraftQueue(serverId, "minecraft_sync_request", {
    command,
    requestedAt,
    handledAt: null,
  });

  return { command, requestedAt };
}
