-- Admins, protegidos (sin ban), y marca de "se salió"
ALTER TABLE "directory_members" ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "directory_members" ADD COLUMN "ban_exempt" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "directory_members" ADD COLUMN "left_at" TIMESTAMP(3);
