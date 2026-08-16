-- Objetos baneados + varias parcelas monitoreadas.
ALTER TABLE "minecraft_config" ADD COLUMN "banned_items_json" TEXT;

CREATE TABLE "minecraft_parcels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Parcela',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "dimension" TEXT NOT NULL DEFAULT 'overworld',
    "min_x" INTEGER NOT NULL DEFAULT 0,
    "min_y" INTEGER NOT NULL DEFAULT 64,
    "min_z" INTEGER NOT NULL DEFAULT 0,
    "max_x" INTEGER NOT NULL DEFAULT 15,
    "max_y" INTEGER NOT NULL DEFAULT 79,
    "max_z" INTEGER NOT NULL DEFAULT 15,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "minecraft_parcels_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "minecraft_parcels_is_primary_idx" ON "minecraft_parcels"("is_primary");

CREATE UNIQUE INDEX "minecraft_parcels_one_primary" ON "minecraft_parcels" ("is_primary") WHERE "is_primary" = true;

INSERT INTO "minecraft_parcels" (
    "id", "name", "enabled", "dimension",
    "min_x", "min_y", "min_z", "max_x", "max_y", "max_z",
    "is_primary", "created_at", "updated_at"
)
SELECT
    'primary',
    COALESCE(NULLIF(TRIM("parcel_name"), ''), 'Parcela'),
    "parcel_enabled",
    COALESCE(NULLIF(TRIM("parcel_dimension"), ''), 'overworld'),
    "parcel_min_x",
    "parcel_min_y",
    "parcel_min_z",
    "parcel_max_x",
    "parcel_max_y",
    "parcel_max_z",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "minecraft_config"
WHERE "id" = 'default'
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "minecraft_parcels" (
    "id", "name", "enabled", "dimension",
    "min_x", "min_y", "min_z", "max_x", "max_y", "max_z",
    "is_primary", "created_at", "updated_at"
)
VALUES (
    'primary', 'Parcela', false, 'overworld',
    0, 64, 0, 15, 79, 15,
    true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "minecraft_parcel_events" ADD COLUMN "parcel_id" TEXT;

UPDATE "minecraft_parcel_events"
SET "parcel_id" = 'primary'
WHERE "parcel_id" IS NULL;

ALTER TABLE "minecraft_parcel_events" ALTER COLUMN "parcel_id" SET NOT NULL;

CREATE INDEX "minecraft_parcel_events_parcel_id_idx" ON "minecraft_parcel_events"("parcel_id");

ALTER TABLE "minecraft_parcel_events"
ADD CONSTRAINT "minecraft_parcel_events_parcel_id_fkey"
FOREIGN KEY ("parcel_id") REFERENCES "minecraft_parcels"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
