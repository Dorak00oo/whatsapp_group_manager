-- Reloj de 7 días en Activos para quitar Ausente. Los que ya están
-- ausentes y activos arrancan desde ahora (no se les quita el tag al desplegar).
ALTER TABLE "directory_members" ADD COLUMN "absent_active_since" TIMESTAMP(3);

UPDATE "directory_members"
SET "absent_active_since" = CURRENT_TIMESTAMP
WHERE "absent_with_cause" = true
  AND "is_active" = true
  AND "left_at" IS NULL;
