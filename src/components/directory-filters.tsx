"use client";

import { DIRECTORY_NEW_MEMBER_DAYS } from "@/lib/directory-cohort";
import type { DirectoryUrlFilters } from "@/lib/directory-query";

function regionLabel(code: string): string {
  try {
    return new Intl.DisplayNames(["es"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

type Props = {
  filters: DirectoryUrlFilters;
  countryCodes: string[];
};

export function DirectoryFilters({ filters, countryCodes }: Props) {
  const sortedCountries = [...countryCodes].sort();

  return (
    <form
      method="get"
      action="/dashboard"
      className="mb-4 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Filtros
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 sm:col-span-2 lg:col-span-3 xl:col-span-4">
          Grupo
          <select
            name="cohort"
            defaultValue={filters.cohort}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="all">Todos los grupos</option>
            <optgroup label="Situación">
              <option value="new">
                Los nuevos (últimos {DIRECTORY_NEW_MEMBER_DAYS} días)
              </option>
              <option value="inactive">
                Los inactivos (siguen en comunidad)
              </option>
              <option value="left">Los que se salieron</option>
              <option value="roster">Los que estuvieron activos (en roster)</option>
            </optgroup>
            <optgroup label="Rol">
              <option value="admins">Admins</option>
              <option value="protected">Protegidos (sin ban)</option>
            </optgroup>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Estado
          <select
            name="status"
            defaultValue={filters.status}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="all">Todos (activos e inactivos)</option>
            <option value="active">Solo activos</option>
            <option value="inactive">Solo inactivos</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Vista (solo con «todos»)
          {filters.status !== "all" ? (
            <input type="hidden" name="view" value={filters.view} />
          ) : null}
          <select
            name={filters.status === "all" ? "view" : undefined}
            disabled={filters.status !== "all"}
            defaultValue={filters.view}
            title={
              filters.status !== "all"
                ? "Elige «Todos» en estado para usar una o dos listas"
                : undefined
            }
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="single">Una sola lista</option>
            <option value="split">
              Tres columnas (activos / inactivos / se salieron)
            </option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          País (desde el teléfono)
          <select
            name="country"
            defaultValue={filters.country || ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">Todos los países</option>
            {sortedCountries.map((code) => (
              <option key={code} value={code}>
                {regionLabel(code)} ({code})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 sm:col-span-2">
          Buscar (gamertag, teléfono, nota, ban, strikes…)
          <input
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Texto libre…"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Baneos
          <select
            name="banned"
            defaultValue={filters.banned === "only" ? "only" : "all"}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="all">Todos</option>
            <option value="only">Solo baneados</option>
          </select>
        </label>
      </div>
      <button
        type="submit"
        className="self-start rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white"
      >
        Aplicar filtros
      </button>
    </form>
  );
}
