/** Ids de ítem/bloque Bedrock, sin prefijo `minecraft:`. */

const ITEM_ID_RE = /^[a-z0-9_.:-]+$/;

export function normalizeItemId(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^minecraft:/, "");
}

export function sanitizeBannedItemsList(raw: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const id = normalizeItemId(x);
    if (!id || !ITEM_ID_RE.test(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** JSON de config: array de ids. Vacío / inválido = no banear nada. */
export function parseBannedItems(json: string | null | undefined): string[] {
  if (!json?.trim()) return [];
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [];
    return sanitizeBannedItemsList(arr);
  } catch {
    return [];
  }
}
