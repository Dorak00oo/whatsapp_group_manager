-- Cuentas del panel (gamertag + contraseña grupal), historial de cambios con
-- actor, protección de 5 días para altas nuevas e índices del directorio.

-- AlterTable: protección de nuevos (vence sola, sin job)
ALTER TABLE "directory_members" ADD COLUMN "permanently_active_until" TIMESTAMP(3);

-- Backfill: quien sigue en la comunidad y se dio de alta hace menos de 5 días
-- queda protegido hasta cumplir sus 5 días. Prisma guarda UTC sin zona.
UPDATE "directory_members"
SET "permanently_active_until" = "created_at" + interval '5 days'
WHERE "left_at" IS NULL
  AND "created_at" > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - interval '5 days';

-- CreateTable
CREATE TABLE "panel_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "panel_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: member_id sin FK para conservar eventos de miembros borrados
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_type" TEXT NOT NULL,
    "actor_gamertag" TEXT,
    "actor_phone" TEXT,
    "actor_name" TEXT,
    "action" TEXT NOT NULL,
    "member_id" TEXT,
    "member_gamertag" TEXT,
    "changes" JSONB,
    "details" JSONB,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "panel_accounts_member_id_key" ON "panel_accounts"("member_id");

-- CreateIndex
CREATE INDEX "panel_accounts_user_id_idx" ON "panel_accounts"("user_id");

-- CreateIndex
CREATE INDEX "audit_events_user_id_created_at_idx" ON "audit_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_member_id_created_at_idx" ON "audit_events"("member_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_actor_gamertag_idx" ON "audit_events"("actor_gamertag");

-- CreateIndex
CREATE INDEX "directory_members_user_id_left_at_is_active_idx" ON "directory_members"("user_id", "left_at", "is_active");

-- CreateIndex
CREATE INDEX "directory_members_user_id_gamertag_idx" ON "directory_members"("user_id", "gamertag");

-- CreateIndex
CREATE INDEX "directory_members_user_id_phone_idx" ON "directory_members"("user_id", "phone");

-- CreateIndex
CREATE INDEX "directory_members_user_id_created_at_idx" ON "directory_members"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "directory_members_whatsapp_username_idx" ON "directory_members"("whatsapp_username");

-- AddForeignKey
ALTER TABLE "panel_accounts" ADD CONSTRAINT "panel_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panel_accounts" ADD CONSTRAINT "panel_accounts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "directory_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
