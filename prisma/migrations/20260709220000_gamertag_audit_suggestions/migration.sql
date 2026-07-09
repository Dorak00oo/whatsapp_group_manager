-- CreateTable
CREATE TABLE "gamertag_audit_suggestions" (
    "id" TEXT NOT NULL,
    "directory_member_id" TEXT NOT NULL,
    "minecraft_player_id" TEXT NOT NULL,
    "current_gamertag" TEXT NOT NULL,
    "suggested_gamertag" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamertag_audit_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gamertag_audit_suggestions_status_idx" ON "gamertag_audit_suggestions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "gamertag_audit_suggestions_member_player_key" ON "gamertag_audit_suggestions"("directory_member_id", "minecraft_player_id");

-- AddForeignKey
ALTER TABLE "gamertag_audit_suggestions" ADD CONSTRAINT "gamertag_audit_suggestions_directory_member_id_fkey" FOREIGN KEY ("directory_member_id") REFERENCES "directory_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamertag_audit_suggestions" ADD CONSTRAINT "gamertag_audit_suggestions_minecraft_player_id_fkey" FOREIGN KEY ("minecraft_player_id") REFERENCES "minecraft_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
