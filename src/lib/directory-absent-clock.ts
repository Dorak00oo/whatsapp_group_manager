import { prisma } from "@/lib/prisma";
import {
  DIRECTORY_ABSENT_ACTIVE_DAYS,
  fieldsForExpiredAbsentToNormal,
} from "@/lib/directory-situation";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Quita Ausente a quien lleva 7 días en Activos (pasa a activo normal),
 * arranca el reloj si un ausente acaba de entrar a Activos,
 * y lo pausa si vuelve a Inactivos.
 */
export async function reconcileDirectoryAbsentActive(
  userId: string,
  now: Date = new Date(),
): Promise<void> {
  const cutoff = new Date(
    now.getTime() - DIRECTORY_ABSENT_ACTIVE_DAYS * MS_PER_DAY,
  );
  const promoted = fieldsForExpiredAbsentToNormal();

  await prisma.directoryMember.updateMany({
    where: {
      userId,
      leftAt: null,
      active: true,
      absentWithCause: true,
      absentActiveSince: { lte: cutoff },
    },
    data: {
      active: promoted.active,
      permanentlyActive: promoted.permanentlyActive,
      absentWithCause: promoted.absentWithCause,
      absentReason: promoted.absentReason,
      activeHoldFromMc: promoted.activeHoldFromMc,
      absentActiveSince: null,
    },
  });

  await prisma.directoryMember.updateMany({
    where: {
      userId,
      leftAt: null,
      active: true,
      absentWithCause: true,
      absentActiveSince: null,
    },
    data: { absentActiveSince: now },
  });

  await prisma.directoryMember.updateMany({
    where: {
      userId,
      absentWithCause: true,
      absentActiveSince: { not: null },
      OR: [{ active: false }, { leftAt: { not: null } }],
    },
    data: { absentActiveSince: null },
  });
}
