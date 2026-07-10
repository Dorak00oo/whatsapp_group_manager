import { prisma } from "@/lib/prisma";

function directoryMayReceiveMcInactive(): { permanentlyActive: false; activeHoldFromMc: false } {
  return { permanentlyActive: false, activeHoldFromMc: false };
}

/**
 * Alinea `DirectoryMember.active` con el estado deseado (p. ej. activo en
 * servidor **y** no blacklist) cuando el gamertag coincide (sin distinguir
 * mayúsculas). No modifica filas con `leftAt` (se salieron del grupo).
 * Respeta `permanentlyActive` y `activeHoldFromMc` al bajar a inactivo.
 */
export async function syncDirectoryActiveWithMinecraft(
  gamertag: string,
  minecraftActive: boolean,
): Promise<void> {
  const email = process.env.COMMUNITY_EMAIL?.trim().toLowerCase();
  if (!email) return;

  const owner = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!owner) return;

  const tag = gamertag.trim();
  if (!tag) return;

  const baseWhere = {
    userId: owner.id,
    leftAt: null,
    gamertag: { equals: tag, mode: "insensitive" as const },
  };

  if (minecraftActive) {
    await prisma.directoryMember.updateMany({
      where: baseWhere,
      data: { active: true },
    });
    return;
  }

  await prisma.directoryMember.updateMany({
    where: {
      ...baseWhere,
      ...directoryMayReceiveMcInactive(),
    },
    data: { active: false },
  });
}

export type SyncDirectoryFromMinecraftSummary = {
  updatedRows: number;
  minecraftCount: number;
  matchedGamertags: number;
};

/**
 * Alinea el directorio con la tabla `minecraft_players` (misma regla que el
 * POST de estado: activo en MC y sin blacklist). Solo `userId` del panel y
 * filas sin `leftAt`. Respeta activo permanente y alta manual.
 */
export async function syncDirectoryMembersFromMinecraftTable(
  userId: string,
): Promise<SyncDirectoryFromMinecraftSummary> {
  const players = await prisma.minecraftPlayer.findMany({
    select: { gamertag: true, active: true, isBlacklisted: true },
  });

  let updatedRows = 0;
  let matchedGamertags = 0;

  for (const p of players) {
    const tag = p.gamertag.trim();
    if (!tag) continue;
    const directoryActive = p.active && !p.isBlacklisted;
    const baseWhere = {
      userId,
      leftAt: null,
      gamertag: { equals: tag, mode: "insensitive" as const },
    };

    if (directoryActive) {
      const r = await prisma.directoryMember.updateMany({
        where: baseWhere,
        data: { active: true },
      });
      if (r.count > 0) {
        matchedGamertags += 1;
        updatedRows += r.count;
      }
      continue;
    }

    const r = await prisma.directoryMember.updateMany({
      where: {
        ...baseWhere,
        ...directoryMayReceiveMcInactive(),
      },
      data: { active: false },
    });
    if (r.count > 0) {
      matchedGamertags += 1;
      updatedRows += r.count;
    }
  }

  return {
    updatedRows,
    minecraftCount: players.length,
    matchedGamertags,
  };
}
