"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadMoreDirectoryMembers } from "@/app/dashboard/lista/actions";
import { DirectoryMinecraftSyncButton } from "@/components/directory-minecraft-sync-button";
import { DirectoryFilters } from "@/components/directory-filters";
import { DirectoryMemberCard } from "@/components/directory-member-card";
import {
  filtersToSearchParams,
  type DirectoryColumnLane,
  type DirectoryUrlFilters,
} from "@/lib/directory-query";
import type { DirectoryMemberDTO } from "@/types/directory";

const stripEmerald =
  "break-words rounded-xl border border-solid border-zinc-300/90 border-l-[5px] border-l-emerald-800 bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-950 dark:border-zinc-600/80 dark:border-l-emerald-600 dark:bg-emerald-950/55 dark:text-emerald-50";
const stripAsh =
  "break-words rounded-xl border border-solid border-zinc-300/90 border-l-[5px] border-l-slate-700 bg-slate-100 px-3 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-600/80 dark:border-l-slate-400 dark:bg-slate-900/55 dark:text-zinc-100";
const stripAmber =
  "break-words rounded-xl border border-solid border-zinc-300/90 border-l-[5px] border-l-amber-700 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950 dark:border-zinc-600/80 dark:border-l-amber-500 dark:bg-amber-950/40 dark:text-amber-50";

export type DirectoryRosterCounts = {
  active: number;
  inactive: number;
  left: number;
};

export type DirectoryPageSlice = {
  members: DirectoryMemberDTO[];
  nextCursor: string | null;
};

function RosterCountsStrip({ counts }: { counts: DirectoryRosterCounts }) {
  return (
    <div
      className="mb-4 grid gap-2 sm:grid-cols-3"
      role="region"
      aria-label="Cantidades por situación en roster (cohorte, país, búsqueda y baneos; sin filtro de estado de la lista)"
    >
      <div className={stripEmerald}>
        Los que estuvieron activos ({counts.active})
      </div>
      <div className={stripAsh}>
        Los inactivos ({counts.inactive})
      </div>
      <div className={stripAmber}>
        Los que se salieron ({counts.left})
      </div>
    </div>
  );
}

function MemberList({
  members,
  empty,
  busy,
}: {
  members: DirectoryMemberDTO[];
  empty: string;
  busy: boolean;
}) {
  if (members.length === 0) {
    return (
      <p className="rounded-[1.75rem] border border-dashed border-zinc-300/90 bg-zinc-50/80 p-6 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900/30 dark:text-zinc-400">
        {empty}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3" aria-busy={busy}>
      {members.map((member) => (
        <DirectoryMemberCard key={member.id} m={member} />
      ))}
    </ul>
  );
}

function DirectoryLoadMore({
  cursor,
  loading,
  error,
  onLoad,
}: {
  cursor: string | null;
  loading: boolean;
  error: string | null;
  onLoad: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onLoadRef = useRef(onLoad);

  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !cursor || loading || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadRef.current();
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loading, error]);

  if (!cursor && !error) return null;

  return (
    <div className="mt-3 flex flex-col items-center gap-2">
      <div ref={ref} className="h-px w-full" aria-hidden />
      {error ? (
        <p role="alert" className="text-center text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {cursor ? (
        <button
          type="button"
          onClick={onLoad}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 ring-1 ring-zinc-300/80 transition hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/25 disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-700 dark:focus-visible:ring-zinc-100/30"
        >
          {loading ? "Cargando…" : "Cargar más"}
        </button>
      ) : null}
    </div>
  );
}

