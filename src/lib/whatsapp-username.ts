/**
 * Usuario público de WhatsApp (`@Drak00_oo`), distinto del nombre de perfil.
 * No se puede editar en WhatsApp; sirve de identidad cuando no hay teléfono.
 */
const USERNAME_RE = /^[a-z][a-z0-9._]{2,29}$/;

export function normalizeWhatsAppUsername(raw: string):
  | { ok: true; username: string }
  | { ok: false; empty: true }
  | { ok: false; empty?: false; error: string } {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { ok: false, empty: true };
  const withoutAt = trimmed.replace(/^@+/, "").trim().toLowerCase();
  if (!withoutAt) return { ok: false, empty: true };
  if (!USERNAME_RE.test(withoutAt)) {
    return {
      ok: false,
      error:
        "Usuario de WhatsApp no válido (3–30 caracteres: letra inicial, números, punto o _). No uses el nombre de perfil.",
    };
  }
  return { ok: true, username: withoutAt };
}

export function formatWhatsAppUsername(username: string): string {
  const n = normalizeWhatsAppUsername(username);
  if (!n.ok) return "";
  return `@${n.username}`;
}
