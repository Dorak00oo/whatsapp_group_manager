import type { DirectoryMemberDTO } from "@/types/directory";

/** Días seguidos en Activos para quitar Ausente y pasar a activo normal. */
export const DIRECTORY_ABSENT_ACTIVE_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Situación de roster que se elige a mano en la ficha. */
export type DirectoryRosterSituation =
  | "normal"
  | "permanent"
  | "absent"
  | "inactive";

export function memberRosterSituation(
  m: Pick<
    DirectoryMemberDTO,
    "active" | "permanentlyActive" | "absentWithCause" | "leftAt"
  >,
): DirectoryRosterSituation | "left" {
  if (m.leftAt) return "left";
  if (m.absentWithCause) return "absent";
  // Solo el flag manual. La protección temporal (`permanentlyActiveUntil`) no
  // es esta situación: guardarla no debe dejar `permanentlyActive` en true.
  if (m.permanentlyActive) return "permanent";
  if (m.active) return "normal";
  return "inactive";
}

/** Campos de roster al cambiar de situación. Ausente no mueve de columna. */
export function rosterFieldsForSituation(
  situation: DirectoryRosterSituation,
  beforeActive: boolean,
  absentReason: string,
) {
  const stayOnRoster =
    situation === "normal" || situation === "permanent";
  const nextActive =
    situation === "absent" ? beforeActive : stayOnRoster;

  return {
    active: nextActive,
    permanentlyActive: situation === "permanent",
    absentWithCause: situation === "absent",
    absentReason: situation === "absent" ? absentReason : null,
    activeHoldFromMc: stayOnRoster || situation === "absent",
    reactivated: nextActive && !beforeActive,
    deactivated: !nextActive && beforeActive,
  };
}

/** Reloj de 7 días: solo corre si sigue ausente y en la columna de activos. */
export function absentActiveSinceForSituation(
  situation: DirectoryRosterSituation,
  nextActive: boolean,
  now: Date,
): Date | null {
  if (situation !== "absent" || !nextActive) return null;
  return now;
}

export function shouldPromoteAbsentToNormal(
  m: {
    absentWithCause: boolean;
    active: boolean;
    leftAt: Date | string | null;
    absentActiveSince: Date | string | null;
  },
  now: Date = new Date(),
): boolean {
  if (!m.absentWithCause || !m.active || m.leftAt || !m.absentActiveSince) {
    return false;
  }
  const sinceMs = new Date(m.absentActiveSince).getTime();
  if (Number.isNaN(sinceMs)) return false;
  return now.getTime() - sinceMs >= DIRECTORY_ABSENT_ACTIVE_DAYS * MS_PER_DAY;
}

/** Misma ficha que elegir activo normal a mano, ya estando en Activos. */
export function fieldsForExpiredAbsentToNormal() {
  const next = rosterFieldsForSituation("normal", true, "");
  return {
    active: next.active,
    permanentlyActive: next.permanentlyActive,
    absentWithCause: next.absentWithCause,
    absentReason: next.absentReason,
    activeHoldFromMc: next.activeHoldFromMc,
    absentActiveSince: null as Date | null,
  };
}

/**
 * Al subir a Activos (Minecraft o panel): deja de ser ausente.
 * El reloj de 7 días solo aplica a quien ya estaba en Activos y sigue ausente.
 */
export function fieldsForBecomingActive() {
  return {
    active: true,
    absentWithCause: false,
    absentReason: null as string | null,
    absentActiveSince: null as Date | null,
  };
}

/** Salida del grupo: baja de roster y caduca la protección temporal de nuevo. */
export function fieldsForLeavingGroup(now: Date) {
  return {
    leftAt: now,
    active: false,
    allowlistAddPending: false,
    absentWithCause: false,
    absentReason: null as string | null,
    absentActiveSince: null as Date | null,
    permanentlyActiveUntil: null as Date | null,
  };
}
