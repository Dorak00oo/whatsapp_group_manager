import { prisma } from "@/lib/prisma";

/**
 * Alinea `DirectoryMember.active` con el estado deseado (p. ej. activo en
 * servidor **y** no blacklist) cuando el gamertag coincide (sin distinguir
 * mayúsculas). No modifica filas con `leftAt` (se salieron del grupo).
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

  await prisma.directoryMember.updateMany({
    where: {
      userId: owner.id,
      leftAt: null,
      gamertag: { equals: tag, mode: "insensitive" },
    },
    data: { active: minecraftActive },
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
 * filas sin `leftAt`.
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
    const r = await prisma.directoryMember.updateMany({
      where: {
        userId,
        leftAt: null,
        gamertag: { equals: tag, mode: "insensitive" },
      },
      data: { active: directoryActive },
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
