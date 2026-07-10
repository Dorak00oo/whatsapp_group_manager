-- Activo permanente (no bajar a inactivo por sync de Minecraft), alta manual en allowlist y anti-re-add.
ALTER TABLE "directory_members" ADD COLUMN "permanently_active" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "directory_members" ADD COLUMN "active_hold_from_mc" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "directory_members" ADD COLUMN "allowlist_add_pending" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "directory_members" ADD COLUMN "allowlist_synced_at" TIMESTAMP(3);
