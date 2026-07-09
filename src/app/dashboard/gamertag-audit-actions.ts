"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { GamertagAuditRunResult } from "@/lib/gamertag-audit";
import { runGamertagAuditWithLog } from "@/lib/gamertag-audit";
import { prisma } from "@/lib/prisma";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";
import { resolveDirectoryUserId } from "@/lib/resolve-directory-user";

const STALE_SESSION_ERROR =
  "Sesión desactualizada respecto a la base de datos. Cierra sesión y vuelve a entrar.";

export type GamertagAuditActionResult =
  | { ok: true; newGamertag?: string }
  | { error: string };

export type RunGamertagAuditResult =
  | ({ ok: true } & GamertagAuditRunResult)
  | { error: string };

/** Recalcula y sincroniza la auditoría; devuelve el log paso a paso y las sugerencias pendientes. */
export async function runGamertagAudit(): Promise<RunGamertagAuditResult> {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return { error: STALE_SESSION_ERROR };

  try {
    const result = await runGamertagAuditWithLog(userId);
    return { ok: true, ...result };
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

/**
 * Aprueba una sugerencia: sobreescribe el gamertag del miembro del directorio
 * con el gamertag visto en Minecraft. Requiere sesión (aprobación manual,
 * ninguna sugerencia se aplica sola).
 */
export async function approveGamertagAuditSuggestion(
  id: string,
): Promise<GamertagAuditActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return { error: STALE_SESSION_ERROR };

  try {
    const suggestion = await prisma.gamertagAuditSuggestion.findFirst({
      where: { id, status: "pending", directoryMember: { userId } },
    });
    if (!suggestion) {
      return { error: "La sugerencia no existe o ya fue resuelta." };
    }

    await prisma.$transaction([
      prisma.directoryMember.update({
        where: { id: suggestion.directoryMemberId },
        data: { gamertag: suggestion.suggestedGamertag },
      }),
      prisma.gamertagAuditSuggestion.update({
        where: { id },
        data: { status: "approved", decidedAt: new Date() },
      }),
    ]);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/importar");
    return { ok: true, newGamertag: suggestion.suggestedGamertag };
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

/** Rechaza una sugerencia: no cambia nada, solo queda como historial descartado. */
export async function rejectGamertagAuditSuggestion(
  id: string,
): Promise<GamertagAuditActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };
  const userId = await resolveDirectoryUserId(session);
  if (!userId) return { error: STALE_SESSION_ERROR };

  try {
    const result = await prisma.gamertagAuditSuggestion.updateMany({
      where: { id, status: "pending", directoryMember: { userId } },
      data: { status: "rejected", decidedAt: new Date() },
    });
    if (result.count === 0) {
      return { error: "La sugerencia no existe o ya fue resuelta." };
    }

    revalidatePath("/dashboard/importar");
    return { ok: true };
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
