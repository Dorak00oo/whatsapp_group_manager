import { prisma } from "@/lib/prisma";
import {
  minecraftQueueId,
  minecraftQueueIdsToRead,
  type MinecraftQueueKind,
  type MinecraftServerId,
} from "@/lib/minecraft-server";
import type { Prisma } from "@/generated/prisma";

export async function readMinecraftQueueRow(
  serverId: MinecraftServerId,
  kind: MinecraftQueueKind,
): Promise<{ id: string; data: unknown } | null> {
  for (const id of minecraftQueueIdsToRead(serverId, kind)) {
    const row = await prisma.minecraftSyncQueue.findUnique({ where: { id } });
    if (row) return { id, data: row.data };
  }
  return null;
}

export async function upsertMinecraftQueue(
  serverId: MinecraftServerId,
  kind: MinecraftQueueKind,
  data: Prisma.InputJsonValue,
): Promise<string> {
  const id = minecraftQueueId(serverId, kind);
  await prisma.minecraftSyncQueue.upsert({
    where: { id },
    update: { data },
    create: { id, data },
  });
  return id;
}

export async function updateMinecraftQueueData(
  queueId: string,
  data: Prisma.InputJsonValue,
): Promise<void> {
  await prisma.minecraftSyncQueue.update({
    where: { id: queueId },
    data: { data },
  });
}
