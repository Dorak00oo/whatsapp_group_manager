import { parsePhoneNumberFromString } from "libphonenumber-js/max";

/** Código ISO 3166-1 alpha-2 (ej. MX, ES) o null si no se puede inferir. */
export function phoneToCountryCode(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  try {
    const parsed = parsePhoneNumberFromString(trimmed);
    return parsed?.country ?? null;
  } catch {
    return null;
  }
}
