-- Monitor events + editable exclude list on config
ALTER TABLE "minecraft_config" ADD COLUMN IF NOT EXISTS "monitor_exclude_json" TEXT;

CREATE TABLE IF NOT EXISTS "minecraft_monitor_events" (
    "id" TEXT NOT NULL,
    "gamertag" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "pos_x" INTEGER,
    "pos_y" INTEGER,
    "pos_z" INTEGER,
    "dimension" TEXT DEFAULT 'overworld',
    "block_type" TEXT,
    "item_type" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "fire_id" TEXT,
    "related_fire_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "minecraft_monitor_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "minecraft_monitor_events_occurred_at_idx" ON "minecraft_monitor_events"("occurred_at" DESC);
CREATE INDEX IF NOT EXISTS "minecraft_monitor_events_gamertag_idx" ON "minecraft_monitor_events"("gamertag");
CREATE INDEX IF NOT EXISTS "minecraft_monitor_events_event_type_idx" ON "minecraft_monitor_events"("event_type");
CREATE INDEX IF NOT EXISTS "minecraft_monitor_events_block_type_idx" ON "minecraft_monitor_events"("block_type");
CREATE INDEX IF NOT EXISTS "minecraft_monitor_events_fire_id_idx" ON "minecraft_monitor_events"("fire_id");
