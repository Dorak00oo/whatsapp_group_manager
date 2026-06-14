import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  type ParcelEventType,
  parcelPrismaUpdateFromPayload,
} from "@/lib/minecraft-parcel";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_EVENTS_PER_POST = 50;
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

/** Addon: registra entradas/salidas (batch, 1 write por lote). */
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

  if (!Array.isArray(body.events) || body.events.length === 0) {
    return NextResponse.json({ error: "events[] requerido" }, { status: 400 });
  }

  const rows: {
    gamertag: string;
    eventType: ParcelEventType;
    occurredAt: Date;
    posX: number | null;
    posY: number | null;
    posZ: number | null;
    dimension: string | null;
    blockType: string | null;
  }[] = [];

  for (const raw of body.events.slice(0, MAX_EVENTS_PER_POST)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const e = raw as Record<string, unknown>;
    const gamertag =
      typeof e.gamertag === "string" ? e.gamertag.trim() : "";
    const event =
      typeof e.event === "string" ? e.event.trim() : "";
    const at = typeof e.at === "string" ? e.at : "";
    if (!gamertag || !isEventType(event) || !at) continue;
    const occurredAt = new Date(at);
    if (Number.isNaN(occurredAt.getTime())) continue;

    const posX =
      typeof e.x === "number" && Number.isFinite(e.x) ? Math.floor(e.x) : null;
    const posY =
      typeof e.y === "number" && Number.isFinite(e.y) ? Math.floor(e.y) : null;
    const posZ =
      typeof e.z === "number" && Number.isFinite(e.z) ? Math.floor(e.z) : null;
    const dimension =
      typeof e.dimension === "string" ? e.dimension.trim().slice(0, 40) : null;
    const blockType =
      typeof e.blockType === "string" ? e.blockType.trim().slice(0, 64) : null;

    rows.push({
      gamertag,
      eventType: event,
      occurredAt,
      posX,
      posY,
      posZ,
      dimension,
      blockType,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "Sin eventos válidos" }, { status: 400 });
  }

  await prisma.minecraftParcelEvent.createMany({ data: rows });

  return NextResponse.json({ ok: true, saved: rows.length });
}

/** Panel: historial reciente. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? PANEL_HISTORY_LIMIT);
  const limit = Math.min(
    PANEL_HISTORY_LIMIT,
    Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : PANEL_HISTORY_LIMIT),
  );

  const events = await prisma.minecraftParcelEvent.findMany({
    orderBy: { occurredAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    ok: true,
    events: events.map((e) => ({
      id: e.id,
      gamertag: e.gamertag,
      event: e.eventType,
      occurredAt: e.occurredAt.toISOString(),
      x: e.posX,
      y: e.posY,
      z: e.posZ,
      dimension: e.dimension,
    })),
  });
}
