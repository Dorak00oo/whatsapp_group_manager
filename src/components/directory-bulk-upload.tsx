"use client";

import { useActionState } from "react";
import {
  bulkImportDirectoryMembers,
  type BulkImportResult,
} from "@/app/dashboard/actions";

export function DirectoryBulkUpload() {
  const [state, formAction, pending] = useActionState<
    BulkImportResult | null,
    FormData
  >(bulkImportDirectoryMembers, null);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div>
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Importar desde Excel o Google Sheets
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
          <strong className="font-medium text-zinc-600 dark:text-zinc-400">.xlsx</strong> /{" "}
          <strong className="font-medium text-zinc-600 dark:text-zinc-400">.xls</strong>, o exporta
          desde Sheets con{" "}
          <strong className="font-medium text-zinc-600 dark:text-zinc-400">.csv</strong> /{" "}
          <strong className="font-medium text-zinc-600 dark:text-zinc-400">.tsv</strong> (Archivo →
          Descargar). Primera
          fila = títulos de columna. Los títulos se reconocen aunque estén mal escritos o usen
          palabras parecidas a los filtros (por ejemplo «Los que se salieron», «Protegidos (sin
          ban)», «roster», «administrador»). Obligatorios: una columna de{" "}
          <strong className="font-medium text-zinc-600 dark:text-zinc-400">nombre / jugador</strong>{" "}
          y otra de <strong className="font-medium text-zinc-600 dark:text-zinc-400">teléfono</strong>
          . Si el número no lleva{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">+</code>, usa la columna de{" "}
          <strong className="font-medium text-zinc-600 dark:text-zinc-400">país</strong> (ISO2, ej.{" "}
          MX). Opcionales: activo, admin, protegido, se salió, notas (sí/no u homónimos en celdas). En
          Excel se leen <strong className="font-medium text-zinc-600 dark:text-zinc-400">todas las
          hojas</strong> que tengan cabeceras reconocibles (las demás se ignoran).
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
          <a
            href="/dashboard/agregar/plantilla"
            className="text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Plantilla .xlsx
          </a>
          <a
            href="/dashboard/agregar/plantilla?format=csv"
            className="text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Plantilla .csv (Sheets)
          </a>
        </div>
      </div>

      <form
        action={formAction}
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Archivo
          <input
            type="file"
            name="file"
            accept=".xlsx,.xls,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/tab-separated-values"
            required
            disabled={pending}
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-700"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white"
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
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="font-medium text-emerald-900 dark:text-emerald-100">
            Creados: {state.created}
            {state.errors.length > 0
              ? ` · Filas con error: ${state.errors.length}`
              : ""}
          </p>
          {state.errors.length > 0 ? (
            <ul className="mt-2 max-h-40 list-inside list-disc space-y-0.5 overflow-y-auto text-emerald-900/90 dark:text-emerald-200/90">
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
