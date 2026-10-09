"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveViewerTimeZone } from "@/app/dashboard/timezone-actions";
import { softBtnPrimary, softPanel, softSelectNeutral } from "@/lib/soft-ui";
import type { TimeZoneOption } from "@/lib/viewer-time-zone";

type Props = {
  current: string;
  options: TimeZoneOption[];
};

export function TimezoneSettingsCard({ current, options }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveViewerTimeZone(value);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={softPanel}>
      <div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Tu zona horaria
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          Todas las horas del panel (eventos, strikes, alertas y fichas) se
          muestran en esta zona.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={pending}
          aria-label="Zona horaria"
          className={`${softSelectNeutral} w-full min-w-0 sm:max-w-xs`}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label === o.id ? o.id : `${o.label} (${o.id})`}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={pending || value === current}
          className={softBtnPrimary}
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
