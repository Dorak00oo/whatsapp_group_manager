import type { PrismaClient } from "@/generated/prisma";

/** Mes y medio ≈ 45 días (histórico en Neon). */
export const DEFAULT_SNAPSHOT_RETENTION_DAYS = 45;

/** Siempre conservar al menos los N snapshots más recientes. */
export const DEFAULT_SNAPSHOT_KEEP_MINIMUM = 10;

export type SnapshotPurgeConfig = {
  snapshotRetentionDays: number;
  snapshotKeepMinimum: number;
};

export function resolveSnapshotPurgeConfig(
  config: Partial<SnapshotPurgeConfig> | null | undefined,
): SnapshotPurgeConfig {
  const retention =
    typeof config?.snapshotRetentionDays === "number" &&
    config.snapshotRetentionDays > 0
      ? config.snapshotRetentionDays
      : DEFAULT_SNAPSHOT_RETENTION_DAYS;
  const keepMinimum =
    typeof config?.snapshotKeepMinimum === "number" &&
    config.snapshotKeepMinimum > 0
      ? config.snapshotKeepMinimum
      : DEFAULT_SNAPSHOT_KEEP_MINIMUM;
  return {
    snapshotRetentionDays: retention,
    snapshotKeepMinimum: keepMinimum,
  };
}

/**
 * Borra snapshots en Neon más viejos que `snapshotRetentionDays`, excepto los
 * `snapshotKeepMinimum` más recientes (por timestamp).
 */
export async function purgeOldMinecraftSnapshots(
  db: PrismaClient,
  config?: Partial<SnapshotPurgeConfig> | null,
): Promise<{ deleted: number }> {
  const { snapshotRetentionDays, snapshotKeepMinimum } =
    resolveSnapshotPurgeConfig(config);

  const protectedRows = await db.minecraftSnapshot.findMany({
    orderBy: { timestamp: "desc" },
    take: snapshotKeepMinimum,
    select: { id: true },
  });
  const protectedIds = protectedRows.map((r) => r.id);

  if (protectedIds.length === 0) {
    return { deleted: 0 };
  }

  const cutoff = new Date(
    Date.now() - snapshotRetentionDays * 24 * 60 * 60 * 1000,
  );

  const result = await db.minecraftSnapshot.deleteMany({
    where: {
      timestamp: { lt: cutoff },
      id: { notIn: protectedIds },
    },
  });

  return { deleted: result.count };
}
