import { auth } from "@/auth";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { DirectoryAllowlistExport } from "@/components/directory-allowlist-export";
import { DirectoryMinecraftActiveCompare } from "@/components/directory-minecraft-active-compare";
import { GamertagAuditPanel } from "@/components/gamertag-audit-panel";
import { PlayerAdminStrikePanel } from "@/components/player-admin-strike-panel";
import { buildActiveCompareData } from "@/lib/directory-minecraft-compare";
import {
  STRIKE_KIND_DEFINITIVE,
  STRIKE_KIND_PENDING,
} from "@/lib/directory-strikes";
import { formatInstantMexicoColombia } from "@/lib/format-time-mx-co";
import {
  buildRosterFromSnapshot,
  snapshotStatusByGamertag,
} from "@/lib/minecraft-active";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";
import { getSelectedMinecraftServerId } from "@/lib/minecraft-selected-world";
import { prisma } from "@/lib/prisma";
import { resolveDirectoryUserId } from "@/lib/resolve-directory-user";

export default async function DashboardAdministracionPage() {
  const session = await auth();
  if (!session?.user) return null;

  let userId: string | null;
  try {
    userId = await resolveDirectoryUserId(session);
  } catch (e) {
    if (isDatabaseUnreachableError(e)) {
      return <DatabaseUnavailable />;
    }
    throw e;
  }
  if (!userId) return null;

  let compareData;
  let snapshotAt: string | null = null;
  let activeCount = 0;
  let selectedWorld: Awaited<ReturnType<typeof getSelectedMinecraftServerId>> =
    "vanilla";
  let rosterMembers: Awaited<
    ReturnType<
      typeof prisma.directoryMember.findMany<{
        select: {
          id: true;
          gamertag: true;
          displayName: true;
          active: true;
          leftAt: true;
          strikes: { select: { id: true; kind: true; reason: true; createdAt: true } };
        };
      }>
    >
  > = [];

  try {
    const serverId = await getSelectedMinecraftServerId();
    selectedWorld = serverId;
    const [waMembers, mcPlayers, lastSnapshot, config] = await Promise.all([
      prisma.directoryMember.findMany({
        where: { userId },
        select: {
          id: true,
          gamertag: true,
          displayName: true,
          active: true,
          leftAt: true,
          strikes: {
            orderBy: { createdAt: "asc" },
            select: { id: true, kind: true, reason: true, createdAt: true },
          },
        },
        orderBy: { gamertag: "asc" },
      }),
      prisma.minecraftPlayer.findMany({
        where: { serverId },
        orderBy: { lastSeen: "desc" },
      }),
      prisma.minecraftSnapshot.findFirst({
        where: { serverId },
        orderBy: { timestamp: "desc" },
      }),
      prisma.minecraftConfig.findUnique({
        where: { id: serverId },
      }),
    ]);

    rosterMembers = waMembers;

    const daysInactiveThreshold = config?.daysInactive ?? 7;
    const snapshotByTag = snapshotStatusByGamertag(lastSnapshot?.data);
    const displayPlayers = buildRosterFromSnapshot(
      mcPlayers,
      snapshotByTag,
      daysInactiveThreshold,
    );

    compareData = buildActiveCompareData(waMembers, displayPlayers);
    snapshotAt = lastSnapshot
      ? formatInstantMexicoColombia(lastSnapshot.timestamp).mexico
      : null;
    activeCount = waMembers.filter(
      (m) => m.active && m.leftAt == null,
    ).length;
  } catch (e) {
    if (isDatabaseUnreachableError(e)) {
      return <DatabaseUnavailable />;
    }
    throw e;
  }

  const playerAdminMembers = rosterMembers.map((m) => ({
    id: m.id,
    gamertag: m.gamertag,
    displayName: m.displayName,
    active: m.active,
    leftAt: m.leftAt?.toISOString() ?? null,
    strikes: m.strikes.map((s) => ({
      id: s.id,
      kind: s.kind === STRIKE_KIND_DEFINITIVE ? STRIKE_KIND_DEFINITIVE : STRIKE_KIND_PENDING,
      reason: s.reason,
      createdAt: s.createdAt.toISOString(),
    })),
  }));

  return (
    <section className="flex flex-col gap-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Panel administración
        </p>
        <h2 className="mt-0.5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Administración de los usuarios
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Administración de jugadores, allowlist, auditoría de gamertags y
          comparación con Minecraft.
        </p>
      </div>

      <PlayerAdminStrikePanel members={playerAdminMembers} />

      <GamertagAuditPanel />

      <DirectoryMinecraftActiveCompare
        key={selectedWorld}
        data={compareData}
        snapshotAt={snapshotAt}
      />

      <DirectoryAllowlistExport activeCount={activeCount} />
    </section>
  );
}
