-- CreateTable
CREATE TABLE "minecraft_installs" (
    "id" TEXT NOT NULL,
    "server_id" TEXT,
    "last_world_name" TEXT,
    "last_version" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "assigned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "minecraft_installs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "minecraft_installs_server_id_key" ON "minecraft_installs"("server_id");

-- AddForeignKey
ALTER TABLE "minecraft_installs" ADD CONSTRAINT "minecraft_installs_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "minecraft_servers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
