import {
  DEFAULT_SNAPSHOT_KEEP_MINIMUM,
  DEFAULT_SNAPSHOT_RETENTION_DAYS,
} from "@/lib/minecraft-snapshot-purge";
import {
  DEFAULT_MONITOR_EXCLUDE,
  parseExcludeList,
} from "@/lib/minecraft-monitor";
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
  monitorExclude: string[];
};

export type MinecraftConfigUpdateInput = Partial<
  Omit<MinecraftConfigPayload, "parcel" | "monitorExclude">
> & {
  monitorExcludeJson?: string | null;
};

export const MINECRAFT_CONFIG_DEFAULTS: MinecraftConfigPayload = {
  daysInactive: 7,
  daysBlacklist: 14,
  daysPurge: 21,
  snapshotRetentionDays: DEFAULT_SNAPSHOT_RETENTION_DAYS,
  snapshotKeepMinimum: DEFAULT_SNAPSHOT_KEEP_MINIMUM,
  parcel: { ...PARCEL_CONFIG_DEFAULTS },
  monitorExclude: [...DEFAULT_MONITOR_EXCLUDE],
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
  monitorExcludeJson?: string | null;
}): MinecraftConfigPayload {
  return {
    daysInactive: config.daysInactive,
    daysBlacklist: config.daysBlacklist,
    daysPurge: config.daysPurge,
    snapshotRetentionDays: config.snapshotRetentionDays,
    snapshotKeepMinimum: config.snapshotKeepMinimum,
    parcel: parcelConfigFromRow(config),
    monitorExclude: parseExcludeList(config.monitorExcludeJson),
  };
}
