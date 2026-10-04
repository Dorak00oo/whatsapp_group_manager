import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { reconcileDirectoryAbsentActive } from "@/lib/directory-absent-clock";
import { prisma } from "@/lib/prisma";
import { requireMinecraftAddon } from "@/lib/minecraft-api-context";
import {
  recordMinecraftActiveChanges,
  syncDirectoryActiveForGamertags,
} from "@/lib/minecraft-directory-sync";
import { accessListGamertags } from "@/lib/minecraft-list-merge";
import {
  planMinecraftPlayerWrites,
  planStaleMinecraftPlayers,
  shouldRevalidateDirectory,
} from "@/lib/minecraft-status-plan";
import { ensureMinecraftConfig } from "@/lib/minecraft-servers-db";
import { purgeOldMinecraftSnapshots } from "@/lib/minecraft-snapshot-purge";
import { revalidateDirectoryViews } from "@/lib/revalidate-directory";

let lastDirectoryRevalidateAt: number | null = null;

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
    const daysBlacklist = config.daysBlacklist;

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

    const existingPlayers = await prisma.minecraftPlayer.findMany({
      where: { serverId },
      select: {
        id: true,
        gamertag: true,
        isBlacklisted: true,
        isWhitelisted: true,
        inactivityBlacklistExemptUntilSeen: true,
      },
    });
    const writes = planMinecraftPlayerWrites({
      players: body.players,
      existing: existingPlayers,
      daysInactiveThreshold,
      daysBlacklist,
    });
    const stale = planStaleMinecraftPlayers({
      existing: existingPlayers,
      seenNames: body.players.map((p) => p.name),
      totalReported: body.serverInfo?.totalPlayers ?? 0,
      reportedCount: body.players.length,
    });

    await prisma.$transaction(async (tx) => {
      const creates = writes.flatMap((w) =>
        w.op === "create"
          ? [{ serverId, gamertag: w.gamertag, ...w.data }]
          : [],
      );
      if (creates.length > 0) {
        await tx.minecraftPlayer.createMany({ data: creates });
      }
      for (const w of writes) {
        if (w.op !== "update") continue;
        await tx.minecraftPlayer.update({
          where: { id: w.id },
          data: w.data,
        });
      }
      if (stale.ids.length > 0) {
        await tx.minecraftPlayer.updateMany({
          where: { id: { in: stale.ids } },
          data: { active: false },
        });
      }
    });

    const affected = [
      ...writes.map((w) => w.gamertag),
      ...stale.gamertags,
    ];
    const synced = await syncDirectoryActiveForGamertags(affected);
    if (synced.userId) {
      await reconcileDirectoryAbsentActive(synced.userId);
      await recordMinecraftActiveChanges(synced.userId, synced.changes);
    }

    const nowMs = Date.now();
    if (shouldRevalidateDirectory(lastDirectoryRevalidateAt, nowMs)) {
      lastDirectoryRevalidateAt = nowMs;
      revalidateDirectoryViews();
      revalidatePath("/dashboard/minecraft");
    }

    const roster = await prisma.minecraftPlayer.findMany({
      where: { serverId },
      select: {
        gamertag: true,
        isBlacklisted: true,
        isWhitelisted: true,
      },
    });
    const lists = accessListGamertags(roster);

    return NextResponse.json({
      ok: true,
      serverId,
      processed: body.players.length,
      timestamp: new Date().toISOString(),
      blacklist: lists.blacklist,
      whitelist: lists.whitelist,
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
