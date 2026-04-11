"use client";

import { useCallback, useEffect, useId, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DIRECTORY_NEW_MEMBER_DAYS } from "@/lib/directory-cohort";
import {
  filtersToSearchParams,
  parseDirectoryFilters,
  type DirectoryCohort,
  type DirectoryUrlFilters,
} from "@/lib/directory-query";
import { softInputNeutral, softPanel } from "@/lib/soft-ui";
import {
  SoftListbox,
  type SoftListboxItem,
} from "@/components/soft-listbox";

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

  const cohortLabelId = useId();
  const statusLabelId = useId();
  const viewLabelId = useId();
  const countryLabelId = useId();
  const searchLabelId = useId();
  const bannedLabelId = useId();

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

  const cohortItems: SoftListboxItem[] = [
    { kind: "option", value: "all", label: "Todos los grupos", accent: "neutral" },
    { kind: "heading", label: "Situación" },
    {
      kind: "option",
      value: "new",
      label: `Los nuevos (últimos ${DIRECTORY_NEW_MEMBER_DAYS} días)`,
      accent: "lime",
    },
    {
      kind: "option",
      value: "inactive",
      label: "Los inactivos (siguen en comunidad)",
      accent: "slate",
    },
    {
      kind: "option",
      value: "left",
      label: "Los que se salieron",
      accent: "amber",
    },
    {
      kind: "option",
      value: "roster",
      label: "Los que estuvieron activos (en roster)",
      accent: "emerald",
    },
    { kind: "heading", label: "Rol" },
    { kind: "option", value: "admins", label: "Admins", accent: "fuchsia" },
    {
      kind: "option",
      value: "protected",
      label: "Protegidos (sin ban)",
      accent: "cyan",
    },
  ];

  const statusItems: SoftListboxItem[] = [
    {
      kind: "option",
      value: "all",
      label: "Todos (activos e inactivos)",
      accent: "neutral",
    },
    { kind: "option", value: "active", label: "Solo activos", accent: "emerald" },
    {
      kind: "option",
      value: "inactive",
      label: "Solo inactivos",
      accent: "slate",
    },
  ];

  const viewItems: SoftListboxItem[] = [
    { kind: "option", value: "single", label: "Una sola lista", accent: "neutral" },
    {
      kind: "option",
      value: "split",
      label: "Tres columnas (activos / inactivos / se salieron)",
      accent: "neutral",
    },
  ];

  const countryItems: SoftListboxItem[] = [
    { kind: "option", value: "", label: "Todos los países", accent: "neutral" },
    ...sortedCountries.map((code) => ({
      kind: "option" as const,
      value: code,
      label: `${regionLabel(code)} (${code})`,
      accent: "neutral" as const,
    })),
  ];

  const bannedItems: SoftListboxItem[] = [
    { kind: "option", value: "all", label: "Todos", accent: "neutral" },
    { kind: "option", value: "only", label: "Solo baneados", accent: "red" },
  ];

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
        <div
          className={`flex min-w-0 w-full flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200`}
        >
          <span id={cohortLabelId}>Grupo</span>
          <SoftListbox
            labelId={cohortLabelId}
            value={filters.cohort}
            onChange={(v) => navigate({ cohort: v as DirectoryCohort })}
            items={cohortItems}
            className={w}
          />
        </div>

        <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            <span id={statusLabelId}>Estado</span>
            <SoftListbox
              labelId={statusLabelId}
              value={filters.status}
              onChange={(v) =>
                navigate({
                  status: v as DirectoryUrlFilters["status"],
                })
              }
              items={statusItems}
              className={w}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            <span id={viewLabelId}>Vista (solo con «todos»)</span>
            <SoftListbox
              labelId={viewLabelId}
              value={filters.view}
              disabled={filters.status !== "all"}
              title={
                filters.status !== "all"
                  ? "Elige «Todos» en estado para usar una o dos listas"
                  : undefined
              }
              onChange={(v) =>
                navigate({
                  view: v as DirectoryUrlFilters["view"],
                })
              }
              items={viewItems}
              className={w}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            <span id={countryLabelId}>País (desde el teléfono)</span>
            <SoftListbox
              labelId={countryLabelId}
              value={filters.country ?? ""}
              onChange={(v) => navigate({ country: v })}
              items={countryItems}
              className={w}
            />
          </div>
        </div>

        <div className="grid w-full min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(11rem,14rem)]">
          <label
            className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200"
            htmlFor={searchLabelId}
          >
            Buscar (gamertag, nombre, teléfono, nota, ban, strikes…)
            <input
              id={searchLabelId}
              type="search"
              value={qDraft}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Texto libre…"
              className={`${softInputNeutral} ${w}`}
            />
          </label>
          <div className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            <span id={bannedLabelId}>Baneos</span>
            <SoftListbox
              labelId={bannedLabelId}
              value={filters.banned === "only" ? "only" : "all"}
              onChange={(v) =>
                navigate({
                  banned: v === "only" ? "only" : "all",
                })
              }
              items={bannedItems}
              className={w}
            />
          </div>
        </div>
      </div>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        Los cambios y la búsqueda se aplican al instante (cada tecla actualiza
        la URL y la lista).
      </p>
    </div>
  );
}
