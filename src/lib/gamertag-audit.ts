import { prisma } from "@/lib/prisma";
import {
  GAMERTAG_SIMILARITY_THRESHOLD,
  gamertagSimilarity,
  shouldSuggestGamertagChange,
} from "@/lib/gamertag-similarity";

export type McAccountSlot = "gamertag" | "mcAccount2" | "mcAccount3";

export type AuditDirectoryMember = {
  id: string;
  gamertag: string;
  mcAccount2?: string | null;
  mcAccount3?: string | null;
};
export type AuditMinecraftPlayer = { id: string; gamertag: string };

export type GamertagAuditCandidate = {
  directoryMemberId: string;
  minecraftPlayerId: string;
  accountSlot: McAccountSlot;
  currentGamertag: string;
  primaryGamertag: string;
  suggestedGamertag: string;
  similarity: number;
};

type TagRow = {
  memberId: string;
  slot: McAccountSlot;
  gamertag: string;
  primaryGamertag: string;
};

function memberTags(m: AuditDirectoryMember): TagRow[] {
  const slots: { slot: McAccountSlot; value: string | null | undefined }[] = [
    { slot: "gamertag", value: m.gamertag },
    { slot: "mcAccount2", value: m.mcAccount2 },
    { slot: "mcAccount3", value: m.mcAccount3 },
  ];
  const out: TagRow[] = [];
  const seen = new Set<string>();
  for (const s of slots) {
    const tag = (s.value ?? "").trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      memberId: m.id,
      slot: s.slot,
      gamertag: tag,
      primaryGamertag: m.gamertag,
    });
  }
  return out;
}

/** Valor de BD (string libre) a slot conocido; cualquier otro cae en la principal. */
export function toAccountSlot(raw: string): McAccountSlot {
  return raw === "mcAccount2" || raw === "mcAccount3" ? raw : "gamertag";
}

/**
 * Detecta pares (miembro del directorio, jugador de Minecraft) donde el
 * gamertag "es la misma persona": primero la base 1 a 1 (mismas letras y
 * espacios, ignorando mayúsculas, y a lo sumo cambia el sufijo numérico). Si
 * eso no coincide, uno cercano que solo cambia espacios o guiones bajos
 * ("Sung JW1883" ~ "SungJW1883", "Luxen py" ~ "luxen_py"). Si tampoco, un
 * error de hasta 4 caracteres en el gamertag entero. Un nombre distinto con
 * otro número no entra ("Drako274" no es "Draks1780"). Si el gamertag de
 * Minecraft ya está igual, carácter por carácter, en el grupo, ya tiene
 * dueño: no se compara con nadie más ni entra a revisar. Solo considera
 * jugadores de Minecraft sin esa coincidencia exacta, y tampoco reasigna a
 * un miembro del grupo cuyo gamertag ya existe igual en Minecraft. Asigna
 * cada miembro/jugador a lo sumo una vez.
 */
