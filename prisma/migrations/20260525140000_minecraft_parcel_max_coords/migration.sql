-- Parcela: esquina mínima + esquina máxima (en lugar de tamaño)
ALTER TABLE "minecraft_config" ADD COLUMN "parcel_max_x" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "minecraft_config" ADD COLUMN "parcel_max_y" INTEGER NOT NULL DEFAULT 79;
ALTER TABLE "minecraft_config" ADD COLUMN "parcel_max_z" INTEGER NOT NULL DEFAULT 15;

UPDATE "minecraft_config"
SET
  "parcel_max_x" = "parcel_min_x" + "parcel_size_x" - 1,
  "parcel_max_y" = "parcel_min_y" + "parcel_size_y" - 1,
  "parcel_max_z" = "parcel_min_z" + "parcel_size_z" - 1;

ALTER TABLE "minecraft_config" DROP COLUMN "parcel_size_x";
ALTER TABLE "minecraft_config" DROP COLUMN "parcel_size_y";
ALTER TABLE "minecraft_config" DROP COLUMN "parcel_size_z";
