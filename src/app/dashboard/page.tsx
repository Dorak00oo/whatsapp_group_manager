import { auth } from "@/auth";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import {
  HomeOverview,
  type HomeAlert,
  type HomeAuditItem,
  type HomeJoiner,
  type HomeWorld,
} from "@/components/home-overview";
import { describeAuditEvent } from "@/lib/audit-format";
import { reconcileDirectoryAbsentActive } from "@/lib/directory-absent-clock";
import {
  directoryHomeCountWhere,
  directoryListRedirectQuery,
  type DirectoryHomeCountKey,
} from "@/lib/directory-query";
import { formatInstant } from "@/lib/format-instant";
import { fetchHomeBotStatus, presentHomeBot } from "@/lib/home-bot-status";
import { formatAlertTypeBreakdown } from "@/lib/minecraft-monitor";
import { listActiveMonitorAlerts } from "@/lib/minecraft-monitor-alerts";
import {
  asOnlinePlayersQueueData,
  isOnlineRosterFresh,
  normalizeOnlinePlayerNames,
} from "@/lib/minecraft-online-players";
import { readMinecraftQueueRow } from "@/lib/minecraft-queue";
import {
  MINECRAFT_SERVER_DEFAULTS,
  MINECRAFT_SERVER_IDS,
  minecraftLinkStatus,
  minecraftLinkStatusLabel,
  parseMinecraftServerId,
  type MinecraftServerId,
} from "@/lib/minecraft-server";
import { listMinecraftServers } from "@/lib/minecraft-servers-db";
import { selectedMinecraftServerId } from "@/lib/minecraft-world";
import { requirePanelSession } from "@/lib/panel-session";
import { prisma } from "@/lib/prisma";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";
import { resolveDirectoryUserId } from "@/lib/resolve-directory-user";
import { resolveViewerClock } from "@/lib/resolve-viewer-clock";
import { redirect } from "next/navigation";

type Search = Record<string, string | string[] | undefined>;