export function findGamertagAuditCandidates(
  members: AuditDirectoryMember[],
  players: AuditMinecraftPlayer[],
  threshold: number = GAMERTAG_SIMILARITY_THRESHOLD,
): GamertagAuditCandidate[] {
  const tags = members.flatMap(memberTags);
  const exactMemberTags = new Set(tags.map((t) => t.gamertag));
  const directoryTags = [...exactMemberTags];
  const minecraftTags = players
    .map((p) => p.gamertag.trim())
    .filter((t) => t.length > 0);

  type Pair = {
    tag: TagRow;
    player: AuditMinecraftPlayer;
    score: number;
  };
  const pairs: Pair[] = [];

  for (const player of players) {
    const playerTag = player.gamertag.trim();
    if (!playerTag) continue;
    if (exactMemberTags.has(playerTag)) continue;

    for (const tag of tags) {
      if (
        !shouldSuggestGamertagChange(tag.gamertag, playerTag, {
          directoryTags,
          minecraftTags,
        })
      ) {
        continue;
      }
      const score = gamertagSimilarity(tag.gamertag, playerTag);
      if (score >= threshold && score < 1) {
        pairs.push({ tag, player, score });
      }
    }
  }

  pairs.sort((a, b) => b.score - a.score);

  const usedSlots = new Set<string>();
  const usedPlayers = new Set<string>();
  const out: GamertagAuditCandidate[] = [];

  for (const p of pairs) {
    const slotKey = `${p.tag.memberId}:${p.tag.slot}`;
    if (usedSlots.has(slotKey) || usedPlayers.has(p.player.id)) continue;
    usedSlots.add(slotKey);
    usedPlayers.add(p.player.id);
    out.push({
      directoryMemberId: p.tag.memberId,
      minecraftPlayerId: p.player.id,
      accountSlot: p.tag.slot,
      currentGamertag: p.tag.gamertag,
      primaryGamertag: p.tag.primaryGamertag,
      suggestedGamertag: p.player.gamertag,
      similarity: Math.round(p.score * 100) / 100,
    });
  }

  return out.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Sincroniza la tabla `gamertag_audit_suggestions` con una lista de candidatos
 * ya calculada: crea/actualiza las sugerencias pendientes vigentes y borra las
 * pendientes que ya no aplican (p. ej. porque el gamertag se corrigió
 * manualmente). Las sugerencias ya aprobadas o rechazadas nunca se tocan
 * (quedan de historial de auditoría).
 */
async function applyGamertagAuditCandidates(
  userId: string,
  candidates: GamertagAuditCandidate[],
): Promise<void> {
  const candidateKeys = new Set(
    candidates.map((c) => `${c.directoryMemberId}:${c.minecraftPlayerId}`),
  );

  const existingPending = await prisma.gamertagAuditSuggestion.findMany({
    where: { status: "pending", directoryMember: { userId } },
    select: { id: true, directoryMemberId: true, minecraftPlayerId: true },
  });

  const staleIds = existingPending
    .filter(
      (e) => !candidateKeys.has(`${e.directoryMemberId}:${e.minecraftPlayerId}`),
    )
    .map((e) => e.id);

  if (staleIds.length > 0) {
    await prisma.gamertagAuditSuggestion.deleteMany({
      where: { id: { in: staleIds } },
    });
  }

  for (const c of candidates) {
    await prisma.gamertagAuditSuggestion.upsert({
      where: {
        directoryMemberId_minecraftPlayerId: {
          directoryMemberId: c.directoryMemberId,
          minecraftPlayerId: c.minecraftPlayerId,
        },
      },
      update: {
        currentGamertag: c.currentGamertag,
        suggestedGamertag: c.suggestedGamertag,
        similarity: c.similarity,
        accountSlot: c.accountSlot,
      },
      create: {
        directoryMemberId: c.directoryMemberId,
        minecraftPlayerId: c.minecraftPlayerId,
        accountSlot: c.accountSlot,
        currentGamertag: c.currentGamertag,
        suggestedGamertag: c.suggestedGamertag,
        similarity: c.similarity,
        status: "pending",
      },
    });
  }
}

/**
 * Recalcula candidatos y sincroniza la tabla `gamertag_audit_suggestions`.
 * Ver {@link applyGamertagAuditCandidates} para el detalle de qué se toca.
 */
export async function syncGamertagAuditSuggestions(
  userId: string,
): Promise<void> {
  const [members, players] = await Promise.all([
    prisma.directoryMember.findMany({
      where: { userId, leftAt: null },
      select: { id: true, gamertag: true, mcAccount2: true, mcAccount3: true },
    }),
    prisma.minecraftPlayer.findMany({
      select: { id: true, gamertag: true },
    }),
  ]);

  const candidates = findGamertagAuditCandidates(members, players);
  await applyGamertagAuditCandidates(userId, candidates);
}

export type PendingGamertagAuditSuggestion = {
  id: string;
  directoryMemberId: string;
  accountSlot: McAccountSlot;
  currentGamertag: string;
  primaryGamertag: string;
  displayName: string | null;
  suggestedGamertag: string;
  similarity: number;
};

/** Sugerencias pendientes de aprobación, ordenadas por similitud descendente. */
export async function listPendingGamertagAuditSuggestions(
  userId: string,
): Promise<PendingGamertagAuditSuggestion[]> {
  const rows = await prisma.gamertagAuditSuggestion.findMany({
    where: { status: "pending", directoryMember: { userId } },
    select: {
      id: true,
      directoryMemberId: true,
      accountSlot: true,
      currentGamertag: true,
      suggestedGamertag: true,
      similarity: true,
      directoryMember: { select: { displayName: true, gamertag: true } },
    },
    orderBy: { similarity: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    directoryMemberId: r.directoryMemberId,
    accountSlot: toAccountSlot(r.accountSlot),
    currentGamertag: r.currentGamertag,
    primaryGamertag: r.directoryMember.gamertag,
    displayName: r.directoryMember.displayName,
    suggestedGamertag: r.suggestedGamertag,
    similarity: r.similarity,
  }));
}

export type GamertagAuditRunResult = {
  /** Líneas de log en orden, pensadas para mostrarse como una terminal. */
  lines: string[];
  suggestions: PendingGamertagAuditSuggestion[];
};

/**
 * Ejecuta la comparación completa (roster de WhatsApp vs jugadores de
 * Minecraft) devolviendo, además del resultado, un log paso a paso pensado
 * para mostrarse en la UI como si fuera una terminal.
 */
export async function runGamertagAuditWithLog(
  userId: string,
): Promise<GamertagAuditRunResult> {
  const lines: string[] = [];
  const log = (s: string) => lines.push(s);

  log("$ auditoria-gamertags --whatsapp=roster --minecraft=jugadores");
  log("Cargando gamertags activos del grupo de WhatsApp...");
  const members = await prisma.directoryMember.findMany({
    where: { userId, leftAt: null, active: true },
    select: { id: true, gamertag: true, mcAccount2: true, mcAccount3: true },
  });
  log(`  -> ${members.length} miembro(s) activo(s) cargado(s)`);

  log("Cargando jugadores registrados en Minecraft...");
  const players = await prisma.minecraftPlayer.findMany({
    select: { id: true, gamertag: true },
  });
  log(`  -> ${players.length} jugador(es) cargado(s)`);

  log(`Comprobando cada nombre de WhatsApp contra Minecraft...`);
  const totalMembers = members.length;
  members.forEach((member, i) => {
    const pct = totalMembers > 0 ? Math.round(((i + 1) / totalMembers) * 100) : 100;
    for (const tag of memberTags(member)) {
      log(`  Comprobando "${tag.gamertag}"... (${i + 1}/${totalMembers} - ${pct}%)`);
    }
  });

  const exactMemberTags = new Set(
    members.flatMap(memberTags).map((t) => t.gamertag),
  );
  const withoutExactMatch = players.filter((p) => {
    const tag = p.gamertag.trim();
    return tag.length > 0 && !exactMemberTags.has(tag);
  });
  const exactMatchCount = players.length - withoutExactMatch.length;
  log(
    `Descartando jugadores con coincidencia exacta en WhatsApp (mayúsculas incluidas)... ${exactMatchCount} descartado(s)`,
  );
  log(
    `Comparando ${withoutExactMatch.length} jugador(es) restante(s) (1 a 1, espacio o guion bajo, o hasta 4 caracteres)...`,
  );

  const candidates = findGamertagAuditCandidates(members, players);

  if (candidates.length === 0) {
    log("  -> ninguna coincidencia (ni 1 a 1, ni espacio, ni hasta 4 caracteres)");
  } else {
    for (const c of candidates) {
      log(
        `  [MATCH] "${c.currentGamertag}" (${c.accountSlot === "gamertag" ? "WhatsApp" : `cuenta extra de ${c.primaryGamertag}`}) ~ "${c.suggestedGamertag}" (Minecraft)`,
      );
    }
  }

  log("Sincronizando sugerencias con la base de datos...");
  await applyGamertagAuditCandidates(userId, candidates);
  const suggestions = await listPendingGamertagAuditSuggestions(userId);

  log(
    suggestions.length > 0
      ? `  -> ${suggestions.length} sugerencia(s) pendiente(s) de aprobar`
      : "  -> sin sugerencias pendientes",
  );
  log("Listo.");

  return { lines, suggestions };
}
