import { NextResponse } from "next/server";
import {
  requireMinecraftAddon,
  requireMinecraftPanel,
} from "@/lib/minecraft-api-context";
import {
  isParcelEventType,
  PARCEL_PAGE_SIZE,
  PARCEL_RETENTION_DAYS,
  resolveEventParcelId,
  type ParcelEventType,
} from "@/lib/minecraft-parcel";
import {
  getLastParcelBatchAt,
  markParcelBatchReceived,
} from "@/lib/parcel-events-store";
import { parsePurgeLimit } from "@/lib/history-purge";
import { ensurePrimaryParcel, knownParcelIdSet } from "@/lib/minecraft-parcels-db";
import { prisma } from "@/lib/prisma";
import { primaryParcelIdForServer } from "@/lib/minecraft-server";

export const runtime = "nodejs";

const MAX_EVENTS_PER_POST = 500;
const PANEL_MAX_PAGE_SIZE = 100;

type ParsedEvent = {
  gamertag: string;
  eventType: ParcelEventType;
  occurredAt: Date;
  posX: number | null;
  posY: number | null;
  posZ: number | null;
  dimension: string | null;
  blockType: string | null;
  parcelIdRaw: unknown;
};

function parseAddonEvent(raw: unknown): ParsedEvent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const e = raw as Record<string, unknown>;
  const gamertag = typeof e.gamertag === "string" ? e.gamertag.trim() : "";
  const event = typeof e.event === "string" ? e.event.trim() : "";
  const at = typeof e.at === "string" ? e.at : "";
  if (!gamertag || !isParcelEventType(event) || !at) return null;
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
    parcelIdRaw: e.parcelId,
  };
}

async function purgeOldParcelEvents() {
  const cutoff = new Date(
    Date.now() - PARCEL_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  await prisma.minecraftParcelEvent.deleteMany({
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

  markParcelBatchReceived(serverId);
  await purgeOldParcelEvents();

  if (rows.length === 0) {
    const total = await prisma.minecraftParcelEvent.count({
      where: { parcel: { serverId } },
    });
    return NextResponse.json({ ok: true, saved: 0, total });
  }

  await ensurePrimaryParcel(serverId);
  const knownIds = await knownParcelIdSet(serverId);
  const fallbackId = primaryParcelIdForServer(serverId);

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
      parcelId: resolveEventParcelId(r.parcelIdRaw, knownIds, fallbackId),
    })),
  });

  const total = await prisma.minecraftParcelEvent.count({
    where: { parcel: { serverId } },
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
  const pageSizeRaw = Number(
    url.searchParams.get("pageSize") ?? PARCEL_PAGE_SIZE,
  );
  const pageSize = Number.isFinite(pageSizeRaw)
    ? Math.min(PANEL_MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSizeRaw)))
    : PARCEL_PAGE_SIZE;
  const pageRaw = Number(url.searchParams.get("page") ?? 1);
  let page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;

  await purgeOldParcelEvents();

  const gamertag = url.searchParams.get("gamertag")?.trim() ?? "";
  const eventType = url.searchParams.get("event")?.trim() ?? "";
  const from = url.searchParams.get("from")?.trim() ?? "";
  const to = url.searchParams.get("to")?.trim() ?? "";
  const parcelId = url.searchParams.get("parcelId")?.trim() ?? "";

  const where: Record<string, unknown> = {
    parcel: { serverId },
  };
  if (parcelId) where.parcelId = parcelId;
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
    lastBatchAt: getLastParcelBatchAt(serverId),
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

export async function DELETE(request: Request) {
  const authz = await requireMinecraftPanel();
  if (!authz.ok) return authz.response;

  const url = new URL(request.url);
  const parcelId = url.searchParams.get("parcelId")?.trim() ?? "";
  if (!parcelId) {
    return NextResponse.json(
      { error: "parcelId es obligatorio para limpiar historial" },
      { status: 400 },
    );
  }

  const parcel = await prisma.minecraftParcel.findFirst({
    where: { id: parcelId, serverId: authz.serverId },
    select: { id: true },
  });
  if (!parcel) {
    return NextResponse.json({ error: "Parcela no encontrada" }, { status: 404 });
  }

  const where = { parcelId };
  const limitRaw = url.searchParams.get("limit");
  if (limitRaw == null) {
    const result = await prisma.minecraftParcelEvent.deleteMany({ where });
    return NextResponse.json({
      ok: true,
      deleted: result.count,
      remaining: 0,
    });
  }

  const limit = parsePurgeLimit(limitRaw);
  const rows = await prisma.minecraftParcelEvent.findMany({
    where,
    select: { id: true },
    take: limit,
  });
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0, remaining: 0 });
  }

  await prisma.minecraftParcelEvent.deleteMany({
    where: { id: { in: rows.map((r) => r.id) } },
  });
  const remaining = await prisma.minecraftParcelEvent.count({ where });
  return NextResponse.json({
    ok: true,
    deleted: rows.length,
    remaining,
  });
}
