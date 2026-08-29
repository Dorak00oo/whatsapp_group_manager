import { prisma } from "@/lib/prisma";
import {
  classifyAddonIdentity,
  heartbeatFromRequestAndBody,
  installIdFromRequest,
  parseMinecraftServerId,
  type MinecraftServerHeartbeat,
  type MinecraftServerId,
} from "@/lib/minecraft-server";
import { ensureMinecraftServers } from "@/lib/minecraft-servers-db";

export type MinecraftInstallRow = {
  id: string;
  serverId: MinecraftServerId | null;
  lastWorldName: string | null;
  lastVersion: string | null;
  lastSeenAt: Date;
  assignedAt: Date | null;
};

function toRow(row: {
  id: string;
  serverId: string | null;
  lastWorldName: string | null;
  lastVersion: string | null;
  lastSeenAt: Date;
  assignedAt: Date | null;
}): MinecraftInstallRow {
  return {
    id: row.id,
    serverId: parseMinecraftServerId(row.serverId),
    lastWorldName: row.lastWorldName,
    lastVersion: row.lastVersion,
    lastSeenAt: row.lastSeenAt,
    assignedAt: row.assignedAt,
  };
}

export async function upsertMinecraftInstallHeartbeat(
  installId: string,
  meta: MinecraftServerHeartbeat,
) {
  const now = new Date();
  const worldName = meta.worldName?.trim().slice(0, 80) || undefined;
  const version = meta.version?.trim().slice(0, 64) || undefined;
  const row = await prisma.minecraftInstall.upsert({
    where: { id: installId },
    create: {
      id: installId,
      lastSeenAt: now,
      lastWorldName: worldName ?? null,
      lastVersion: version ?? null,
    },
    update: {
      lastSeenAt: now,
      ...(worldName ? { lastWorldName: worldName } : {}),
      ...(version ? { lastVersion: version } : {}),
    },
  });
  return toRow(row);
}

export async function listMinecraftInstalls(): Promise<MinecraftInstallRow[]> {
  const rows = await prisma.minecraftInstall.findMany({
    orderBy: [{ serverId: "asc" }, { lastSeenAt: "desc" }],
  });
  return rows.map(toRow);
}

export async function assignMinecraftInstall(
  installId: string,
  serverId: MinecraftServerId,
): Promise<MinecraftInstallRow> {
  await ensureMinecraftServers();
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const existing = await tx.minecraftInstall.findUnique({
      where: { id: installId },
    });
    if (!existing) {
      throw new Error("INSTALL_NOT_FOUND");
    }
    await tx.minecraftInstall.updateMany({
      where: { serverId, NOT: { id: installId } },
      data: { serverId: null, assignedAt: null },
    });
    const row = await tx.minecraftInstall.update({
      where: { id: installId },
      data: { serverId, assignedAt: now },
    });
    return toRow(row);
  });
}

export async function resolveAddonIdentityFromRequest(
  request: Request,
  body?: {
    serverId?: unknown;
    installId?: unknown;
    flavor?: unknown;
    version?: unknown;
    worldName?: unknown;
  } | null,
) {
  const installId = installIdFromRequest(request, body);
  let mappedServerId: MinecraftServerId | null = null;
  if (installId) {
    const row = await upsertMinecraftInstallHeartbeat(
      installId,
      heartbeatFromRequestAndBody(request, body),
    );
    mappedServerId = row.serverId;
  }
  return classifyAddonIdentity({
    installId,
    mappedServerId,
    request,
    body,
  });
}
