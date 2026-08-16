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
