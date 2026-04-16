-- CreateTable
CREATE TABLE "minecraft_config" (
    "id" TEXT NOT NULL,
    "days_inactive" INTEGER NOT NULL DEFAULT 7,
    "days_blacklist" INTEGER NOT NULL DEFAULT 14,
    "days_purge" INTEGER NOT NULL DEFAULT 21,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "minecraft_config_pkey" PRIMARY KEY ("id")
);

-- Insert default config
INSERT INTO "minecraft_config" ("id", "days_inactive", "days_blacklist", "days_purge", "updated_at")
VALUES ('default', 7, 14, 21, CURRENT_TIMESTAMP);
