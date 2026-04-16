import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncDirectoryActiveWithMinecraft } from "@/lib/minecraft-directory-sync";

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

    // Actualizar o crear jugadores (gamertag sin distinguir mayúsculas en la búsqueda)
    // IMPORTANTE: Listas desde la web se conservan con OR contra el payload del servidor.
    for (const player of body.players) {
      const name = player.name.trim();
      if (!name) continue;

      const existing = await prisma.minecraftPlayer.findFirst({
        where: { gamertag: { equals: name, mode: "insensitive" } },
      });

      const mergedBlacklist = existing
        ? existing.isBlacklisted || player.isBlacklisted
        : player.isBlacklisted;
      const mergedWhitelist = existing
        ? existing.isWhitelisted || player.isWhitelisted
        : player.isWhitelisted;

      /** Directorio WhatsApp: inactivo si el servidor dice inactivo o está en blacklist */
      const directoryActive = player.active && !mergedBlacklist;

      if (existing) {
        await prisma.minecraftPlayer.update({
          where: { id: existing.id },
          data: {
            lastSeen: new Date(player.lastSeen),
            active: player.active,
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
            active: player.active,
            daysInactive: player.daysInactive,
            isBlacklisted: mergedBlacklist,
            isWhitelisted: mergedWhitelist,
          },
        });
        await syncDirectoryActiveWithMinecraft(name, directoryActive);
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
