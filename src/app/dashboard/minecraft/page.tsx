import { auth } from "@/auth";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { MinecraftPlayersSection } from "@/components/minecraft-players-section";
import { formatInstantMexicoColombia } from "@/lib/format-time-mx-co";
import {
  buildRosterFromSnapshot,
  playersOnAccessLists,
  snapshotStatusByGamertag,
} from "@/lib/minecraft-active";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";
import {
  MINECRAFT_CONFIG_DEFAULTS,
} from "@/lib/minecraft-config-defaults";
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

  const daysInactiveThreshold =
    config?.daysInactive ?? 7;
  const snapshotByTag = snapshotStatusByGamertag(lastSnapshot?.data);

  const displayPlayers = buildRosterFromSnapshot(
    players,
    snapshotByTag,
    daysInactiveThreshold,
  );

  const rosterByTag = new Map(
    displayPlayers.map((p) => [p.gamertag.toLowerCase(), p] as const),
  );
  const withLiveStats = players.map(
    (p) => rosterByTag.get(p.gamertag.toLowerCase()) ?? p,
  );
  const accessLists = playersOnAccessLists(withLiveStats);

  const activeCount = displayPlayers.filter((p) => p.active).length;
  const inactiveCount = displayPlayers.filter((p) => !p.active).length;
  const blacklistedCount = accessLists.blacklist.length;

  const summaryTotal =
    lastSnapshot?.totalPlayers ?? displayPlayers.length;
  const summaryActive =
    lastSnapshot?.activePlayers ?? activeCount;
  const summaryInactive =
    lastSnapshot?.inactivePlayers ?? inactiveCount;

  const lastUpdateZones = lastSnapshot
    ? formatInstantMexicoColombia(lastSnapshot.timestamp)
    : null;

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

      <MinecraftPlayersSection
        players={displayPlayers.map(toClientMinecraftPlayer)}
        blacklistPlayers={accessLists.blacklist.map(toClientMinecraftPlayer)}
        whitelistPlayers={accessLists.whitelist.map(toClientMinecraftPlayer)}
        activePlayers={activeCount}
        inactivePlayers={inactiveCount}
        summary={
          lastSnapshot
            ? {
                total: summaryTotal,
                active: summaryActive,
                inactive: summaryInactive,
                blacklisted: blacklistedCount,
                lastUpdate: lastUpdateZones,
              }
            : null
        }
        config={
          config
            ? {
                daysInactive: config.daysInactive,
                daysBlacklist: config.daysBlacklist,
                daysPurge: config.daysPurge,
                snapshotRetentionDays: config.snapshotRetentionDays,
                snapshotKeepMinimum: config.snapshotKeepMinimum,
              }
            : {
                daysInactive: MINECRAFT_CONFIG_DEFAULTS.daysInactive,
                daysBlacklist: MINECRAFT_CONFIG_DEFAULTS.daysBlacklist,
                daysPurge: MINECRAFT_CONFIG_DEFAULTS.daysPurge,
                snapshotRetentionDays:
                  MINECRAFT_CONFIG_DEFAULTS.snapshotRetentionDays,
                snapshotKeepMinimum:
                  MINECRAFT_CONFIG_DEFAULTS.snapshotKeepMinimum,
              }
        }
      />
    </section>
  );
}

function toClientMinecraftPlayer(p: {
  id: string;
  gamertag: string;
  lastSeen: Date;
  active: boolean;
  daysInactive: number;
  isBlacklisted: boolean;
  isWhitelisted: boolean;
  createdAt: Date;
}) {
  return {
    id: p.id,
    gamertag: p.gamertag,
    lastSeen: p.lastSeen.toISOString(),
    active: p.active,
    daysInactive: p.daysInactive,
    isBlacklisted: p.isBlacklisted,
    isWhitelisted: p.isWhitelisted,
    createdAt: p.createdAt.toISOString(),
  };
}
