import type { CallingCodeOption } from "@/lib/phone-calling-codes";
import { softInputNeutral, softSelectNeutral } from "@/lib/soft-ui";

const labelClass =
  "flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200";

type Props = {
  countrySelectId: string;
  phoneCountryOptions: CallingCodeOption[];
  defaultIso?: string;
  defaultNational?: string;
  defaultAge?: number | null;
};

export function DirectoryPhoneAgeFields({
  countrySelectId,
  phoneCountryOptions,
  defaultIso = "MX",
  defaultNational,
  defaultAge,
}: Props) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,12.5rem)_minmax(0,1fr)_8.5rem] sm:items-end sm:gap-2">
      <label className={labelClass} htmlFor={countrySelectId}>
        País y prefijo
        <select
          id={countrySelectId}
          name="phoneCountry"
          defaultValue={defaultIso}
          className={`${softSelectNeutral} w-full min-w-0`}
        >
          {phoneCountryOptions.map(({ iso, label }) => (
            <option key={iso} value={iso}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Celular{" "}
        <span className="font-normal text-zinc-500 dark:text-zinc-400">
          (o el @)
        </span>
        <input
          name="phoneNational"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          defaultValue={defaultNational}
          placeholder="55 1234 5678"
          className={`${softInputNeutral} w-full min-w-0`}
        />
      </label>
      <label className={labelClass}>
        Edad
        <input
          name="age"
          type="number"
          inputMode="numeric"
          min={1}
          max={99}
          defaultValue={defaultAge ?? ""}
          placeholder="18"
          className={`${softInputNeutral} w-full min-w-0 sm:w-[8.5rem]`}
        />
      </label>
    </div>
  );
}
