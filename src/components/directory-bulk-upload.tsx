"use client";

import { useActionState } from "react";
import {
  bulkImportDirectoryMembers,
  type BulkImportResult,
} from "@/app/dashboard/actions";
import { softBtnLavender, softPanel } from "@/lib/soft-ui";

export function DirectoryBulkUpload() {
  const [state, formAction, pending] = useActionState<
    BulkImportResult | null,
    FormData
  >(bulkImportDirectoryMembers, null);

  return (
    <div className={`${softPanel} gap-3`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">
          Hoja de cálculo
        </p>
        <h3 className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Importar desde Excel o Google Sheets
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          <strong className="font-medium text-zinc-800 dark:text-zinc-200">.xlsx</strong> /{" "}
          <strong className="font-medium text-zinc-800 dark:text-zinc-200">.xls</strong>, o exporta
          desde Sheets con{" "}
          <strong className="font-medium text-zinc-800 dark:text-zinc-200">.csv</strong> /{" "}
          <strong className="font-medium text-zinc-800 dark:text-zinc-200">.tsv</strong> (Archivo →
          Descargar). Primera
          fila = títulos de columna. Los títulos se reconocen aunque estén mal escritos o usen
          palabras parecidas a los filtros (por ejemplo «Los que se salieron», «Protegidos (sin
          ban)», «roster», «administrador»). Obligatorio: columna de{" "}
          <strong className="font-medium text-zinc-800 dark:text-zinc-200">gamertag</strong> (o
          gamertags) y otra de <strong className="font-medium text-zinc-800 dark:text-zinc-200">teléfono</strong>
          . Opcional: <strong className="font-medium text-zinc-800 dark:text-zinc-200">nombres</strong> o{" "}
          <strong className="font-medium text-zinc-800 dark:text-zinc-200">nombre</strong> para el nombre
          real (se guarda aparte del gamertag).
          . Si el número no lleva{" "}
          <code className="rounded-lg bg-amber-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 ring-1 ring-amber-200/90 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-800/50">
            +
          </code>
          , usa la columna de{" "}
          <strong className="font-medium text-zinc-800 dark:text-zinc-200">país</strong> (ISO2, ej.{" "}
          MX). Opcionales: activo, admin, protegido, se salió, notas (sí/no u homónimos en celdas). En
          Excel se leen <strong className="font-medium text-zinc-800 dark:text-zinc-200">todas las
          hojas</strong> que tengan cabeceras reconocibles (las demás se ignoran).
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
          <a
            href="/dashboard/agregar/plantilla"
            className="text-zinc-800 underline-offset-2 hover:underline dark:text-zinc-200"
          >
            Plantilla .xlsx
          </a>
          <a
            href="/dashboard/agregar/plantilla?format=csv"
            className="text-zinc-800 underline-offset-2 hover:underline dark:text-zinc-200"
          >
            Plantilla .csv (Sheets)
          </a>
        </div>
      </div>

      <form
        action={formAction}
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          Archivo
          <input
            type="file"
            name="file"
            accept=".xlsx,.xls,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/tab-separated-values"
            required
            disabled={pending}
            className="text-sm text-zinc-700 file:mr-3 file:rounded-2xl file:border-0 file:bg-emerald-200 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-emerald-300 disabled:opacity-60 dark:text-zinc-300 dark:file:bg-emerald-800/80 dark:file:text-emerald-50 dark:hover:file:bg-emerald-700/80"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className={softBtnLavender}
        >
          {pending ? "Importando…" : "Importar jugadores"}
        </button>
      </form>

      {state && "error" in state ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}

      {state && "ok" in state && state.ok ? (
        <div className="rounded-2xl bg-emerald-100 px-3 py-2 text-xs ring-1 ring-emerald-200/90 dark:bg-emerald-950/35 dark:ring-emerald-800/50">
          <p className="font-semibold text-zinc-800 dark:text-zinc-100">
            Creados: {state.created}
            {state.errors.length > 0
              ? ` · Filas con error: ${state.errors.length}`
              : ""}
          </p>
          {state.errors.length > 0 ? (
            <ul className="mt-2 max-h-40 list-inside list-disc space-y-0.5 overflow-y-auto text-zinc-600 dark:text-zinc-300">
              {state.errors.map((e) => (
                <li key={`${e.sheet ?? ""}-${e.row}-${e.message}`}>
                  {e.sheet ? (
                    <>
                      Hoja «{e.sheet}», fila {e.row}: {e.message}
                    </>
                  ) : (
                    <>
                      Fila {e.row}: {e.message}
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
