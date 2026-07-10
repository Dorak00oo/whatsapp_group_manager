import { prisma } from "@/lib/prisma";

export type CorrectedAllowlistSync = {
  toAdd: string[];
  toRemove: string[];
  correctionIds: string[];
  /** Correcciones descartadas por tener un gamertag con pinta de error de tipeo (no se envían al servidor). */
  skipped: { oldGamertag: string; newGamertag: string; reason: string }[];
};

/**
 * Los gamertags de Xbox Live tienen máximo ~15-16 caracteres. Si algo excede
 * ese límite (p. ej. un error de tipeo al editar el gamertag a mano, como
 * "Drako2744444444" en vez de "Drako274") probablemente no es un gamertag
 * real: mandarlo tal cual al `allowList` nativo del servidor puede fallar de
 * forma imprevisible en el addon. Mejor descartarlo aquí antes de encolarlo.
 */
const MAX_GAMERTAG_LENGTH = 16;

function isPlausibleGamertag(name: string): boolean {
  return name.length > 0 && name.length <= MAX_GAMERTAG_LENGTH;
}

type PendingCorrectionRow = {
  id: string;
  directoryMemberId: string;
  oldGamertag: string;
  newGamertag: string;
};

/**
 * Varias ediciones seguidas del mismo miembro generan una cadena de correcciones.
 * Solo el gamertag final debe darse de alta; el resto de nombres de la cadena
 * (el original y los intermedios) deben quitarse del allowlist.
 */
export function collapseMemberCorrections(
  rows: PendingCorrectionRow[],
): {
  toAdd: string;
  toRemove: string[];
  correctionIds: string[];
} | null {
  if (rows.length === 0) return null;

  const finalNew = rows[rows.length - 1]!.newGamertag;
  const mentioned = new Set<string>();
  for (const row of rows) {
    mentioned.add(row.oldGamertag);
    mentioned.add(row.newGamertag);
  }
  mentioned.delete(finalNew);

  return {
    toAdd: finalNew,
    toRemove: [...mentioned],
    correctionIds: rows.map((r) => r.id),
  };
}

/**
 * Registra que el gamertag de un miembro cambió (por aprobar una sugerencia
 * de auditoría o por edición manual desde la ficha) y aún no se reflejó en el
 * allowlist real del servidor. No hace nada si no hay cambio real de texto.
 */
export async function recordPendingGamertagCorrection(
  directoryMemberId: string,
  oldGamertag: string,
  newGamertag: string,
): Promise<void> {
  const oldTag = oldGamertag.trim();
  const newTag = newGamertag.trim();
  if (!oldTag || !newTag || oldTag === newTag) return;

  await prisma.pendingGamertagCorrection.create({
    data: { directoryMemberId, oldGamertag: oldTag, newGamertag: newTag },
  });
}

/**
 * Correcciones de gamertag (por auditoría aprobada o edición manual) que aún
 * no se reflejaron en el allowlist nativo del servidor.
 */
export async function pendingCorrectedAllowlistSync(
  userId: string,
): Promise<CorrectedAllowlistSync> {
  const rows = await prisma.pendingGamertagCorrection.findMany({
    where: { syncedAt: null, directoryMember: { userId } },
    select: {
      id: true,
      directoryMemberId: true,
      oldGamertag: true,
      newGamertag: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const byMember = new Map<string, PendingCorrectionRow[]>();
  for (const row of rows) {
    const list = byMember.get(row.directoryMemberId) ?? [];
    list.push(row);
    byMember.set(row.directoryMemberId, list);
  }

  const toAdd: string[] = [];
  const toRemove: string[] = [];
  const correctionIds: string[] = [];
  const skipped: CorrectedAllowlistSync["skipped"] = [];
  const seenAdd = new Set<string>();
  const seenRemove = new Set<string>();

  for (const memberRows of byMember.values()) {
    const collapsed = collapseMemberCorrections(memberRows);
    if (!collapsed) continue;

    const firstOld = memberRows[0]!.oldGamertag;
    if (!isPlausibleGamertag(collapsed.toAdd)) {
      skipped.push({
        oldGamertag: firstOld,
        newGamertag: collapsed.toAdd,
        reason: `Gamertag con más de ${MAX_GAMERTAG_LENGTH} caracteres, revisa si hay un error de tipeo en la ficha del miembro.`,
      });
      continue;
    }

    correctionIds.push(...collapsed.correctionIds);

    if (!seenAdd.has(collapsed.toAdd)) {
      seenAdd.add(collapsed.toAdd);
      toAdd.push(collapsed.toAdd);
    }
    for (const name of collapsed.toRemove) {
      if (name === collapsed.toAdd || seenRemove.has(name)) continue;
      seenRemove.add(name);
      toRemove.push(name);
    }
  }

  return { toAdd, toRemove, correctionIds, skipped };
}

export async function markCorrectedAllowlistSynced(
  correctionIds: string[],
): Promise<void> {
  if (correctionIds.length === 0) return;
  await prisma.pendingGamertagCorrection.updateMany({
    where: { id: { in: correctionIds } },
    data: { syncedAt: new Date() },
  });
}
