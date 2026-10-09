import { formatInstantDate } from "@/lib/format-instant";

/** Insignia de activo permanente cuando la protección es solo la de los 5 días. */
export function temporaryProtectionCopy(
  until: Date,
  timeZone: string,
): {
  chip: string;
  date: string;
} {
  const date = formatInstantDate(until, timeZone);
  return { chip: `Activo permanente · temporal · hasta ${date}`, date };
}
