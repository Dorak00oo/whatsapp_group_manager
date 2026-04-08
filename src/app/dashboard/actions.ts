"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizePhoneForDirectory,
  normalizePhoneFreeform,
} from "@/lib/phone-normalize";
import {
  isMissingDisplayNameColumnError,
  MISSING_DISPLAY_NAME_COLUMN_MESSAGE,
} from "@/lib/prisma-migration-hints";
import { resolveDirectoryUserId } from "@/lib/resolve-directory-user";
import { parseMemberSpreadsheet } from "@/lib/spreadsheet-members";

const STALE_SESSION_ERROR =
  "Sesión desactualizada respecto a la base de datos. Cierra sesión y vuelve a entrar.";

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
  const phoneIso = String(formData.get("phoneCountry") ?? "")
    .trim()
    .toUpperCase();
  const phoneNational = String(formData.get("phoneNational") ?? "");
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const markedLeft = formData.get("markedLeft") === "on";
  const active = !markedLeft && formData.get("active") === "on";
  const isAdmin = formData.get("isAdmin") === "on";
  const banExempt = formData.get("banExempt") === "on";

  if (!gamertag) return { error: "El gamertag es obligatorio" };
  const normalized = normalizePhoneForDirectory(phoneIso, phoneNational);
  if (!normalized.ok) {
    return { error: normalized.error };
  }
  const { phone, phoneCountry } = normalized;

  try {
    await prisma.directoryMember.create({
      data: {
        gamertag,
        displayName: displayName || null,
        phone,
        phoneCountry,
        active: markedLeft ? false : active,
        leftAt: markedLeft ? new Date() : null,
        isAdmin,
        banExempt,
        notes: notesRaw || null,
        userId,
      },
    });
  } catch (e) {
    if (isMissingDisplayNameColumnError(e)) {
      return { error: MISSING_DISPLAY_NAME_COLUMN_MESSAGE };
    }
    throw e;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agregar");
  redirect("/dashboard");
}

export type BulkImportResult =
  | { error: string }
  | {
      ok: true;
      created: number;
      errors: { row: number; sheet?: string; message: string }[];
    };

const BULK_MAX_FILE_BYTES = 3 * 1024 * 1024;

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
    return {
      error:
        "Selecciona un archivo: Excel (.xlsx, .xls), CSV o TSV (exportación desde Google Sheets)",
    };
  }

  const lower = file.name.toLowerCase();
  const allowed =
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".csv") ||
    lower.endsWith(".tsv");
  if (!allowed) {
    return {
      error:
        "Formatos admitidos: .xlsx, .xls, .csv, .tsv (en Sheets: Archivo → Descargar → Excel o Valores separados por comas)",
    };
  }
  if (file.size > BULK_MAX_FILE_BYTES) {
    return { error: "Archivo demasiado grande (máximo 3 MB)" };
  }

  let rows: ReturnType<typeof parseMemberSpreadsheet>;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    rows = parseMemberSpreadsheet(buf, file.name);
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (rows.length === 0) {
    return { error: "No hay filas de datos (además de la cabecera)" };
  }

  const errors: { row: number; sheet?: string; message: string }[] = [];
  let created = 0;

  for (const row of rows) {
    const loc = { row: row.rowNumber, sheet: row.sheetName };
    if (!row.gamertag) {
      errors.push({ ...loc, message: "Falta gamertag" });
      continue;
    }
    if (!row.telefono) {
      errors.push({ ...loc, message: "Falta teléfono" });
      continue;
    }

    const phoneResult = normalizePhoneFreeform(row.telefono, row.pais);
    if (!phoneResult.ok) {
      errors.push({ ...loc, message: phoneResult.error });
      continue;
    }

    try {
      await prisma.directoryMember.create({
        data: {
          gamertag: row.gamertag,
          displayName: row.displayName,
          phone: phoneResult.phone,
          phoneCountry: phoneResult.phoneCountry,
          active: row.seSalio ? false : row.activo,
          leftAt: row.seSalio ? new Date() : null,
          isAdmin: row.admin,
          banExempt: row.protegido,
          notes: row.notas,
          userId,
        },
      });
      created++;
    } catch (err) {
      if (isMissingDisplayNameColumnError(err)) {
        return { error: MISSING_DISPLAY_NAME_COLUMN_MESSAGE };
      }
      const msg = err instanceof Error ? err.message : "Error al guardar";
      errors.push({ ...loc, message: msg });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agregar");

  return { ok: true, created, errors };
}

export async function deleteDirectoryMember(id: string) {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return { error: STALE_SESSION_ERROR };

  const result = await prisma.directoryMember.deleteMany({
    where: { id, userId },
  });

  if (result.count === 0) return { error: "No encontrado" };

  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function updateDirectoryMemberNotes(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return;

  const id = String(formData.get("memberId") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!id) return;

  await prisma.directoryMember.updateMany({
    where: { id, userId },
    data: {
      notes: notes || null,
      displayName: displayName || null,
    },
  });

  revalidatePath("/dashboard");
}

export async function setDirectoryMemberActive(id: string, active: boolean) {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return { error: STALE_SESSION_ERROR };

  const result = await prisma.directoryMember.updateMany({
    where: { id, userId },
    data: { active },
  });

  if (result.count === 0) return { error: "No encontrado" };

  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function addDirectoryStrike(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return;

  const memberId = String(formData.get("memberId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!memberId || !reason) return;

  const member = await prisma.directoryMember.findFirst({
    where: { id: memberId, userId },
  });
  if (!member) return;

  await prisma.directoryStrike.create({
    data: { memberId, reason },
  });

  revalidatePath("/dashboard");
}

export async function setDirectoryMemberBan(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return;

  const memberId = String(formData.get("memberId") ?? "").trim();
  const action = String(formData.get("banAction") ?? "").trim();
  if (!memberId || !action) return;

  if (action === "unban") {
    await prisma.directoryMember.updateMany({
      where: { id: memberId, userId },
      data: { banned: false, bannedReason: null },
    });
  } else if (action === "ban") {
    const bannedReason = String(formData.get("bannedReason") ?? "").trim();
    if (!bannedReason) return;
    await prisma.directoryMember.updateMany({
      where: {
        id: memberId,
        userId,
        banExempt: false,
      },
      data: { banned: true, bannedReason },
    });
  }

  revalidatePath("/dashboard");
}

export async function toggleDirectoryMemberIsAdmin(id: string) {
  const session = await auth();
  if (!session?.user) return;
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return;

  const member = await prisma.directoryMember.findFirst({
    where: { id, userId },
    select: { isAdmin: true },
  });
  if (!member) return;

  await prisma.directoryMember.updateMany({
    where: { id, userId },
    data: { isAdmin: !member.isAdmin },
  });

  revalidatePath("/dashboard");
}

export async function toggleDirectoryMemberBanExempt(id: string) {
  const session = await auth();
  if (!session?.user) return;
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return;

  const member = await prisma.directoryMember.findFirst({
    where: { id, userId },
    select: { banExempt: true },
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

  revalidatePath("/dashboard");
}

export async function setDirectoryMemberLeft(id: string, left: boolean) {
  const session = await auth();
  if (!session?.user) return;
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return;

  await prisma.directoryMember.updateMany({
    where: { id, userId },
    data: left
      ? { leftAt: new Date(), active: false }
      : { leftAt: null },
  });

  revalidatePath("/dashboard");
}
