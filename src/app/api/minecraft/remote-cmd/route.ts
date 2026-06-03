import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  REMOTE_CMD_QUEUE_ID,
  asRemoteCmdQueueData,
  isRemoteCmdAction,
  remoteCmdNeedsTarget,
  type RemoteCmdAction,
} from "@/lib/minecraft-remote-commands";
import { prisma } from "@/lib/prisma";

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

async function isAdminGamertag(gamertag: string): Promise<boolean> {
  const trimmed = gamertag.trim();
  if (!trimmed) return false;
  const row = await prisma.directoryMember.findFirst({
    where: {
      isAdmin: true,
      gamertag: { equals: trimmed, mode: "insensitive" },
    },
    select: { id: true },
  });
  return row != null;
}

/** Panel web: encola un comando para el addon (1 upsert en cola existente). */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  let body: { action?: unknown; targetGamertag?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest("JSON inválido");
  }

  const actionRaw =
    typeof body.action === "string" ? body.action.trim() : "";
  if (!isRemoteCmdAction(actionRaw)) {
    return badRequest(
      `action debe ser uno de: spectator, survival, kill_silverfish, kill_withers`,
    );
  }
  const action: RemoteCmdAction = actionRaw;

  let targetGamertag: string | null = null;
  if (remoteCmdNeedsTarget(action)) {
    const t =
      typeof body.targetGamertag === "string" ? body.targetGamertag.trim() : "";
    if (!t) {
      return badRequest("targetGamertag es obligatorio para spectator/survival");
    }
    if (!(await isAdminGamertag(t))) {
      return badRequest(
        "Solo se puede elegir un gamertag marcado como admin en el directorio",
      );
    }
    targetGamertag = t;
  }

  const requestedAt = new Date().toISOString();

  await prisma.minecraftSyncQueue.upsert({
    where: { id: REMOTE_CMD_QUEUE_ID },
    update: {
      data: {
        action,
        targetGamertag,
        requestedAt,
        handledAt: null,
      },
    },
    create: {
      id: REMOTE_CMD_QUEUE_ID,
      data: {
        action,
        targetGamertag,
        requestedAt,
        handledAt: null,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    action,
    targetGamertag,
    requestedAt,
  });
}

/** Addon: lee comando pendiente (GET liviano, misma fila de cola). */
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

  const row = await prisma.minecraftSyncQueue.findUnique({
    where: { id: REMOTE_CMD_QUEUE_ID },
  });
  const data = asRemoteCmdQueueData(row?.data);
  const pending =
    Boolean(data.requestedAt) && data.requestedAt !== data.handledAt;

  return NextResponse.json({
    ok: true,
    pending,
    action: pending && isRemoteCmdAction(data.action ?? "") ? data.action : null,
    targetGamertag: pending ? (data.targetGamertag ?? null) : null,
    requestedAt: data.requestedAt ?? null,
  });
}

/** Addon: confirma ejecución. */
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
    return badRequest("JSON inválido");
  }

  const requestedAt =
    typeof body.requestedAt === "string" ? body.requestedAt : "";
  if (!requestedAt) {
    return badRequest("requestedAt es requerido");
  }

  const row = await prisma.minecraftSyncQueue.findUnique({
    where: { id: REMOTE_CMD_QUEUE_ID },
  });
  if (!row) {
    return NextResponse.json({ error: "Sin cola de comandos" }, { status: 404 });
  }

  const prev = asRemoteCmdQueueData(row.data);

  await prisma.minecraftSyncQueue.update({
    where: { id: REMOTE_CMD_QUEUE_ID },
    data: {
      data: {
        action: prev.action,
        targetGamertag: prev.targetGamertag ?? null,
        requestedAt: prev.requestedAt ?? requestedAt,
        handledAt: requestedAt,
      },
    },
  });

  return NextResponse.json({ ok: true, handledAt: requestedAt });
}
