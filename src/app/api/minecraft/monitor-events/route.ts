import { NextResponse } from "next/server";
import {
  requireMinecraftAddon,
  requireMinecraftPanel,
} from "@/lib/minecraft-api-context";
import {
  isMonitorEventType,
  MONITOR_PAGE_SIZE,
  MONITOR_RETENTION_DAYS,
  resolveMonitorEventFilter,
  type MonitorEventType,
  type MonitorPriority,
} from "@/lib/minecraft-monitor";
import {
  applyMonitorAlertsFromEvents,
  listActiveMonitorAlerts,
} from "@/lib/minecraft-monitor-alerts";
import {
  getLastMonitorBatchAt,
  markMonitorBatchReceived,
} from "@/lib/monitor-events-store";
import { parsePurgeLimit } from "@/lib/history-purge";
import { prisma } from "@/lib/prisma";
import {
  axisRange,
  parseRadius,
  tryParseCoordNumber,
} from "@/lib/xyz-coords";

export const runtime = "nodejs";

const MAX_EVENTS_PER_POST = 500;
const PANEL_MAX_PAGE_SIZE = 100;

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

export async function POST(request: Request) {
  let body: { events?: unknown; serverId?: unknown; flavor?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const authz = await requireMinecraftAddon(request, body);
  if (!authz.ok) return authz.response;
  const { serverId } = authz;

  if (!Array.isArray(body.events)) {
    return NextResponse.json({ error: "events[] requerido" }, { status: 400 });
  }

  const rows: ParsedEvent[] = [];
  for (const raw of body.events.slice(0, MAX_EVENTS_PER_POST)) {
    const row = parseAddonEvent(raw);
    if (row) rows.push(row);
  }

  markMonitorBatchReceived(serverId);
  await purgeOldMonitorEvents();

  if (rows.length === 0) {
    const total = await prisma.minecraftMonitorEvent.count({
      where: { serverId },
    });
    return NextResponse.json({ ok: true, saved: 0, total });
  }

  const result = await prisma.minecraftMonitorEvent.createMany({
    data: rows.map((r) => ({
      serverId,
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

  await applyMonitorAlertsFromEvents(
    rows.map((r) => ({
      gamertag: r.gamertag,
      eventType: r.eventType,
      occurredAt: r.occurredAt,
      blockType: r.blockType,
      itemType: r.itemType,
    })),
    serverId,
  );

  const total = await prisma.minecraftMonitorEvent.count({
    where: { serverId },
  });

  return NextResponse.json({
    ok: true,
    saved: result.count,
    total,
  });
}

export async function GET(request: Request) {
  const authz = await requireMinecraftPanel();
  if (!authz.ok) return authz.response;
  const { serverId } = authz;

  const url = new URL(request.url);
  const gamertag = url.searchParams.get("gamertag")?.trim() ?? "";
  const eventType = url.searchParams.get("event")?.trim() ?? "";
  const item = url.searchParams.get("item")?.trim() ?? "";
  const from = url.searchParams.get("from")?.trim() ?? "";
  const to = url.searchParams.get("to")?.trim() ?? "";
  const xRaw = url.searchParams.get("x")?.trim() ?? "";
  const yRaw = url.searchParams.get("y")?.trim() ?? "";
  const zRaw = url.searchParams.get("z")?.trim() ?? "";
  const radiusRaw = url.searchParams.get("radius")?.trim() ?? "";

  const pageSizeRaw = Number(url.searchParams.get("pageSize") ?? MONITOR_PAGE_SIZE);
  const pageSize = Number.isFinite(pageSizeRaw)
    ? Math.min(PANEL_MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSizeRaw)))
    : MONITOR_PAGE_SIZE;
  const pageRaw = Number(url.searchParams.get("page") ?? 1);
  let page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;

  await purgeOldMonitorEvents();

  const where: Record<string, unknown> = { serverId };
  if (gamertag) {
    where.gamertag = { contains: gamertag, mode: "insensitive" };
  }
  const eventTypes = resolveMonitorEventFilter(eventType);
  if (eventTypes?.length === 1) {
    where.eventType = eventTypes[0];
  } else if (eventTypes && eventTypes.length > 1) {
    where.eventType = { in: eventTypes };
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

  const centerX = tryParseCoordNumber(xRaw);
  const centerZ = tryParseCoordNumber(zRaw);
  const radius = parseRadius(radiusRaw);
  if (centerX != null && centerZ != null && radius != null) {
    where.posX = axisRange(centerX, radius);
    where.posZ = axisRange(centerZ, radius);
    const centerY = tryParseCoordNumber(yRaw);
    if (centerY != null) {
      where.posY = axisRange(centerY, radius);
    }
  }

  const total = await prisma.minecraftMonitorEvent.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages) page = totalPages;

  const events = await prisma.minecraftMonitorEvent.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const alerts = await listActiveMonitorAlerts(serverId);

  return NextResponse.json({
    ok: true,
    lastBatchAt: getLastMonitorBatchAt(serverId),
    total,
    page,
    pageSize,
    totalPages,
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

export async function DELETE(request: Request) {
  const authz = await requireMinecraftPanel();
  if (!authz.ok) return authz.response;
  const { serverId } = authz;

  const url = new URL(request.url);
  const limit = parsePurgeLimit(url.searchParams.get("limit"));

  const rows = await prisma.minecraftMonitorEvent.findMany({
    where: { serverId },
    select: { id: true },
    take: limit,
  });
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0, remaining: 0 });
  }

  await prisma.minecraftMonitorEvent.deleteMany({
    where: { id: { in: rows.map((r) => r.id) } },
  });
  const remaining = await prisma.minecraftMonitorEvent.count({
    where: { serverId },
  });
  return NextResponse.json({
    ok: true,
    deleted: rows.length,
    remaining,
  });
}
