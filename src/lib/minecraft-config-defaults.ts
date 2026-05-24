import {
  DEFAULT_SNAPSHOT_KEEP_MINIMUM,
  DEFAULT_SNAPSHOT_RETENTION_DAYS,
} from "@/lib/minecraft-snapshot-purge";

export type MinecraftConfigPayload = {
  daysInactive: number;
  daysBlacklist: number;
  daysPurge: number;
  snapshotRetentionDays: number;
  snapshotKeepMinimum: number;
};

export type MinecraftConfigUpdateInput = Partial<MinecraftConfigPayload>;

export const MINECRAFT_CONFIG_DEFAULTS: MinecraftConfigPayload = {
  daysInactive: 7,
  daysBlacklist: 14,
  daysPurge: 21,
  snapshotRetentionDays: DEFAULT_SNAPSHOT_RETENTION_DAYS,
  snapshotKeepMinimum: DEFAULT_SNAPSHOT_KEEP_MINIMUM,
};

export function minecraftConfigToPayload(config: {
  daysInactive: number;
  daysBlacklist: number;
  daysPurge: number;
  snapshotRetentionDays: number;
  snapshotKeepMinimum: number;
}): MinecraftConfigPayload {
  return {
    daysInactive: config.daysInactive,
    daysBlacklist: config.daysBlacklist,
    daysPurge: config.daysPurge,
    snapshotRetentionDays: config.snapshotRetentionDays,
    snapshotKeepMinimum: config.snapshotKeepMinimum,
  };
}
