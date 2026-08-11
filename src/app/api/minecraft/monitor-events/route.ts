import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  buildVandalismAlerts,
  isMonitorEventType,
  MONITOR_RETENTION_DAYS,
  type MonitorEventType,
  type MonitorPriority,
} from "@/lib/minecraft-monitor";
import {
  getLastMonitorBatchAt,
  markMonitorBatchReceived,
} from "@/lib/monitor-events-store";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_EVENTS_PER_POST = 500;
const PANEL_HISTORY_LIMIT = 500;

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

function getBearerToken(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}

type ParsedEvent = {
  gamertag: string;
  eventType: MonitorEventType;
  occurredAt: Date;
  posX: number | null;
  posY: number | null;
  posZ: number | null;
  dimension: string | null;
  blockType: string | null;
  itemType: string | null;
  priority: MonitorPriority;
  fireId: string | null;
  relatedFireId: string | null;
};

function parsePriority(raw: unknown): MonitorPriority {
  if (raw === "critical" || raw === "high" || raw === "normal") return raw;
  return "normal";
}

function parseAddonEvent(raw: unknown): ParsedEvent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const e = raw as Record<string, unknown>;
  const gamertag = typeof e.gamertag === "string" ? e.gamertag.trim() : "";
  const event = typeof e.event === "string" ? e.event.trim() : "";
  const at = typeof e.at === "string" ? e.at : "";
  if (!gamertag || !isMonitorEventType(event) || !at) return null;
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
      typeof e.dimension === "string"
        ? e.dimension.trim().slice(0, 40)
        : "overworld",
    blockType:
      typeof e.blockType === "string" ? e.blockType.trim().slice(0, 64) : null,
    itemType:
      typeof e.itemType === "string" ? e.itemType.trim().slice(0, 64) : null,
    priority: parsePriority(e.priority),
    fireId: typeof e.fireId === "string" ? e.fireId.trim().slice(0, 64) : null,
    relatedFireId:
      typeof e.relatedFireId === "string"
        ? e.relatedFireId.trim().slice(0, 64)
        : null,
  };
}

async function purgeOldMonitorEvents() {
  const cutoff = new Date(
    Date.now() - MONITOR_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  await prisma.minecraftMonitorEvent.deleteMany({
    where: { occurredAt: { lt: cutoff } },
  });
}

/** Addon: lote → createMany + purga 21d. */
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

  markMonitorBatchReceived();
  await purgeOldMonitorEvents();

  if (rows.length === 0) {
    const total = await prisma.minecraftMonitorEvent.count();
    return NextResponse.json({ ok: true, saved: 0, total });
  }

  const result = await prisma.minecraftMonitorEvent.createMany({
    data: rows.map((r) => ({
      gamertag: r.gamertag,
      eventType: r.eventType,
      occurredAt: r.occurredAt,
      posX: r.posX,
      posY: r.posY,
      posZ: r.posZ,
      dimension: r.dimension,
      blockType: r.blockType,
      itemType: r.itemType,
      priority: r.priority,
      fireId: r.fireId,
      relatedFireId: r.relatedFireId,
    })),
  });

  const total = await prisma.minecraftMonitorEvent.count();

  return NextResponse.json({
    ok: true,
    saved: result.count,
    total,
  });
}

/** Panel: historial con filtros opcionales. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const url = new URL(request.url);
  const gamertag = url.searchParams.get("gamertag")?.trim() ?? "";
  const eventType = url.searchParams.get("event")?.trim() ?? "";
  const item = url.searchParams.get("item")?.trim() ?? "";
  const from = url.searchParams.get("from")?.trim() ?? "";
  const to = url.searchParams.get("to")?.trim() ?? "";
  const minX = url.searchParams.get("minX")?.trim() ?? "";
  const minY = url.searchParams.get("minY")?.trim() ?? "";
  const minZ = url.searchParams.get("minZ")?.trim() ?? "";
  const maxX = url.searchParams.get("maxX")?.trim() ?? "";
  const maxY = url.searchParams.get("maxY")?.trim() ?? "";
  const maxZ = url.searchParams.get("maxZ")?.trim() ?? "";

  await purgeOldMonitorEvents();

  const where: Record<string, unknown> = {};
  if (gamertag) {
    where.gamertag = { contains: gamertag, mode: "insensitive" };
  }
  if (eventType && isMonitorEventType(eventType)) {
    where.eventType = eventType;
  }
  if (item) {
    where.OR = [
      { blockType: { contains: item, mode: "insensitive" } },
      { itemType: { contains: item, mode: "insensitive" } },
    ];
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

  const parseCoord = (raw: string): number | null => {
    if (raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.floor(n) : null;
  };

  const applyAxisRange = (
    field: "posX" | "posY" | "posZ",
    aRaw: string,
    bRaw: string,
  ) => {
    const a = parseCoord(aRaw);
    const b = parseCoord(bRaw);
    if (a == null || b == null) return;
    where[field] = { gte: Math.min(a, b), lte: Math.max(a, b) };
  };

  applyAxisRange("posX", minX, maxX);
  applyAxisRange("posY", minY, maxY);
  applyAxisRange("posZ", minZ, maxZ);

  const events = await prisma.minecraftMonitorEvent.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: PANEL_HISTORY_LIMIT,
  });

  const total = await prisma.minecraftMonitorEvent.count({ where });
  const alerts = buildVandalismAlerts(
    events.map((e) => ({
      gamertag: e.gamertag,
      eventType: e.eventType,
      occurredAt: e.occurredAt,
    })),
  );

  return NextResponse.json({
    ok: true,
    lastBatchAt: getLastMonitorBatchAt(),
    total,
    alerts,
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
      itemType: e.itemType,
      priority: e.priority,
      fireId: e.fireId,
      relatedFireId: e.relatedFireId,
    })),
  });
}
