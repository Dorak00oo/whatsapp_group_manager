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
import {
  softInputAmber,
  softInputCyan,
  softInputEmerald,
  softInputRed,
  softInputRose,
  softInputViolet,
  softPanel,
} from "@/lib/soft-ui";

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

  const w = "w-full min-w-0";

  return (
    <div
      className={`${softPanel} mb-4 gap-3 ${isPending ? "opacity-80" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">
          Filtros
        </p>
        {isPending ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Actualizando…
          </span>
        ) : null}
      </div>
      <div className="flex w-full flex-col gap-3">
        <label
          className={`flex min-w-0 w-full flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200`}
        >
          Grupo
          <select
            value={filters.cohort}
            onChange={(e) =>
              navigate({ cohort: e.target.value as DirectoryCohort })
            }
            className={`${softInputViolet} ${w}`}
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

        <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            Estado
            <select
              value={filters.status}
              onChange={(e) =>
                navigate({
                  status: e.target.value as DirectoryUrlFilters["status"],
                })
              }
              className={`${softInputCyan} ${w}`}
            >
              <option value="all">Todos (activos e inactivos)</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
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
              className={`${softInputRose} ${w} disabled:cursor-not-allowed disabled:opacity-55`}
            >
              <option value="single">Una sola lista</option>
              <option value="split">
                Tres columnas (activos / inactivos / se salieron)
              </option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            País (desde el teléfono)
            <select
              value={filters.country || ""}
              onChange={(e) => navigate({ country: e.target.value })}
              className={`${softInputAmber} ${w}`}
            >
              <option value="">Todos los países</option>
              {sortedCountries.map((code) => (
                <option key={code} value={code}>
                  {regionLabel(code)} ({code})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid w-full min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(11rem,14rem)]">
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            Buscar (gamertag, nombre, teléfono, nota, ban, strikes…)
            <input
              type="search"
              value={qDraft}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Texto libre…"
              className={`${softInputEmerald} ${w}`}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            Baneos
            <select
              value={filters.banned === "only" ? "only" : "all"}
              onChange={(e) =>
                navigate({
                  banned: e.target.value === "only" ? "only" : "all",
                })
              }
              className={`${softInputRed} ${w}`}
            >
              <option value="all">Todos</option>
              <option value="only">Solo baneados</option>
            </select>
          </label>
        </div>
      </div>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        Los cambios y la búsqueda se aplican al instante (cada tecla actualiza
        la URL y la lista).
      </p>
    </div>
  );
}
