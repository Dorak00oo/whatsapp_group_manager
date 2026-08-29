import { prisma } from "@/lib/prisma";
import {
  allowlistRemovalServerIds,
  type MinecraftServerId,
} from "@/lib/minecraft-server";

function normalizeGamertag(tag: string): string {
  return tag.trim();
}

export type AllowlistRemovalScope = MinecraftServerId | "all";

export { allowlistRemovalServerIds };

/** Encola `allowlist remove` si aún no está pendiente ni confirmada para ese gamertag en ese mundo. */
export async function enqueueAllowlistRemoval(
  userId: string,
  gamertag: string,
  scope: AllowlistRemovalScope,
): Promise<void> {
  const tag = normalizeGamertag(gamertag);
  if (!tag) return;

  for (const serverId of allowlistRemovalServerIds(scope)) {
    const existing = await prisma.pendingAllowlistRemoval.findFirst({
      where: {
        userId,
        serverId,
        gamertag: { equals: tag, mode: "insensitive" },
      },
      select: { id: true, syncedAt: true },
    });
    if (existing) continue;

    await prisma.pendingAllowlistRemoval.create({
      data: { userId, serverId, gamertag: tag },
    });
  }
}

/** Quita de la cola una baja pendiente (p. ej. al reactivar al miembro). */
export async function cancelPendingAllowlistRemoval(
  userId: string,
  gamertag: string,
  scope: AllowlistRemovalScope = "all",
): Promise<void> {
  const tag = normalizeGamertag(gamertag);
  if (!tag) return;

  await prisma.pendingAllowlistRemoval.deleteMany({
    where: {
      userId,
      serverId: { in: allowlistRemovalServerIds(scope) },
      gamertag: { equals: tag, mode: "insensitive" },
      syncedAt: null,
    },
  });
}

/** Gamertags con `allowlist remove` pendiente de confirmar por el addon de ese mundo. */
export async function pendingAllowlistRemovalGamertags(
  userId: string,
  serverId: MinecraftServerId,
): Promise<string[]> {
  const rows = await prisma.pendingAllowlistRemoval.findMany({
    where: { userId, serverId, syncedAt: null },
    select: { gamertag: true },
    orderBy: { createdAt: "asc" },
  });

  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    const tag = normalizeGamertag(row.gamertag);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

/** Gamertags que ya se confirmaron como quitados del allowlist de ese mundo. */
export async function alreadyRemovedAllowlistGamertags(
  userId: string,
  candidates: string[],
  serverId: MinecraftServerId,
): Promise<Set<string>> {
  const tags = candidates.map(normalizeGamertag).filter(Boolean);
  if (tags.length === 0) return new Set();

  const rows = await prisma.pendingAllowlistRemoval.findMany({
    where: {
      userId,
      serverId,
      syncedAt: { not: null },
      OR: tags.map((tag) => ({
        gamertag: { equals: tag, mode: "insensitive" as const },
      })),
    },
    select: { gamertag: true },
  });

  return new Set(rows.map((r) => normalizeGamertag(r.gamertag).toLowerCase()));
}

/** Tras confirmar el addon: marca bajas hechas en cola de ESE mundo y en fichas de miembro. */
export async function markAllowlistRemovesCompleted(
  userId: string,
  gamertags: string[],
  serverId: MinecraftServerId,
): Promise<void> {
  const now = new Date();
  for (const raw of gamertags) {
    const tag = normalizeGamertag(raw);
    if (!tag) continue;

    const existing = await prisma.pendingAllowlistRemoval.findFirst({
      where: {
        userId,
        serverId,
        gamertag: { equals: tag, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (existing) {
      await prisma.pendingAllowlistRemoval.update({
        where: { id: existing.id },
        data: { syncedAt: now },
      });
    } else {
      await prisma.pendingAllowlistRemoval.create({
        data: { userId, serverId, gamertag: tag, syncedAt: now },
      });
    }

    const stillPending = await prisma.pendingAllowlistRemoval.count({
      where: {
        userId,
        gamertag: { equals: tag, mode: "insensitive" },
        syncedAt: null,
      },
    });
    if (stillPending === 0) {
      await prisma.directoryMember.updateMany({
        where: {
          userId,
          gamertag: { equals: tag, mode: "insensitive" },
        },
        data: { allowlistRemovedAt: now },
      });
    }
  }
}

export async function enqueueAllowlistRemovalForMember(
  userId: string,
  member: {
    gamertag: string;
    allowlistSyncedAt: Date | null;
    allowlistRemovedAt: Date | null;
  },
): Promise<void> {
  if (!member.allowlistSyncedAt || member.allowlistRemovedAt) return;
  await enqueueAllowlistRemoval(userId, member.gamertag, "all");
}
