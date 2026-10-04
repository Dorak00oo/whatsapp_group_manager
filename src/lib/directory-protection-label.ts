import { formatInstantMexicoColombia } from "@/lib/format-time-mx-co";

/** Insignia de activo permanente cuando la protección es solo la de los 5 días. */
export function temporaryProtectionCopy(until: Date): {
  chip: string;
  mexico: string;
  colombia: string;
} {
  const zones = formatInstantMexicoColombia(until);
  return {
    chip: `Activo permanente · temporal · hasta ${zones.mexico}`,
    mexico: zones.mexico,
    colombia: zones.colombia,
  };
}
