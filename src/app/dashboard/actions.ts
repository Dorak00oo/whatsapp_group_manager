"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  recordAuditEvent,
  recordAuditEvents,
  type AuditEventInput,
} from "@/lib/audit-log";
import { diffAuditChanges, type AuditChanges } from "@/lib/audit-format";
import { recordPendingGamertagCorrection } from "@/lib/allowlist-corrected";
import {
  MAX_DIRECTORY_STRIKES,
  memberHasStrikeWithoutReason,
  parseStrikeKind,
} from "@/lib/directory-strikes";
import {
  cancelPendingAllowlistRemoval,
  enqueueAllowlistRemoval,
  enqueueAllowlistRemovalForMember,
} from "@/lib/allowlist-removal";
import {
  duplicateMcAccountMessage,
  memberMcAccounts,
  parseOptionalMcAccount,
} from "@/lib/member-mc-accounts";
import { prisma } from "@/lib/prisma";
import { parseDirectoryAge } from "@/lib/directory-age";
import { resolveDirectoryWhatsAppContact } from "@/lib/directory-whatsapp-contact";
import { parseGamertagsFromInactiveLog } from "@/lib/minecraft-inactive-log";
import {
  isMissingAgeColumnError,
  isMissingDisplayNameColumnError,
  isMissingWhatsAppUsernameColumnError,
  MISSING_AGE_COLUMN_MESSAGE,
  MISSING_DISPLAY_NAME_COLUMN_MESSAGE,
  MISSING_WHATSAPP_USERNAME_COLUMN_MESSAGE,
} from "@/lib/prisma-migration-hints";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";
import { isMemberProtected, newMemberProtectionUntil } from "@/lib/directory-protection";
import {
  blacklistMinecraftGamertagOnAllWorlds,
  recordMinecraftActiveChanges,
  syncDirectoryMembersFromMinecraftTable,
} from "@/lib/minecraft-directory-sync";
import { getPanelActor } from "@/lib/panel-session";
import { resolveDirectoryUserId } from "@/lib/resolve-directory-user";
import { revalidateDirectoryViews } from "@/lib/revalidate-directory";
import {
  parseDirectoryCsv,
  planCsvImport,
  type CsvExistingIdentity,
} from "@/lib/spreadsheet-members";
import { reconcileDirectoryAbsentActive } from "@/lib/directory-absent-clock";
import {
  absentActiveSinceForSituation,
  fieldsForLeavingGroup,
  rosterFieldsForSituation,
  type DirectoryRosterSituation,
} from "@/lib/directory-situation";

const STALE_SESSION_ERROR =
  "Sesión desactualizada respecto a la base de datos. Cierra sesión y vuelve a entrar.";

const PROFILE_AUDIT_FIELDS = [
  "gamertag",
  "mcAccount2",
  "mcAccount3",
  "displayName",
  "age",
  "phone",
  "phoneCountry",
  "whatsappUsername",
  "notes",
] as const;

async function auditPanel(
  userId: string,
  input: Omit<AuditEventInput, "userId" | "actor">,
): Promise<void> {
  const actor = await getPanelActor();
  if (!actor) return;
  await recordAuditEvent({ userId, actor, ...input });
}

function revalidateMemberViews(): void {
  revalidateDirectoryViews();
}

