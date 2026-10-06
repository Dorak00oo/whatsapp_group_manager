import { recordAuditEvents } from "@/lib/audit-log";
import { reconcileDirectoryAbsentActive } from "@/lib/directory-absent-clock";
import {
  planHeartbeatDirectoryActive,
  planPanelDirectoryActive,
  type ActiveSyncChange,
} from "@/lib/directory-active-sync-plan";
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
  type MinecraftServerId,
} from "@/lib/minecraft-server";
import { ensureMinecraftServers } from "@/lib/minecraft-servers-db";
import { memberMcAccounts } from "@/lib/member-mc-accounts";

const MC_SYNC_ACTOR = {
  actorType: "sistema" as const,
  actorName: "Sincronización con Minecraft",
};

async function communityOwnerId(): Promise<string | null> {
  const { findCommunityOwner } = await import("@/lib/resolve-directory-user");
  const owner = await findCommunityOwner();
  return owner?.id ?? null;
}

function uniqueTags(gamertags: string[]): string[] {
  const seen = new Map<string, string>();
  for (const raw of gamertags) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (!seen.has(key)) seen.set(key, tag);
  }
  return [...seen.values()];
}

async function updateMemberActive(
  ids: string[],
  data: { active: boolean; activeHoldFromMc?: boolean },
): Promise<number> {
  let updated = 0;
  const size = 500;
  for (let i = 0; i < ids.length; i += size) {
    const result = await prisma.directoryMember.updateMany({
      where: { id: { in: ids.slice(i, i + size) } },
      data,
    });
    updated += result.count;
  }
  return updated;
}

/** Historial solo de quien cambió de activo de verdad. Fuera de transacciones. */
export async function recordMinecraftActiveChanges(
  userId: string,
  changes: ActiveSyncChange[],
): Promise<void> {
  if (changes.length === 0) return;
  await recordAuditEvents(
    changes.map((c) => ({
      userId,
      actor: MC_SYNC_ACTOR,
      action: "member.update",
      memberId: c.id,
      memberGamertag: c.gamertag,
      changes: { active: { from: c.from, to: c.to } },
      details: { source: "mc.sync" },
    })),
  );
}

/**
 * Alinea el directorio de estos gamertags con la unión de mundos.
 * Una lectura de jugadores, un plan y `updateMany` agrupados. No reconcilia
 * ausentes: el llamador lo hace una vez al final.
 */
export async function syncDirectoryActiveForGamertags(
  gamertags: string[],
  now: Date = new Date(),
): Promise<{ userId: string | null; changes: ActiveSyncChange[] }> {
  const userId = await communityOwnerId();
  if (!userId) return { userId: null, changes: [] };
  const tags = uniqueTags(gamertags);
  if (tags.length === 0) return { userId, changes: [] };

  const playerWhere = tags.map((t) => ({
    gamertag: { equals: t, mode: "insensitive" as const },
  }));
  const memberWhere = tags.flatMap((t) => [
    { gamertag: { equals: t, mode: "insensitive" as const } },
    { mcAccount2: { equals: t, mode: "insensitive" as const } },
    { mcAccount3: { equals: t, mode: "insensitive" as const } },
  ]);
  const [players, members] = await Promise.all([
    prisma.minecraftPlayer.findMany({
      where: { OR: playerWhere },
      select: {
        gamertag: true,
        serverId: true,
        active: true,
        isBlacklisted: true,
      },
    }),
    prisma.directoryMember.findMany({
      where: { userId, OR: memberWhere },
      select: {
        id: true,
        gamertag: true,
        mcAccount2: true,
        mcAccount3: true,
        active: true,
        permanentlyActive: true,
        permanentlyActiveUntil: true,
        activeHoldFromMc: true,
        absentWithCause: true,
        leftAt: true,
      },
    }),
  ]);

  const grouped = groupWorldActivityByGamertag(players);
  const mc = new Map<string, boolean>();
  for (const tag of tags) {
    const key = tag.toLowerCase();
    mc.set(key, isCommunityActiveFromWorlds(grouped.get(key) ?? []));
  }
  for (const member of members) {
    const accounts = memberMcAccounts(member).map((tag) => tag.toLowerCase());
    const known = accounts.filter((key) => mc.has(key));
    if (known.length === 0) continue;
    mc.set(
      member.gamertag.trim().toLowerCase(),
      known.some((key) => mc.get(key) === true),
    );
  }
  const plan = planHeartbeatDirectoryActive({
    members,
    minecraftActiveByGamertag: mc,
    now,
  });
  if (plan.activateIds.length > 0) {
    await updateMemberActive(plan.activateIds, { active: true });
  }
  if (plan.deactivateIds.length > 0) {
    await updateMemberActive(plan.deactivateIds, { active: false });
  }
  return { userId, changes: plan.changes };
}

