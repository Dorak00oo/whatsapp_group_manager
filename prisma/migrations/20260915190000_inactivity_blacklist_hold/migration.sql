-- Hold de unban: el auto-ban por inactividad no vuelve a marcar hasta que el jugador entre.
ALTER TABLE "minecraft_players" ADD COLUMN "inactivity_blacklist_exempt_until_seen" BOOLEAN NOT NULL DEFAULT false;
