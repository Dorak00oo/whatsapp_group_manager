import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { isActiveByDaysInactive } from "@/lib/minecraft-active";
import { syncDirectoryActiveWithMinecraft } from "@/lib/minecraft-directory-sync";
import { purgeOldMinecraftSnapshots } from "@/lib/minecraft-snapshot-purge";

export const runtime = "nodejs";

type MinecraftStatusPayload = {
  timestamp: number;
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

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

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
  // Segundos UNIX (~1e9) vs milisegundos (~1e12+)
  return new Date(n < 1_000_000_000_000 ? n * 1000 : n);
}

function getBearerToken(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}

export async function POST(request: Request) {
  const secret = process.env.MINECRAFT_API_KEY?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "MINECRAFT_API_KEY no configurado en el servidor" },
      { status: 503 },
    );
  }

  const token = getBearerToken(request);
  if (token !== secret) {
    return unauthorized();
  }

  let body: MinecraftStatusPayload;
  try {
    body = (await request.json()) as MinecraftStatusPayload;
  } catch {
    return badRequest("JSON inválido");
  }

  if (!body.players || !Array.isArray(body.players)) {
    return badRequest("El campo 'players' es requerido y debe ser un array");
  }

  try {
    const serverSnapshotTime = snapshotDateFromPayload(body.timestamp);
    const config = await prisma.minecraftConfig.findUnique({
      where: { id: "default" },
    });
    const daysInactiveThreshold = config?.daysInactive ?? 7;

    // Guardar snapshot histórico
    await prisma.minecraftSnapshot.create({
      data: {
        timestamp: serverSnapshotTime,
        totalPlayers: body.serverInfo.totalPlayers,
        activePlayers: body.serverInfo.activePlayers,
        inactivePlayers: body.serverInfo.inactivePlayers,
        data: body as Prisma.InputJsonValue,
      },
    });

    const purgeResult = await purgeOldMinecraftSnapshots(prisma, config);
    if (purgeResult.deleted > 0) {
      console.info(
        `[Minecraft API] Purga snapshots: ${purgeResult.deleted} filas (> ${config?.snapshotRetentionDays ?? 45} días, mín. ${config?.snapshotKeepMinimum ?? 10} recientes)`,
      );
    }

    // Actualizar o crear jugadores (gamertag sin distinguir mayúsculas en la búsqueda)
    // Blacklist/WL: si el panel editó la fila recientemente, no pisar con un snapshot
    // del servidor que aún refleja el estado anterior (antes de Sync all / GET).
    // Si el snapshot es más nuevo que esa ventana, el servidor manda y además se usa OR
    // para no perder un ban desde panel hasta que el mundo confirme.
    for (const player of body.players) {
      const name = player.name.trim();
      if (!name) continue;

      const existing = await prisma.minecraftPlayer.findFirst({
        where: { gamertag: { equals: name, mode: "insensitive" } },
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
        mergedBlacklist =
          existing.isBlacklisted || player.isBlacklisted;
        mergedWhitelist =
          existing.isWhitelisted || player.isWhitelisted;
      } else {
        mergedBlacklist = player.isBlacklisted;
        mergedWhitelist = player.isWhitelisted;
      }

      const active = isActiveByDaysInactive(
        player.daysInactive,
        daysInactiveThreshold,
      );

      /** Directorio WhatsApp: inactivo si no cumple días activos o está en blacklist */
      const directoryActive = active && !mergedBlacklist;

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
        await syncDirectoryActiveWithMinecraft(name, directoryActive);
      } else {
        await prisma.minecraftPlayer.create({
          data: {
            gamertag: name,
            lastSeen: new Date(player.lastSeen),
            active,
            daysInactive: player.daysInactive,
            isBlacklisted: mergedBlacklist,
            isWhitelisted: mergedWhitelist,
          },
        });
        await syncDirectoryActiveWithMinecraft(name, directoryActive);
      }
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
        select: { id: true, gamertag: true },
      });
      const staleIds = stale
        .filter((r) => !seen.has(r.gamertag.toLowerCase()))
        .map((r) => r.id);
      if (staleIds.length > 0) {
        await prisma.minecraftPlayer.updateMany({
          where: { id: { in: staleIds } },
          data: { active: false },
        });
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/minecraft");

    return NextResponse.json({
      ok: true,
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
  const secret = process.env.MINECRAFT_API_KEY?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "MINECRAFT_API_KEY no configurado" },
      { status: 503 },
    );
  }

  const token = getBearerToken(request);
  if (token !== secret) {
    return unauthorized();
  }

  try {
    const [players, lastSnapshot, config] = await Promise.all([
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

    const blacklist = players
      .filter((p) => p.isBlacklisted)
      .map((p) => p.gamertag);
    const whitelist = players
      .filter((p) => p.isWhitelisted)
      .map((p) => p.gamertag);

    return NextResponse.json({
      ok: true,
      players: players.map((p) => ({
        gamertag: p.gamertag,
        lastSeen: p.lastSeen.toISOString(),
        active: p.active,
        daysInactive: p.daysInactive,
        isBlacklisted: p.isBlacklisted,
        isWhitelisted: p.isWhitelisted,
      })),
      /** Listas planas para el addon del servidor (mismo contrato que el POST) */
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
      config: config
        ? {
            daysInactive: config.daysInactive,
            daysBlacklist: config.daysBlacklist,
            daysPurge: config.daysPurge,
            snapshotRetentionDays: config.snapshotRetentionDays,
            snapshotKeepMinimum: config.snapshotKeepMinimum,
          }
        : {
            daysInactive: 7,
            daysBlacklist: 14,
            daysPurge: 21,
            snapshotRetentionDays: 45,
            snapshotKeepMinimum: 10,
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
