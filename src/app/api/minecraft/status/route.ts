import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { isActiveByDaysInactive } from "@/lib/minecraft-active";
import { requireMinecraftAddon } from "@/lib/minecraft-api-context";
import { syncDirectoryActiveWithMinecraft } from "@/lib/minecraft-directory-sync";
import { ensureMinecraftConfig } from "@/lib/minecraft-servers-db";
import { purgeOldMinecraftSnapshots } from "@/lib/minecraft-snapshot-purge";

export const runtime = "nodejs";

type MinecraftStatusPayload = {
  timestamp: number;
  serverId?: unknown;
  flavor?: unknown;
  serverInfo: {
    totalPlayers: number;
    activePlayers: number;
    inactivePlayers: number;
  };
  players: Array<{
    name: string;
    lastSeen: number;
    lastSeenDate: string;
    active: boolean;
    daysInactive: number;
    isBlacklisted: boolean;
    isWhitelisted: boolean;
  }>;
  blacklist: string[];
  whitelist: string[];
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Evita que un POST de estado con blacklist/WL “viejas” (o en cola antes del
 * próximo poll del addon) borre un Unban/Un-WL recién hecho en el panel.
 * Margen amplio por posible desfase de reloj entre BD y el mundo Bedrock.
 */
const PANEL_LIST_PRIORITY_MS = 60_000;

function snapshotDateFromPayload(timestamp: unknown): Date {
  const n =
    typeof timestamp === "number"
      ? timestamp
      : typeof timestamp === "string"
        ? Number(timestamp)
        : NaN;
  if (!Number.isFinite(n)) return new Date();
  return new Date(n < 1_000_000_000_000 ? n * 1000 : n);
}

export async function POST(request: Request) {
  let body: MinecraftStatusPayload;
  try {
    body = (await request.json()) as MinecraftStatusPayload;
  } catch {
    return badRequest("JSON inválido");
  }

  const authz = await requireMinecraftAddon(request, body);
  if (!authz.ok) return authz.response;
  const { serverId } = authz;

  if (!body.players || !Array.isArray(body.players)) {
    return badRequest("El campo 'players' es requerido y debe ser un array");
  }

  try {
    const serverSnapshotTime = snapshotDateFromPayload(body.timestamp);
    const config = await ensureMinecraftConfig(serverId);
    const daysInactiveThreshold = config.daysInactive;

    await prisma.minecraftSnapshot.create({
      data: {
        serverId,
        timestamp: serverSnapshotTime,
        totalPlayers: body.serverInfo.totalPlayers,
        activePlayers: body.serverInfo.activePlayers,
        inactivePlayers: body.serverInfo.inactivePlayers,
        data: body as Prisma.InputJsonValue,
      },
    });

    const purgeResult = await purgeOldMinecraftSnapshots(
      prisma,
      config,
      serverId,
    );
    if (purgeResult.deleted > 0) {
      console.info(
        `[Minecraft API] Purga snapshots ${serverId}: ${purgeResult.deleted} filas (> ${config.snapshotRetentionDays} días, mín. ${config.snapshotKeepMinimum} recientes)`,
      );
    }

    for (const player of body.players) {
      const name = player.name.trim();
      if (!name) continue;

      const existing = await prisma.minecraftPlayer.findFirst({
        where: {
          serverId,
          gamertag: { equals: name, mode: "insensitive" },
        },
      });

      const panelListsNewerThanSnapshot =
        !!existing &&
        existing.updatedAt.getTime() >
          serverSnapshotTime.getTime() - PANEL_LIST_PRIORITY_MS;

      let mergedBlacklist: boolean;
      let mergedWhitelist: boolean;
      if (panelListsNewerThanSnapshot) {
        mergedBlacklist = existing!.isBlacklisted;
        mergedWhitelist = existing!.isWhitelisted;
      } else if (existing) {
        mergedBlacklist = existing.isBlacklisted || player.isBlacklisted;
        mergedWhitelist = existing.isWhitelisted || player.isWhitelisted;
      } else {
        mergedBlacklist = player.isBlacklisted;
        mergedWhitelist = player.isWhitelisted;
      }

      const active = isActiveByDaysInactive(
        player.daysInactive,
        daysInactiveThreshold,
      );

      if (existing) {
        await prisma.minecraftPlayer.update({
          where: { id: existing.id },
          data: {
            lastSeen: new Date(player.lastSeen),
            active,
            daysInactive: player.daysInactive,
            isBlacklisted: mergedBlacklist,
            isWhitelisted: mergedWhitelist,
          },
        });
      } else {
        await prisma.minecraftPlayer.create({
          data: {
            serverId,
            gamertag: name,
            lastSeen: new Date(player.lastSeen),
            active,
            daysInactive: player.daysInactive,
            isBlacklisted: mergedBlacklist,
            isWhitelisted: mergedWhitelist,
          },
        });
      }
      await syncDirectoryActiveWithMinecraft(name);
    }

    const totalReported = body.serverInfo?.totalPlayers ?? 0;
    const isFullRoster =
      totalReported > 0 && body.players.length >= totalReported;
    if (isFullRoster) {
      const seen = new Set(
        body.players
          .map((p) => p.name.trim().toLowerCase())
          .filter(Boolean),
      );
      const stale = await prisma.minecraftPlayer.findMany({
        where: { serverId },
        select: { id: true, gamertag: true },
      });
      const staleRows = stale.filter(
        (r) => !seen.has(r.gamertag.toLowerCase()),
      );
      const staleIds = staleRows.map((r) => r.id);
      if (staleIds.length > 0) {
        await prisma.minecraftPlayer.updateMany({
          where: { id: { in: staleIds } },
          data: { active: false },
        });
        for (const row of staleRows) {
          await syncDirectoryActiveWithMinecraft(row.gamertag);
        }
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/minecraft");

    return NextResponse.json({
      ok: true,
      serverId,
      processed: body.players.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Minecraft API] Error:", error);
    return NextResponse.json(
      { error: "Error al procesar los datos" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const authz = await requireMinecraftAddon(request);
  if (!authz.ok) return authz.response;
  const { serverId } = authz;

  try {
    const [players, lastSnapshot, config] = await Promise.all([
      prisma.minecraftPlayer.findMany({
        where: { serverId },
        orderBy: { lastSeen: "desc" },
      }),
      prisma.minecraftSnapshot.findFirst({
        where: { serverId },
        orderBy: { timestamp: "desc" },
      }),
      ensureMinecraftConfig(serverId),
    ]);

    const blacklist = players
      .filter((p) => p.isBlacklisted)
      .map((p) => p.gamertag);
    const whitelist = players
      .filter((p) => p.isWhitelisted)
      .map((p) => p.gamertag);

    return NextResponse.json({
      ok: true,
      serverId,
      players: players.map((p) => ({
        gamertag: p.gamertag,
        lastSeen: p.lastSeen.toISOString(),
        active: p.active,
        daysInactive: p.daysInactive,
        isBlacklisted: p.isBlacklisted,
        isWhitelisted: p.isWhitelisted,
      })),
      blacklist,
      whitelist,
      lastUpdate: lastSnapshot?.timestamp.toISOString() ?? null,
      serverInfo: lastSnapshot
        ? {
            totalPlayers: lastSnapshot.totalPlayers,
            activePlayers: lastSnapshot.activePlayers,
            inactivePlayers: lastSnapshot.inactivePlayers,
          }
        : null,
      config: {
        daysInactive: config.daysInactive,
        daysBlacklist: config.daysBlacklist,
        daysPurge: config.daysPurge,
        snapshotRetentionDays: config.snapshotRetentionDays,
        snapshotKeepMinimum: config.snapshotKeepMinimum,
      },
    });
  } catch (error) {
    console.error("[Minecraft API] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener los datos" },
      { status: 500 },
    );
  }
}
