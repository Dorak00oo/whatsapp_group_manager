/**
 * Comparación estricta entre gamertags para detectar un único caso concreto de
 * error humano: alguien se anota en el grupo de WhatsApp sin el sufijo
 * numérico final de su gamertag real (p. ej. "Drako274" se anota como
 * "Drako"). El gamertag se descompone UNA sola vez en "base" (letras, espacios
 * y todo lo que no sea el sufijo numérico final) y "sufijo" (los dígitos del
 * final), y con esas dos partes ya descompuestas se toma UNA sola decisión —
 * no se compara primero el nombre completo y, si falla, por separado la
 * versión sin números: es un único paso de comparación sobre el gamertag
 * entero, donde el sufijo numérico es la única parte que se permite variar.
 * La base debe coincidir letra por letra y espacio por espacio (solo se
 * ignoran mayúsculas/minúsculas, porque Bedrock no distingue caso). Esto evita
 * fusionar por error a dos jugadores distintos que solo comparten un nombre
 * parecido.
 */

/**
 * Puntaje de confianza cuando la base coincide 1 a 1 pero el sufijo numérico
 * no. No hay valores intermedios: o se detecta este caso exacto (0.97) o no
 * hay ninguna sugerencia (0).
 */
export const GAMERTAG_SUFFIX_MATCH_SCORE = 0.97;

/** Umbral: cualquier valor > 0 y < 1 activa la sugerencia; se deja explícito para el resto del código. */
export const GAMERTAG_SIMILARITY_THRESHOLD = GAMERTAG_SUFFIX_MATCH_SCORE;

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
 * Puntaje 0-1 entre dos gamertags, en un único paso sobre el gamertag entero:
 * - 0 si la base (letras/espacios, sin distinguir mayúsculas) no coincide 1 a 1.
 * - 1 si además el sufijo numérico también coincide exacto (son el mismo gamertag).
 * - 0.97 si la base coincide 1 a 1 pero el sufijo numérico falta, sobra o es
 *   distinto (caso de "olvidó poner los números").
 */
export function gamertagSimilarity(a: string, b: string): number {
  const pa = parseGamertag(a);
  const pb = parseGamertag(b);
  if (!pa.base || !pb.base) return 0;
  if (pa.base.toLowerCase() !== pb.base.toLowerCase()) return 0;

  return pa.suffix === pb.suffix ? 1 : GAMERTAG_SUFFIX_MATCH_SCORE;
}