async function readOnline(serverId: MinecraftServerId): Promise<{
  state: HomeWorld["playersState"];
  players: string[];
}> {
  try {
    const found = await readMinecraftQueueRow(serverId, "online_players");
    const data = asOnlinePlayersQueueData(found?.data);
    if (!isOnlineRosterFresh(data.reportedAt)) {
      return { state: "unknown", players: [] };
    }
    const players = normalizeOnlinePlayerNames(data.players);
    return {
      state: players.length === 0 ? "empty" : "online",
      players,
    };
  } catch {
    return { state: "unknown", players: [] };
  }
}

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const panel = await requirePanelSession();
  const clock = await resolveViewerClock(panel);
  const sp = await searchParams;
  const redirectQuery = directoryListRedirectQuery(sp);
  if (redirectQuery) redirect(`/dashboard/lista?${redirectQuery}`);

  const botPromise = fetchHomeBotStatus(2000);
  const now = new Date();

  try {
    const authSession = await auth();
    const userId =
      (await resolveDirectoryUserId(authSession)) ?? panel.userId;
    await reconcileDirectoryAbsentActive(userId);

    const countKeys: DirectoryHomeCountKey[] = [
      "active",
      "inactive",
      "new",
      "absent",
      "left",
    ];
    const selectedId = await selectedMinecraftServerId();

    const [countRows, protectedCount, servers, events, joiners, vanillaAlerts, modsAlerts, vanillaOnline, modsOnline] =
      await Promise.all([
        Promise.all(
          countKeys.map((key) =>
            prisma.directoryMember.count({
              where: directoryHomeCountWhere(userId, key, now),
            }),
          ),
        ),
        prisma.directoryMember.count({
          where: { userId, banExempt: true },
        }),
        listMinecraftServers(),
        prisma.auditEvent.findMany({
          where: { userId: panel.userId },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 8,
          select: {
            id: true,
            createdAt: true,
            actorType: true,
            actorGamertag: true,
            actorPhone: true,
            actorName: true,
            action: true,
            memberId: true,
            memberGamertag: true,
            changes: true,
            details: true,
          },
        }),
        prisma.directoryMember.findMany({
          where: { userId },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 5,
          select: {
            id: true,
            gamertag: true,
            displayName: true,
            createdAt: true,
            leftAt: true,
          },
        }),
        listActiveMonitorAlerts("vanilla"),
        listActiveMonitorAlerts("mods"),
        readOnline("vanilla"),
        readOnline("mods"),
      ]);

    const [active, inactive, newer, absent, left] = countRows;
    const byId = new Map(servers.map((server) => [server.id, server]));
    const onlineById = { vanilla: vanillaOnline, mods: modsOnline };
    const worlds: HomeWorld[] = MINECRAFT_SERVER_IDS.map((id) => {
      const row = byId.get(id);
      const parsed = parseMinecraftServerId(row?.id ?? id) ?? id;
      const status = minecraftLinkStatus(row?.lastSeenAt ?? null);
      const online = onlineById[id];
      return {
        id: parsed,
        name: row?.name?.trim() || MINECRAFT_SERVER_DEFAULTS[id].name,
        selected: parsed === selectedId,
        linkStatus: status,
        linkLabel: minecraftLinkStatusLabel(status),
        playersState: online.state,
        players: online.players,
      };
    });

    const worldName = (id: MinecraftServerId) =>
      worlds.find((world) => world.id === id)?.name ?? MINECRAFT_SERVER_DEFAULTS[id].name;

    const mergedAlerts = [
      ...vanillaAlerts.map((alert) => ({ ...alert, worldName: worldName("vanilla") })),
      ...modsAlerts.map((alert) => ({ ...alert, worldName: worldName("mods") })),
    ].sort((a, b) => b.lastEventAt.localeCompare(a.lastEventAt));

    const alerts: HomeAlert[] = mergedAlerts.slice(0, 8).map((alert) => {
      const summary = formatAlertTypeBreakdown(alert.counts).trim();
      return {
        id: alert.id,
        worldName: alert.worldName,
        gamertag: alert.gamertag,
        summary: summary || `${alert.eventCount} eventos`,
        timeLabel: formatInstant(new Date(alert.lastEventAt), clock.timeZone),
      };
    });

    const history: HomeAuditItem[] = events.map((event) => {
      return {
        id: event.id,
        iso: event.createdAt.toISOString(),
        timeLabel: formatInstant(event.createdAt, clock.timeZone),
        memberId: event.memberId,
        parts: describeAuditEvent(event).parts,
      };
    });

    const newest: HomeJoiner[] = joiners.map((member) => {
      const name = member.displayName?.trim();
      return {
        id: member.id,
        gamertag: member.gamertag,
        detail: member.leftAt ? "Se salió" : name || "En el directorio",
        timeLabel: formatInstant(member.createdAt, clock.timeZone),
      };
    });

    const commandWorld =
      worlds.find((world) => world.selected) ?? worlds[0];

    return (
      <HomeOverview
        counts={{
          active: active ?? 0,
          inactive: inactive ?? 0,
          newer: newer ?? 0,
          absent: absent ?? 0,
          protected: protectedCount,
          left: left ?? 0,
        }}
        bot={presentHomeBot(await botPromise)}
        worlds={worlds}
        newest={newest}
        alerts={alerts}
        alertTotal={mergedAlerts.length}
        alertsUnknown={false}
        events={history}
        originGamertag={panel.gamertag}
        commandWorldName={commandWorld?.name ?? MINECRAFT_SERVER_DEFAULTS[selectedId].name}
        commandWorldId={commandWorld?.id ?? selectedId}
      />
    );
  } catch (error) {
    if (isDatabaseUnreachableError(error)) {
      return <DatabaseUnavailable />;
    }
    throw error;
  }
}
