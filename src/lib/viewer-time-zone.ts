export type TimeZoneOption = { id: string; label: string };

export type ViewerTimeZoneDecision =
  | { status: "ready"; timeZone: string }
  | {
      status: "needs_choice";
      options: TimeZoneOption[];
      suggested: string;
    };

export const PROVISIONAL_TIME_ZONE = "America/Mexico_City";

const AUTO_ZONE: Record<string, string> = {
  CO: "America/Bogota",
  PE: "America/Lima",
  EC: "America/Guayaquil",
  AR: "America/Argentina/Buenos_Aires",
  CL: "America/Santiago",
  UY: "America/Montevideo",
  PY: "America/Asuncion",
  BO: "America/La_Paz",
  VE: "America/Caracas",
  CR: "America/Costa_Rica",
  PA: "America/Panama",
  GT: "America/Guatemala",
  HN: "America/Tegucigalpa",
  SV: "America/El_Salvador",
  NI: "America/Managua",
  DO: "America/Santo_Domingo",
  PR: "America/Puerto_Rico",
  CU: "America/Havana",
  ES: "Europe/Madrid",
};

const MX_OPTIONS: TimeZoneOption[] = [
  { id: "America/Mexico_City", label: "Centro" },
  { id: "America/Tijuana", label: "Noroeste" },
  { id: "America/Hermosillo", label: "Sonora" },
  { id: "America/Mazatlan", label: "Pacífico" },
  { id: "America/Cancun", label: "Sureste" },
  { id: "America/Chihuahua", label: "Chihuahua" },
  { id: "America/Matamoros", label: "Noreste" },
];

const US_OPTIONS: TimeZoneOption[] = [
  { id: "America/New_York", label: "Este" },
  { id: "America/Chicago", label: "Centro" },
  { id: "America/Denver", label: "Montaña" },
  { id: "America/Los_Angeles", label: "Pacífico" },
  { id: "America/Anchorage", label: "Alaska" },
  { id: "Pacific/Honolulu", label: "Hawái" },
];

const FALLBACK_OPTIONS: TimeZoneOption[] = [
  ...MX_OPTIONS,
  { id: "America/Bogota", label: "Colombia" },
  { id: "America/Lima", label: "Perú" },
  { id: "America/Argentina/Buenos_Aires", label: "Argentina" },
  { id: "Europe/Madrid", label: "España" },
  ...US_OPTIONS,
];

export function isValidTimeZoneId(id: string): boolean {
  if (!id) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: id });
    return true;
  } catch {
    return false;
  }
}

export function timeZoneOptionsForCountry(iso: string | null): TimeZoneOption[] {
  if (iso === "MX") return MX_OPTIONS;
  if (iso === "US") return US_OPTIONS;
  if (iso && iso in AUTO_ZONE) {
    const zone = AUTO_ZONE[iso];
    return [{ id: zone, label: zone }];
  }
  return FALLBACK_OPTIONS;
}

export function decideViewerTimeZone(input: {
  timeZone: string | null;
  phoneCountry: string | null;
}): ViewerTimeZoneDecision {
  const { timeZone, phoneCountry } = input;

  if (timeZone && isValidTimeZoneId(timeZone)) {
    return { status: "ready", timeZone };
  }

  if (phoneCountry && phoneCountry in AUTO_ZONE) {
    return { status: "ready", timeZone: AUTO_ZONE[phoneCountry] };
  }

  if (phoneCountry === "MX") {
    return {
      status: "needs_choice",
      options: MX_OPTIONS,
      suggested: "America/Mexico_City",
    };
  }

  if (phoneCountry === "US") {
    return {
      status: "needs_choice",
      options: US_OPTIONS,
      suggested: "America/New_York",
    };
  }

  return {
    status: "needs_choice",
    options: FALLBACK_OPTIONS,
    suggested: PROVISIONAL_TIME_ZONE,
  };
}
