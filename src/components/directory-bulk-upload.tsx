"use client";

import { useActionState } from "react";
import {
  bulkImportDirectoryMembers,
  type BulkImportResult,
} from "@/app/dashboard/actions";
import { softBtnLavender, softBtnMint, softBtnPrimary, softPanel } from "@/lib/soft-ui";

const linkBtn =
  "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-medium shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 disabled:opacity-60 dark:focus-visible:ring-zinc-100/25";

export function DirectoryBulkUpload() {
  const [state, formAction, pending] = useActionState<
    BulkImportResult | null,
    FormData
  >(bulkImportDirectoryMembers, null);

  const skipped = state && "ok" in state ? state.skipped : [];
  const errors = state && "ok" in state ? state.errors : [];

  return (
    <section className={softPanel} aria-labelledby="csv-directorio-titulo">
      <div className="flex flex-col gap-2">
        <h3
          id="csv-directorio-titulo"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Importar y exportar (CSV)
        </h3>
        <p className="max-w-prose text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Exporta todo el directorio o baja la plantilla vacía, con las mismas
          columnas. Al importar, quien ya esté (mismo teléfono, @usuario o
          gamertag) se salta y no se pisa. Las altas nuevas quedan protegidas
          5 días.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a href="/dashboard/agregar/exportar" className={`${linkBtn} ${softBtnPrimary}`}>
          Exportar CSV
        </a>
        <a href="/dashboard/agregar/plantilla" className={`${linkBtn} ${softBtnLavender}`}>
          Descargar plantilla
        </a>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          Archivo CSV
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            disabled={pending}
            className="text-sm text-zinc-800 file:mr-3 file:rounded-2xl file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15 disabled:opacity-60 dark:text-zinc-200 dark:file:bg-zinc-100 dark:file:text-zinc-900 dark:hover:file:bg-white dark:focus-visible:ring-zinc-100/25"
          />
        </label>
        <p className="max-w-prose text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          UTF-8, separador coma o punto y coma. La primera fila son los títulos.
          Sin + en el teléfono, llena la columna de país (MX, CO…).
        </p>
        <button type="submit" disabled={pending} className={`${softBtnMint} self-start`}>
          {pending ? "Importando…" : "Importar CSV"}
        </button>
      </form>

      {state && "error" in state ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}

      {state && "ok" in state && state.ok ? (
        <div
          className="rounded-2xl bg-emerald-100 px-3 py-3 text-sm ring-1 ring-emerald-200/90 dark:bg-emerald-950/35 dark:ring-emerald-800/50"
          role="status"
        >
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {state.created === 1
              ? "1 alta nueva."
              : `${state.created} altas nuevas.`}{" "}
            {skipped.length === 1
              ? "1 ya estaba y se saltó."
              : skipped.length > 0
                ? `${skipped.length} ya estaban y se saltaron.`
                : "Nadie se saltó."}
            {errors.length > 0
              ? ` ${errors.length === 1 ? "1 fila con error." : `${errors.length} filas con error.`}`
              : ""}
          </p>
          {skipped.length > 0 ? (
            <ul className="mt-2 max-h-40 list-inside list-disc space-y-0.5 overflow-y-auto text-xs text-zinc-700 dark:text-zinc-300">
              {skipped.map((row) => (
                <li key={`skip-${row.row}-${row.gamertag}`}>
                  Fila {row.row}
                  {row.gamertag ? ` · ${row.gamertag}` : ""} — {row.reason}
                </li>
              ))}
            </ul>
          ) : null}
          {errors.length > 0 ? (
            <ul className="mt-2 max-h-40 list-inside list-disc space-y-0.5 overflow-y-auto text-xs text-red-700 dark:text-red-300">
              {errors.map((row) => (
                <li key={`err-${row.row}-${row.message}`}>
                  Fila {row.row}: {row.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
