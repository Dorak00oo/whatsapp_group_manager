import { auth } from "@/auth";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { MinecraftPlayersSection } from "@/components/minecraft-players-section";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";

export default async function MinecraftPage() {
  const session = await auth();
  if (!session?.user) return null;

  let players: Awaited<ReturnType<typeof prisma.minecraftPlayer.findMany>>;
  let lastSnapshot: Awaited<
    ReturnType<typeof prisma.minecraftSnapshot.findFirst>
  > | null;
  let config: Awaited<
    ReturnType<typeof prisma.minecraftConfig.findUnique>
  > | null;

  try {
    [players, lastSnapshot, config] = await Promise.all([
      prisma.minecraftPlayer.findMany({
        orderBy: { lastSeen: "desc" },
      }),
      prisma.minecraftSnapshot.findFirst({
        orderBy: { timestamp: "desc" },
      }),
      prisma.minecraftConfig.findUnique({
        where: { id: "default" },
      }),
    ]);
  } catch (e) {
    if (isDatabaseUnreachableError(e)) {
      return <DatabaseUnavailable />;
    }
    throw e;
  }

  const activePlayers = players.filter((p) => p.active);
  const inactivePlayers = players.filter((p) => !p.active);
  const blacklisted = players.filter((p) => p.isBlacklisted);
  const whitelisted = players.filter((p) => p.isWhitelisted);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Jugadores de Minecraft
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Estado de actividad de jugadores del servidor de Minecraft.
        </p>
      </div>

      {lastSnapshot && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Resumen del servidor
            </h3>
            <span className="text-xs text-zinc-500">
              Última actualización:{" "}
              {new Date(lastSnapshot.timestamp).toLocaleString("es-ES")}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-800">
              <p className="text-xs text-zinc-500">Total</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {lastSnapshot.totalPlayers}
              </p>
            </div>
            <div className="rounded-md bg-green-50 p-3 dark:bg-green-950">
              <p className="text-xs text-green-700 dark:text-green-400">
                Activos
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-50">
                {lastSnapshot.activePlayers}
              </p>
            </div>
            <div className="rounded-md bg-amber-50 p-3 dark:bg-amber-950">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Inactivos
              </p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-50">
                {lastSnapshot.inactivePlayers}
              </p>
            </div>
            <div className="rounded-md bg-red-50 p-3 dark:bg-red-950">
              <p className="text-xs text-red-700 dark:text-red-400">
                Blacklist
              </p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-50">
                {blacklisted.length}
              </p>
            </div>
          </div>
        </div>
      )}

      <MinecraftPlayersSection
        players={players.map((p) => ({
          id: p.id,
          gamertag: p.gamertag,
          lastSeen: p.lastSeen.toISOString(),
          active: p.active,
          daysInactive: p.daysInactive,
          isBlacklisted: p.isBlacklisted,
          isWhitelisted: p.isWhitelisted,
          createdAt: p.createdAt.toISOString(),
        }))}
        activePlayers={activePlayers.length}
        inactivePlayers={inactivePlayers.length}
        blacklisted={blacklisted.length}
        whitelisted={whitelisted.length}
        config={
          config
            ? {
                daysInactive: config.daysInactive,
                daysBlacklist: config.daysBlacklist,
                daysPurge: config.daysPurge,
              }
            : { daysInactive: 7, daysBlacklist: 14, daysPurge: 21 }
        }
      />
    </section>
  );
}
