import { prisma } from "@/lib/prisma";

export const MINECRAFT_SYNC_QUEUE_ID = "minecraft_sync_request";

export type MinecraftPanelCommand = "syncall";

/**
 * Encola un comando de panel para el addon (p. ej. `syncall` para aplicar
 * blacklist/whitelist del GET /api/minecraft/status).
 */
export async function enqueueMinecraftPanelCommand(
  command: MinecraftPanelCommand = "syncall",
): Promise<{ command: MinecraftPanelCommand; requestedAt: string }> {
  const requestedAt = new Date().toISOString();

  await prisma.minecraftSyncQueue.upsert({
    where: { id: MINECRAFT_SYNC_QUEUE_ID },
    update: {
      data: {
        command,
        requestedAt,
        handledAt: null,
      },
    },
    create: {
      id: MINECRAFT_SYNC_QUEUE_ID,
      data: {
        command,
        requestedAt,
        handledAt: null,
      },
    },
  });

  return { command, requestedAt };
}
