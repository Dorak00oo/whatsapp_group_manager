/** Miembros con createdAt >= ahora - esto cuentan como "nuevos" en filtros y badges. */
export const DIRECTORY_NEW_MEMBER_DAYS = 30;

/** Alta reciente y aún en comunidad (no marcó salida). */
export function memberIsNew(
  createdAtIso: string,
  leftAtIso: string | null,
  nowMs: number = Date.now(),
): boolean {
  if (leftAtIso) return false;
  const created = new Date(createdAtIso).getTime();
  const cutoff = new Date(nowMs);
  cutoff.setUTCDate(cutoff.getUTCDate() - DIRECTORY_NEW_MEMBER_DAYS);
  return created >= cutoff.getTime();
}

export type DirectoryCohort =
  | "all"
  | "admins"
  | "protected"
  | "roster"
  | "new"
  | "inactive"
  | "left";

export function parseDirectoryCohort(
  raw: string | undefined,
): DirectoryCohort {
  switch (raw) {
    case "admins":
    case "protected":
    case "roster":
    case "new":
    case "inactive":
    case "left":
      return raw;
    default:
      return "all";
  }
}
