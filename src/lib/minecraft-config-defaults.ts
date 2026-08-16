import {
  DEFAULT_SNAPSHOT_KEEP_MINIMUM,
  DEFAULT_SNAPSHOT_RETENTION_DAYS,
} from "@/lib/minecraft-snapshot-purge";
import {
  DEFAULT_MONITOR_EXCLUDE,
  parseExcludeList,
} from "@/lib/minecraft-monitor";
import { parseBannedItems } from "@/lib/minecraft-banned-items";
import {
  PARCEL_CONFIG_DEFAULTS,
  type ParcelConfigPayload,
  type ParcelRecordPayload,
  parcelConfigFromRow,
} from "@/lib/minecraft-parcel";

export type MinecraftConfigPayload = {
  daysInactive: number;
  daysBlacklist: number;
  daysPurge: number;
  snapshotRetentionDays: number;
  snapshotKeepMinimum: number;
  parcel: ParcelConfigPayload;
  parcels: ParcelRecordPayload[];
  monitorExclude: string[];
  bannedItems: string[];
  adminGamertags: string[];
};

export type MinecraftConfigUpdateInput = Partial<
  Omit<
    MinecraftConfigPayload,
    "parcel" | "parcels" | "monitorExclude" | "bannedItems" | "adminGamertags"
  >
> & {
  monitorExcludeJson?: string | null;
  bannedItemsJson?: string | null;
};

export const MINECRAFT_CONFIG_DEFAULTS: MinecraftConfigPayload = {
  daysInactive: 7,
  daysBlacklist: 14,
  daysPurge: 21,
  snapshotRetentionDays: DEFAULT_SNAPSHOT_RETENTION_DAYS,
  snapshotKeepMinimum: DEFAULT_SNAPSHOT_KEEP_MINIMUM,
  parcel: { ...PARCEL_CONFIG_DEFAULTS },
  parcels: [],
  monitorExclude: [...DEFAULT_MONITOR_EXCLUDE],
  bannedItems: [],
  adminGamertags: [],
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
  bannedItemsJson?: string | null;
}): MinecraftConfigPayload {
  return {
    daysInactive: config.daysInactive,
    daysBlacklist: config.daysBlacklist,
    daysPurge: config.daysPurge,
    snapshotRetentionDays: config.snapshotRetentionDays,
    snapshotKeepMinimum: config.snapshotKeepMinimum,
    parcel: parcelConfigFromRow(config),
    parcels: [],
    monitorExclude: parseExcludeList(config.monitorExcludeJson),
    bannedItems: parseBannedItems(config.bannedItemsJson),
    adminGamertags: [],
  };
}
