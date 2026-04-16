import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    // Guardar snapshot histórico
    await prisma.minecraftSnapshot.create({
      data: {
        timestamp: new Date(body.timestamp),
        totalPlayers: body.serverInfo.totalPlayers,
        activePlayers: body.serverInfo.activePlayers,
        inactivePlayers: body.serverInfo.inactivePlayers,
        data: body as any,
      },
    });

    // Actualizar o crear jugadores
    // IMPORTANTE: Respeta los cambios manuales desde la web
    for (const player of body.players) {
      const existing = await prisma.minecraftPlayer.findUnique({
        where: { gamertag: player.name },
      });

      if (existing) {
        // Si ya existe, actualizar pero respetar cambios manuales en listas
        await prisma.minecraftPlayer.update({
          where: { gamertag: player.name },
          data: {
            lastSeen: new Date(player.lastSeen),
            active: player.active,
            daysInactive: player.daysInactive,
            // Solo actualizar listas si no han sido modificadas manualmente
            // (si la web las cambió, el addon no las sobrescribe)
            isBlacklisted: existing.isBlacklisted || player.isBlacklisted,
            isWhitelisted: existing.isWhitelisted || player.isWhitelisted,
          },
        });
      } else {
        // Si no existe, crear nuevo
        await prisma.minecraftPlayer.create({
          data: {
            gamertag: player.name,
            lastSeen: new Date(player.lastSeen),
            active: player.active,
            daysInactive: player.daysInactive,
            isBlacklisted: player.isBlacklisted,
            isWhitelisted: player.isWhitelisted,
          },
        });
      }
    }

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
          }
        : { daysInactive: 7, daysBlacklist: 14, daysPurge: 21 },
    });
  } catch (error) {
    console.error("[Minecraft API] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener los datos" },
      { status: 500 },
    );
  }
}
