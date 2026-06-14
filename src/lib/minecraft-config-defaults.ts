import {
  DEFAULT_SNAPSHOT_KEEP_MINIMUM,
  DEFAULT_SNAPSHOT_RETENTION_DAYS,
} from "@/lib/minecraft-snapshot-purge";
import {
  PARCEL_CONFIG_DEFAULTS,
  type ParcelConfigPayload,
  parcelConfigFromRow,
} from "@/lib/minecraft-parcel";

export type MinecraftConfigPayload = {
  daysInactive: number;
  daysBlacklist: number;
  daysPurge: number;
  snapshotRetentionDays: number;
  snapshotKeepMinimum: number;
  parcel: ParcelConfigPayload;
};

export type MinecraftConfigUpdateInput = Partial<MinecraftConfigPayload>;

export const MINECRAFT_CONFIG_DEFAULTS: MinecraftConfigPayload = {
  daysInactive: 7,
  daysBlacklist: 14,
  daysPurge: 21,
  snapshotRetentionDays: DEFAULT_SNAPSHOT_RETENTION_DAYS,
  snapshotKeepMinimum: DEFAULT_SNAPSHOT_KEEP_MINIMUM,
  parcel: { ...PARCEL_CONFIG_DEFAULTS },
};

export function minecraftConfigToPayload(config: {
  daysInactive: number;
  daysBlacklist: number;
  daysPurge: number;
  snapshotRetentionDays: number;
  snapshotKeepMinimum: number;
  parcelEnabled: boolean;
  parcelName: string;
  parcelDimension: string;
  parcelMinX: number;
  parcelMinY: number;
  parcelMinZ: number;
  parcelMaxX: number;
  parcelMaxY: number;
  parcelMaxZ: number;
}): MinecraftConfigPayload {
  return {
    daysInactive: config.daysInactive,
    daysBlacklist: config.daysBlacklist,
    daysPurge: config.daysPurge,
    snapshotRetentionDays: config.snapshotRetentionDays,
    snapshotKeepMinimum: config.snapshotKeepMinimum,
    parcel: parcelConfigFromRow(config),
  };
}
