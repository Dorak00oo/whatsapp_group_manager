import type { CountryCode } from "libphonenumber-js";
import {
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js/max";

/**
 * Normaliza el teléfono para guardarlo. Prioriza formato internacional de
 * libphonenumber; si no puede validar en estricto, acepta números posibles o
 * al menos +prefijo y dígitos (validación blanda).
 */
export function normalizePhoneForDirectory(
  iso: string,
  nationalRaw: string,
):
  | { ok: true; phone: string; phoneCountry: string }
  | { ok: false; error: string } {
  const upper = iso.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) {
    return { ok: false, error: "Elige un país con prefijo" };
  }

  // Acepta espacios, guiones, puntos, etc.; solo los dígitos cuentan para validar.
  const digits = nationalRaw.replace(/\D/g, "");
  if (!digits) {
    return { ok: false, error: "Escribe el número de celular" };
  }
  if (digits.length < 3) {
    return { ok: false, error: "El número es demasiado corto" };
  }
  if (digits.length > 14) {
    return { ok: false, error: "El número es demasiado largo" };
  }

  let cc: string;
  try {
    cc = getCountryCallingCode(upper as CountryCode);
  } catch {
    return { ok: false, error: "País no válido para el prefijo" };
  }

  const isoC = upper as CountryCode;
  const e164 = `+${cc}${digits}`;

  let parsed =
    parsePhoneNumberFromString(digits, isoC) ??
    parsePhoneNumberFromString(e164);

  if (parsed) {
    try {
      if (parsed.isValid() || parsed.isPossible()) {
        return {
          ok: true,
          phone: parsed.formatInternational(),
          phoneCountry: upper,
        };
      }
    } catch {
      /* continuar con formato blando */
    }
  }

  return {
    ok: true,
    phone: `+${cc} ${digits}`,
    phoneCountry: upper,
  };
}
