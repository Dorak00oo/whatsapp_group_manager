import { normalizePhoneForDirectory } from "@/lib/phone-normalize";
import { normalizeWhatsAppUsername } from "@/lib/whatsapp-username";

export type DirectoryWhatsAppContact =
  | {
      ok: true;
      phone: string | null;
      phoneCountry: string | null;
      whatsappUsername: string | null;
    }
  | { ok: false; error: string };

const NEED_PHONE_OR_USER =
  "Indica el celular o el usuario de WhatsApp (@usuario). El usuario no es el nombre de perfil.";

export function resolveDirectoryWhatsAppContact(input: {
  phoneIso: string;
  phoneNational: string;
  usernameRaw: string;
}): DirectoryWhatsAppContact {
  const phoneDigits = String(input.phoneNational ?? "").replace(/\D/g, "");
  const username = normalizeWhatsAppUsername(input.usernameRaw ?? "");

  if (username.ok === false && !username.empty) {
    return { ok: false, error: username.error };
  }

  let phone: string | null = null;
  let phoneCountry: string | null = null;
  if (phoneDigits) {
    const normalized = normalizePhoneForDirectory(
      input.phoneIso,
      input.phoneNational,
    );
    if (!normalized.ok) return { ok: false, error: normalized.error };
    phone = normalized.phone;
    phoneCountry = normalized.phoneCountry;
  }

  const whatsappUsername = username.ok ? username.username : null;
  if (!phone && !whatsappUsername) {
    return { ok: false, error: NEED_PHONE_OR_USER };
  }

  return { ok: true, phone, phoneCountry, whatsappUsername };
}
