-- Cola de sync Minecraft (antes fila en bot_panel_settings)
CREATE TABLE "minecraft_sync_queue" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "minecraft_sync_queue_pkey" PRIMARY KEY ("id")
);

INSERT INTO "minecraft_sync_queue" ("id", "data", "updated_at")
SELECT "id", "data", "updated_at"
FROM "bot_panel_settings"
WHERE "id" = 'minecraft_sync_request';

DROP TABLE "bot_panel_settings";
