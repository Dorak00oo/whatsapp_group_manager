/** Token de eje: número, `~` o relativo `~10` / `~-4`. */
const COORD_TOKEN_RE = /^(?:~|-?\d+(?:\.\d+)?|~-?\d+(?:\.\d+)?)$/;

export function isCoordToken(value: string): boolean {
  return COORD_TOKEN_RE.test(value);
}

/**
 * Parte un pegado tipo `1304, 76, 4848` o `-8532 67 -10351` en X/Y/Z.
 * Quita comas; si no hay tres tokens válidos, devuelve null.
 */
export function splitPastedCoords(
  raw: string,
): [string, string, string] | null {
  const tokens = raw
    .replace(/,/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length < 3) return null;
  const x = tokens[0];
  const y = tokens[1];
  const z = tokens[2];
  if (!isCoordToken(x) || !isCoordToken(y) || !isCoordToken(z)) return null;
  return [x, y, z];
}

export function tryParseCoordNumber(token: string): number | null {
  const t = token.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function coordTokenToNumber(token: string, fallback = 0): number {
  return tryParseCoordNumber(token) ?? fallback;
}

const MAX_RADIUS = 30_000_000;

/**
 * Radio en bloques. Acepta `100`, `10000`, `10.000` (miles locales) y `10,000`.
 */
export function parseRadius(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "");
  if (!t) return null;
  let n: number;
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    n = Number(t.replace(/\./g, ""));
  } else if (/^\d{1,3}(,\d{3})+$/.test(t)) {
    n = Number(t.replace(/,/g, ""));
  } else {
    n = Number(t);
  }
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(MAX_RADIUS, Math.floor(n));
}

export function axisRange(
  center: number,
  radius: number,
): { gte: number; lte: number } {
  const c = Math.floor(center);
  return { gte: c - radius, lte: c + radius };
}
