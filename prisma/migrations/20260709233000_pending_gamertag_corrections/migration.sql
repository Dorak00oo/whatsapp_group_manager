-- AlterTable: la columna se reemplaza por la tabla genérica de correcciones pendientes
ALTER TABLE "gamertag_audit_suggestions" DROP COLUMN "allowlist_synced_at";

-- CreateTable
CREATE TABLE "pending_gamertag_corrections" (
    "id" TEXT NOT NULL,
    "directory_member_id" TEXT NOT NULL,
    "old_gamertag" TEXT NOT NULL,
    "new_gamertag" TEXT NOT NULL,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_gamertag_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pending_gamertag_corrections_synced_at_idx" ON "pending_gamertag_corrections"("synced_at");

-- AddForeignKey
ALTER TABLE "pending_gamertag_corrections" ADD CONSTRAINT "pending_gamertag_corrections_directory_member_id_fkey" FOREIGN KEY ("directory_member_id") REFERENCES "directory_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
