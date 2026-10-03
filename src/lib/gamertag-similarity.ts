/**
 * Comparación entre gamertags para detectar estos errores al anotarse en WhatsApp:
 *
 * 1. Falta (o sobra, o difiere) el sufijo numérico final ("Drako274" ~ "Drako").
 * 2. Las mayúsculas no coinciden ("drako274" ~ "Drako274"). Minecraft sí las
 *    distingue, así que hace falta corregirlas para el allowlist.
 * 3. Espacios o guiones bajos, con el resto igual ("Sung JW1883" ~ "SungJW1883",
 *    "Luxen py" ~ "luxen_py").
 * 4. Si tampoco, hasta dos letras de diferencia en la base ya sin espacios ni
 *    guiones bajos ("Luxen py" ~ "luxen_pz"). Nombres de menos de cuatro letras
 *    no entran. Este puntaje queda por debajo del espacio.
 *
 * Primero la base 1 a 1 (ignorando mayúsculas). Si no, se quitan espacios y
 * guiones bajos. Si tampoco, se aceptan una o dos letras.
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
 * Puntaje cuando tampoco coinciden espacios ni guiones bajos, pero la base
 * (sin esos separadores) difiere en una o dos letras. Queda por debajo del
 * espacio para que, si hay los dos, gane el más parecido.
 */
export const GAMERTAG_LETTER_MATCH_SCORE = 0.88;

/** Umbral mínimo para sugerir. El error de un par de letras también entra. */
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
 * - 0.88 si tampoco, y la base sin separadores difiere en una o dos letras.
 * - 0 si cambian tres letras o más, o el nombre es demasiado corto.
 */
function withoutSeparators(base: string): string {
  return base.toLowerCase().replace(/[\s_]+/g, "");
}

/** Distancia de edición. Si pasa de 2, devuelve 3 y corta. */
function letterEdits(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
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
    if (rowMin > 2) return 3;
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j]!;
  }
  return prev[b.length]!;
}

/** Hasta dos letras, y solo si el nombre es lo bastante largo para que no sea otro jugador. */
function closeByLetters(a: string, b: string): boolean {
  const longer = Math.max(a.length, b.length);
  if (longer < 4) return false;
  const edits = letterEdits(a, b);
  if (edits < 1 || edits > 2) return false;
  if (edits === 2 && longer < 6) return false;
  return true;
}

export function gamertagSimilarity(a: string, b: string): number {
  const pa = parseGamertag(a);
  const pb = parseGamertag(b);
  if (!pa.base || !pb.base) return 0;

  const sameBase = pa.base.toLowerCase() === pb.base.toLowerCase();
  const compactA = withoutSeparators(pa.base);
  const compactB = withoutSeparators(pb.base);
  const sameCompact = compactA.length > 0 && compactA === compactB;
  if (!sameBase && !sameCompact && !closeByLetters(compactA, compactB)) return 0;

  const exactMatch = pa.base === pb.base && pa.suffix === pb.suffix;
  if (exactMatch) return 1;
  if (sameBase) return GAMERTAG_SUFFIX_MATCH_SCORE;
  if (sameCompact) return GAMERTAG_SEPARATOR_MATCH_SCORE;
  return GAMERTAG_LETTER_MATCH_SCORE;
}
