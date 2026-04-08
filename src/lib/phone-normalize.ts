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

/**
 * Celda de Excel: si empieza por + se interpreta como internacional; si no,
 * hace falta `pais` (ISO2) como en el formulario manual.
 */
export function normalizePhoneFreeform(
  telefonoRaw: string,
  paisFallback?: string,
):
  | { ok: true; phone: string; phoneCountry: string | null }
  | { ok: false; error: string } {
  const t = telefonoRaw.trim();
  if (!t) return { ok: false, error: "Teléfono vacío" };

  if (t.startsWith("+")) {
    const parsed = parsePhoneNumberFromString(t);
    if (parsed) {
      try {
        if (parsed.isValid() || parsed.isPossible()) {
          return {
            ok: true,
            phone: parsed.formatInternational(),
            phoneCountry: parsed.country ?? null,
          };
        }
      } catch {
        /* continuar */
      }
    }
    const digitsOnly = t.replace(/\D/g, "");
    if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
      return {
        ok: true,
        phone: `+${digitsOnly}`,
        phoneCountry: parsed?.country ?? null,
      };
    }
    return { ok: false, error: "Teléfono con + no reconocido" };
  }

  const pais = (paisFallback ?? "").trim().toUpperCase();
  const inner = normalizePhoneForDirectory(pais, t);
  if (!inner.ok) {
    return {
      ok: false,
      error:
        inner.error === "Elige un país con prefijo"
          ? "Sin + en teléfono: rellena la columna pais (ej. MX)"
          : inner.error,
    };
  }
  return {
    ok: true,
    phone: inner.phone,
    phoneCountry: inner.phoneCountry,
  };
}
