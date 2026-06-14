-- Agrega block_type opcional a minecraft_parcel_events
-- Se usa para registrar qué tipo de contenedor se abrió (chest_open events)
ALTER TABLE "minecraft_parcel_events"
  ADD COLUMN IF NOT EXISTS "block_type" VARCHAR(64);
