/** WhatsApp JID México: 521 + 10 dígitos → 52 + 10 (sin el 1 de celular). */
export function stripMexicoWhatsAppDigits(digits: string): string {
  if (/^521\d{10}$/.test(digits)) return `52${digits.slice(3)}`;
  return digits;
}

/** Nacional MX pegado con el 1 de celular (11 dígitos). */
export function stripMexicoNationalTrunk(iso: string, nationalDigits: string): string {
  if (iso.trim().toUpperCase() === "MX" && /^1\d{10}$/.test(nationalDigits)) {
    return nationalDigits.slice(1);
  }
  return nationalDigits;
}