/**
 * Un gamertag (p. ej. tras un ban en todos los mundos). Reconcilia ausentes
 * una vez y deja historial si `active` cambió.
 */
export async function syncDirectoryActiveWithMinecraft(
  gamertag: string,
): Promise<void> {
  const { userId, changes } = await syncDirectoryActiveForGamertags([gamertag]);
  if (!userId) return;
  await reconcileDirectoryAbsentActive(userId);
  await recordMinecraftActiveChanges(userId, changes);
}

export type SyncDirectoryFromMinecraftSummary = {
  updatedRows: number;
  minecraftCount: number;
  matchedGamertags: number;
  activated: string[];
  deactivated: string[];
  changes: ActiveSyncChange[];
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
 * Solo filas del panel sin `leftAt`. Protegido (manual o temporal vigente)
 * no se baja y, si estaba inactivo, sube a activo.
 * Los ausentes con causa siguen ausentes, pero sí cambian de columna.
 * Esta acción de panel ignora `activeHoldFromMc` (si no, casi nadie se inactiva).
 */
export async function syncDirectoryMembersFromMinecraftTable(
  userId: string,
  now: Date = new Date(),
): Promise<SyncDirectoryFromMinecraftSummary> {
  const byTag = await unionActivityByGamertag();

  const members = await prisma.directoryMember.findMany({
    where: { userId, leftAt: null },
    select: {
      id: true,
      gamertag: true,
      mcAccount2: true,
      mcAccount3: true,
      displayName: true,
      active: true,
      permanentlyActive: true,
      permanentlyActiveUntil: true,
      activeHoldFromMc: true,
      absentWithCause: true,
      leftAt: true,
    },
  });

  const mc = new Map<string, boolean>();
  let matchedGamertags = 0;
  for (const m of members) {
    const key = m.gamertag.trim().toLowerCase();
    const activeInMc = memberMcAccounts(m).some((tag) =>
      isCommunityActiveFromWorlds(byTag.get(tag.toLowerCase()) ?? []),
    );
    mc.set(key, activeInMc);
    if (activeInMc) matchedGamertags += 1;
  }

  const plan = planPanelDirectoryActive({
    members,
    minecraftActiveByGamertag: mc,
    now,
  });

  function memberLabel(id: string): string {
    const m = members.find((row) => row.id === id);
    if (!m) return id;
    const name = m.displayName?.trim();
    return name ? `${name} · ${m.gamertag}` : m.gamertag;
  }

  const activated = plan.changes
    .filter((c) => c.to)
    .map((c) => memberLabel(c.id))
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  const deactivated = plan.changes
    .filter((c) => !c.to)
    .map((c) => memberLabel(c.id))
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  let updatedRows = 0;
  if (plan.activateIds.length > 0) {
    updatedRows += await updateMemberActive(plan.activateIds, {
      active: true,
      activeHoldFromMc: false,
    });
  }
  if (plan.deactivateIds.length > 0) {
    updatedRows += await updateMemberActive(plan.deactivateIds, {
      active: false,
      activeHoldFromMc: false,
    });
  }

  await reconcileDirectoryAbsentActive(userId, now);

  const minecraftCount = [...byTag.values()].filter((worlds) =>
    isCommunityActiveFromWorlds(worlds),
  ).length;

  return {
    updatedRows,
    minecraftCount,
    matchedGamertags,
    activated,
    deactivated,
    changes: plan.changes,
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
