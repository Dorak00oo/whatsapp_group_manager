import { normalizePhoneFreeform } from "@/lib/phone-normalize";

/**
 * Convierte JID de WhatsApp (`54911...@s.whatsapp.net`) o cadena de dígitos
 * al formato internacional usado en el directorio.
 */
export function normalizeWhatsAppPhoneInput(input: string):
  | { ok: true; phone: string; phoneCountry: string | null }
  | { ok: false; error: string } {
  const raw = input.trim();
  if (!raw) {
    return { ok: false, error: "Teléfono o JID vacío" };
  }

  const digits = raw.includes("@")
    ? raw.split("@")[0]!.replace(/\D/g, "")
    : raw.replace(/\D/g, "");

  if (digits.length < 8 || digits.length > 15) {
    return { ok: false, error: "Número inválido (longitud)" };
  }

  return normalizePhoneFreeform(`+${digits}`);
}
