import { createHash, timingSafeEqual } from "node:crypto";

export const DEFAULT_PANEL_OWNER_GAMERTAG = "Drako274";

/** Clave de comparación de gamertags: sin espacios en los bordes ni mayúsculas. */
export function gamertagKey(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isPanelOwnerGamertag(gamertag: string, ownerGamertag: string): boolean {
  const key = gamertagKey(gamertag);
  return key !== "" && key === gamertagKey(ownerGamertag);
}

/**
 * Tiempo constante también con largos distintos: compara los SHA-256.
 * Un secreto esperado vacío nunca coincide.
 */
export function secretMatches(expected: string, given: string): boolean {
  const a = createHash("sha256").update(expected, "utf8").digest();
  const b = createHash("sha256").update(given, "utf8").digest();
  const same = timingSafeEqual(a, b);
  return same && expected.length > 0;
}

/**
 * Huella corta de la contraseña con la que se entró (va cifrada en el JWT):
 * si cambian la contraseña en el env, las sesiones viejas dejan de valer.
 */
export function passwordFingerprint(secret: string): string {
  return createHash("sha256").update(`wsp-panel-session:${secret}`, "utf8").digest("hex").slice(0, 16);
}

export type PanelAuthConfig = {
  ownerGamertag: string;
  ownerPassword: string;
  groupPassword: string;
};

export type PanelLoginRejectReason =
  | "missing-input"
  | "owner-password-unset"
  | "group-password-unset"
  | "wrong-password";

export type PanelLoginDecision =
  | { kind: "owner"; gamertag: string }
  /** La contraseña grupal coincide; falta confirmar que el gamertag tenga cuenta. */
  | { kind: "account"; gamertagKey: string }
  | { kind: "reject"; reason: PanelLoginRejectReason };

/**
 * El dueño solo entra con su contraseña propia (nunca con la grupal);
 * el resto, con la grupal y una `PanelAccount` que se busca después.
 */
export function decidePanelLogin(
  input: { gamertag: string; password: string },
  config: PanelAuthConfig,
): PanelLoginDecision {
  const key = gamertagKey(input.gamertag);
  if (!key || !input.password) {
    return { kind: "reject", reason: "missing-input" };
  }
  if (key.includes("@")) {
    return { kind: "reject", reason: "wrong-password" };
  }

  if (isPanelOwnerGamertag(key, config.ownerGamertag)) {
    if (!config.ownerPassword) {
      return { kind: "reject", reason: "owner-password-unset" };
    }
    return secretMatches(config.ownerPassword, input.password)
      ? { kind: "owner", gamertag: config.ownerGamertag.trim() }
      : { kind: "reject", reason: "wrong-password" };
  }

  if (!config.groupPassword) {
    return { kind: "reject", reason: "group-password-unset" };
  }
  return secretMatches(config.groupPassword, input.password)
    ? { kind: "account", gamertagKey: key }
    : { kind: "reject", reason: "wrong-password" };
}

/** Solo los fallos que alguien puede provocar adivinando cuentan para el límite. */
export function rejectCountsAsFailure(reason: PanelLoginRejectReason): boolean {
  return reason === "wrong-password";
}

/** Primera cuenta cuyo gamertag actual coincide sin mayúsculas. */
export function findAccountByGamertag<T extends { gamertag: string }>(
  accounts: readonly T[],
  key: string,
): T | null {
  const wanted = gamertagKey(key);
  if (!wanted) return null;
  return accounts.find((a) => gamertagKey(a.gamertag) === wanted) ?? null;
}
