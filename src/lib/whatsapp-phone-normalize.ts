import { normalizePhoneFreeform } from "@/lib/phone-normalize";
import { stripMexicoWhatsAppDigits } from "@/lib/mexico-mobile-trunk";

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
  if (/@(lid|g\.us|newsletter)$/i.test(raw)) {
    return { ok: false, error: "JID sin número de teléfono" };
  }

  const digitsRaw = raw.includes("@")
    ? raw.split("@")[0]!.replace(/\D/g, "")
    : raw.replace(/\D/g, "");
  const digits = stripMexicoWhatsAppDigits(digitsRaw);

  if (digits.length < 8 || digits.length > 15) {
    return { ok: false, error: "Número inválido (longitud)" };
  }

  return normalizePhoneFreeform(`+${digits}`);
}
