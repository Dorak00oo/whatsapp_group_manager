-- Dos mundos Bedrock (vanilla / mods): identidad, server_id, colas prefijadas.

CREATE TABLE "minecraft_servers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flavor" TEXT NOT NULL,
    "edition" TEXT NOT NULL DEFAULT 'bedrock',
    "last_seen_at" TIMESTAMP(3),
    "last_version" TEXT,
    "last_world_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "minecraft_servers_pkey" PRIMARY KEY ("id")
);

INSERT INTO "minecraft_servers" ("id", "name", "flavor", "edition", "created_at", "updated_at")
VALUES
    ('vanilla', 'Vanilla', 'vanilla', 'bedrock', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('mods', 'Mods', 'mods', 'bedrock', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Jugadores: unique pasa a (server_id, gamertag)
ALTER TABLE "minecraft_players" ADD COLUMN "server_id" TEXT NOT NULL DEFAULT 'vanilla';
DROP INDEX IF EXISTS "minecraft_players_gamertag_key";
CREATE UNIQUE INDEX "minecraft_players_server_id_gamertag_key" ON "minecraft_players"("server_id", "gamertag");
CREATE INDEX "minecraft_players_server_id_last_seen_idx" ON "minecraft_players"("server_id", "last_seen");

ALTER TABLE "minecraft_snapshots" ADD COLUMN "server_id" TEXT NOT NULL DEFAULT 'vanilla';
CREATE INDEX "minecraft_snapshots_server_id_timestamp_idx" ON "minecraft_snapshots"("server_id", "timestamp");

-- Config: default → vanilla; fila nueva para mods
UPDATE "minecraft_config" SET "id" = 'vanilla' WHERE "id" = 'default';

INSERT INTO "minecraft_config" (
    "id",
    "days_inactive",
    "days_blacklist",
    "days_purge",
    "snapshot_retention_days",
    "snapshot_keep_minimum",
    "parcel_enabled",
    "parcel_name",
    "parcel_dimension",
    "parcel_min_x",
    "parcel_min_y",
    "parcel_min_z",
    "parcel_max_x",
    "parcel_max_y",
    "parcel_max_z",
    "monitor_exclude_json",
    "banned_items_json",
    "updated_at"
)
SELECT
    'mods',
    7, 14, 21, 45, 10,
    false, 'Parcela', 'overworld',
    0, 64, 0, 15, 79, 15,
    NULL, NULL,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "minecraft_config" WHERE "id" = 'mods');

ALTER TABLE "minecraft_parcels" ADD COLUMN "server_id" TEXT NOT NULL DEFAULT 'vanilla';
DROP INDEX IF EXISTS "minecraft_parcels_one_primary";
CREATE INDEX "minecraft_parcels_server_id_idx" ON "minecraft_parcels"("server_id");
CREATE INDEX "minecraft_parcels_server_id_is_primary_idx" ON "minecraft_parcels"("server_id", "is_primary");

INSERT INTO "minecraft_parcels" (
    "id", "server_id", "name", "enabled", "dimension",
    "min_x", "min_y", "min_z", "max_x", "max_y", "max_z",
    "is_primary", "created_at", "updated_at"
)
VALUES (
    'mods:primary', 'mods', 'Parcela', false, 'overworld',
    0, 64, 0, 15, 79, 15,
    true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "minecraft_monitor_events" ADD COLUMN "server_id" TEXT NOT NULL DEFAULT 'vanilla';
CREATE INDEX "minecraft_monitor_events_server_id_occurred_at_idx" ON "minecraft_monitor_events"("server_id", "occurred_at" DESC);

ALTER TABLE "minecraft_monitor_alerts" ADD COLUMN "server_id" TEXT NOT NULL DEFAULT 'vanilla';
CREATE INDEX "minecraft_monitor_alerts_server_id_gamertag_key_dismissed_at_idx"
    ON "minecraft_monitor_alerts"("server_id", "gamertag_key", "dismissed_at");

ALTER TABLE "pending_allowlist_removals" ADD COLUMN "server_id" TEXT NOT NULL DEFAULT 'vanilla';
CREATE INDEX "pending_allowlist_removals_user_id_server_id_synced_at_idx"
    ON "pending_allowlist_removals"("user_id", "server_id", "synced_at");

ALTER TABLE "pending_gamertag_corrections" ADD COLUMN "server_id" TEXT NOT NULL DEFAULT 'vanilla';
CREATE INDEX "pending_gamertag_corrections_server_id_synced_at_idx"
    ON "pending_gamertag_corrections"("server_id", "synced_at");

-- Colas legacy → vanilla:*
UPDATE "minecraft_sync_queue" SET "id" = 'vanilla:minecraft_sync_request' WHERE "id" = 'minecraft_sync_request';
UPDATE "minecraft_sync_queue" SET "id" = 'vanilla:online_players' WHERE "id" = 'online_players';
UPDATE "minecraft_sync_queue" SET "id" = 'vanilla:panel_remote_cmd' WHERE "id" = 'panel_remote_cmd';

ALTER TABLE "minecraft_players"
    ADD CONSTRAINT "minecraft_players_server_id_fkey"
    FOREIGN KEY ("server_id") REFERENCES "minecraft_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "minecraft_snapshots"
    ADD CONSTRAINT "minecraft_snapshots_server_id_fkey"
    FOREIGN KEY ("server_id") REFERENCES "minecraft_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "minecraft_config"
    ADD CONSTRAINT "minecraft_config_id_fkey"
    FOREIGN KEY ("id") REFERENCES "minecraft_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "minecraft_parcels"
    ADD CONSTRAINT "minecraft_parcels_server_id_fkey"
    FOREIGN KEY ("server_id") REFERENCES "minecraft_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "minecraft_monitor_events"
    ADD CONSTRAINT "minecraft_monitor_events_server_id_fkey"
    FOREIGN KEY ("server_id") REFERENCES "minecraft_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "minecraft_monitor_alerts"
    ADD CONSTRAINT "minecraft_monitor_alerts_server_id_fkey"
    FOREIGN KEY ("server_id") REFERENCES "minecraft_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pending_allowlist_removals"
    ADD CONSTRAINT "pending_allowlist_removals_server_id_fkey"
    FOREIGN KEY ("server_id") REFERENCES "minecraft_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pending_gamertag_corrections"
    ADD CONSTRAINT "pending_gamertag_corrections_server_id_fkey"
    FOREIGN KEY ("server_id") REFERENCES "minecraft_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
