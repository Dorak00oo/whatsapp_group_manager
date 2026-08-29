import { prisma } from "@/lib/prisma";
import {
  minecraftConfigToPayload,
  type MinecraftConfigPayload,
} from "@/lib/minecraft-config-defaults";
import {
  parcelConfigFromRow,
  parcelPrismaUpdateFromPayload,
  parcelRecordFromRow,
  type ParcelConfigPayload,
  type ParcelRecordPayload,
} from "@/lib/minecraft-parcel";
import { primaryParcelIdForServer, type MinecraftServerId } from "@/lib/minecraft-server";
import { ensureMinecraftConfig, ensureMinecraftServers } from "@/lib/minecraft-servers-db";

export async function listParcelRecords(
  serverId: MinecraftServerId,
): Promise<ParcelRecordPayload[]> {
  const rows = await prisma.minecraftParcel.findMany({
    where: { serverId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  return rows.map(parcelRecordFromRow);
}

export async function ensurePrimaryParcel(
  serverId: MinecraftServerId,
): Promise<ParcelRecordPayload[]> {
  await ensureMinecraftServers();
  const existing = await listParcelRecords(serverId);
  if (existing.length > 0) return existing;

  const config = await ensureMinecraftConfig(serverId);
  const fromConfig = parcelConfigFromRow(config);
  const primaryId = primaryParcelIdForServer(serverId);

  await prisma.minecraftParcel.create({
    data: {
      id: primaryId,
      serverId,
      isPrimary: true,
      name: fromConfig.name,
      enabled: fromConfig.enabled,
      dimension: fromConfig.dimension,
      minX: fromConfig.minX,
      minY: fromConfig.minY,
      minZ: fromConfig.minZ,
      maxX: fromConfig.maxX,
      maxY: fromConfig.maxY,
      maxZ: fromConfig.maxZ,
    },
  });
  return listParcelRecords(serverId);
}

export async function extraParcelCount(
  serverId: MinecraftServerId,
): Promise<number> {
  return prisma.minecraftParcel.count({
    where: { serverId, isPrimary: false },
  });
}

export async function syncPrimaryConfigColumns(
  serverId: MinecraftServerId,
  parcel: Partial<ParcelConfigPayload>,
): Promise<void> {
  const fields = parcelPrismaUpdateFromPayload(parcel);
  if (Object.keys(fields).length === 0) return;
  await ensureMinecraftConfig(serverId);
  await prisma.minecraftConfig.update({
    where: { id: serverId },
    data: fields,
  });
}

export async function knownParcelIdSet(
  serverId: MinecraftServerId,
): Promise<Set<string>> {
  const rows = await prisma.minecraftParcel.findMany({
    where: { serverId },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

export async function fullMinecraftConfigPayload(
  config: Parameters<typeof minecraftConfigToPayload>[0],
  serverId: MinecraftServerId,
): Promise<MinecraftConfigPayload> {
  const base = minecraftConfigToPayload(config);
  const parcels = await ensurePrimaryParcel(serverId);
  const admins = await prisma.directoryMember.findMany({
    where: { isAdmin: true },
    select: { gamertag: true },
  });
  const seen = new Set<string>();
  const adminGamertags: string[] = [];
  for (const a of admins) {
    const tag = a.gamertag.trim();
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    adminGamertags.push(tag);
  }
  const primary = parcels.find((p) => p.isPrimary) ?? parcels[0];
  return {
    ...base,
    parcel: primary
      ? {
          enabled: primary.enabled,
          name: primary.name,
          dimension: primary.dimension,
          minX: primary.minX,
          minY: primary.minY,
          minZ: primary.minZ,
          maxX: primary.maxX,
          maxY: primary.maxY,
          maxZ: primary.maxZ,
        }
      : base.parcel,
    parcels,
    adminGamertags,
  };
}
