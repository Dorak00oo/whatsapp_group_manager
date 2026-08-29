import { NextResponse } from "next/server";
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
  requireMinecraftAddon,
  requireMinecraftPanel,
  unauthorizedMinecraft,
} from "@/lib/minecraft-api-context";
import {
  readMinecraftQueueRow,
  updateMinecraftQueueData,
  upsertMinecraftQueue,
} from "@/lib/minecraft-queue";
import {
  REMOTE_CMD_ACTIONS,
  asRemoteCmdQueueData,
  isRemoteCmdAction,
  parseTpCoords,
  remoteCmdActionForAddon,
  remoteCmdNeedsDestination,
  remoteCmdNeedsTarget,
  remoteCmdNeedsTargetList,
  type RemoteCmdAction,
} from "@/lib/minecraft-remote-commands";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/prisma-retry";
import { resolveDirectoryUserId } from "@/lib/resolve-directory-user";
import { auth } from "@/auth";
import type { MinecraftServerId } from "@/lib/minecraft-server";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
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

export async function POST(request: Request) {
  const authz = await requireMinecraftPanel();
  if (!authz.ok) return authz.response;
  const { serverId } = authz;

  const session = await auth();
  if (!session?.user) return unauthorizedMinecraft();

  let body: {
    action?: unknown;
    targetGamertag?: unknown;
    destinationGamertag?: unknown;
    destinationX?: unknown;
    destinationY?: unknown;
    destinationZ?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return badRequest("JSON inválido");
  }

  const actionRaw =
    typeof body.action === "string" ? body.action.trim() : "";
  if (!isRemoteCmdAction(actionRaw)) {
    return badRequest(
      `action debe ser uno de: ${REMOTE_CMD_ACTIONS.join(", ")}`,
    );
  }
  const action: RemoteCmdAction = actionRaw;

  let targetGamertag: string | null = null;
  if (remoteCmdNeedsTarget(action)) {
    const t =
      typeof body.targetGamertag === "string" ? body.targetGamertag.trim() : "";
    if (!t) {
      return badRequest(
        action === "tp"
          ? "targetGamertag (moderador) es obligatorio para tp"
          : action === "extinguish_fire"
            ? "targetGamertag (moderador) es obligatorio para apagar fuego"
            : "targetGamertag es obligatorio para spectator/survival",
      );
    }
    if (!(await isAdminGamertag(t))) {
      return badRequest(
        "Solo se puede elegir un gamertag marcado como admin en el directorio",
      );
    }
    targetGamertag = t;
  }

  let destinationGamertag: string | null = null;
  let destinationX: string | null = null;
  let destinationY: string | null = null;
  let destinationZ: string | null = null;
  if (remoteCmdNeedsDestination(action)) {
    const hasCoordFields =
      body.destinationX !== undefined ||
      body.destinationY !== undefined ||
      body.destinationZ !== undefined;

    if (hasCoordFields) {
      const parsed = parseTpCoords({
        x: body.destinationX,
        y: body.destinationY,
        z: body.destinationZ,
      });
      if ("error" in parsed) return badRequest(parsed.error);
      destinationX = parsed.x;
      destinationY = parsed.y;
      destinationZ = parsed.z;
    } else {
      const d =
        typeof body.destinationGamertag === "string"
          ? body.destinationGamertag.trim()
          : "";
      if (!d) {
        return badRequest(
          "destinationGamertag o coordenadas (destinationX/Y/Z) son obligatorios para tp",
        );
      }
      if (targetGamertag && d.toLowerCase() === targetGamertag.toLowerCase()) {
        return badRequest(
          "Origen y destino del tp deben ser jugadores distintos",
        );
      }
      destinationGamertag = d;
    }
  }

  let targetGamertagsAdd: string[] | null = null;
  let targetGamertagsRemove: string[] | null = null;
  let pendingCorrectionIds: string[] | null = null;
  let skippedCorrections: { oldGamertag: string; newGamertag: string; reason: string }[] = [];

  if (remoteCmdNeedsTargetList(action)) {
    const userId = await resolveDirectoryUserId(session);
    if (!userId) return unauthorizedMinecraft();

    if (action === "allowlist_sync") {
      const blockedFromAdd = new Set(
        (await pendingAllowlistRemovalGamertags(userId, serverId)).map((t) =>
          t.toLowerCase(),
        ),
      );
      const [toAddRaw, toRemoveRaw] = await Promise.all([
        newMemberGamertags(userId, blockedFromAdd),
        pendingAllowlistRemovalGamertags(userId, serverId),
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
        pendingCorrectedAllowlistSync(userId, serverId),
      );
      skippedCorrections = corrected.skipped;
      const blockedFromAdd = new Set(
        (await pendingAllowlistRemovalGamertags(userId, serverId)).map((t) =>
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
      targetGamertagsAdd = toAdd.length > 0 ? toAdd : null;
      targetGamertagsRemove = toRemove.length > 0 ? toRemove : null;
      pendingCorrectionIds =
        corrected.correctionIds.length > 0 ? corrected.correctionIds : null;
    }
  }

  const requestedAt = new Date().toISOString();

  await withDbRetry(() =>
    upsertMinecraftQueue(serverId, "panel_remote_cmd", {
      action,
      targetGamertag,
      destinationGamertag,
      destinationX,
      destinationY,
      destinationZ,
      targetGamertagsAdd,
      targetGamertagsRemove,
      pendingCorrectionIds,
      requestedAt,
      handledAt: null,
    }),
  );

  return NextResponse.json({
    ok: true,
    action,
    targetGamertag,
    destinationGamertag,
    destinationX,
    destinationY,
    destinationZ,
    targetGamertagsAdd,
    targetGamertagsRemove,
    pendingCorrectionIds,
    skippedCorrections,
    requestedAt,
  });
}

export async function GET(request: Request) {
  const authz = await requireMinecraftAddon(request);
  if (!authz.ok) return authz.response;

  const found = await withDbRetry(() =>
    readMinecraftQueueRow(authz.serverId, "panel_remote_cmd"),
  );
  const data = asRemoteCmdQueueData(found?.data);
  const pending =
    Boolean(data.requestedAt) && data.requestedAt !== data.handledAt;
  const storedAction = pending && isRemoteCmdAction(data.action ?? "") ? data.action : null;
  const action = storedAction ? remoteCmdActionForAddon(storedAction) : null;

  return NextResponse.json({
    ok: true,
    pending,
    action,
    targetGamertag: pending ? (data.targetGamertag ?? null) : null,
    destinationGamertag: pending ? (data.destinationGamertag ?? null) : null,
    destinationX: pending ? (data.destinationX ?? null) : null,
    destinationY: pending ? (data.destinationY ?? null) : null,
    destinationZ: pending ? (data.destinationZ ?? null) : null,
    targetGamertagsAdd: pending ? (data.targetGamertagsAdd ?? null) : null,
    targetGamertagsRemove: pending ? (data.targetGamertagsRemove ?? null) : null,
    requestedAt: data.requestedAt ?? null,
  });
}

export async function PUT(request: Request) {
  let body: { requestedAt?: unknown; serverId?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return badRequest("JSON inválido");
  }

  const authz = await requireMinecraftAddon(request, body);
  if (!authz.ok) return authz.response;
  const serverId: MinecraftServerId = authz.serverId;

  const requestedAt =
    typeof body.requestedAt === "string" ? body.requestedAt : "";
  if (!requestedAt) {
    return badRequest("requestedAt es requerido");
  }

  const found = await withDbRetry(() =>
    readMinecraftQueueRow(serverId, "panel_remote_cmd"),
  );
  if (!found) {
    return NextResponse.json({ error: "Sin cola de comandos" }, { status: 404 });
  }

  const prev = asRemoteCmdQueueData(found.data);

  await withDbRetry(() =>
    updateMinecraftQueueData(found.id, {
      action: prev.action,
      targetGamertag: prev.targetGamertag ?? null,
      destinationGamertag: prev.destinationGamertag ?? null,
      destinationX: prev.destinationX ?? null,
      destinationY: prev.destinationY ?? null,
      destinationZ: prev.destinationZ ?? null,
      targetGamertagsAdd: prev.targetGamertagsAdd ?? null,
      targetGamertagsRemove: prev.targetGamertagsRemove ?? null,
      pendingCorrectionIds: prev.pendingCorrectionIds ?? null,
      requestedAt: prev.requestedAt ?? requestedAt,
      handledAt: requestedAt,
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
      markAllowlistRemovesCompleted(owner.id, removedGamertags, serverId),
    );
  }

  return NextResponse.json({ ok: true, handledAt: requestedAt });
}
