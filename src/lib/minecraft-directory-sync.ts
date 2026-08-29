import { prisma } from "@/lib/prisma";
import {
  buildRosterFromSnapshot,
  snapshotStatusByGamertag,
} from "@/lib/minecraft-active";
import { MINECRAFT_CONFIG_DEFAULTS } from "@/lib/minecraft-config-defaults";
import {
  activeMinecraftServerIds,
  groupWorldActivityByGamertag,
  isCommunityActiveFromWorlds,
  type WorldActivityRow,
} from "@/lib/minecraft-community-activity";
import {
  MINECRAFT_SERVER_IDS,
  parseMinecraftServerId,
  type MinecraftServerId,
} from "@/lib/minecraft-server";
import { ensureMinecraftServers } from "@/lib/minecraft-servers-db";

function directoryMayReceiveMcInactive(): {
  permanentlyActive: false;
  activeHoldFromMc: false;
  absentWithCause: false;
} {
  return {
    permanentlyActive: false,
    activeHoldFromMc: false,
    absentWithCause: false,
  };
}

async function worldRowsForGamertag(gamertag: string): Promise<WorldActivityRow[]> {
  const tag = gamertag.trim();
  if (!tag) return [];
  const players = await prisma.minecraftPlayer.findMany({
    where: { gamertag: { equals: tag, mode: "insensitive" } },
    select: { serverId: true, active: true, isBlacklisted: true },
  });
  return players.flatMap((p) => {
    const serverId = parseMinecraftServerId(p.serverId);
    if (!serverId) return [];
    return [{ serverId, active: p.active, isBlacklisted: p.isBlacklisted }];
  });
}

/**
 * Alinea `DirectoryMember.active` con la unión de mundos (activo y sin
 * blacklist en al menos uno). No modifica filas con `leftAt`.
 * Respeta `permanentlyActive`, `absentWithCause` y `activeHoldFromMc` al bajar a inactivo.
 */
export async function syncDirectoryActiveWithMinecraft(
  gamertag: string,
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

  const minecraftActive = isCommunityActiveFromWorlds(
    await worldRowsForGamertag(tag),
  );

  const baseWhere = {
    userId: owner.id,
    leftAt: null,
    gamertag: { equals: tag, mode: "insensitive" as const },
  };

  if (minecraftActive) {
    await prisma.directoryMember.updateMany({
      where: { ...baseWhere, absentWithCause: false },
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

async function unionActivityByGamertag(): Promise<Map<string, WorldActivityRow[]>> {
  const [players, snapshots, configs] = await Promise.all([
    prisma.minecraftPlayer.findMany(),
    prisma.minecraftSnapshot.findMany({ orderBy: { timestamp: "desc" } }),
    prisma.minecraftConfig.findMany(),
  ]);

  const latestByServer = new Map<string, (typeof snapshots)[number]>();
  for (const snap of snapshots) {
    if (!latestByServer.has(snap.serverId)) {
      latestByServer.set(snap.serverId, snap);
    }
  }
  const configById = new Map(configs.map((c) => [c.id, c]));
  const playersByServer = new Map<string, typeof players>();
  for (const p of players) {
    const list = playersByServer.get(p.serverId) ?? [];
    list.push(p);
    playersByServer.set(p.serverId, list);
  }

  const merged: Array<{
    gamertag: string;
    serverId: string;
    active: boolean;
    isBlacklisted: boolean;
  }> = [];

  for (const serverId of MINECRAFT_SERVER_IDS) {
    const serverPlayers = playersByServer.get(serverId) ?? [];
    const daysInactiveThreshold =
      configById.get(serverId)?.daysInactive ??
      MINECRAFT_CONFIG_DEFAULTS.daysInactive;
    const roster = buildRosterFromSnapshot(
      serverPlayers,
      snapshotStatusByGamertag(latestByServer.get(serverId)?.data),
      daysInactiveThreshold,
    );
    for (const p of roster) {
      merged.push({
        gamertag: p.gamertag,
        serverId,
        active: p.active,
        isBlacklisted: p.isBlacklisted,
      });
    }
  }

  return groupWorldActivityByGamertag(merged);
}

/**
 * Alinea el directorio con el roster de Minecraft (unión de mundos:
 * activo en MC y sin blacklist en al menos uno).
 * Solo filas del panel sin `leftAt`. El activo permanente y el ausente con causa no se bajan.
 * Esta acción de panel ignora `activeHoldFromMc` (si no, casi nadie se inactiva).
 */
export async function syncDirectoryMembersFromMinecraftTable(
  userId: string,
): Promise<SyncDirectoryFromMinecraftSummary> {
  const byTag = await unionActivityByGamertag();

  const members = await prisma.directoryMember.findMany({
    where: { userId, leftAt: null },
    select: {
      id: true,
      gamertag: true,
      displayName: true,
      active: true,
      permanentlyActive: true,
      absentWithCause: true,
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
    const worlds = byTag.get(key) ?? [];
    const mcActive = isCommunityActiveFromWorlds(worlds);
    if (mcActive) matchedGamertags += 1;

    const shouldBeActive = m.permanentlyActive || mcActive;
    if (m.absentWithCause) continue;
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

  const minecraftCount = [...byTag.values()].filter((worlds) =>
    isCommunityActiveFromWorlds(worlds),
  ).length;

  return {
    updatedRows,
    minecraftCount,
    matchedGamertags,
    activated,
    deactivated,
  };
}

export async function activeOnByGamertagMap(): Promise<
  Map<string, MinecraftServerId[]>
> {
  const players = await prisma.minecraftPlayer.findMany({
    select: {
      gamertag: true,
      serverId: true,
      active: true,
      isBlacklisted: true,
    },
  });
  const grouped = groupWorldActivityByGamertag(players);
  const out = new Map<string, MinecraftServerId[]>();
  for (const [key, worlds] of grouped) {
    out.set(key, activeMinecraftServerIds(worlds));
  }
  return out;
}

export const directoryActiveOnByGamertag = activeOnByGamertagMap;

export async function blacklistMinecraftGamertagOnAllWorlds(
  gamertag: string,
): Promise<void> {
  const tag = gamertag.trim();
  if (!tag) return;
  await ensureMinecraftServers();
  for (const serverId of MINECRAFT_SERVER_IDS) {
    const existing = await prisma.minecraftPlayer.findFirst({
      where: {
        serverId,
        gamertag: { equals: tag, mode: "insensitive" },
      },
    });
    if (existing) {
      await prisma.minecraftPlayer.update({
        where: { id: existing.id },
        data: { isBlacklisted: true },
      });
    } else {
      await prisma.minecraftPlayer.create({
        data: {
          serverId,
          gamertag: tag,
          lastSeen: new Date(),
          active: false,
          daysInactive: 0,
          isBlacklisted: true,
        },
      });
    }
  }
  await syncDirectoryActiveWithMinecraft(tag);
}
