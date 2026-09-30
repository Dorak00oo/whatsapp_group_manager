import type { DirectoryMemberDTO } from "@/types/directory";

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
