import { prisma } from "@/lib/prisma";
import {
  buildRosterFromSnapshot,
  snapshotStatusByGamertag,
} from "@/lib/minecraft-active";
import { MINECRAFT_CONFIG_DEFAULTS } from "@/lib/minecraft-config-defaults";

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
  activated: string[];
  deactivated: string[];
};

/**
 * Alinea el directorio con el roster de Minecraft (misma regla que Reconciliación:
 * activo en MC y sin blacklist, usando el último snapshot si existe).
 * Solo filas del panel sin `leftAt`. El activo permanente no se baja.
 * Esta acción de panel ignora `activeHoldFromMc` (si no, casi nadie se inactiva).
 */
export async function syncDirectoryMembersFromMinecraftTable(
  userId: string,
): Promise<SyncDirectoryFromMinecraftSummary> {
  const [players, lastSnapshot, config] = await Promise.all([
    prisma.minecraftPlayer.findMany(),
    prisma.minecraftSnapshot.findFirst({
      orderBy: { timestamp: "desc" },
    }),
    prisma.minecraftConfig.findUnique({
      where: { id: "default" },
    }),
  ]);

  const daysInactiveThreshold =
    config?.daysInactive ?? MINECRAFT_CONFIG_DEFAULTS.daysInactive;
  const displayPlayers = buildRosterFromSnapshot(
    players,
    snapshotStatusByGamertag(lastSnapshot?.data),
    daysInactiveThreshold,
  );

  const activeMcKeys = new Set(
    displayPlayers
      .filter((p) => p.active && !p.isBlacklisted)
      .map((p) => p.gamertag.trim().toLowerCase())
      .filter(Boolean),
  );

  const members = await prisma.directoryMember.findMany({
    where: { userId, leftAt: null },
    select: {
      id: true,
      gamertag: true,
      displayName: true,
      active: true,
      permanentlyActive: true,
    },
  });

  const toActivate: string[] = [];
  const toDeactivate: string[] = [];
  const activated: string[] = [];
  const deactivated: string[] = [];
  let matchedGamertags = 0;

  function memberLabel(m: {
    gamertag: string;
    displayName: string | null;
  }): string {
    const name = m.displayName?.trim();
    return name ? `${name} · ${m.gamertag}` : m.gamertag;
  }

  for (const m of members) {
    const key = m.gamertag.trim().toLowerCase();
    const mcActive = Boolean(key) && activeMcKeys.has(key);
    if (mcActive) matchedGamertags += 1;

    const shouldBeActive = m.permanentlyActive || mcActive;
    if (m.active === shouldBeActive) continue;
    if (shouldBeActive) {
      toActivate.push(m.id);
      activated.push(memberLabel(m));
    } else {
      toDeactivate.push(m.id);
      deactivated.push(memberLabel(m));
    }
  }

  activated.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  deactivated.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  let updatedRows = 0;

  if (toActivate.length > 0) {
    const r = await prisma.directoryMember.updateMany({
      where: { id: { in: toActivate } },
      data: { active: true, activeHoldFromMc: false },
    });
    updatedRows += r.count;
  }
  if (toDeactivate.length > 0) {
    const r = await prisma.directoryMember.updateMany({
      where: { id: { in: toDeactivate } },
      data: { active: false, activeHoldFromMc: false },
    });
    updatedRows += r.count;
  }

  return {
    updatedRows,
    minecraftCount: activeMcKeys.size,
    matchedGamertags,
    activated,
    deactivated,
  };
}
