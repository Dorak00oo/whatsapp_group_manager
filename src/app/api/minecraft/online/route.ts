import { NextResponse } from "next/server";
import {
  requireMinecraftAddon,
  requireMinecraftPanel,
} from "@/lib/minecraft-api-context";
import {
  asOnlinePlayersQueueData,
  isOnlineRosterFresh,
  normalizeOnlinePlayerNames,
} from "@/lib/minecraft-online-players";
import {
  readMinecraftQueueRow,
  upsertMinecraftQueue,
} from "@/lib/minecraft-queue";
import { withDbRetry } from "@/lib/prisma-retry";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** Panel: jugadores online reportados por el addon. */
export async function GET() {
  const authz = await requireMinecraftPanel();
  if (!authz.ok) return authz.response;

  const found = await withDbRetry(() =>
    readMinecraftQueueRow(authz.serverId, "online_players"),
  );
  const data = asOnlinePlayersQueueData(found?.data);
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
  let body: { players?: unknown; serverId?: unknown; flavor?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return badRequest("JSON inválido");
  }

  const authz = await requireMinecraftAddon(request, body);
  if (!authz.ok) return authz.response;

  const players = normalizeOnlinePlayerNames(body.players);
  const reportedAt = new Date().toISOString();

  await withDbRetry(() =>
    upsertMinecraftQueue(authz.serverId, "online_players", {
      players,
      reportedAt,
    }),
  );

  return NextResponse.json({ ok: true, count: players.length, reportedAt });
}
