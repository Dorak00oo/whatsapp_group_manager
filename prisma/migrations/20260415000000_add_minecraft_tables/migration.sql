-- CreateTable
CREATE TABLE "minecraft_players" (
    "id" TEXT NOT NULL,
    "gamertag" TEXT NOT NULL,
    "last_seen" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "days_inactive" INTEGER NOT NULL DEFAULT 0,
    "is_blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "is_whitelisted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "minecraft_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "minecraft_snapshots" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_players" INTEGER NOT NULL,
    "active_players" INTEGER NOT NULL,
    "inactive_players" INTEGER NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "minecraft_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "minecraft_players_gamertag_key" ON "minecraft_players"("gamertag");

-- CreateIndex
CREATE INDEX "minecraft_snapshots_timestamp_idx" ON "minecraft_snapshots"("timestamp");
