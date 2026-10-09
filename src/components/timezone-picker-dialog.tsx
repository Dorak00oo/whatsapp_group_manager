"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveViewerTimeZone } from "@/app/dashboard/timezone-actions";
import { softBtnPrimary, softSelectNeutral } from "@/lib/soft-ui";
import type { TimeZoneOption } from "@/lib/viewer-time-zone";

export function TimezonePickerDialog({
  options,
  suggested,
}: {
  options: TimeZoneOption[];
  suggested: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const selectId = useId();
  const [selected, setSelected] = useState(() =>
    options.some((o) => o.id === suggested)
      ? suggested
      : (options[0]?.id ?? suggested),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveViewerTimeZone(selected);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
      <div
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px] dark:bg-black/70"
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        className="relative z-10 flex w-full max-w-md flex-col rounded-[1.75rem] bg-white p-5 shadow-lg shadow-zinc-900/10 ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:shadow-none dark:ring-zinc-700/60"
      >
        <h2
          id={titleId}
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          ¿En qué zona estás?
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Las horas del panel (parcela, Minecraft, historial) se muestran en tu
          hora local.
        </p>

        <label htmlFor={selectId} className="sr-only">
          Zona horaria
        </label>
        <select
          id={selectId}
          value={selected}
          disabled={pending}
          onChange={(e) => setSelected(e.target.value)}
          className={`${softSelectNeutral} mt-4`}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>

        {error ? (
          <p
            role="alert"
            className="mt-3 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className={softBtnPrimary}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
