-- Edad opcional; notas que eran solo la edad pasan a la columna.
ALTER TABLE "directory_members" ADD COLUMN "age" INTEGER;
ALTER TABLE "directory_members" ADD CONSTRAINT "directory_members_age_range"
  CHECK ("age" IS NULL OR ("age" >= 1 AND "age" <= 99));

UPDATE "directory_members"
SET
  "age" = CAST(substring(trim("notes") from '^[1-9][0-9]?') AS INTEGER),
  "notes" = NULL
WHERE "notes" IS NOT NULL
  AND trim("notes") ~* '^[1-9][0-9]?\s*(años|anos)?$';
