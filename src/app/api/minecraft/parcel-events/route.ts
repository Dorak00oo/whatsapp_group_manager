import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { type ParcelEventType } from "@/lib/minecraft-parcel";
import {
  getLastParcelBatchAt,
  markParcelBatchReceived,
} from "@/lib/parcel-events-store";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_EVENTS_PER_POST = 500;
const PANEL_HISTORY_LIMIT = 250;

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

function getBearerToken(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}

function isEventType(value: string): value is ParcelEventType {
  return value === "enter" || value === "exit" || value === "chest_open";
}

type ParsedEvent = {
  gamertag: string;
  eventType: ParcelEventType;
  occurredAt: Date;
  posX: number | null;
  posY: number | null;
  posZ: number | null;
  dimension: string | null;
  blockType: string | null;
};

function parseAddonEvent(raw: unknown): ParsedEvent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const e = raw as Record<string, unknown>;
  const gamertag = typeof e.gamertag === "string" ? e.gamertag.trim() : "";
  const event = typeof e.event === "string" ? e.event.trim() : "";
  const at = typeof e.at === "string" ? e.at : "";
  if (!gamertag || !isEventType(event) || !at) return null;
  const occurredAt = new Date(at);
  if (Number.isNaN(occurredAt.getTime())) return null;

  return {
    gamertag,
    eventType: event,
    occurredAt,
    posX:
      typeof e.x === "number" && Number.isFinite(e.x) ? Math.floor(e.x) : null,
    posY:
      typeof e.y === "number" && Number.isFinite(e.y) ? Math.floor(e.y) : null,
    posZ:
      typeof e.z === "number" && Number.isFinite(e.z) ? Math.floor(e.z) : null,
    dimension:
      typeof e.dimension === "string" ? e.dimension.trim().slice(0, 40) : null,
    blockType:
      typeof e.blockType === "string" ? e.blockType.trim().slice(0, 64) : null,
  };
}

/** Addon: un lote → una sola escritura en BD (createMany). */
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

  let body: { events?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!Array.isArray(body.events)) {
    return NextResponse.json({ error: "events[] requerido" }, { status: 400 });
  }

  const rows: ParsedEvent[] = [];
  for (const raw of body.events.slice(0, MAX_EVENTS_PER_POST)) {
    const row = parseAddonEvent(raw);
    if (row) rows.push(row);
  }

  markParcelBatchReceived();

  if (rows.length === 0) {
    const total = await prisma.minecraftParcelEvent.count();
    return NextResponse.json({ ok: true, saved: 0, total });
  }

  const result = await prisma.minecraftParcelEvent.createMany({
    data: rows.map((r) => ({
      gamertag: r.gamertag,
      eventType: r.eventType,
      occurredAt: r.occurredAt,
      posX: r.posX,
      posY: r.posY,
      posZ: r.posZ,
      dimension: r.dimension,
      blockType: r.blockType,
    })),
  });

  const total = await prisma.minecraftParcelEvent.count();

  return NextResponse.json({
    ok: true,
    saved: result.count,
    total,
  });
}

/** Panel: historial permanente (lectura; sin escritura). */
export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const [events, total] = await Promise.all([
    prisma.minecraftParcelEvent.findMany({
      orderBy: { occurredAt: "desc" },
      take: PANEL_HISTORY_LIMIT,
    }),
    prisma.minecraftParcelEvent.count(),
  ]);

  return NextResponse.json({
    ok: true,
    lastBatchAt: getLastParcelBatchAt(),
    total,
    events: events.map((e) => ({
      id: e.id,
      gamertag: e.gamertag,
      event: e.eventType,
      occurredAt: e.occurredAt.toISOString(),
      x: e.posX,
      y: e.posY,
      z: e.posZ,
      dimension: e.dimension,
      blockType: e.blockType,
    })),
  });
}
