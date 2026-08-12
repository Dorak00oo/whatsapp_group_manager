-- Desglose por tipo en alertas de monitoreo
ALTER TABLE "minecraft_monitor_alerts"
  ADD COLUMN IF NOT EXISTS "counts_json" TEXT NOT NULL DEFAULT '{}';
