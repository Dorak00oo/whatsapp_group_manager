import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DIRECTORY_NEW_MEMBER_DAYS } from "@/lib/directory-cohort";
import {
  REMOTE_CMD_QUEUE_ID,
  asRemoteCmdQueueData,
  isRemoteCmdAction,
  remoteCmdNeedsTarget,
  remoteCmdNeedsTargetList,
  type RemoteCmdAction,
} from "@/lib/minecraft-remote-commands";
import { prisma } from "@/lib/prisma";
import { resolveDirectoryUserId } from "@/lib/resolve-directory-user";

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

function dedupedTrimmedGamertags(members: { gamertag: string }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of members) {
    const tag = m.gamertag.trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

/** Gamertags de miembros «nuevos» (alta reciente, sin salida) para el alta rápida en el allowlist del servidor. */
async function newMemberGamertags(userId: string): Promise<string[]> {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - DIRECTORY_NEW_MEMBER_DAYS);

  const members = await prisma.directoryMember.findMany({
    where: { userId, leftAt: null, createdAt: { gte: cutoff } },
    select: { gamertag: true },
  });
  return dedupedTrimmedGamertags(members);
}

/**
 * Gamertags que ya no cuentan como roster activo (mismo criterio que el
 * export de `allowlist.json`: activo y sin salida) para darles baja del
 * allowlist del servidor con `allowlist remove`.
 */
async function inactiveOrLeftMemberGamertags(userId: string): Promise<string[]> {
  const members = await prisma.directoryMember.findMany({
    where: { userId, NOT: { active: true, leftAt: null } },
    select: { gamertag: true },
  });
  return dedupedTrimmedGamertags(members);
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
      `action debe ser uno de: spectator, survival, kill_silverfish, kill_withers, allowlist_sync`,
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

  let targetGamertagsAdd: string[] | null = null;
  let targetGamertagsRemove: string[] | null = null;
  if (remoteCmdNeedsTargetList(action)) {
    const userId = await resolveDirectoryUserId(session);
    if (!userId) return unauthorized();
    const [toAdd, toRemove] = await Promise.all([
      newMemberGamertags(userId),
      inactiveOrLeftMemberGamertags(userId),
    ]);
    if (toAdd.length === 0 && toRemove.length === 0) {
      return badRequest(
        `No hay miembros «nuevos» (alta en los últimos ${DIRECTORY_NEW_MEMBER_DAYS} días) ni inactivos/salidos para actualizar en el allowlist.`,
      );
    }
    targetGamertagsAdd = toAdd.length > 0 ? toAdd : null;
    targetGamertagsRemove = toRemove.length > 0 ? toRemove : null;
  }

  const requestedAt = new Date().toISOString();

  await prisma.minecraftSyncQueue.upsert({
    where: { id: REMOTE_CMD_QUEUE_ID },
    update: {
      data: {
        action,
        targetGamertag,
        targetGamertagsAdd,
        targetGamertagsRemove,
        requestedAt,
        handledAt: null,
      },
    },
    create: {
      id: REMOTE_CMD_QUEUE_ID,
      data: {
        action,
        targetGamertag,
        targetGamertagsAdd,
        targetGamertagsRemove,
        requestedAt,
        handledAt: null,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    action,
    targetGamertag,
    targetGamertagsAdd,
    targetGamertagsRemove,
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
    targetGamertagsAdd: pending ? (data.targetGamertagsAdd ?? null) : null,
    targetGamertagsRemove: pending ? (data.targetGamertagsRemove ?? null) : null,
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
        targetGamertagsAdd: prev.targetGamertagsAdd ?? null,
        targetGamertagsRemove: prev.targetGamertagsRemove ?? null,
        requestedAt: prev.requestedAt ?? requestedAt,
        handledAt: requestedAt,
      },
    },
  });

  return NextResponse.json({ ok: true, handledAt: requestedAt });
}
