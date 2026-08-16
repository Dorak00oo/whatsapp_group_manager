-- Ausente con causa: situación distinta de activo normal y de activo permanente.
ALTER TABLE "directory_members" ADD COLUMN "absent_with_cause" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "directory_members" ADD COLUMN "absent_reason" TEXT;
