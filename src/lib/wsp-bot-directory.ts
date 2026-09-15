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

/** Gamertag que mandó `.addwsp`. Vacío / solo espacios = no hay alta. */
export function explicitJoinGamertag(raw?: string | null): string | null {
  const tag = (raw ?? "").trim().slice(0, 64);
  return tag || null;
}

/**
 * Gamertag para un alta. Solo el del comando `.addwsp`.
 * Sin gamertag no se crea ficha (el join del grupo ya no da de alta).
 */
export function gamertagForJoin(
  _digits: string,
  _name?: string,
  gamertag?: string,
): string | null {
  return explicitJoinGamertag(gamertag);
}

/**
 * En un reingreso, rellena displayName solo si estaba vacío.
 * `undefined` = no tocar el campo.
 */
export function displayNameForRestore(
  existing: string | null | undefined,
  incoming?: string | null,
): string | undefined {
  if ((existing ?? "").trim()) return undefined;
  const next = (incoming ?? "").trim();
  return next || undefined;
}

function usernameKey(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

export function findMemberByPhone<T extends { phone: string | null }>(
  members: T[],
  incomingPhone: string | null | undefined,
): T | undefined {
  if (!incomingPhone?.trim()) return undefined;
  return members.find(
    (m) => Boolean(m.phone) && phonesLikelySame(m.phone as string, incomingPhone),
  );
}

export function findMemberByUsername<T extends { whatsappUsername?: string | null }>(
  members: T[],
  incoming: string | null | undefined,
): T | undefined {
  const n = usernameKey(incoming);
  if (!n) return undefined;
  return members.find((m) => usernameKey(m.whatsappUsername) === n);
}

export function findMemberByWhatsAppIdentity<
  T extends { phone: string | null; whatsappUsername?: string | null },
>(
  members: T[],
  identity: { phone?: string | null; username?: string | null },
): T | undefined {
  return (
    findMemberByPhone(members, identity.phone) ??
    findMemberByUsername(members, identity.username)
  );
}
