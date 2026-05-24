-- Retención de historial en Neon (separado de days_purge del mundo Bedrock)
ALTER TABLE "minecraft_config" ADD COLUMN "snapshot_retention_days" INTEGER NOT NULL DEFAULT 45;
ALTER TABLE "minecraft_config" ADD COLUMN "snapshot_keep_minimum" INTEGER NOT NULL DEFAULT 10;
