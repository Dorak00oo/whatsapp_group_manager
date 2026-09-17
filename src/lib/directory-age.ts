export const AGE_MIN = 1;
export const AGE_MAX = 99;

export type ParseDirectoryAge =
  | { ok: true; age: number | null }
  | { ok: false; error: string };

export function parseDirectoryAge(raw: unknown): ParseDirectoryAge {
  const t = String(raw ?? "").trim();
  if (!t) return { ok: true, age: null };
  if (!/^\d{1,2}$/.test(t)) {
    return { ok: false, error: "La edad debe ser un número de 1 a 99" };
  }
  const age = Number(t);
  if (!Number.isInteger(age) || age < AGE_MIN || age > AGE_MAX) {
    return { ok: false, error: "La edad debe ser un número de 1 a 99" };
  }
  return { ok: true, age };
}

const NOTES_AGE_RE = /^\s*([1-9]\d?)\s*(años|anos)?\s*$/i;

export function splitAgeFromNotes(notes: string | null | undefined): {
  age: number | null;
  notes: string | null;
} {
  const raw = (notes ?? "").trim();
  if (!raw) return { age: null, notes: null };
  const m = raw.match(NOTES_AGE_RE);
  if (!m) return { age: null, notes: raw };
  const age = Number(m[1]);
  if (!Number.isInteger(age) || age < AGE_MIN || age > AGE_MAX) {
    return { age: null, notes: raw };
  }
  return { age, notes: null };
}
