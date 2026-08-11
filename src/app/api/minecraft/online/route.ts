import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  ONLINE_PLAYERS_QUEUE_ID,
  asOnlinePlayersQueueData,
  isOnlineRosterFresh,
  normalizeOnlinePlayerNames,
} from "@/lib/minecraft-online-players";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/prisma-retry";

export const runtime = "nodejs";

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

/** Panel: jugadores online reportados por el addon. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const row = await withDbRetry(() =>
    prisma.minecraftSyncQueue.findUnique({
      where: { id: ONLINE_PLAYERS_QUEUE_ID },
    }),
  );
  const data = asOnlinePlayersQueueData(row?.data);
  const reportedAt = data.reportedAt ?? null;
  const fresh = isOnlineRosterFresh(reportedAt);
  const players = fresh ? normalizeOnlinePlayerNames(data.players) : [];

  return NextResponse.json({
    ok: true,
    players,
    reportedAt,
    fresh,
  });
}

/** Addon: publica roster actual (`world.getPlayers()`). */
export async function POST(request: Request) {
  const secret = process.env.MINECRAFT_API_KEY?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "MINECRAFT_API_KEY no configurado" },
      { status: 503 },
    );
  }

  const token = getBearerToken(request);
  if (token !== secret) return unauthorized();

  let body: { players?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return badRequest("JSON inválido");
  }

  const players = normalizeOnlinePlayerNames(body.players);
  const reportedAt = new Date().toISOString();

  await withDbRetry(() =>
    prisma.minecraftSyncQueue.upsert({
      where: { id: ONLINE_PLAYERS_QUEUE_ID },
      update: { data: { players, reportedAt } },
      create: {
        id: ONLINE_PLAYERS_QUEUE_ID,
        data: { players, reportedAt },
      },
    }),
  );

  return NextResponse.json({ ok: true, count: players.length, reportedAt });
}
