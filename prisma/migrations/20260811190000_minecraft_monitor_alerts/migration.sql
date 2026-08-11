-- Alertas de vandalismo del monitoreo (7 días / descartar manual)
CREATE TABLE IF NOT EXISTS "minecraft_monitor_alerts" (
    "id" TEXT NOT NULL,
    "gamertag" TEXT NOT NULL,
    "gamertag_key" TEXT NOT NULL,
    "event_count" INTEGER NOT NULL DEFAULT 0,
    "wither_count" INTEGER NOT NULL DEFAULT 0,
    "window_start" TIMESTAMP(3) NOT NULL,
    "last_event_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "dismissed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "minecraft_monitor_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "minecraft_monitor_alerts_gamertag_key_dismissed_at_idx"
  ON "minecraft_monitor_alerts"("gamertag_key", "dismissed_at");
CREATE INDEX IF NOT EXISTS "minecraft_monitor_alerts_expires_at_idx"
  ON "minecraft_monitor_alerts"("expires_at");
CREATE INDEX IF NOT EXISTS "minecraft_monitor_alerts_last_event_at_idx"
  ON "minecraft_monitor_alerts"("last_event_at" DESC);
