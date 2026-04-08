import type { CountryCode } from "libphonenumber-js";
import { getCountryCallingCode } from "libphonenumber-js/max";

export type CallingCodeOption = {
  iso: CountryCode;
  dial: string;
  label: string;
};

/**
 * Solo países que sueles usar (Latinoamérica, España, Norteamérica y algunos
 * europeos frecuentes). Amplía o reduce esta lista aquí.
 */
const KNOWN_COUNTRY_CODES = [
  "MX",
  "ES",
  "US",
  "CA",
  "AR",
  "BO",
  "BR",
  "CL",
  "CO",
  "CR",
  "CU",
  "DO",
  "EC",
  "SV",
  "GT",
  "HN",
  "NI",
  "PA",
  "PY",
  "PE",
  "PR",
  "UY",
  "VE",
  "FR",
  "DE",
  "IT",
  "PT",
  "GB",
  "NL",
] as const satisfies readonly CountryCode[];

/** Orden fijo al inicio del desplegable; el resto va alfabético por nombre. */
const PRIORITY_ISO: readonly CountryCode[] = ["MX", "ES", "US", "CA"];

export function getCallingCodeOptions(locale = "es"): CallingCodeOption[] {
  let dn: Intl.DisplayNames;
  try {
    dn = new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    dn = new Intl.DisplayNames(["en"], { type: "region" });
  }

  const items: CallingCodeOption[] = KNOWN_COUNTRY_CODES.map((iso) => {
    const dial = getCountryCallingCode(iso);
    const name = dn.of(iso) ?? iso;
    return {
      iso,
      dial,
      label: `${name} (+${dial})`,
    };
  });

  const priorityIndex = (iso: CountryCode) => {
    const i = PRIORITY_ISO.indexOf(iso);
    return i === -1 ? PRIORITY_ISO.length + 1 : i;
  };

  items.sort((a, b) => {
    const pa = priorityIndex(a.iso);
    const pb = priorityIndex(b.iso);
    if (pa !== pb) return pa - pb;
    return a.label.localeCompare(b.label, locale);
  });

  return items;
}
