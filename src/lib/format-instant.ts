const DATE_TIME: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

const DATE_ONLY: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

export function formatInstant(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-MX", { ...DATE_TIME, timeZone }).format(d);
}

export function formatInstantDate(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-MX", { ...DATE_ONLY, timeZone }).format(d);
}
