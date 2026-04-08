-- CreateTable
CREATE TABLE "directory_members" (
    "id" TEXT NOT NULL,
    "gamertag" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "notes" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "directory_members_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "directory_members" ADD CONSTRAINT "directory_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
