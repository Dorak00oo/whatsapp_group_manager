-- AlterTable
ALTER TABLE "directory_members" ADD COLUMN "phone_country" TEXT;
ALTER TABLE "directory_members" ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "directory_members" ADD COLUMN "banned_reason" TEXT;

-- CreateTable
CREATE TABLE "directory_strikes" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "directory_strikes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "directory_strikes_member_id_idx" ON "directory_strikes"("member_id");

-- AddForeignKey
ALTER TABLE "directory_strikes" ADD CONSTRAINT "directory_strikes_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "directory_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
