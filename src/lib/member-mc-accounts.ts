/** Cuentas de Minecraft de una ficha: la principal y hasta dos más. */

export type MemberMcAccounts = {
  gamertag: string;
  mcAccount2?: string | null;
  mcAccount3?: string | null;
};

export function mcAccountKey(tag: string): string {
  return tag.trim().toLowerCase();
}

export function parseOptionalMcAccount(raw: unknown): string | null {
  const tag = String(raw ?? "").trim();
  return tag || null;
}

/** Principales y extras, sin vacíos ni repetidos. */
export function memberMcAccounts(member: MemberMcAccounts): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [member.gamertag, member.mcAccount2, member.mcAccount3]) {
    const tag = String(raw ?? "").trim();
    if (!tag) continue;
    const key = mcAccountKey(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

export function duplicateMcAccountMessage(tags: string[]): string | null {
  const seen = new Set<string>();
  for (const tag of tags) {
    const key = mcAccountKey(tag);
    if (!key) continue;
    if (seen.has(key)) {
      return "Las cuentas de Minecraft no pueden repetirse en la misma persona.";
    }
    seen.add(key);
  }
  return null;
}

/** Activo en Minecraft si cualquiera de sus cuentas lo está. */
export function memberActiveOnWorlds<T>(
  member: MemberMcAccounts,
  worldsByTag: ReadonlyMap<string, T[]>,
): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const tag of memberMcAccounts(member)) {
    for (const world of worldsByTag.get(mcAccountKey(tag)) ?? []) {
      if (seen.has(world)) continue;
      seen.add(world);
      out.push(world);
    }
  }
  return out;
}
