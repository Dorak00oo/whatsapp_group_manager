"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DIRECTORY_NEW_MEMBER_DAYS } from "@/lib/directory-cohort";
import {
  filtersToSearchParams,
  parseDirectoryFilters,
  type DirectoryCohort,
  type DirectoryUrlFilters,
} from "@/lib/directory-query";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const sortedCountries = [...countryCodes].sort();

  const [qDraft, setQDraft] = useState(filters.q);

  // Sincronizar el borrador si `q` cambia en la URL (atrás, enlace, otro filtro).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- espejo de searchParams
    setQDraft(filters.q);
  }, [filters.q]);

  const navigate = useCallback(
    (patch: Partial<DirectoryUrlFilters>) => {
      const current = parseDirectoryFilters(
        Object.fromEntries(searchParams.entries()),
      );
      const next: DirectoryUrlFilters = { ...current, ...patch };
      const qs = filtersToSearchParams(next).toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      startTransition(() => {
        router.replace(url, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const onSearchChange = (v: string) => {
    setQDraft(v);
    navigate({ q: v.trim() });
  };

  return (
    <div
      className={`mb-4 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 ${isPending ? "opacity-80" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Filtros
        </p>
        {isPending ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Actualizando…
          </span>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 sm:col-span-2 lg:col-span-3 xl:col-span-4">
          Grupo
          <select
            value={filters.cohort}
            onChange={(e) =>
              navigate({ cohort: e.target.value as DirectoryCohort })
            }
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
              <option value="roster">
                Los que estuvieron activos (en roster)
              </option>
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
            value={filters.status}
            onChange={(e) =>
              navigate({
                status: e.target.value as DirectoryUrlFilters["status"],
              })
            }
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="all">Todos (activos e inactivos)</option>
            <option value="active">Solo activos</option>
            <option value="inactive">Solo inactivos</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Vista (solo con «todos»)
          <select
            value={filters.view}
            disabled={filters.status !== "all"}
            onChange={(e) =>
              navigate({
                view: e.target.value as DirectoryUrlFilters["view"],
              })
            }
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
            value={filters.country || ""}
            onChange={(e) => navigate({ country: e.target.value })}
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
          Buscar (gamertag, nombre, teléfono, nota, ban, strikes…)
          <input
            type="search"
            value={qDraft}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Texto libre…"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Baneos
          <select
            value={filters.banned === "only" ? "only" : "all"}
            onChange={(e) =>
              navigate({
                banned: e.target.value === "only" ? "only" : "all",
              })
            }
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="all">Todos</option>
            <option value="only">Solo baneados</option>
          </select>
        </label>
      </div>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
        Los cambios y la búsqueda se aplican al instante (cada tecla actualiza
        la URL y la lista).
      </p>
    </div>
  );
}
