export type ActiveCompareEntry = {
  /** Id de la fila de origen (miembro o jugador); único aunque el gamertag se repita. */
  id: string;
  gamertag: string;
  label: string;
  detail?: string | null;
};

export type ActiveCompareSummary = {
  whatsappCount: number;
  minecraftCount: number;
  /** Activos en MC que no están activos en el grupo WA (o no existen / se salieron). */
  mcActiveNotInWhatsappActive: ActiveCompareEntry[];
  /** Activos en WA sin coincidencia activa en MC. */
  waActiveNotInMcActive: ActiveCompareEntry[];
};

export type ActiveCompareData = {
  whatsapp: ActiveCompareEntry[];
  minecraft: ActiveCompareEntry[];
  summary: ActiveCompareSummary;
};

function tagKey(gamertag: string): string {
  return gamertag.trim().toLowerCase();
}

function sortByGamertag<T extends { gamertag: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) =>
    a.gamertag.localeCompare(b.gamertag, "es", { sensitivity: "base" }),
  );
}

type WhatsappMember = {
  id: string;
  gamertag: string;
  displayName: string | null;
  active: boolean;
  leftAt: Date | null;
};

type MinecraftPlayer = {
  id: string;
  gamertag: string;
  active: boolean;
  isBlacklisted: boolean;
  daysInactive: number;
};

export function buildActiveCompareData(
  waMembers: WhatsappMember[],
  mcPlayers: MinecraftPlayer[],
): ActiveCompareData {
  const waByTag = new Map<string, WhatsappMember>();
  for (const m of waMembers) {
    const key = tagKey(m.gamertag);
    if (key) waByTag.set(key, m);
  }

  const waActive = sortByGamertag(
    waMembers
      .filter((m) => m.leftAt == null && m.active)
      .map((m) => ({
        id: m.id,
        gamertag: m.gamertag,
        label: m.displayName?.trim()
          ? `${m.displayName.trim()} · ${m.gamertag}`
          : m.gamertag,
      })),
  );

  const mcActive = sortByGamertag(
    mcPlayers
      .filter((p) => p.active && !p.isBlacklisted)
      .map((p) => ({
        id: p.id,
        gamertag: p.gamertag,
        label: p.gamertag,
        detail:
          p.daysInactive === 0
            ? "hoy"
            : `${p.daysInactive} día${p.daysInactive === 1 ? "" : "s"} sin conectar`,
      })),
  );

  const waActiveTags = new Set(waActive.map((r) => tagKey(r.gamertag)));
  const mcActiveTags = new Set(mcActive.map((r) => tagKey(r.gamertag)));

  const mcActiveNotInWhatsappActive = sortByGamertag(
    mcActive
      .filter((r) => !waActiveTags.has(tagKey(r.gamertag)))
      .map((r) => {
        const wa = waByTag.get(tagKey(r.gamertag));
        let detail = r.detail ?? null;
        if (!wa) {
          detail = "No está en el directorio";
        } else if (wa.leftAt != null) {
          detail = "Marcado como «se salió» del grupo";
        } else if (!wa.active) {
          detail = "En directorio pero inactivo en WhatsApp";
        }
        return { ...r, detail };
      }),
  );

  const waActiveNotInMcActive = sortByGamertag(
    waActive
      .filter((r) => !mcActiveTags.has(tagKey(r.gamertag)))
      .map((r) => ({
        ...r,
        detail: "Activo en WA, no aparece activo en MC",
      })),
  );

  return {
    whatsapp: waActive,
    minecraft: mcActive,
    summary: {
      whatsappCount: waActive.length,
      minecraftCount: mcActive.length,
      mcActiveNotInWhatsappActive,
      waActiveNotInMcActive,
    },
  };
}
