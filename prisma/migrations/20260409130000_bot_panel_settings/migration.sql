-- CreateTable
CREATE TABLE "bot_panel_settings" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_panel_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "bot_panel_settings" ("id", "data", "updated_at")
VALUES ('default', '{}', CURRENT_TIMESTAMP);
