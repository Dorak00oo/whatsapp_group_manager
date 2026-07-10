import { prisma } from "@/lib/prisma";

function normalizeGamertag(tag: string): string {
  return tag.trim();
}

/** Encola `allowlist remove` si aún no está pendiente ni confirmada para ese gamertag. */
export async function enqueueAllowlistRemoval(
  userId: string,
  gamertag: string,
): Promise<void> {
  const tag = normalizeGamertag(gamertag);
  if (!tag) return;

  const existing = await prisma.pendingAllowlistRemoval.findFirst({
    where: {
      userId,
      gamertag: { equals: tag, mode: "insensitive" },
    },
    select: { id: true, syncedAt: true },
  });
  if (existing) return;

  await prisma.pendingAllowlistRemoval.create({
    data: { userId, gamertag: tag },
  });
}

/** Quita de la cola una baja pendiente (p. ej. al reactivar al miembro). */
export async function cancelPendingAllowlistRemoval(
  userId: string,
  gamertag: string,
): Promise<void> {
  const tag = normalizeGamertag(gamertag);
  if (!tag) return;

  await prisma.pendingAllowlistRemoval.deleteMany({
    where: {
      userId,
      gamertag: { equals: tag, mode: "insensitive" },
      syncedAt: null,
    },
  });
}

/** Gamertags con `allowlist remove` pendiente de confirmar por el addon. */
export async function pendingAllowlistRemovalGamertags(
  userId: string,
): Promise<string[]> {
  const rows = await prisma.pendingAllowlistRemoval.findMany({
    where: { userId, syncedAt: null },
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

/** Gamertags que ya se confirmaron como quitados del allowlist del servidor. */
export async function alreadyRemovedAllowlistGamertags(
  userId: string,
  candidates: string[],
): Promise<Set<string>> {
  const tags = candidates.map(normalizeGamertag).filter(Boolean);
  if (tags.length === 0) return new Set();

  const rows = await prisma.pendingAllowlistRemoval.findMany({
    where: {
      userId,
      syncedAt: { not: null },
      OR: tags.map((tag) => ({
        gamertag: { equals: tag, mode: "insensitive" as const },
      })),
    },
    select: { gamertag: true },
  });

  return new Set(rows.map((r) => normalizeGamertag(r.gamertag).toLowerCase()));
}

/** Tras confirmar el addon: marca bajas hechas en cola y en fichas de miembro. */
export async function markAllowlistRemovesCompleted(
  userId: string,
  gamertags: string[],
): Promise<void> {
  const now = new Date();
  for (const raw of gamertags) {
    const tag = normalizeGamertag(raw);
    if (!tag) continue;

    const existing = await prisma.pendingAllowlistRemoval.findFirst({
      where: {
        userId,
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
        data: { userId, gamertag: tag, syncedAt: now },
      });
    }

    await prisma.directoryMember.updateMany({
      where: {
        userId,
        gamertag: { equals: tag, mode: "insensitive" },
      },
      data: { allowlistRemovedAt: now },
    });
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
  await enqueueAllowlistRemoval(userId, member.gamertag);
}
