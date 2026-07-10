/**
 * Comparación estricta entre gamertags para detectar dos únicos casos
 * concretos de error humano al anotarse en el grupo de WhatsApp:
 *
 * 1. Falta (o sobra, o difiere) el sufijo numérico final del gamertag real
 *    (p. ej. "Drako274" se anota como "Drako").
 * 2. Las mayúsculas no coinciden (p. ej. "drako274" en WhatsApp vs
 *    "Drako274" en Minecraft). Minecraft SÍ distingue mayúsculas en el
 *    gamertag real, así que esta diferencia importa de verdad para el
 *    allowlist del servidor y no se puede ignorar como si fuera la misma
 *    cadena.
 *
 * El gamertag se descompone UNA sola vez en "base" (letras, espacios y todo
 * lo que no sea el sufijo numérico final) y "sufijo" (los dígitos del final),
 * y con esas dos partes ya descompuestas se toma UNA sola decisión — no se
 * compara primero el nombre completo y, si falla, por separado la versión sin
 * números: es un único paso de comparación sobre el gamertag entero. La base
 * debe coincidir letra por letra y espacio por espacio SIN importar
 * mayúsculas para saber si "son la misma persona"; pero si el resultado no es
 * un calco exacto carácter por carácter (mayúsculas incluidas), se marca como
 * candidato a corregir. Esto evita fusionar por error a dos jugadores
 * distintos que solo comparten un nombre parecido.
 */

/**
 * Puntaje de confianza cuando la base coincide (ignorando mayúsculas) pero el
 * gamertag no es un calco exacto carácter por carácter (por mayúsculas, por
 * el sufijo numérico, o por ambos). No hay valores intermedios: o se detecta
 * este caso exacto (0.97) o no hay ninguna sugerencia (0).
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
 * - 0 si la base (letras/espacios, ignorando mayúsculas) no coincide 1 a 1:
 *   son gamertags de personas distintas.
 * - 1 si además son un calco exacto carácter por carácter, mayúsculas
 *   incluidas: no hace falta ninguna corrección.
 * - 0.97 si la base coincide (ignorando mayúsculas) pero el gamertag real no
 *   es exactamente igual: mayúsculas distintas, sufijo numérico distinto, o
 *   ambos. Minecraft distingue mayúsculas, así que esto sí requiere corregir
 *   el gamertag en WhatsApp para que el allowlist funcione.
 */
export function gamertagSimilarity(a: string, b: string): number {
  const pa = parseGamertag(a);
  const pb = parseGamertag(b);
  if (!pa.base || !pb.base) return 0;
  if (pa.base.toLowerCase() !== pb.base.toLowerCase()) return 0;

  const exactMatch = pa.base === pb.base && pa.suffix === pb.suffix;
  return exactMatch ? 1 : GAMERTAG_SUFFIX_MATCH_SCORE;
}
