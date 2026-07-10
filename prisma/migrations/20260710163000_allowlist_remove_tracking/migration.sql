-- Evitar re-intentar allowlist remove/add: estado por miembro y bajas tras borrar ficha.
ALTER TABLE "directory_members" ADD COLUMN "allowlist_removed_at" TIMESTAMP(3);

CREATE TABLE "pending_allowlist_removals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gamertag" TEXT NOT NULL,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_allowlist_removals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pending_allowlist_removals_user_id_synced_at_idx" ON "pending_allowlist_removals"("user_id", "synced_at");

-- Miembros inactivos/salidos que ya estaban en allowlist: encolar baja una sola vez.
INSERT INTO "pending_allowlist_removals" ("id", "user_id", "gamertag", "created_at")
SELECT 'pr_' || dm."id", dm."user_id", dm."gamertag", NOW()
FROM "directory_members" dm
WHERE NOT (dm."is_active" = true AND dm."left_at" IS NULL)
  AND dm."allowlist_synced_at" IS NOT NULL
  AND dm."allowlist_removed_at" IS NULL;
