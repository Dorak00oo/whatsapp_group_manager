export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** México 521 vs 52 y Argentina 549 vs 54 (JIDs de WhatsApp vs E.164 del directorio). */
export function phonesLikelySame(a: string, b: string): boolean {
  const da = phoneDigits(a);
  const db = phoneDigits(b);
  if (!da || !db) return false;
  if (da === db) return true;

  const variants = (d: string): Set<string> => {
    const out = new Set([d]);
    if (d.startsWith("521") && d.length >= 13) out.add(`52${d.slice(3)}`);
    if (d.startsWith("52") && !d.startsWith("521") && d.length >= 12) {
      out.add(`521${d.slice(2)}`);
    }
    if (d.startsWith("549") && d.length >= 12) out.add(`54${d.slice(3)}`);
    if (d.startsWith("54") && !d.startsWith("549") && d.length >= 11) {
      out.add(`549${d.slice(2)}`);
    }
    return out;
  };

  const va = variants(da);
  for (const x of variants(db)) {
    if (va.has(x)) return true;
  }
  return false;
}

export type RosterEvent = "join" | "leave";

export type MemberAction =
  | { type: "noop" }
  | { type: "create" }
  | { type: "restore"; memberId: string }
  | { type: "mark_left"; memberId: string };

export function planWhatsAppRosterChange(
  member: { id: string; leftAt: Date | null } | null,
  event: RosterEvent,
): MemberAction {
  if (event === "join") {
    if (!member) return { type: "create" };
    if (member.leftAt != null) return { type: "restore", memberId: member.id };
    return { type: "noop" };
  }
  if (!member || member.leftAt != null) return { type: "noop" };
  return { type: "mark_left", memberId: member.id };
}

export function placeholderGamertag(digits: string, name?: string): string {
  const trimmed = (name ?? "").trim();
  if (trimmed && !/^\d[\d\s+]{6,}$/.test(trimmed)) {
    return trimmed.slice(0, 64);
  }
  return `wa-${digits}`;
}

export function findMemberByPhone<T extends { phone: string }>(
  members: T[],
  incomingPhone: string,
): T | undefined {
  return members.find((m) => phonesLikelySame(m.phone, incomingPhone));
}
