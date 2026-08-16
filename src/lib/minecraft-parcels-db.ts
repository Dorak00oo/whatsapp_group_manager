import { prisma } from "@/lib/prisma";
import {
  minecraftConfigToPayload,
  type MinecraftConfigPayload,
} from "@/lib/minecraft-config-defaults";
import {
  PARCEL_CONFIG_DEFAULTS,
  PRIMARY_PARCEL_ID,
  parcelConfigFromRow,
  parcelPrismaUpdateFromPayload,
  parcelRecordFromRow,
  type ParcelConfigPayload,
  type ParcelRecordPayload,
} from "@/lib/minecraft-parcel";

export async function listParcelRecords(): Promise<ParcelRecordPayload[]> {
  const rows = await prisma.minecraftParcel.findMany({
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  return rows.map(parcelRecordFromRow);
}

export async function ensurePrimaryParcel(): Promise<ParcelRecordPayload[]> {
  const existing = await listParcelRecords();
  if (existing.length > 0) return existing;

  const config = await prisma.minecraftConfig.findUnique({
    where: { id: "default" },
  });
  const fromConfig = config
    ? parcelConfigFromRow(config)
    : { ...PARCEL_CONFIG_DEFAULTS };

  await prisma.minecraftParcel.create({
    data: {
      id: PRIMARY_PARCEL_ID,
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
  return listParcelRecords();
}

export async function extraParcelCount(): Promise<number> {
  return prisma.minecraftParcel.count({ where: { isPrimary: false } });
}

export async function syncPrimaryConfigColumns(
  parcel: Partial<ParcelConfigPayload>,
): Promise<void> {
  const fields = parcelPrismaUpdateFromPayload(parcel);
  if (Object.keys(fields).length === 0) return;
  await prisma.minecraftConfig.upsert({
    where: { id: "default" },
    update: fields,
    create: {
      id: "default",
      parcelEnabled: PARCEL_CONFIG_DEFAULTS.enabled,
      parcelName: PARCEL_CONFIG_DEFAULTS.name,
      parcelDimension: PARCEL_CONFIG_DEFAULTS.dimension,
      parcelMinX: PARCEL_CONFIG_DEFAULTS.minX,
      parcelMinY: PARCEL_CONFIG_DEFAULTS.minY,
      parcelMinZ: PARCEL_CONFIG_DEFAULTS.minZ,
      parcelMaxX: PARCEL_CONFIG_DEFAULTS.maxX,
      parcelMaxY: PARCEL_CONFIG_DEFAULTS.maxY,
      parcelMaxZ: PARCEL_CONFIG_DEFAULTS.maxZ,
      ...fields,
    },
  });
}

export async function knownParcelIdSet(): Promise<Set<string>> {
  const rows = await prisma.minecraftParcel.findMany({ select: { id: true } });
  return new Set(rows.map((r) => r.id));
}

export async function fullMinecraftConfigPayload(config: Parameters<
  typeof minecraftConfigToPayload
>[0]): Promise<MinecraftConfigPayload> {
  const base = minecraftConfigToPayload(config);
  const parcels = await ensurePrimaryParcel();
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

