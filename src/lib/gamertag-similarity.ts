/**
 * Comparación entre gamertags para detectar estos errores al anotarse en WhatsApp:
 *
 * 1. Falta (o sobra, o difiere) el sufijo numérico final ("Drako274" ~ "Drako").
 * 2. Las mayúsculas no coinciden ("drako274" ~ "Drako274"). Minecraft sí las
 *    distingue, así que hace falta corregirlas para el allowlist.
 * 3. Espacios o guiones bajos, con el resto igual ("Sung JW1883" ~ "SungJW1883",
 *    "Luxen py" ~ "luxen_py").
 * 4. Si tampoco, hasta 4 caracteres de letras o números. Las mayúsculas y
 *    los espacios no entran en esa cuenta y pueden cambiar todos. Un nombre
 *    distinto con un número distinto no entra ("Drako274" no es "Draks1780").
 *
 * Si el gamertag de Minecraft ya está igual, carácter por carácter, en el
 * grupo, ya tiene dueño: no se compara con nadie más ni sale a revisar.
 */

/**
 * Puntaje cuando la base coincide 1 a 1 (ignorando mayúsculas) pero el
 * gamertag no es un calco exacto (mayúsculas, sufijo numérico, o ambos).
 */
export const GAMERTAG_SUFFIX_MATCH_SCORE = 0.97;

/**
 * Puntaje cuando la base no coincide 1 a 1, pero sí al quitar espacios y
 * guiones bajos. Queda por debajo del calco de base para que, si hay los dos,
 * gane el 1 a 1.
 */
export const GAMERTAG_SEPARATOR_MATCH_SCORE = 0.93;

/**
 * Puntaje cuando tampoco coinciden espacios ni guiones bajos, pero el
 * gamertag entero difiere en como máximo 4 caracteres. Queda por debajo del
 * espacio para que, si hay los dos, gane el más parecido.
 */
export const GAMERTAG_LETTER_MATCH_SCORE = 0.88;

/** Tope de caracteres distintos (letras o números) para sugerir un error. */
export const MAX_GAMERTAG_CHAR_EDITS = 4;

/** Umbral mínimo para sugerir. El error de hasta 4 caracteres también entra. */
export const GAMERTAG_SIMILARITY_THRESHOLD = GAMERTAG_LETTER_MATCH_SCORE;

type ParsedGamertag = {
  /** Todo el gamertag salvo el sufijo numérico final: letras, espacios, símbolos. */
  base: string;
  /** Dígitos del final (puede ser cadena vacía si no tiene). */
  suffix: string;
};

/** Descompone el gamertag UNA sola vez en base + sufijo numérico final. */
function parseGamertag(raw: string): ParsedGamertag {
  const trimmed = raw.trim();
  const match = /^(.*?)(\d*)$/.exec(trimmed);
  const suffix = match?.[2] ?? "";
  const base = suffix ? trimmed.slice(0, trimmed.length - suffix.length) : trimmed;
  return { base, suffix };
}

/**
 * Puntaje 0-1 entre dos gamertags:
 * - 1 si son un calco exacto, mayúsculas incluidas: no hay corrección.
 * - 0.97 si la base coincide 1 a 1 (ignorando mayúsculas) pero cambian
 *   mayúsculas o el sufijo numérico.
 * - 0.93 si esa base no coincide, pero sí al quitar espacios y guiones bajos.
 * - 0.88 si tampoco, y letras o números difieren en 1 a 4. Mayúsculas y
 *   espacios no cuentan y pueden ser todos los que haga falta.
 * - 0 si cambian más de 4, si cambia el nombre y también el número, o si el
 *   nombre tiene menos de cuatro letras.
 */
function withoutSeparators(base: string): string {
  return base.toLowerCase().replace(/[\s_]+/g, "");
}

/** Letras y números, ya sin mayúsculas ni espacios: eso no gasta el tope de 4. */
function compactGamertag(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_]+/g, "");
}

/** Distancia de edición. Si pasa de 4, devuelve 5 y corta. */
function charEdits(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > MAX_GAMERTAG_CHAR_EDITS) {
    return MAX_GAMERTAG_CHAR_EDITS + 1;
  }
  const prev = new Array<number>(b.length + 1);
  const cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let rowMin = cur[0]!;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (cur[j]! < rowMin) rowMin = cur[j]!;
    }
    if (rowMin > MAX_GAMERTAG_CHAR_EDITS) return MAX_GAMERTAG_CHAR_EDITS + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j]!;
  }
  return prev[b.length]!;
}

export function gamertagSimilarity(a: string, b: string): number {
  const pa = parseGamertag(a);
  const pb = parseGamertag(b);
  if (!pa.base || !pb.base) return 0;

  const exactMatch = pa.base === pb.base && pa.suffix === pb.suffix;
  if (exactMatch) return 1;

  if (charEdits(compactGamertag(a), compactGamertag(b)) > MAX_GAMERTAG_CHAR_EDITS) {
    return 0;
  }

  const sameBase = pa.base.toLowerCase() === pb.base.toLowerCase();
  const compactA = withoutSeparators(pa.base);
  const compactB = withoutSeparators(pb.base);
  const sameCompact = compactA.length > 0 && compactA === compactB;
  const nameChanged = compactA !== compactB;
  const bothNumbers = pa.suffix.length > 0 && pb.suffix.length > 0;
  const numberChanged = pa.suffix !== pb.suffix;
  if (nameChanged && numberChanged && bothNumbers) return 0;

  if (sameBase) return GAMERTAG_SUFFIX_MATCH_SCORE;
  if (sameCompact) return GAMERTAG_SEPARATOR_MATCH_SCORE;
  if (Math.max(compactA.length, compactB.length) < 4) return 0;
  return GAMERTAG_LETTER_MATCH_SCORE;
}

function tagSet(tags: string[]): Set<string> {
  return new Set(tags.map((t) => t.trim()).filter((t) => t.length > 0));
}

/**
 * El tag de Minecraft que ya existe igual, carácter por carácter, en el grupo
 * ya tiene dueño. El del grupo que ya existe igual en Minecraft tampoco se
 * reasigna. El resto pasa por {@link gamertagSimilarity}.
 */
export function shouldSuggestGamertagChange(
  memberTag: string,
  playerTag: string,
  lists: { directoryTags: string[]; minecraftTags: string[] },
): boolean {
  const member = memberTag.trim();
  const player = playerTag.trim();
  if (!member || !player) return false;
  const directory = tagSet(lists.directoryTags);
  const minecraft = tagSet(lists.minecraftTags);
  if (directory.has(player)) return false;
  if (minecraft.has(member)) return false;
  const score = gamertagSimilarity(member, player);
  return score >= GAMERTAG_SIMILARITY_THRESHOLD && score < 1;
}
