const DATE_ONLY: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

function formatDate(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-MX", { ...DATE_ONLY, timeZone }).format(d);
}

/** Insignia de activo permanente cuando la protección es solo la de los 5 días. */
export function temporaryProtectionCopy(until: Date): {
  chip: string;
  mexico: string;
  colombia: string;
} {
  const mexico = formatDate(until, "America/Mexico_City");
  const colombia = formatDate(until, "America/Bogota");
  return {
    chip: `Activo permanente · temporal · hasta ${mexico}`,
    mexico,
    colombia,
  };
}
