-- Parcela única: límites en minecraft_config + historial de entradas/salidas
ALTER TABLE "minecraft_config" ADD COLUMN "parcel_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "minecraft_config" ADD COLUMN "parcel_name" TEXT NOT NULL DEFAULT 'Parcela';
ALTER TABLE "minecraft_config" ADD COLUMN "parcel_dimension" TEXT NOT NULL DEFAULT 'overworld';
ALTER TABLE "minecraft_config" ADD COLUMN "parcel_min_x" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "minecraft_config" ADD COLUMN "parcel_min_y" INTEGER NOT NULL DEFAULT 64;
ALTER TABLE "minecraft_config" ADD COLUMN "parcel_min_z" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "minecraft_config" ADD COLUMN "parcel_size_x" INTEGER NOT NULL DEFAULT 16;
ALTER TABLE "minecraft_config" ADD COLUMN "parcel_size_y" INTEGER NOT NULL DEFAULT 16;
ALTER TABLE "minecraft_config" ADD COLUMN "parcel_size_z" INTEGER NOT NULL DEFAULT 16;

CREATE TABLE "minecraft_parcel_events" (
    "id" TEXT NOT NULL,
    "gamertag" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "pos_x" INTEGER,
    "pos_y" INTEGER,
    "pos_z" INTEGER,
    "dimension" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "minecraft_parcel_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "minecraft_parcel_events_occurred_at_idx" ON "minecraft_parcel_events"("occurred_at" DESC);
CREATE INDEX "minecraft_parcel_events_gamertag_idx" ON "minecraft_parcel_events"("gamertag");