function PagedMembers({
  initialMembers,
  initialCursor,
  empty,
  filters,
  lane,
}: {
  initialMembers: DirectoryMemberDTO[];
  initialCursor: string | null;
  empty: string;
  filters: DirectoryUrlFilters;
  lane: DirectoryColumnLane | null;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    setMembers(initialMembers);
    setCursor(initialCursor);
    setError(null);
  }, [initialMembers, initialCursor]);

  const load = useCallback(async () => {
    if (busy.current || !cursor) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await loadMoreDirectoryMembers({ filters, cursor, lane });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMembers((prev) => {
        const seen = new Set(prev.map((member) => member.id));
        return [...prev, ...result.members.filter((member) => !seen.has(member.id))];
      });
      setCursor(result.nextCursor);
    } catch {
      setError("No se pudo cargar más. Inténtalo de nuevo.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [cursor, filters, lane]);

  return (
    <>
      <MemberList members={members} empty={empty} busy={loading} />
      <DirectoryLoadMore
        cursor={cursor}
        loading={loading}
        error={error}
        onLoad={() => void load()}
      />
    </>
  );
}

function DirectoryResults({
  filters,
  rosterCounts,
  list,
  columns,
}: {
  filters: DirectoryUrlFilters;
  rosterCounts: DirectoryRosterCounts;
  list: DirectoryPageSlice | null;
  columns: {
    active: DirectoryPageSlice;
    inactive: DirectoryPageSlice;
    left: DirectoryPageSlice;
  } | null;
}) {
  const showSplit = filters.view === "split" && filters.status === "all" && columns != null;
  const listEmpty = !showSplit && (list?.members.length ?? 0) === 0;

  return (
    <>
      {!showSplit ? <RosterCountsStrip counts={rosterCounts} /> : null}
      {listEmpty ? (
        <p className="rounded-[1.75rem] border border-dashed border-zinc-300/90 bg-zinc-50/80 p-8 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900/30 dark:text-zinc-400">
          No hay personas con estos filtros. Cambia los filtros,{" "}
          <Link
            href="/dashboard/agregar"
            className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
          >
            agrega una persona
          </Link>{" "}
          o{" "}
          <Link
            href="/dashboard/administracion"
            className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
          >
            Administración de jugadores
          </Link>
          .
        </p>
      ) : showSplit && columns ? (
        <div className="grid gap-8 lg:grid-cols-3">
          <div>
            <h3 className={`mb-3 ${stripEmerald}`}>
              Los que estuvieron activos ({rosterCounts.active})
            </h3>
            <PagedMembers
              initialMembers={columns.active.members}
              initialCursor={columns.active.nextCursor}
              empty="Nadie activo en roster con estos filtros."
              filters={filters}
              lane="active"
            />
          </div>
          <div>
            <h3 className={`mb-3 ${stripAsh}`}>
              Los inactivos ({rosterCounts.inactive})
            </h3>
            <PagedMembers
              initialMembers={columns.inactive.members}
              initialCursor={columns.inactive.nextCursor}
              empty="Nadie inactivo en comunidad con estos filtros."
              filters={filters}
              lane="inactive"
            />
          </div>
          <div>
            <h3 className={`mb-3 ${stripAmber}`}>
              Los que se salieron ({rosterCounts.left})
            </h3>
            <PagedMembers
              initialMembers={columns.left.members}
              initialCursor={columns.left.nextCursor}
              empty="Nadie marcado como salido con estos filtros."
              filters={filters}
              lane="left"
            />
          </div>
        </div>
      ) : list ? (
        <PagedMembers
          initialMembers={list.members}
          initialCursor={list.nextCursor}
          empty="Sin resultados."
          filters={filters}
          lane={null}
        />
      ) : null}
    </>
  );
}

type Props = {
  filters: DirectoryUrlFilters;
  countryCodes: string[];
  rosterCounts: DirectoryRosterCounts;
  list: DirectoryPageSlice | null;
  columns: {
    active: DirectoryPageSlice;
    inactive: DirectoryPageSlice;
    left: DirectoryPageSlice;
  } | null;
};

export function DirectorySection({
  filters,
  countryCodes,
  rosterCounts,
  list,
  columns,
}: Props) {
  const filterKey = filtersToSearchParams(filters).toString() || "default";

  return (
    <>
      <Suspense
        fallback={
          <div className="mb-4 h-24 animate-pulse rounded-[1.75rem] bg-zinc-100 ring-1 ring-zinc-200/80 dark:bg-zinc-800/50 dark:ring-zinc-700/50" />
        }
      >
        <DirectoryFilters filters={filters} countryCodes={countryCodes} />
      </Suspense>

      <DirectoryMinecraftSyncButton />

      <DirectoryResults
        key={filterKey}
        filters={filters}
        rosterCounts={rosterCounts}
        list={list}
        columns={columns}
      />
    </>
  );
}
