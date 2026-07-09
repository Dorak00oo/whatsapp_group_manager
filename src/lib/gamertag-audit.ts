import { prisma } from "@/lib/prisma";
import {
  GAMERTAG_SIMILARITY_THRESHOLD,
  gamertagSimilarity,
} from "@/lib/gamertag-similarity";

export type AuditDirectoryMember = { id: string; gamertag: string };
export type AuditMinecraftPlayer = { id: string; gamertag: string };

export type GamertagAuditCandidate = {
  directoryMemberId: string;
  minecraftPlayerId: string;
  currentGamertag: string;
  suggestedGamertag: string;
  similarity: number;
};

/**
 * Detecta pares (miembro del directorio, jugador de Minecraft) donde el único
 * caso de gamertags "parecidos pero no idénticos" que aplica es: mismas
 * letras y espacios (sin distinguir mayúsculas), y solo cambia el sufijo
 * numérico final (falta, sobra o es distinto). No se corrigen errores de
 * tipeo en las letras, para no fusionar por error a dos jugadores distintos
 * con nombres parecidos. Solo considera jugadores de Minecraft que no tengan
 * ya una coincidencia exacta (sin distinguir mayúsculas) en el directorio, y
 * asigna cada miembro/jugador a lo sumo una vez (asignación voraz uno-a-uno).
 */
export function findGamertagAuditCandidates(
  members: AuditDirectoryMember[],
  players: AuditMinecraftPlayer[],
  threshold: number = GAMERTAG_SIMILARITY_THRESHOLD,
): GamertagAuditCandidate[] {
  const exactMemberTags = new Set(
    members
      .map((m) => m.gamertag.trim().toLowerCase())
      .filter((t) => t.length > 0),
  );

  type Pair = {
    member: AuditDirectoryMember;
    player: AuditMinecraftPlayer;
    score: number;
  };
  const pairs: Pair[] = [];

  for (const player of players) {
    const playerTag = player.gamertag.trim();
    if (!playerTag) continue;
    if (exactMemberTags.has(playerTag.toLowerCase())) continue;

    for (const member of members) {
      const memberTag = member.gamertag.trim();
      if (!memberTag) continue;
      const score = gamertagSimilarity(memberTag, playerTag);
      if (score >= threshold && score < 1) {
        pairs.push({ member, player, score });
      }
    }
  }

  pairs.sort((a, b) => b.score - a.score);

  const usedMembers = new Set<string>();
  const usedPlayers = new Set<string>();
  const out: GamertagAuditCandidate[] = [];

  for (const p of pairs) {
    if (usedMembers.has(p.member.id) || usedPlayers.has(p.player.id)) continue;
    usedMembers.add(p.member.id);
    usedPlayers.add(p.player.id);
    out.push({
      directoryMemberId: p.member.id,
      minecraftPlayerId: p.player.id,
      currentGamertag: p.member.gamertag,
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
      },
      create: {
        directoryMemberId: c.directoryMemberId,
        minecraftPlayerId: c.minecraftPlayerId,
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
      select: { id: true, gamertag: true },
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
  currentGamertag: string;
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
      currentGamertag: true,
      suggestedGamertag: true,
      similarity: true,
      directoryMember: { select: { displayName: true } },
    },
    orderBy: { similarity: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    directoryMemberId: r.directoryMemberId,
    currentGamertag: r.currentGamertag,
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
    select: { id: true, gamertag: true },
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
    log(`  Comprobando "${member.gamertag}"... (${i + 1}/${totalMembers} - ${pct}%)`);
  });

  const exactMemberTags = new Set(
    members.map((m) => m.gamertag.trim().toLowerCase()).filter((t) => t.length > 0),
  );
  const withoutExactMatch = players.filter((p) => {
    const tag = p.gamertag.trim();
    return tag.length > 0 && !exactMemberTags.has(tag.toLowerCase());
  });
  const exactMatchCount = players.length - withoutExactMatch.length;
  log(
    `Descartando jugadores con coincidencia exacta en WhatsApp... ${exactMatchCount} descartado(s)`,
  );
  log(
    `Comparando ${withoutExactMatch.length} jugador(es) restante(s) (solo sufijo numérico, sin distinguir mayúsculas)...`,
  );

  const candidates = findGamertagAuditCandidates(members, players);

  if (candidates.length === 0) {
    log("  -> ninguna coincidencia por sufijo numérico");
  } else {
    for (const c of candidates) {
      log(
        `  [MATCH] "${c.currentGamertag}" (WhatsApp) ~ "${c.suggestedGamertag}" (Minecraft)`,
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
