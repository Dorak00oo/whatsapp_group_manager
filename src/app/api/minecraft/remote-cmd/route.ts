import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  markAllowlistAddsCompleted,
  markCorrectedAllowlistSynced,
  pendingCorrectedAllowlistSync,
} from "@/lib/allowlist-corrected";
import {
  markAllowlistRemovesCompleted,
  pendingAllowlistRemovalGamertags,
} from "@/lib/allowlist-removal";
import { DIRECTORY_NEW_MEMBER_DAYS } from "@/lib/directory-cohort";
import {
  REMOTE_CMD_QUEUE_ID,
  asRemoteCmdQueueData,
  isRemoteCmdAction,
  remoteCmdActionForAddon,
  remoteCmdNeedsTarget,
  remoteCmdNeedsTargetList,
  type RemoteCmdAction,
} from "@/lib/minecraft-remote-commands";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/prisma-retry";
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
  const row = await withDbRetry(() =>
    prisma.directoryMember.findFirst({
      where: {
        isAdmin: true,
        gamertag: { equals: trimmed, mode: "insensitive" },
      },
      select: { id: true },
    }),
  );
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

function resolveAllowlistBatch(
  toAdd: string[],
  toRemove: string[],
): { toAdd: string[]; toRemove: string[] } {
  const removeSet = new Set(toRemove);
  const addFiltered = toAdd.filter((tag) => !removeSet.has(tag));
  const addSet = new Set(addFiltered);
  const removeFiltered = toRemove.filter((tag) => !addSet.has(tag));
  return { toAdd: addFiltered, toRemove: removeFiltered };
}

