/** Mismo patrón visual en ambas zonas (solo cambia el huso). */
const SAME_PATTERN: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

function formatInZone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    ...SAME_PATTERN,
    timeZone,
  }).format(d);
}

/**
 * Misma instantánea en hora de México (centro) y Colombia.
 * México usa `America/Mexico_City` (la más habitual para “hora de México”).
 */
export function formatInstantMexicoColombia(d: Date): {
  mexico: string;
  colombia: string;
} {
  return {
    mexico: formatInZone(d, "America/Mexico_City"),
    colombia: formatInZone(d, "America/Bogota"),
  };
}
