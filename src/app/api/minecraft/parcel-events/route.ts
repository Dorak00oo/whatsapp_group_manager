import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  isParcelEventType,
  PARCEL_PAGE_SIZE,
  type ParcelEventType,
} from "@/lib/minecraft-parcel";
import {
  getLastParcelBatchAt,
  markParcelBatchReceived,
} from "@/lib/parcel-events-store";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_EVENTS_PER_POST = 500;
const PANEL_MAX_PAGE_SIZE = 100;

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

function getBearerToken(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}

function isEventType(value: string): value is ParcelEventType {
  return isParcelEventType(value);
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

/** Panel: historial permanente, paginado. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const url = new URL(request.url);
  const pageSizeRaw = Number(
    url.searchParams.get("pageSize") ?? PARCEL_PAGE_SIZE,
  );
  const pageSize = Number.isFinite(pageSizeRaw)
    ? Math.min(PANEL_MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSizeRaw)))
    : PARCEL_PAGE_SIZE;
  const pageRaw = Number(url.searchParams.get("page") ?? 1);
  let page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;

  const gamertag = url.searchParams.get("gamertag")?.trim() ?? "";
  const eventType = url.searchParams.get("event")?.trim() ?? "";
  const from = url.searchParams.get("from")?.trim() ?? "";
  const to = url.searchParams.get("to")?.trim() ?? "";

  const where: Record<string, unknown> = {};
  if (gamertag) {
    where.gamertag = { contains: gamertag, mode: "insensitive" };
  }
  if (isParcelEventType(eventType)) {
    where.eventType = eventType;
  }
  if (from || to) {
    const occurredAt: { gte?: Date; lte?: Date } = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) occurredAt.gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) occurredAt.lte = d;
    }
    if (Object.keys(occurredAt).length) where.occurredAt = occurredAt;
  }

  const total = await prisma.minecraftParcelEvent.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages) page = totalPages;

  const events = await prisma.minecraftParcelEvent.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return NextResponse.json({
    ok: true,
    lastBatchAt: getLastParcelBatchAt(),
    total,
    page,
    pageSize,
    totalPages,
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

/** Panel: borra todo el historial de parcela. */
export async function DELETE() {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const result = await prisma.minecraftParcelEvent.deleteMany();
  return NextResponse.json({ ok: true, deleted: result.count });
}