/** Miembros nuevos activos que aún no se sincronizaron al allowlist del servidor. */
async function newMemberGamertags(
  userId: string,
  blockedFromAdd: Set<string>,
): Promise<string[]> {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - DIRECTORY_NEW_MEMBER_DAYS);

  const members = await withDbRetry(() =>
    prisma.directoryMember.findMany({
      where: {
        userId,
        leftAt: null,
        active: true,
        allowlistSyncedAt: null,
        createdAt: { gte: cutoff },
      },
      select: { gamertag: true },
    }),
  );
  return dedupedTrimmedGamertags(members).filter(
    (tag) => !blockedFromAdd.has(tag.toLowerCase()),
  );
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
      `action debe ser uno de: spectator, survival, kill_silverfish, kill_withers, allowlist_sync, allowlist_sync_corrected`,
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
  let pendingCorrectionIds: string[] | null = null;
  let skippedCorrections: { oldGamertag: string; newGamertag: string; reason: string }[] = [];

  if (remoteCmdNeedsTargetList(action)) {
    const userId = await resolveDirectoryUserId(session);
    if (!userId) return unauthorized();

    if (action === "allowlist_sync") {
      const blockedFromAdd = new Set(
        (await pendingAllowlistRemovalGamertags(userId)).map((t) =>
          t.toLowerCase(),
        ),
      );
      const [toAddRaw, toRemoveRaw] = await Promise.all([
        newMemberGamertags(userId, blockedFromAdd),
        pendingAllowlistRemovalGamertags(userId),
      ]);
      const { toAdd, toRemove } = resolveAllowlistBatch(toAddRaw, toRemoveRaw);
      if (toAdd.length === 0 && toRemove.length === 0) {
        return badRequest(
          `No hay miembros «nuevos» (alta en los últimos ${DIRECTORY_NEW_MEMBER_DAYS} días) ni bajas pendientes para actualizar en el allowlist.`,
        );
      }
      targetGamertagsAdd = toAdd.length > 0 ? toAdd : null;
      targetGamertagsRemove = toRemove.length > 0 ? toRemove : null;
    } else {
      const corrected = await withDbRetry(() =>
        pendingCorrectedAllowlistSync(userId),
      );
      skippedCorrections = corrected.skipped;
      const blockedFromAdd = new Set(
        (await pendingAllowlistRemovalGamertags(userId)).map((t) =>
          t.toLowerCase(),
        ),
      );
      const toAddRaw = corrected.toAdd.filter(
        (tag) => !blockedFromAdd.has(tag.toLowerCase()),
      );
      const { toAdd, toRemove } = resolveAllowlistBatch(
        toAddRaw,
        corrected.toRemove,
      );
      if (toAdd.length === 0 && toRemove.length === 0) {
        if (corrected.skipped.length > 0) {
          return badRequest(
            `No hay correcciones válidas para sincronizar: ${corrected.skipped.length} descartada(s) por tener un gamertag con pinta de error de tipeo (revisa la ficha del miembro). Detalle: ${corrected.skipped
              .map((s) => `"${s.oldGamertag}"→"${s.newGamertag}"`)
              .join(", ")}`,
          );
        }
        return badRequest(
          "No hay correcciones de gamertag ni reactivaciones manuales pendientes de sincronizar con el allowlist del servidor.",
        );
      }
      targetGamertagsAdd =
        toAdd.length > 0 ? toAdd : null;
      targetGamertagsRemove =
        toRemove.length > 0 ? toRemove : null;
      pendingCorrectionIds =
        corrected.correctionIds.length > 0 ? corrected.correctionIds : null;
    }
  }

  const requestedAt = new Date().toISOString();

  await withDbRetry(() =>
    prisma.minecraftSyncQueue.upsert({
      where: { id: REMOTE_CMD_QUEUE_ID },
      update: {
        data: {
          action,
          targetGamertag,
          targetGamertagsAdd,
          targetGamertagsRemove,
          pendingCorrectionIds,
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
          pendingCorrectionIds,
          requestedAt,
          handledAt: null,
        },
      },
    }),
  );

  return NextResponse.json({
    ok: true,
    action,
    targetGamertag,
    targetGamertagsAdd,
    targetGamertagsRemove,
    pendingCorrectionIds,
    skippedCorrections,
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

  const row = await withDbRetry(() =>
    prisma.minecraftSyncQueue.findUnique({ where: { id: REMOTE_CMD_QUEUE_ID } }),
  );
  const data = asRemoteCmdQueueData(row?.data);
  const pending =
    Boolean(data.requestedAt) && data.requestedAt !== data.handledAt;
  const storedAction = pending && isRemoteCmdAction(data.action ?? "") ? data.action : null;
  const action = storedAction ? remoteCmdActionForAddon(storedAction) : null;

  return NextResponse.json({
    ok: true,
    pending,
    action,
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

  const row = await withDbRetry(() =>
    prisma.minecraftSyncQueue.findUnique({ where: { id: REMOTE_CMD_QUEUE_ID } }),
  );
  if (!row) {
    return NextResponse.json({ error: "Sin cola de comandos" }, { status: 404 });
  }

  const prev = asRemoteCmdQueueData(row.data);

  await withDbRetry(() =>
    prisma.minecraftSyncQueue.update({
      where: { id: REMOTE_CMD_QUEUE_ID },
      data: {
        data: {
          action: prev.action,
          targetGamertag: prev.targetGamertag ?? null,
          targetGamertagsAdd: prev.targetGamertagsAdd ?? null,
          targetGamertagsRemove: prev.targetGamertagsRemove ?? null,
          pendingCorrectionIds: prev.pendingCorrectionIds ?? null,
          requestedAt: prev.requestedAt ?? requestedAt,
          handledAt: requestedAt,
        },
      },
    }),
  );

  const pendingCorrectionIds = prev.pendingCorrectionIds;
  const addedGamertags = prev.targetGamertagsAdd;
  const removedGamertags = prev.targetGamertagsRemove;
  const storedAction = prev.action;

  if (Array.isArray(pendingCorrectionIds) && pendingCorrectionIds.length > 0) {
    await withDbRetry(() => markCorrectedAllowlistSynced(pendingCorrectionIds));
  }

  const email = process.env.COMMUNITY_EMAIL?.trim().toLowerCase();
  const owner =
    email &&
    (storedAction === "allowlist_sync" ||
      storedAction === "allowlist_sync_corrected")
      ? await withDbRetry(() =>
          prisma.user.findUnique({ where: { email }, select: { id: true } }),
        )
      : null;

  if (
    owner &&
    Array.isArray(addedGamertags) &&
    addedGamertags.length > 0 &&
    (storedAction === "allowlist_sync" || storedAction === "allowlist_sync_corrected")
  ) {
    await withDbRetry(() =>
      markAllowlistAddsCompleted(owner.id, addedGamertags),
    );
  }

  if (
    owner &&
    Array.isArray(removedGamertags) &&
    removedGamertags.length > 0 &&
    (storedAction === "allowlist_sync" || storedAction === "allowlist_sync_corrected")
  ) {
    await withDbRetry(() =>
      markAllowlistRemovesCompleted(owner.id, removedGamertags),
    );
  }

  return NextResponse.json({ ok: true, handledAt: requestedAt });
}