export async function createDirectoryMember(
  _prev: { error?: string } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return { error: STALE_SESSION_ERROR };

  const gamertag = String(formData.get("gamertag") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const usernameRaw = String(formData.get("whatsappUsername") ?? "").trim();
  const phoneIso = String(formData.get("phoneCountry") ?? "")
    .trim()
    .toUpperCase();
  const phoneNational = String(formData.get("phoneNational") ?? "");
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const ageParsed = parseDirectoryAge(formData.get("age"));
  if (!ageParsed.ok) return { error: ageParsed.error };
  const markedLeft = formData.get("markedLeft") === "on";
  const active = !markedLeft && formData.get("active") === "on";
  const isAdmin = formData.get("isAdmin") === "on";
  const banExempt = formData.get("banExempt") === "on";
  const permanentlyActive = formData.get("permanentlyActive") === "on";

  if (!gamertag) return { error: "El gamertag es obligatorio" };
  const contact = resolveDirectoryWhatsAppContact({
    phoneIso,
    phoneNational,
    usernameRaw,
  });
  if (!contact.ok) return { error: contact.error };

  const createdAt = new Date();
  let createdId: string;
  try {
    const created = await prisma.directoryMember.create({
      data: {
        gamertag,
        displayName: displayName || null,
        age: ageParsed.age,
        phone: contact.phone,
        phoneCountry: contact.phoneCountry,
        whatsappUsername: contact.whatsappUsername,
        active: markedLeft ? false : active || permanentlyActive,
        leftAt: markedLeft ? createdAt : null,
        isAdmin,
        banExempt,
        permanentlyActive,
        permanentlyActiveUntil: newMemberProtectionUntil(createdAt),
        absentWithCause: false,
        absentReason: null,
        activeHoldFromMc: false,
        notes: notesRaw || null,
        createdAt,
        userId,
      },
      select: { id: true },
    });
    createdId = created.id;
  } catch (e) {
    if (isMissingDisplayNameColumnError(e)) {
      return { error: MISSING_DISPLAY_NAME_COLUMN_MESSAGE };
    }
    if (isMissingWhatsAppUsernameColumnError(e)) {
      return { error: MISSING_WHATSAPP_USERNAME_COLUMN_MESSAGE };
    }
    if (isMissingAgeColumnError(e)) {
      return { error: MISSING_AGE_COLUMN_MESSAGE };
    }
    throw e;
  }

  await auditPanel(userId, {
    action: "member.create",
    memberId: createdId,
    memberGamertag: gamertag,
    details: { source: "formulario" },
  });

  revalidateMemberViews();
  revalidatePath("/dashboard/agregar");
  redirect("/dashboard/lista");
}

export type BulkImportResult =
  | { error: string }
  | {
      ok: true;
      created: number;
      skipped: { row: number; gamertag: string; reason: string }[];
      errors: { row: number; message: string }[];
    };

const BULK_MAX_FILE_BYTES = 3 * 1024 * 1024;
const CSV_CREATE_CHUNK = 400;

export async function bulkImportDirectoryMembers(
  _prev: BulkImportResult | null,
  formData: FormData,
): Promise<BulkImportResult> {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return { error: STALE_SESSION_ERROR };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo CSV" };
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return {
      error:
        "Solo CSV. En Excel o Sheets: Archivo → Descargar → Valores separados por comas.",
    };
  }
  if (file.size > BULK_MAX_FILE_BYTES) {
    return { error: "Archivo demasiado grande (máximo 3 MB)" };
  }

  let parsed: ReturnType<typeof parseDirectoryCsv>;
  try {
    parsed = parseDirectoryCsv(Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (parsed.length === 0) {
    return { error: "No hay filas de datos (además de la cabecera)" };
  }

  const existing: CsvExistingIdentity[] = await prisma.directoryMember.findMany({
    where: { userId },
    select: {
      gamertag: true,
      mcAccount2: true,
      mcAccount3: true,
      phone: true,
      whatsappUsername: true,
    },
  });
  const plan = planCsvImport(parsed, existing);
  const actor = await getPanelActor();
  const createdRows: { id: string; gamertag: string }[] = [];

  try {
    for (let i = 0; i < plan.create.length; i += CSV_CREATE_CHUNK) {
      const chunk = plan.create.slice(i, i + CSV_CREATE_CHUNK);
      const createdAt = new Date();
      const until = newMemberProtectionUntil(createdAt);
      const inserted = await prisma.directoryMember.createManyAndReturn({
        data: chunk.map((row) => ({
          gamertag: row.gamertag,
          mcAccount2: row.mcAccount2,
          mcAccount3: row.mcAccount3,
          displayName: row.displayName,
          age: row.age,
          phone: row.phone,
          phoneCountry: row.phoneCountry,
          whatsappUsername: row.whatsappUsername,
          active: row.active,
          leftAt: row.left ? createdAt : null,
          isAdmin: row.isAdmin,
          banExempt: row.banExempt,
          permanentlyActive: row.permanentlyActive,
          permanentlyActiveUntil: until,
          absentWithCause: row.absent,
          absentReason: row.absentReason,
          absentActiveSince: row.absent && row.active ? createdAt : null,
          activeHoldFromMc: false,
          banned: row.banned,
          bannedReason: row.bannedReason,
          notes: row.notes,
          createdAt,
          userId,
        })),
        select: { id: true, gamertag: true },
      });
      createdRows.push(...inserted);
    }
  } catch (err) {
    if (isMissingDisplayNameColumnError(err)) {
      return { error: MISSING_DISPLAY_NAME_COLUMN_MESSAGE };
    }
    if (isMissingWhatsAppUsernameColumnError(err)) {
      return { error: MISSING_WHATSAPP_USERNAME_COLUMN_MESSAGE };
    }
    if (isMissingAgeColumnError(err)) {
      return { error: MISSING_AGE_COLUMN_MESSAGE };
    }
    const msg = err instanceof Error ? err.message : "Error al guardar";
    return { error: msg };
  }

  if (actor) {
    const events: AuditEventInput[] = createdRows.map((row) => ({
      userId,
      actor,
      action: "member.create",
      memberId: row.id,
      memberGamertag: row.gamertag,
      details: { source: "csv" },
    }));
    events.push({
      userId,
      actor,
      action: "csv.import",
      details: {
        created: createdRows.length,
        skipped: plan.skipped.length,
      },
    });
    await recordAuditEvents(events);
  }

  revalidateMemberViews();
  revalidatePath("/dashboard/agregar");
  revalidatePath("/dashboard/administracion");

  return {
    ok: true,
    created: createdRows.length,
    skipped: plan.skipped.map((s) => ({
      row: s.rowNumber,
      gamertag: s.gamertag,
      reason: s.reason,
    })),
    errors: plan.errors.map((e) => ({ row: e.rowNumber, message: e.message })),
  };
}

export async function deleteDirectoryMember(id: string) {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return { error: STALE_SESSION_ERROR };

  const member = await prisma.directoryMember.findFirst({
    where: { id, userId },
    select: {
      gamertag: true,
      mcAccount2: true,
      mcAccount3: true,
      allowlistSyncedAt: true,
      allowlistRemovedAt: true,
    },
  });
  if (!member) return { error: "No encontrado" };

  await enqueueAllowlistRemovalForMember(userId, member);

  const result = await prisma.directoryMember.deleteMany({
    where: { id, userId },
  });

  if (result.count === 0) return { error: "No encontrado" };

  await auditPanel(userId, {
    action: "member.delete",
    memberId: id,
    memberGamertag: member.gamertag,
  });

  revalidateMemberViews();
  return { ok: true as const };
}

export async function updateDirectoryMemberNotes(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return { error: STALE_SESSION_ERROR };

  const id = String(formData.get("memberId") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const gamertag = String(formData.get("gamertag") ?? "").trim();
  const mcAccount2 = parseOptionalMcAccount(formData.get("mcAccount2"));
  const mcAccount3 = parseOptionalMcAccount(formData.get("mcAccount3"));
  const usernameRaw = String(formData.get("whatsappUsername") ?? "").trim();
  const phoneIso = String(formData.get("phoneCountry") ?? "")
    .trim()
    .toUpperCase();
  const phoneNational = String(formData.get("phoneNational") ?? "");
  const ageParsed = parseDirectoryAge(formData.get("age"));
  if (!ageParsed.ok) return { error: ageParsed.error };
  if (!id) return { error: "Falta el identificador" };
  if (!gamertag) return { error: "El gamertag es obligatorio" };
  const accountTags = memberMcAccounts({ gamertag, mcAccount2, mcAccount3 });
  const duplicateAccounts = duplicateMcAccountMessage(accountTags);
  if (duplicateAccounts) return { error: duplicateAccounts };

  const contact = resolveDirectoryWhatsAppContact({
    phoneIso,
    phoneNational,
    usernameRaw,
  });
  if (!contact.ok) return { error: contact.error };

  const afterProfile = {
    gamertag,
    mcAccount2,
    mcAccount3,
    displayName: displayName || null,
    age: ageParsed.age,
    phone: contact.phone,
    phoneCountry: contact.phoneCountry,
    whatsappUsername: contact.whatsappUsername,
    notes: notes || null,
  };
  let profileChanges: AuditChanges | null = null;

  try {
    const before = await prisma.directoryMember.findFirst({
      where: { id, userId },
      select: {
        gamertag: true,
        mcAccount2: true,
        mcAccount3: true,
        displayName: true,
        age: true,
        phone: true,
        phoneCountry: true,
        whatsappUsername: true,
        notes: true,
      },
    });
    if (!before) return { error: "No encontrado" };

    const taken = await prisma.directoryMember.findFirst({
      where: {
        userId,
        id: { not: id },
        OR: accountTags.flatMap((tag) => [
          { gamertag: { equals: tag, mode: "insensitive" as const } },
          { mcAccount2: { equals: tag, mode: "insensitive" as const } },
          { mcAccount3: { equals: tag, mode: "insensitive" as const } },
        ]),
      },
      select: { gamertag: true },
    });
    if (taken) {
      return {
        error: `Esa cuenta de Minecraft ya está en ${taken.gamertag}.`,
      };
    }

    profileChanges = diffAuditChanges(before, afterProfile, PROFILE_AUDIT_FIELDS);

    const updated = await prisma.directoryMember.updateMany({
      where: { id, userId },
      data: afterProfile,
    });
    if (updated.count === 0) return { error: "No encontrado" };

    if (before.gamertag.trim() !== gamertag) {
      await recordPendingGamertagCorrection(id, before.gamertag, gamertag);
    }
    const beforeKeys = new Set(
      memberMcAccounts(before).map((tag) => tag.toLowerCase()),
    );
    const added = accountTags.filter((tag) => !beforeKeys.has(tag.toLowerCase()));
    const afterKeys = new Set(accountTags.map((tag) => tag.toLowerCase()));
    const removed = memberMcAccounts(before).filter(
      (tag) => !afterKeys.has(tag.toLowerCase()),
    );
    if (added.length > 0) {
      await prisma.directoryMember.updateMany({
        where: { id, userId },
        data: { allowlistAddPending: true },
      });
    }
    for (const tag of removed) {
      await enqueueAllowlistRemoval(userId, tag, "all");
    }
  } catch (e) {
    if (isMissingDisplayNameColumnError(e)) {
      return { error: MISSING_DISPLAY_NAME_COLUMN_MESSAGE };
    }
    if (isMissingWhatsAppUsernameColumnError(e)) {
      return { error: MISSING_WHATSAPP_USERNAME_COLUMN_MESSAGE };
    }
    if (isMissingAgeColumnError(e)) {
      return { error: MISSING_AGE_COLUMN_MESSAGE };
    }
    throw e;
  }

  if (profileChanges) {
    await auditPanel(userId, {
      action: "member.update",
      memberId: id,
      memberGamertag: gamertag,
      changes: profileChanges,
    });
  }

  revalidateMemberViews();
  return null;
}

export async function setDirectoryMemberActive(id: string, active: boolean) {
  return setDirectoryMemberSituation(id, active ? "normal" : "inactive");
}

export async function toggleDirectoryMemberPermanentlyActive(id: string) {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return { error: STALE_SESSION_ERROR };

  const member = await prisma.directoryMember.findFirst({
    where: { id, userId },
    select: { permanentlyActive: true },
  });
  if (!member) return { error: "No encontrado" };

  if (member.permanentlyActive) {
    return setDirectoryMemberSituation(id, "normal");
  }
  return setDirectoryMemberSituation(id, "permanent");
}

export async function setDirectoryMemberSituation(
  id: string,
  situation: DirectoryRosterSituation,
  absentReason?: string,
) {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return { error: STALE_SESSION_ERROR };

  const before = await prisma.directoryMember.findFirst({
    where: { id, userId },
    select: {
      active: true,
      permanentlyActive: true,
      absentWithCause: true,
      absentReason: true,
      absentActiveSince: true,
      gamertag: true,
      mcAccount2: true,
      mcAccount3: true,
      allowlistSyncedAt: true,
      allowlistRemovedAt: true,
    },
  });
  if (!before) return { error: "No encontrado" };

  const reason = (absentReason ?? "").trim();
  if (situation === "absent" && !reason) {
    return { error: "La causa de la ausencia es obligatoria" };
  }

  const next = rosterFieldsForSituation(situation, before.active, reason);
  const { reactivated, deactivated } = next;
  const now = new Date();
  const keepAbsentClock =
    situation === "absent" &&
    next.active &&
    before.absentWithCause &&
    before.active &&
    before.absentActiveSince;
  const absentActiveSince = keepAbsentClock
    ? before.absentActiveSince
    : absentActiveSinceForSituation(situation, next.active, now);

  await prisma.directoryMember.updateMany({
    where: { id, userId },
    data: {
      active: next.active,
      permanentlyActive: next.permanentlyActive,
      absentWithCause: next.absentWithCause,
      absentReason: next.absentReason,
      absentActiveSince,
      activeHoldFromMc: next.activeHoldFromMc,
      ...(reactivated
        ? { allowlistAddPending: true, allowlistRemovedAt: null }
        : deactivated
          ? { allowlistAddPending: false }
          : {}),
    },
  });

  if (reactivated) {
    for (const tag of memberMcAccounts(before)) {
      await cancelPendingAllowlistRemoval(userId, tag);
    }
  } else if (deactivated) {
    await enqueueAllowlistRemovalForMember(userId, before);
  }

  const situationChanges = diffAuditChanges(
    {
      active: before.active,
      permanentlyActive: before.permanentlyActive,
      absentWithCause: before.absentWithCause,
      absentReason: before.absentReason,
    },
    {
      active: next.active,
      permanentlyActive: next.permanentlyActive,
      absentWithCause: next.absentWithCause,
      absentReason: next.absentReason,
    },
    ["active", "permanentlyActive", "absentWithCause", "absentReason"],
  );
  if (situationChanges) {
    await auditPanel(userId, {
      action: "member.update",
      memberId: id,
      memberGamertag: before.gamertag,
      changes: situationChanges,
    });
  }

  revalidateMemberViews();
  return { ok: true as const };
}

export type SyncFromMinecraftResult =
  | {
      ok: true;
      updatedRows: number;
      minecraftCount: number;
      matchedGamertags: number;
      activated: string[];
      deactivated: string[];
    }
  | { error: string };

/** Iguala activo/inactivo del directorio con la lista de Minecraft (gamertag coincidente; no toca “se salieron”). */
export async function syncDirectoryFromMinecraftPanel(): Promise<SyncFromMinecraftResult> {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return { error: STALE_SESSION_ERROR };

  try {
    const summary = await syncDirectoryMembersFromMinecraftTable(userId);
    await recordMinecraftActiveChanges(userId, summary.changes);
    if (summary.changes.length > 0) {
      await auditPanel(userId, {
        action: "mc.sync",
        details: {
          updated: summary.changes.length,
          activated: summary.activated.length,
          deactivated: summary.deactivated.length,
        },
      });
    }
    revalidateMemberViews();
    revalidatePath("/dashboard/minecraft");
    revalidatePath("/dashboard/administracion");
    return {
      ok: true,
      updatedRows: summary.updatedRows,
      minecraftCount: summary.minecraftCount,
      matchedGamertags: summary.matchedGamertags,
      activated: summary.activated,
      deactivated: summary.deactivated,
    };
  } catch (e) {
    if (isDatabaseUnreachableError(e)) {
      return {
        error:
          "No hay conexión con la base de datos. Revisa Neon o la red e inténtalo de nuevo.",
      };
    }
    throw e;
  }
}

export async function addDirectoryStrike(
  formData: FormData,
): Promise<{ error: string } | { ok: true }> {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return { error: STALE_SESSION_ERROR };

  const memberId = String(formData.get("memberId") ?? "").trim();
  const kind = parseStrikeKind(String(formData.get("kind") ?? ""));
  const reasonRaw = String(formData.get("reason") ?? "").trim();
  if (!memberId) return { error: "Jugador no válido." };

  const member = await prisma.directoryMember.findFirst({
    where: { id: memberId, userId },
    include: {
      strikes: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!member) return { error: "Jugador no encontrado." };

  if (member.strikes.length >= MAX_DIRECTORY_STRIKES) {
    return {
      error: `Máximo ${MAX_DIRECTORY_STRIKES} strikes por jugador.`,
    };
  }

  if (!reasonRaw && memberHasStrikeWithoutReason(member.strikes)) {
    return {
      error:
        "Solo puede haber un strike sin causa escrita. Añade la descripción o elimina el otro.",
    };
  }

  await prisma.directoryStrike.create({
    data: { memberId, kind, reason: reasonRaw },
  });

  await auditPanel(userId, {
    action: "strike.add",
    memberId,
    memberGamertag: member.gamertag,
    details: reasonRaw ? { reason: reasonRaw } : null,
  });

  revalidateMemberViews();
  revalidatePath("/dashboard/administracion");
  return { ok: true };
}

/** Para `<form action={…}>` que no consume el resultado JSON. */
export async function addDirectoryStrikeFromForm(
  formData: FormData,
): Promise<void> {
  await addDirectoryStrike(formData);
}

export async function removeDirectoryStrike(
  strikeId: string,
  memberId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return;

  const strike = await prisma.directoryStrike.findFirst({
    where: { id: strikeId, memberId, member: { userId } },
    select: { id: true, member: { select: { gamertag: true } } },
  });
  if (!strike) return;

  await prisma.directoryStrike.deleteMany({
    where: { id: strikeId, memberId, member: { userId } },
  });

  await auditPanel(userId, {
    action: "strike.remove",
    memberId,
    memberGamertag: strike.member.gamertag,
  });

  revalidateMemberViews();
  revalidatePath("/dashboard/administracion");
}

export async function setDirectoryMemberBan(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return;

  const memberId = String(formData.get("memberId") ?? "").trim();
  const action = String(formData.get("banAction") ?? "").trim();
  if (!memberId || !action) return;

  const member = await prisma.directoryMember.findFirst({
    where: { id: memberId, userId },
    select: {
      gamertag: true,
      mcAccount2: true,
      mcAccount3: true,
      banned: true,
      banExempt: true,
      allowlistSyncedAt: true,
      allowlistRemovedAt: true,
    },
  });
  if (!member) return;

  if (action === "unban") {
    if (!member.banned) return;
    await prisma.directoryMember.updateMany({
      where: { id: memberId, userId },
      data: { banned: false, bannedReason: null },
    });
    await auditPanel(userId, {
      action: "ban.set",
      memberId,
      memberGamertag: member.gamertag,
      changes: { banned: { from: true, to: false } },
    });
  } else if (action === "ban") {
    const bannedReason = String(formData.get("bannedReason") ?? "").trim();
    if (!bannedReason || member.banExempt) return;
    await prisma.directoryMember.updateMany({
      where: { id: memberId, userId, banExempt: false },
      data: { banned: true, bannedReason },
    });
    await enqueueAllowlistRemovalForMember(userId, member);
    await blacklistMinecraftGamertagOnAllWorlds(member.gamertag);
    await auditPanel(userId, {
      action: "ban.set",
      memberId,
      memberGamertag: member.gamertag,
      changes: { banned: { from: member.banned, to: true } },
      details: { reason: bannedReason },
    });
  }

  revalidateMemberViews();
}

export async function toggleDirectoryMemberIsAdmin(id: string) {
  const session = await auth();
  if (!session?.user) return;
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return;

  const member = await prisma.directoryMember.findFirst({
    where: { id, userId },
    select: { isAdmin: true, gamertag: true },
  });
  if (!member) return;

  const next = !member.isAdmin;
  await prisma.directoryMember.updateMany({
    where: { id, userId },
    data: { isAdmin: next },
  });

  await auditPanel(userId, {
    action: "member.update",
    memberId: id,
    memberGamertag: member.gamertag,
    changes: { isAdmin: { from: member.isAdmin, to: next } },
  });

  revalidateMemberViews();
}

export async function toggleDirectoryMemberBanExempt(id: string) {
  const session = await auth();
  if (!session?.user) return;
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return;

  const member = await prisma.directoryMember.findFirst({
    where: { id, userId },
    select: { banExempt: true, banned: true, gamertag: true },
  });
  if (!member) return;

  const next = !member.banExempt;
  await prisma.directoryMember.updateMany({
    where: { id, userId },
    data: {
      banExempt: next,
      ...(next ? { banned: false, bannedReason: null } : {}),
    },
  });

  const changes: AuditChanges = {
    banExempt: { from: member.banExempt, to: next },
  };
  if (next && member.banned) changes.banned = { from: true, to: false };
  await auditPanel(userId, {
    action: "member.update",
    memberId: id,
    memberGamertag: member.gamertag,
    changes,
  });

  revalidateMemberViews();
}

export async function setDirectoryMemberLeft(id: string, left: boolean) {
  const session = await auth();
  if (!session?.user) return;
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return;

  const member = await prisma.directoryMember.findFirst({
    where: { id, userId },
    select: {
      gamertag: true,
      mcAccount2: true,
      mcAccount3: true,
      active: true,
      leftAt: true,
      allowlistSyncedAt: true,
      allowlistRemovedAt: true,
    },
  });
  if (!member) return;

  const leftAt = left ? new Date() : null;
  await prisma.directoryMember.updateMany({
    where: { id, userId },
    data: left
      ? fieldsForLeavingGroup(leftAt ?? new Date())
      : {
          leftAt: null,
          active: true,
          absentWithCause: false,
          absentReason: null,
          absentActiveSince: null,
          activeHoldFromMc: true,
        },
  });

  if (left) {
    await enqueueAllowlistRemovalForMember(userId, member);
  } else {
    await cancelPendingAllowlistRemoval(userId, member.gamertag);
  }

  await auditPanel(userId, {
    action: "member.update",
    memberId: id,
    memberGamertag: member.gamertag,
    changes: {
      leftAt: {
        from: member.leftAt ? member.leftAt.toISOString() : null,
        to: leftAt ? leftAt.toISOString() : null,
      },
      active: { from: member.active, to: !left },
    },
  });

  revalidateMemberViews();
}

const MINECRAFT_LOG_MAX_CHARS = 400_000;

export type InactiveLogResult =
  | { error: string }
  | {
      ok: true;
      parsed: number;
      updated: number;
      alreadyInactive: number;
      skippedLeft: number;
      notFound: string[];
    };

/**
 * Solo afecta a miembros activos en comunidad (roster): active=true y sin salida.
 * Quienes ya se salieron o ya estaban inactivos no cambian de columna.
 */
export async function bulkMarkInactiveFromMinecraftLog(
  _prev: InactiveLogResult | null,
  formData: FormData,
): Promise<InactiveLogResult> {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return { error: STALE_SESSION_ERROR };

  const raw = String(formData.get("log") ?? "");
  if (raw.length > MINECRAFT_LOG_MAX_CHARS) {
    return {
      error: `Texto demasiado largo (máximo ${MINECRAFT_LOG_MAX_CHARS} caracteres)`,
    };
  }

  const gamertags = parseGamertagsFromInactiveLog(raw);
  if (gamertags.length === 0) {
    return {
      error:
        "No se detectaron líneas con [INACTIVO] … última conexión. Pega el log tal cual lo genera el servidor.",
    };
  }

  try {
    const members = await prisma.directoryMember.findMany({
      where: {
        userId,
        OR: gamertags.map((g) => ({
          gamertag: { equals: g, mode: "insensitive" as const },
        })),
      },
      select: {
        id: true,
        gamertag: true,
        active: true,
        leftAt: true,
        permanentlyActive: true,
        permanentlyActiveUntil: true,
        absentWithCause: true,
      },
    });

    const byTagLower = new Map<string, typeof members>();
    for (const row of members) {
      const k = row.gamertag.toLowerCase();
      const arr = byTagLower.get(k);
      if (arr) arr.push(row);
      else byTagLower.set(k, [row]);
    }

    const matchedLogTags = new Set<string>();
    const toDeactivate: { id: string; gamertag: string }[] = [];
    let alreadyInactive = 0;
    let skippedLeft = 0;
    const now = new Date();

    for (const g of gamertags) {
      const list = byTagLower.get(g.toLowerCase());
      if (!list?.length) continue;
      matchedLogTags.add(g.toLowerCase());
      for (const row of list) {
        if (row.leftAt != null) {
          skippedLeft++;
          continue;
        }
        if (isMemberProtected(row, now)) {
          continue;
        }
        if (!row.active) {
          alreadyInactive++;
          continue;
        }
        toDeactivate.push({ id: row.id, gamertag: row.gamertag });
      }
    }

    if (toDeactivate.length > 0) {
      await prisma.directoryMember.updateMany({
        where: {
          id: { in: toDeactivate.map((row) => row.id) },
          userId,
          active: true,
          leftAt: null,
        },
        data: { active: false },
      });
      await reconcileDirectoryAbsentActive(userId);
      const actor = await getPanelActor();
      if (actor) {
        await recordAuditEvents(
          toDeactivate.map((row) => ({
            userId,
            actor,
            action: "member.update" as const,
            memberId: row.id,
            memberGamertag: row.gamertag,
            changes: { active: { from: true, to: false } },
            details: { source: "mc.log" },
          })),
        );
      }
    }

    const notFound = gamertags.filter((g) => !matchedLogTags.has(g.toLowerCase()));

    revalidateMemberViews();
    revalidatePath("/dashboard/agregar");
    revalidatePath("/dashboard/administracion");

    return {
      ok: true,
      parsed: gamertags.length,
      updated: toDeactivate.length,
      alreadyInactive,
      skippedLeft,
      notFound,
    };
  } catch (e) {
    if (isDatabaseUnreachableError(e)) {
      return {
        error:
          "No hay conexión con la base de datos. Revisa Neon o la red e inténtalo de nuevo.",
      };
    }
    throw e;
  }
}
