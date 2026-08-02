export const MAX_DIRECTORY_STRIKES = 3;

export type StrikeKind = "pending" | "definitive";

export const STRIKE_KIND_PENDING: StrikeKind = "pending";
export const STRIKE_KIND_DEFINITIVE: StrikeKind = "definitive";

/** @deprecated use formatStrikeKindLabel */
export const EMPTY_STRIKE_REASON = "?";

export function parseStrikeKind(raw: string | null | undefined): StrikeKind {
  return raw === STRIKE_KIND_DEFINITIVE
    ? STRIKE_KIND_DEFINITIVE
    : STRIKE_KIND_PENDING;
}

export function formatStrikeKindLabel(kind: StrikeKind): "?" | "X" {
  return kind === STRIKE_KIND_DEFINITIVE ? "X" : "?";
}

export function formatStrikeDisplay(
  kind: StrikeKind,
  reason: string,
): string {
  const label = formatStrikeKindLabel(kind);
  const text = reason.trim();
  return text ? `${label} — ${text}` : label;
}

/** Compat: strikes antiguos sin `kind` en memoria. */
export function formatStrikeReason(
  reason: string,
  kind?: StrikeKind,
): string {
  if (kind) return formatStrikeDisplay(kind, reason);
  const t = reason.trim();
  if (!t || t === "?") return "?";
  if (t === "X" || t === "x") return "X";
  return t;
}

export function memberHasStrikeWithoutReason(
  strikes: { reason: string }[],
): boolean {
  return strikes.some((s) => !s.reason.trim());
}

/** @deprecated */
export function isEmptyStrikeReason(reason: string): boolean {
  const t = reason.trim();
  return !t || t === "?" || t === "X" || t === "x";
}

/** @deprecated */
export function memberHasEmptyStrike(
  strikes: { reason: string }[],
): boolean {
  return memberHasStrikeWithoutReason(strikes);
}
