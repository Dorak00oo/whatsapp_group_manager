import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SETTINGS_ID = "minecraft_sync_request";

type SyncRequestData = {
  command?: string;
  requestedAt?: string;
  handledAt?: string | null;
};

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

function getBearerToken(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}

function asSyncRequestData(value: unknown): SyncRequestData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as SyncRequestData;
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const requestedAt = new Date().toISOString();

  await prisma.botPanelSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {
      data: {
        command: "syncall",
        requestedAt,
        handledAt: null,
      },
    },
    create: {
      id: SETTINGS_ID,
      data: {
        command: "syncall",
        requestedAt,
        handledAt: null,
      },
    },
  });

  return NextResponse.json({ ok: true, command: "syncall", requestedAt });
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
  if (token !== secret) return unauthorized();

  const row = await prisma.botPanelSettings.findUnique({
    where: { id: SETTINGS_ID },
  });
  const data = asSyncRequestData(row?.data);
  const pending =
    Boolean(data.requestedAt) && data.requestedAt !== data.handledAt;

  return NextResponse.json({
    ok: true,
    pending,
    command: pending ? data.command ?? "syncall" : null,
    requestedAt: data.requestedAt ?? null,
  });
}

export async function PUT(request: Request) {
  const secret = process.env.MINECRAFT_API_KEY?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "MINECRAFT_API_KEY no configurado" },
      { status: 503 },
    );
  }

  const token = getBearerToken(request);
  if (token !== secret) return unauthorized();

  let body: { requestedAt?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const requestedAt =
    typeof body.requestedAt === "string" ? body.requestedAt : "";
  if (!requestedAt) {
    return NextResponse.json(
      { error: "requestedAt es requerido" },
      { status: 400 },
    );
  }

  await prisma.botPanelSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {
      data: {
        command: "syncall",
        requestedAt,
        handledAt: requestedAt,
      },
    },
    create: {
      id: SETTINGS_ID,
      data: {
        command: "syncall",
        requestedAt,
        handledAt: requestedAt,
      },
    },
  });

  return NextResponse.json({ ok: true, handledAt: requestedAt });
}
